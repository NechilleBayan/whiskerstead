// Tests for the Phase-1 polish systems: pond accidents, cook-off, comfort,
// offerings/scavenging, schedule anchors.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { DAY_MS, OUST } from "../src/config/tuning.ts";

function run(sim: Simulation, ms: number, stepMs = 200): Map<string, number> {
  const counts = new Map<string, number>();
  sim.bus.on("*", (e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
  for (let t = 0; t < ms; t += stepMs) sim.tick(stepMs);
  return counts;
}

test("pond accident collapses a shaky cat and rescue follows", () => {
  // Engineer: Pepper (clumsy) exhausted and fishing-obsessed across seeds —
  // an accident must occur and be resolved by rescue within the run.
  let sawAccident = false;
  let sawRescue = false;
  for (const seed of [3, 5, 8, 21, 34]) {
    const sim = new Simulation(createWorld(seed));
    // Houses pre-built so construction doesn't compete with the fishing setup.
    for (const b of sim.world.buildings) if (b.type === "house") b.state!.stage = 2;
    const pepper = sim.world.cats.find((c) => c.id === "pepper")!;
    pepper.needs.energy = 0.1;
    pepper.condition = 0.4;
    pepper.identity.preferences.ponds = 1.5; // magnetized to the pond
    sim.bus.on("pond-accident", () => (sawAccident = true));
    sim.bus.on("rescued", (e) => {
      if (e.type === "rescued" && e.victim === "pepper") sawRescue = true;
    });
    run(sim, DAY_MS);
    if (sawAccident && sawRescue) break;
  }
  assert.ok(sawAccident, "a pond accident occurred across seeds");
  assert.ok(sawRescue, "the accident victim was rescued");
});

test("confrontation outcomes span multiple branches across seeds", () => {
  const outcomes = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const sim = new Simulation(createWorld(seed));
    const cook = sim.world.cats.find((c) => c.id === "biscuit")!;
    const station = sim.world.buildings.find((b) => b.type === "soup-station")!;
    station.state!.cook = cook.id;
    station.state!.badPots = 3;
    for (const id of ["moss", "pepper", "bramble"]) {
      const c = sim.world.cats.find((x) => x.id === id)!;
      c.memory.push({ subject: cook.id, event: "bad soup", charge: -0.2, at: 0 });
      c.memory.push({ subject: cook.id, event: "awful soup", charge: -0.3, at: 0 });
      c.relationships[cook.id] = -0.3;
    }
    sim.bus.on("confronted", (e) => {
      if (e.type === "confronted") outcomes.add(e.outcome);
    });
    sim.evaluateSoupDrama(); // starts campaign
    sim.world.oustCampaign!.since = -OUST.sustainMs;
    sim.evaluateSoupDrama(); // resolves
    // Consistency: if the cook was ousted or lost the cook-off, the role moved.
    if (cook.identity.occupation === "villager") {
      const heir = sim.world.cats.find((c) => c.identity.occupation === "cook");
      const stationCook = sim.world.buildings.find((b) => b.type === "soup-station")!.state!.cook;
      if (heir) assert.equal(stationCook, heir.id, "station cook matches new role-holder");
    }
  }
  const valid = new Set(["defended", "apology", "quit", "cook-off:cook-won", "cook-off:challenger-won"]);
  for (const o of outcomes) assert.ok(valid.has(o), `unexpected outcome ${o}`);
  assert.ok(outcomes.size >= 3, `branching variety across seeds (saw: ${[...outcomes].join(", ")})`);
});

test("comfort and scavenge fire in ordinary village life", () => {
  const sim = new Simulation(createWorld(41));
  // Ordinary life = settled village: houses done, no construction pressure.
  for (const b of sim.world.buildings) if (b.type === "house") b.state!.stage = 2;
  // Seed a shaken cat and a dropped trinket.
  const ink = sim.world.cats.find((c) => c.id === "ink")!;
  ink.emotion = "sad";
  sim.world.groundItems.push({
    id: "lost-trinket",
    kind: "item",
    type: "trinket",
    pos: { x: 500, y: 300 },
  });
  const counts = run(sim, DAY_MS);
  assert.ok((counts.get("comforted") ?? 0) + (counts.get("scavenged") ?? 0) >= 1, "care or curiosity happened");
  assert.equal(sim.world.groundItems.find((i) => i.id === "lost-trinket")?.holder, undefined, "no dangling holder");
});

test("schedule anchors bias behavior: Ink reads at night", () => {
  const sim = new Simulation(createWorld(47));
  let inkNightReads = 0;
  let inkNightDecisions = 0;
  sim.bus.on("decision", (e) => {
    if (e.type === "decision" && e.cat === "ink" && sim.world.phase === "night") {
      inkNightDecisions++;
      if (e.action === "read" || e.action === "sleep") inkNightReads++;
    }
  });
  for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200);
  assert.ok(inkNightDecisions > 3, "ink makes night decisions");
  assert.ok(
    inkNightReads / inkNightDecisions > 0.2,
    `night anchor pulls ink to the library/bed (${inkNightReads}/${inkNightDecisions})`,
  );
});
