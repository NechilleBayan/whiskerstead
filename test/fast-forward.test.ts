// Headless fast-forward tests — spec §Debug 4 + §Build Notes: "write the
// headless test harness in the first milestone, not last." The sim runs with
// zero rendering here, proving the core is graphics-free.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { DAY_MS } from "../src/config/tuning.ts";

/** Run the sim for `days` game-days at a fixed step, collecting events. */
function runDays(sim: Simulation, days: number, stepMs = 200): Map<string, number> {
  const counts = new Map<string, number>();
  sim.bus.on("*", (e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
  const total = days * DAY_MS;
  let t = 0;
  while (t < total) {
    sim.tick(stepMs);
    t += stepMs;
  }
  return counts;
}

test("village runs 3 game-days without deadlock", () => {
  const sim = new Simulation(createWorld(1));
  const counts = runDays(sim, 3);
  // Every cat should have made many decisions — nobody frozen.
  assert.ok((counts.get("decision") ?? 0) > 100, "cats keep making decisions");
  assert.ok((counts.get("action-completed") ?? 0) > 80, "actions complete and refire");
});

test("cats eat and nobody stays permanently collapsed", () => {
  const sim = new Simulation(createWorld(7));
  const counts = runDays(sim, 3);
  assert.ok((counts.get("ate") ?? 0) > 5, "cats feed themselves");
  // No cat may end the run collapsed (rescue must resolve it) — no perma-death.
  const stuck = sim.world.cats.filter((c) => c.stage === "collapsed");
  assert.equal(stuck.length, 0, `no cat left collapsed (found ${stuck.map((c) => c.id)})`);
  // Condition is always floored — never negative, never zero.
  for (const c of sim.world.cats) assert.ok(c.condition > 0, `${c.id} condition floored`);
});

test("soup station serves over time (emergent cook)", () => {
  const sim = new Simulation(createWorld(3));
  const counts = runDays(sim, 3);
  assert.ok((counts.get("cooked") ?? 0) >= 1, "someone self-adopts cooking");
  assert.ok((counts.get("fished") ?? 0) >= 3, "fishing happens");
});

test("determinism: same seed reproduces the same run (spec §6)", () => {
  const a = new Simulation(createWorld(42));
  const b = new Simulation(createWorld(42));
  runDays(a, 1);
  runDays(b, 1);
  assert.equal(a.world.rngState, b.world.rngState, "rng state matches");
  for (let i = 0; i < a.world.cats.length; i++) {
    assert.equal(
      Math.round(a.world.cats[i].pos.x),
      Math.round(b.world.cats[i].pos.x),
      `${a.world.cats[i].id} x position matches`,
    );
    assert.equal(a.world.cats[i].fishSkill.attempts, b.world.cats[i].fishSkill.attempts, "fish attempts match");
  }
});

test("save/load round-trips and continues deterministically", () => {
  const sim = new Simulation(createWorld(99));
  runDays(sim, 1);
  const snapshot = sim.save();
  const restored = Simulation.load(snapshot);
  assert.equal(restored.world.time, sim.world.time, "time preserved");
  assert.equal(restored.world.rngState, sim.world.rngState, "rng preserved");
  assert.equal(restored.world.cats.length, sim.world.cats.length, "cats preserved");
  // both advance identically from the same restored state
  const c1 = runDays(sim, 1);
  const restored2 = Simulation.load(snapshot);
  const c2 = runDays(restored2, 1);
  assert.equal(c1.get("decision") ?? 0 > 0, c2.get("decision") ?? 0 > 0, "both continue deciding");
});

test("weather and phases advance", () => {
  const sim = new Simulation(createWorld(5));
  const counts = runDays(sim, 2);
  assert.ok((counts.get("phase-changed") ?? 0) >= 5, "phases cycle across days");
});
