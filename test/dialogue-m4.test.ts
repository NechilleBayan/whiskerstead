// Dialogue M4 Feature A — reconcile action tests (files/09-dialogue-m4-spec.md).
// Covers: shallow rival repaired to neutral with the OLD argument memory left
// intact (rule 5 — additive only); a deep rival needing more than one reconcile;
// the per-target cooldown blocking a repeat candidate; 2-day same-seed transcript
// determinism with reconcile registered; and byte-exact save round-trip carrying
// reconcileCooldowns. Direct onComplete drives use a seeded Rng so accept/rebuff
// is deterministic (the accept roll is the one rng draw per attempt).

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { reconcile } from "../src/sim/actions/reconcile.ts";
import { relBand } from "../src/sim/relationships.ts";
import { Rng } from "../src/sim/rng.ts";
import { TONED_LINES, TONES } from "../src/content/dialogue/lines.ts";
import { DAY_MS, RECONCILE } from "../src/config/tuning.ts";
import type { CatState, WorldState } from "../src/sim/types.ts";
import type { GameEvent } from "../src/sim/events.ts";

/** All texts a toned category can produce, with {who} filled for every name. */
function textsOf(category: string, names: string[]): Set<string> {
  const out = new Set<string>();
  const tones = TONED_LINES[category];
  if (!tones) return out;
  for (const tone of TONES) {
    for (const pool of Object.values(tones[tone] ?? {})) {
      for (const line of pool) {
        if (line.includes("{who}")) for (const n of names) out.add(line.replaceAll("{who}", n));
        else out.add(line);
      }
    }
  }
  return out;
}

/** First seed whose fresh Rng's first draw satisfies pred — lets us force a
 *  deterministic accept/rebuff independent of the exact clamped accept chance. */
function firstSeedWith(pred: (v: number) => boolean): number {
  for (let s = 1; s < 1_000_000; s++) if (pred(new Rng(s).next())) return s;
  throw new Error("no seed found");
}
// v < minAccept guarantees accept (accept chance is clamped ≥ minAccept).
const acceptSeed = firstSeedWith((v) => v < RECONCILE.minAccept);

/** Invoke reconcile.onComplete directly and collect the emitted events. */
function runReconcile(cat: CatState, other: CatState, world: WorldState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  reconcile.onComplete({ cat, world, target: other, rng, emit: (e) => events.push(e), now: world.time });
  return events;
}

test("reconcile repairs a shallow rival to neutral while old memories persist", () => {
  const world = createWorld(101);
  const cat = world.cats[0];
  const other = world.cats[1];
  cat.relationships[other.id] = -0.5; // shallow rival — one repairUp crosses to neutral
  other.relationships[cat.id] = -0.3;
  // a pre-existing negative argument memory that reconciliation must NOT touch
  cat.memory.push({ subject: other.id, event: "argued about the pot", charge: -0.4, at: 0 });

  const events = runReconcile(cat, other, world, new Rng(acceptSeed));
  const ev = events.find((e) => e.type === "reconciled");
  assert.ok(ev && ev.type === "reconciled" && ev.outcome === "accepted", "the peace was accepted");
  assert.equal(relBand(cat.relationships[other.id] ?? 0), "neutral", "-0.5 + repairUp crosses rival→neutral");

  // rule 5: the old negative memory is left intact (not scaled, not deleted)
  const old = cat.memory.find((m) => m.event === "argued about the pot");
  assert.ok(old, "the argument memory still exists after reconciling");
  assert.equal(old!.charge, -0.4, "old negative charge is unchanged — reconciliation is additive only");
  // and a NEW additive positive memory landed on both cats
  assert.ok(cat.memory.some((m) => m.subject === other.id && m.charge > 0), "initiator gains a positive memory");
  assert.ok(other.memory.some((m) => m.subject === cat.id && m.charge > 0), "the other gains a positive memory");
});

test("a deep rival (-0.9) needs more than one reconcile to reach neutral", () => {
  const world = createWorld(202);
  const cat = world.cats[0];
  const other = world.cats[1];
  cat.relationships[other.id] = -0.9;

  // Force acceptance (guaranteed-accept seed): even a fully accepted reconcile
  // leaves a deep rivalry short of neutral — intended persistence.
  runReconcile(cat, other, world, new Rng(acceptSeed));
  assert.equal(relBand(cat.relationships[other.id] ?? 0), "rival", "one accepted reconcile is not enough — still rival");
  assert.ok((cat.relationships[other.id] ?? 0) > -0.9, "but the drift moved upward");

  // still a rival → a second reconcile is allowed and this one crosses to neutral
  runReconcile(cat, other, world, new Rng(acceptSeed));
  assert.equal(relBand(cat.relationships[other.id] ?? 0), "neutral", "a second accepted reconcile crosses to neutral");
});

test("the per-target cooldown blocks a repeat reconcile candidate", () => {
  const world = createWorld(303);
  const cat = world.cats[0];
  const other = world.cats[1];
  cat.relationships[other.id] = -0.5; // a rival, eligible

  assert.ok(reconcile.candidates(cat, world).some((c) => c!.id === other.id), "the rival is a candidate");
  cat.reconcileCooldowns[other.id] = world.time; // just attempted
  assert.ok(!reconcile.candidates(cat, world).some((c) => c!.id === other.id), "cooldown removes the candidate");
  world.time += RECONCILE.cooldownMs; // a game day passes
  assert.ok(reconcile.candidates(cat, world).some((c) => c!.id === other.id), "candidate returns after the cooldown");
});

test("determinism: 2-day same-seed transcript is identical with reconcile registered", () => {
  const transcript = (seed: number) => {
    const sim = new Simulation(createWorld(seed));
    const out: string[] = [];
    sim.bus.on("*", (e) => out.push(JSON.stringify(e).replace(/item-([a-z]+)-\d+/g, "item-$1-#")));
    for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200);
    return out;
  };
  const a = transcript(88);
  assert.deepEqual(a, transcript(88), "same-seed event streams match with the new action in the roll");
  assert.ok(a.some((e) => e.includes('"ambient-window"')), "ambient windows still appear in the stream");
});

test("save round-trip stays byte-exact and preserves reconcileCooldowns", () => {
  const sim = new Simulation(createWorld(404));
  for (let t = 0; t < DAY_MS; t += 200) sim.tick(200);
  // stamp a cooldown so the new field is exercised in the snapshot
  const [a, b] = sim.world.cats;
  a.reconcileCooldowns[b.id] = sim.world.time;
  const snapshot = sim.save();
  const restored = Simulation.load(snapshot);
  assert.equal(restored.save(), snapshot, "reloaded world re-serializes byte-for-byte");
  assert.equal(
    restored.world.cats[0].reconcileCooldowns[b.id],
    sim.world.time,
    "reconcileCooldowns survived the round-trip",
  );
});

test("the reconciled event narrates from the initiator only", () => {
  const sim = new Simulation(createWorld(505));
  const [a, b] = sim.world.cats;
  const names = sim.world.cats.map((c) => c.identity.name);
  const acceptedTexts = textsOf("reconcile", names);
  const rebuffedTexts = textsOf("reconcile_rebuffed", names);
  const fromA: string[] = [];
  const fromB: string[] = [];
  sim.bus.on("bubble", (e) => {
    if (e.type !== "bubble" || e.kind !== "speech") return;
    if (e.cat === a.id) fromA.push(e.text);
    if (e.cat === b.id) fromB.push(e.text);
  });

  sim.bus.emit({ type: "reconciled", a: a.id, b: b.id, outcome: "accepted" });
  assert.ok(fromA.some((t) => acceptedTexts.has(t)), "accepted → the initiator speaks a reconcile line");

  // advance past the per-cat chatter cooldown so the (unforced) rebuff line lands
  sim.world.time += DAY_MS;
  sim.bus.setClock(sim.world.time);
  sim.bus.emit({ type: "reconciled", a: a.id, b: b.id, outcome: "rebuffed" });
  assert.ok(fromA.some((t) => rebuffedTexts.has(t)), "rebuffed → the initiator speaks a reconcile_rebuffed line");

  assert.ok(
    !fromB.some((t) => acceptedTexts.has(t) || rebuffedTexts.has(t)),
    "the other cat never voices the reconcile — initiator only",
  );
});
