// Tree & wood system tests: forest layout (edge zones, clearing, exclusions,
// determinism), the tree state machine, reservation exclusivity, harvest
// yield, regrowth, and wood consumption by construction + campfire.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { choppableTrees, updateTrees } from "../src/sim/trees.ts";
import { DAY_MS, FOREST, TREES } from "../src/config/tuning.ts";
import type { Building } from "../src/sim/types.ts";

function trees(world: ReturnType<typeof createWorld>): Building[] {
  return world.buildings.filter((b) => b.type === "tree");
}

function run(sim: Simulation, ms: number, stepMs = 200): Map<string, number> {
  const counts = new Map<string, number>();
  sim.bus.on("*", (e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
  for (let t = 0; t < ms; t += stepMs) sim.tick(stepMs);
  return counts;
}

test("forest frames the field: edge zones, sparse bottom, open center", () => {
  const world = createWorld(1337);
  const ts = trees(world);
  const { w: W, h: H } = world.bounds;
  assert.ok(ts.length >= 25, `enough trees spawned (${ts.length})`);

  // central clearing stays tree-free
  const clearW = (W * FOREST.clearingFrac) / 2;
  const clearH = (H * FOREST.clearingFrac) / 2;
  const central = ts.filter(
    (t) => Math.abs(t.pos.x - W / 2) < clearW && Math.abs(t.pos.y - H / 2) < clearH,
  );
  assert.equal(central.length, 0, "no trees in the central clearing");

  // middle-bottom stays open (bottom trees hug the corners)
  const midBottom = ts.filter((t) => t.pos.x > W * 0.3 && t.pos.x < W * 0.7 && t.pos.y > H - 70);
  assert.equal(midBottom.length, 0, "middle-bottom is open");

  // bottom band is much sparser than the top band
  const topCount = ts.filter((t) => t.pos.y < 110).length;
  const bottomCount = ts.filter((t) => t.pos.y > H - 60).length;
  assert.ok(topCount >= 6, `top band is dense (${topCount})`);
  assert.ok(bottomCount <= Math.max(2, topCount * 0.4), `bottom is sparse (${bottomCount} vs top ${topCount})`);

  // exclusion zones respected: no tree on/near buildings, pond, sites
  for (const b of world.buildings) {
    if (b.type === "tree") continue;
    const r = FOREST.exclusionRadius[b.type] ?? FOREST.exclusionRadius.default;
    for (const t of ts) {
      assert.ok(
        Math.hypot(t.pos.x - b.pos.x, t.pos.y - b.pos.y) >= r,
        `tree ${t.id} clear of ${b.id}`,
      );
    }
  }

  // natural variation: scales and variants differ
  const scales = new Set(ts.map((t) => t.state!.scale));
  const variants = new Set(ts.map((t) => t.state!.variant));
  assert.ok(scales.size > 5, "scale variation");
  assert.ok(variants.size >= 2, "variant variation");
});

test("forest generation is deterministic per seed", () => {
  const a = createWorld(42);
  const b = createWorld(42);
  const c = createWorld(43);
  const key = (w: ReturnType<typeof createWorld>) =>
    trees(w).map((t) => `${Math.round(t.pos.x)},${Math.round(t.pos.y)},${t.state!.variant}`).join(";");
  assert.equal(key(a), key(b), "same seed → same forest");
  assert.notEqual(key(a), key(c), "different seed → different forest");
});

test("reservation: one cat per tree", () => {
  const sim = new Simulation(createWorld(51));
  const [a, b] = sim.world.cats;
  // Place both cats next to the same mature tree.
  const tree = trees(sim.world).find((t) => t.state!.stage === "mature")!;
  a.pos = { x: tree.pos.x + 30, y: tree.pos.y };
  b.pos = { x: tree.pos.x - 30, y: tree.pos.y };
  // Cat A reserves it (simulating onCommit).
  tree.state!.stage = "reserved";
  tree.state!.reservedBy = a.id;
  a.action = { id: "chop", targetId: tree.id, startedAt: 0, duration: 1000, phase: "goto" };
  // B's chop candidates must not include the reserved tree.
  const options = choppableTrees(b, sim.world);
  assert.ok(!options.some((t) => t.id === tree.id), "reserved tree is not offered to another cat");
  // Sweep keeps the reservation while A still targets it…
  updateTrees(sim.world);
  assert.equal(tree.state!.stage, "reserved");
  // …and self-heals it when A is interrupted (grab clears the action).
  a.action = undefined;
  updateTrees(sim.world);
  assert.equal(tree.state!.stage, "mature", "leaked reservation released");
  assert.equal(tree.state!.reservedBy, "");
});

test("chop lifecycle: harvest yields 3–5 wood, stump regrows to mature", () => {
  const sim = new Simulation(createWorld(53));
  let harvested: { tree: string; wood: number } | undefined;
  sim.bus.on("chopped", (e) => {
    if (e.type === "chopped" && !harvested) harvested = { tree: e.tree, wood: e.wood };
  });
  // Run until the first chop (build-arc guarantees one early), then stop so
  // the stump is still fresh when we inspect it.
  for (let t = 0; t < DAY_MS && !harvested; t += 200) sim.tick(200);
  assert.ok(harvested, "a tree was chopped within a day");
  assert.ok(harvested!.wood >= TREES.yieldMin && harvested!.wood <= TREES.yieldMax, `yield in range (${harvested!.wood})`);

  const cut = trees(sim.world).find((t) => t.id === harvested!.tree);
  assert.ok(cut, "harvested tree exists");
  assert.equal(cut!.state!.stage, "stump", "harvested tree is a stump");
  // Each transition restamps `since`, so advance the clock per transition.
  sim.world.time += TREES.stumpMs + 1000;
  updateTrees(sim.world); // stump → regrowing
  sim.world.time += TREES.regrowMs + 1000;
  updateTrees(sim.world); // regrowing → mature
  assert.equal(cut!.state!.stage, "mature", "stump regrew to mature");
});

test("wood feeds construction and the campfire", () => {
  const sim = new Simulation(createWorld(57));
  let everLit = false;
  sim.bus.on("*", () => {
    const fire = sim.world.buildings.find((b) => b.type === "bonfire")!;
    if ((fire.state!.lit as number) === 1) everLit = true;
  });
  const counts = run(sim, 2 * DAY_MS);
  // Houses require wood now — construction proves the chop → build chain.
  assert.ok((counts.get("chopped") ?? 0) >= 3, `chopping happened (${counts.get("chopped")})`);
  assert.ok((counts.get("build-progressed") ?? 0) >= 5, "construction progressed on wood");
  const done = sim.world.buildings.filter((b) => b.type === "house" && (b.state!.stage as number) >= 2);
  assert.ok(done.length >= 4, `houses completed via wood economy (${done.length}/5)`);
  assert.ok(everLit, "the campfire was lit (fuel consumed from the woodpile or a carried bundle)");
});

test("save/load preserves the forest exactly (no respawn over live state)", () => {
  const sim = new Simulation(createWorld(59));
  run(sim, 0.5 * DAY_MS);
  const before = trees(sim.world).map((t) => `${t.id}:${t.state!.stage}`).join(";");
  const restored = Simulation.load(sim.save());
  const after = trees(restored.world).map((t) => `${t.id}:${t.state!.stage}`).join(";");
  assert.equal(after, before, "tree states survive the round-trip");
});

test("pre-forest saves get a forest via migration", () => {
  const world = createWorld(61);
  world.buildings = world.buildings.filter((b) => b.type !== "tree"); // simulate old save
  const restored = Simulation.load(JSON.stringify(world));
  assert.ok(trees(restored.world).length >= 25, "forest planted for old saves");
});
