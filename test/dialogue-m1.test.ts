// M1 dialogue state-gap tests — 06-dialogue-integration-spec §6 (M1):
// weather-changed emission, relationship band milestones, ambient speech
// windows, repetition streaks, derived context queries, save migration, and
// full-stream determinism with the new events in play.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { nudgeRel, relBand } from "../src/sim/relationships.ts";
import { foodShortage, fuelShortage, nearbyCats, workElapsedMs } from "../src/sim/dialogue/context.ts";
import { DAY_MS, DIALOGUE, SOUP, TREES } from "../src/config/tuning.ts";
import type { GameEvent } from "../src/sim/events.ts";

test("weather-changed fires on actual change, never on a same-value set", () => {
  const sim = new Simulation(createWorld(51));
  const events: GameEvent[] = [];
  sim.bus.on("weather-changed", (e) => events.push(e));
  sim.weather("rain");
  assert.deepEqual(events, [{ type: "weather-changed", from: "clear", to: "rain" }]);
  sim.weather("rain"); // same value — silent
  assert.equal(events.length, 1, "no event on a same-value set");
  sim.weather("storm");
  assert.deepEqual(events[1], { type: "weather-changed", from: "rain", to: "storm" });
});

test("relationship-milestone fires exactly once per band crossing, both directions", () => {
  const world = createWorld(52);
  const [a, b] = world.cats;
  const events: GameEvent[] = [];
  const emit = (e: GameEvent) => events.push(e);
  for (let i = 0; i < 3; i++) nudgeRel(a, b.id, 0.1, emit); // 0 → ~0.3, inside neutral
  assert.equal(events.length, 0, "no fire while staying inside a band");
  nudgeRel(a, b.id, 0.15, emit); // → ~0.45: neutral → friend
  assert.deepEqual(events, [{ type: "relationship-milestone", a: a.id, b: b.id, from: "neutral", to: "friend" }]);
  nudgeRel(a, b.id, 0.1, emit); // → ~0.55, still friend
  assert.equal(events.length, 1, "no repeat-fire inside the friend band");
  nudgeRel(a, b.id, -0.3, emit); // → ~0.25: friend → neutral (reverse direction)
  assert.deepEqual(events[1], { type: "relationship-milestone", a: a.id, b: b.id, from: "friend", to: "neutral" });
  nudgeRel(a, b.id, -0.9, emit); // → ~-0.65: straight through to rival
  assert.deepEqual(events[2], { type: "relationship-milestone", a: a.id, b: b.id, from: "neutral", to: "rival" });
  assert.equal(relBand(a.relationships[b.id]), "rival", "value and band agree after clamped writes");
});

test("ambient-window fires for an idle-ish cat and resets even though nothing speaks", () => {
  const sim = new Simulation(createWorld(53));
  const fired = new Map<string, number>();
  sim.bus.on("ambient-window", (e) => {
    if (e.type === "ambient-window") fired.set(e.cat, (fired.get(e.cat) ?? 0) + 1);
  });
  const cat = sim.world.cats[0];
  const before = cat.lastAmbientAt;
  const horizon = 2 * (DIALOGUE.ambientIntervalMs + DIALOGUE.ambientJitterMs);
  for (let t = 0; t < horizon; t += 200) sim.tick(200);
  assert.ok((fired.get(cat.id) ?? 0) >= 1, "window fired after the interval");
  assert.ok(cat.lastAmbientAt > before, "timer reset with no subscriber speaking (M1 has none)");
});

test("ambient-window is suppressed while grabbed, collapsed, or mid-perform", () => {
  const sim = new Simulation(createWorld(54));
  const fired: string[] = [];
  sim.bus.on("ambient-window", (e) => {
    if (e.type === "ambient-window") fired.push(e.cat);
  });
  const [g, c, p] = sim.world.cats;
  g.grabbed = true;
  c.stage = "collapsed";
  c.action = undefined;
  // M2 carved out a sleep-perform exception (sleep_talk windows), so the
  // mid-perform suppression case must use a non-sleep action.
  p.action = { id: "fish", phase: "perform", startedAt: sim.world.time, duration: 1e12 };
  for (const cat of [g, c, p]) cat.lastAmbientAt = -1e9; // long overdue
  for (let t = 0; t < 2000; t += 200) sim.tick(200);
  assert.ok(!fired.includes(g.id), "grabbed cat gets no window");
  assert.ok(!fired.includes(c.id), "collapsed cat gets no window");
  assert.ok(!fired.includes(p.id), "mid-perform cat gets no window");
  p.action = undefined; // back to idle — the overdue window fires immediately
  sim.tick(200);
  assert.ok(fired.includes(p.id), "window fires once the perform phase ends");
});

test("repetition streak increments on same-action repeats and resets on a switch", () => {
  const sim = new Simulation(createWorld(55));
  // Record the streak the moment each completion lands; replay the stream to
  // verify the math at every step (increment on repeat, reset to 1 on switch).
  const observed = new Map<string, Array<{ action: string; count: number }>>();
  sim.bus.on("action-completed", (e) => {
    if (e.type !== "action-completed") return;
    const cat = sim.world.cats.find((x) => x.id === e.cat)!;
    const list = observed.get(e.cat) ?? [];
    list.push({ action: e.action, count: cat.repetition.count });
    observed.set(e.cat, list);
  });
  for (let t = 0; t < DAY_MS; t += 200) sim.tick(200);
  let sawRepeat = false;
  let sawReset = false;
  for (const [id, list] of observed) {
    let prev = "";
    let streak = 0;
    for (const o of list) {
      streak = o.action === prev ? streak + 1 : 1;
      prev = o.action;
      assert.equal(o.count, streak, `${id}: streak tracks completions of ${o.action}`);
      if (o.count >= 2) sawRepeat = true;
      if (o.count === 1 && streak === 1) sawReset = true;
    }
  }
  assert.ok(sawRepeat, "some action repeated back-to-back within a day");
  assert.ok(sawReset, "streaks reset when the action changes");
});

test("context queries: shortage flags flip when stocks drain; workElapsedMs undefined when idle", () => {
  const world = createWorld(56);
  assert.equal(foodShortage(world).any, false, "fresh world has food");
  assert.equal(fuelShortage(world), false, "bonfire starts fueled");
  for (const b of world.buildings) {
    if (b.type === "soup-station") b.state!.ingredients = SOUP.restockUnits - 1;
    if (b.type === "bakery") b.state!.bread = 0;
    if (b.type === "forage") b.state!.veg = 0;
    if (b.type === "bonfire") b.state!.fuel = TREES.campfireCost - 1;
  }
  assert.deepEqual(foodShortage(world), { soup: true, bread: true, forage: true, any: true });
  assert.equal(fuelShortage(world), true, "fuel below the next lighting cost");

  const cat = world.cats[0];
  assert.equal(workElapsedMs(cat, world.time), undefined, "idle cat has no work timer");
  cat.action = { id: "fish", phase: "goto", startedAt: 0, duration: 1000 };
  assert.equal(workElapsedMs(cat, 500), undefined, "goto phase is not work");
  cat.action.phase = "perform";
  cat.action.startedAt = 200;
  assert.equal(workElapsedMs(cat, 700), 500, "perform phase measures from startedAt");

  assert.equal(nearbyCats(cat, world, 1e6).length, world.cats.length - 1, "wide radius sees everyone else");
  assert.equal(nearbyCats(cat, world, 0.001).length, 0, "tiny radius sees no one");
  world.cats[1].grabbed = true;
  assert.equal(nearbyCats(cat, world, 1e6).length, world.cats.length - 2, "grabbed cats are not nearby");
});

test("save round-trip keeps M1 fields exact; stripped old saves get migration defaults", () => {
  const sim = new Simulation(createWorld(57));
  for (let t = 0; t < DAY_MS / 2; t += 200) sim.tick(200);
  const snapshot = sim.save();
  const restored = Simulation.load(snapshot);
  assert.deepEqual(
    JSON.parse(restored.save()),
    JSON.parse(snapshot),
    "round-trip exact including lastAmbientAt and repetition",
  );
  // Old save: strip the M1 fields entirely, as a pre-M1 file would lack them.
  const old = JSON.parse(snapshot);
  for (const c of old.cats) {
    delete c.lastAmbientAt;
    delete c.repetition;
  }
  const migrated = Simulation.load(JSON.stringify(old));
  for (const c of migrated.world.cats) {
    assert.equal(typeof c.lastAmbientAt, "number", `${c.id} lastAmbientAt defaulted to a number`);
    assert.deepEqual(c.repetition, { actionId: "", count: 0 }, `${c.id} repetition defaulted`);
  }
});

test("determinism: 2-day same-seed FULL event transcript identity (new events included)", () => {
  const transcript = (seed: number) => {
    const sim = new Simulation(createWorld(seed));
    const out: string[] = [];
    // Item ids are minted from a module-level counter (pre-existing M0 state),
    // so two sims in one process differ ONLY in those suffixes — normalize
    // them; everything else in the stream must match byte-for-byte.
    sim.bus.on("*", (e) => out.push(JSON.stringify(e).replace(/item-([a-z]+)-\d+/g, "item-$1-#")));
    for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200);
    return out;
  };
  const a = transcript(58);
  assert.deepEqual(a, transcript(58), "full event streams match");
  assert.ok(a.some((e) => e.includes('"ambient-window"')), "ambient windows appear in the stream");
});
