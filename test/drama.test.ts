// Tests for the Phase-1 drama systems: build-arc, theft/beg escalation,
// gossip, bubble dedup, and the soup-ousting chain. All headless.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { DAY_MS, OUST } from "../src/config/tuning.ts";
import { pickLine } from "../src/content/bubbles.ts";
import { Rng } from "../src/sim/rng.ts";

function run(sim: Simulation, ms: number, stepMs = 200): Map<string, number> {
  const counts = new Map<string, number>();
  sim.bus.on("*", (e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
  for (let t = 0; t < ms; t += stepMs) sim.tick(stepMs);
  return counts;
}

test("spawn build-arc: all houses get built", () => {
  const sim = new Simulation(createWorld(11));
  const counts = run(sim, 2 * DAY_MS);
  assert.ok((counts.get("build-progressed") ?? 0) >= 5, "construction progresses");
  const houses = sim.world.buildings.filter((b) => b.type === "house");
  const done = houses.filter((h) => (h.state?.stage as number) >= 2);
  assert.ok(done.length >= 4, `most houses finished within 2 days (${done.length}/5)`);
});

test("hunger escalation: begging/theft fire under scarcity", () => {
  const sim = new Simulation(createWorld(13));
  // Engineer scarcity: strip every public food source. Moss alone holds food
  // and isn't hungry — begging/stealing from Moss is the only route.
  for (const b of sim.world.buildings) {
    if (b.type === "forage") b.state!.veg = 0;
    if (b.type === "market") b.state!.stocked = 0;
    if (b.type === "soup-station") b.state!.ingredients = 0;
    if (b.type === "bakery") b.state!.bread = 0;
  }
  const moss = sim.world.cats.find((c) => c.id === "moss")!;
  for (const c of sim.world.cats) c.needs.hunger = c === moss ? 1.0 : 0.1;
  for (let i = 0; i < 4; i++) {
    moss.inventory.push({ id: `f${i}`, kind: "item", type: "fish", pos: { x: 0, y: 0 }, holder: "moss" });
  }
  // Short window (within one phase) so nothing regrows.
  const counts = run(sim, 0.15 * DAY_MS);
  const pressure = (counts.get("begged") ?? 0) + (counts.get("stole") ?? 0) + (counts.get("theft-caught") ?? 0);
  assert.ok(pressure >= 1, `hungry cats beg or steal (saw ${pressure})`);
});

test("gossip spreads secondhand opinions", () => {
  const sim = new Simulation(createWorld(17));
  const [a, b] = sim.world.cats;
  // Seed a juicy memory: a was wronged by cat #3.
  const c = sim.world.cats[2];
  a.memory.push({ subject: c.id, event: `${c.id} stole my fish`, charge: -0.4, at: 0 });
  const counts = run(sim, DAY_MS);
  assert.ok((counts.get("gossiped") ?? 0) >= 1, "gossip fires");
  const heard = sim.world.cats.some((x) => x.id !== a.id && x.memory.some((m) => m.event.startsWith("heard:")));
  assert.ok(heard, "someone absorbed a secondhand opinion");
  void b;
});

test("bubble lines dedupe within the suppression window", () => {
  const world = createWorld(19);
  const cat = world.cats[0];
  const rng = new Rng(5);
  const seen = new Set<string>();
  // Draw the same category repeatedly at the same timestamp: every line must
  // be unique until the pool exhausts, then silence (undefined).
  for (let i = 0; i < 30; i++) {
    const line = pickLine(cat, "fish_miss", 1000, rng);
    if (line === undefined) break;
    assert.ok(!seen.has(line), `line repeated within window: ${line}`);
    seen.add(line);
  }
  assert.ok(seen.size >= 3, "pool has variety");
  assert.equal(pickLine(cat, "fish_miss", 1000, rng), undefined, "exhausted pool goes silent");
  // After the window passes, lines free up again.
  assert.ok(pickLine(cat, "fish_miss", 1000 + 4 * DAY_MS, rng) !== undefined, "window expiry frees lines");
});

test("soup ousting: pattern → campaign → confrontation", () => {
  const sim = new Simulation(createWorld(23));
  const events: string[] = [];
  sim.bus.on("*", (e) => {
    if (["oust-started", "oust-dissolved", "confronted", "ousted"].includes(e.type)) events.push(e.type);
  });
  const cook = sim.world.cats.find((c) => c.id === "biscuit")!;
  const station = sim.world.buildings.find((b) => b.type === "soup-station")!;
  station.state!.cook = cook.id;
  station.state!.badPots = 3;
  // Engineer the full pattern: 3 supporters with 2+ bad-soup memories + dislike.
  for (const id of ["moss", "pepper", "bramble"]) {
    const c = sim.world.cats.find((x) => x.id === id)!;
    c.memory.push({ subject: cook.id, event: "bad soup", charge: -0.2, at: 0 });
    c.memory.push({ subject: cook.id, event: "awful soup", charge: -0.3, at: 0 });
    c.relationships[cook.id] = -0.3;
  }
  sim.evaluateSoupDrama();
  assert.ok(events.includes("oust-started"), "campaign starts when the pattern holds");
  assert.ok(sim.world.oustCampaign, "campaign is live");

  // Sustain past the threshold, then re-evaluate → confrontation resolves it.
  sim.world.oustCampaign!.since = -OUST.sustainMs;
  sim.evaluateSoupDrama();
  assert.ok(events.includes("confronted"), "confrontation fires after sustained support");
  assert.equal(sim.world.oustCampaign, undefined, "campaign resolves");
});

test("ousting dissolves when reputation repairs", () => {
  const sim = new Simulation(createWorld(29));
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
  sim.evaluateSoupDrama();
  assert.ok(sim.world.oustCampaign, "campaign starts");
  // Rep repair: two supporters warm back up to the cook.
  for (const id of ["moss", "pepper"]) {
    sim.world.cats.find((x) => x.id === id)!.relationships[cook.id] = 0.5;
  }
  const events: string[] = [];
  sim.bus.on("*", (e) => events.push(e.type));
  sim.evaluateSoupDrama();
  assert.ok(events.includes("oust-dissolved"), "campaign dissolves");
  assert.equal(sim.world.oustCampaign, undefined);
});
