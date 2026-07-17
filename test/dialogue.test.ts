// M0 dialogue plumbing tests — 06-dialogue-integration-spec §3 bug fixes:
// selection is pure, dropped bubbles don't burn lines, one suppression record
// per utterance, and the bubble transcript stays deterministic per seed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { Rng } from "../src/sim/rng.ts";
import { selectLine } from "../src/sim/dialogue/select.ts";
import { DAY_MS } from "../src/config/tuning.ts";

test("selection is pure: same inputs + rng state give same line, no mutation", () => {
  const world = createWorld(11);
  const cat = world.cats[0];
  const before = JSON.stringify(cat);
  const a = selectLine(cat, "greeting", 1000, new Rng(7));
  const b = selectLine(cat, "greeting", 1000, new Rng(7));
  assert.ok(a, "a line was selected");
  assert.deepEqual(a, b, "identical inputs yield identical picks");
  assert.equal(JSON.stringify(cat), before, "cat state untouched by selection");
});

test("a dropped bubble does not burn the line", () => {
  const sim = new Simulation(createWorld(21));
  const cat = sim.world.cats[0];
  cat.lastBubbleAt = sim.world.time; // per-cat chatter cooldown is active
  sim.bus.emit({ type: "chopped", cat: cat.id, tree: "t1", wood: 3 }); // non-forced narration → speak drops it
  const burned = Object.keys(cat.lineHistory).filter((k) => k.startsWith("chop:"));
  assert.equal(burned.length, 0, "no suppression written for a bubble that never showed");
  const pick = selectLine(cat, "chop", sim.world.time, new Rng(1));
  assert.ok(pick, "the category is still fully eligible next pick");
});

test("one suppression record per spoken line (no double bookkeeping)", () => {
  const sim = new Simulation(createWorld(22));
  const cat = sim.world.cats[0];
  sim.bus.emit({ type: "collapsed", cat: cat.id, cause: "hunger" }); // forced 'rescue' line — bubble shows
  const keys = Object.keys(cat.lineHistory);
  assert.equal(keys.length, 1, `exactly one record per utterance (saw: ${keys.join(", ")})`);
  assert.ok(keys[0].startsWith("rescue:"), "record uses the shared category:line key");
  assert.ok(!keys.some((k) => k.startsWith("spoke:")), "no spoke: sibling record");
});

test("determinism: same seed produces identical bubble transcripts over 2 days", () => {
  const transcript = (seed: number) => {
    const sim = new Simulation(createWorld(seed));
    const out: string[] = [];
    sim.bus.on("bubble", (e) => {
      if (e.type === "bubble") out.push(`${e.cat}|${e.kind}|${e.text}`);
    });
    for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200);
    return out;
  };
  assert.deepEqual(transcript(33), transcript(33), "bubble transcripts match");
});

test("save round-trip stays exact with dialogue history in play", () => {
  const sim = new Simulation(createWorld(44));
  for (let t = 0; t < DAY_MS; t += 200) sim.tick(200);
  const snapshot = sim.save();
  const restored = Simulation.load(snapshot);
  assert.deepEqual(JSON.parse(restored.save()), JSON.parse(snapshot), "world serializes identically after load");
});
