// M3 dialogue tone-weighting tests — 08-dialogue-m3-spec:
// per-personality tone-band lean (roll, don't max — every band reachable),
// near-death grim-humor damper, the campfire ambient fix (seated bonfire
// perform → campfire_talk only), plus determinism / save round-trip guards.
// Statistical tests drive selectLine directly with a fresh Rng and a fixed
// `now` + empty lineHistory, so the full pool is always available and no state
// is written (selectLine is side-effect-free).

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { selectLine } from "../src/sim/dialogue/select.ts";
import { Rng } from "../src/sim/rng.ts";
import { LINES } from "../src/content/bubbles.ts";
import { TONED_LINES, TONES, type Tone } from "../src/content/dialogue/lines.ts";
import { AMBIENT_CATEGORIES } from "../src/content/dialogue/categories.ts";
import { DAY_MS, DIALOGUE, LINE_SUPPRESS_MS, TONE_WEIGHTS } from "../src/config/tuning.ts";
import type { CatState, PersonalityId } from "../src/sim/types.ts";

const PERSONALITIES: PersonalityId[] = ["planner", "chaos", "optimist", "cynic", "cryptic"];

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

/** Map each authored line of a toned category to its tone band (lines are
 *  globally unique per the M2 audit, so the mapping is unambiguous). */
function bandOf(category: string): Map<string, Tone> {
  const m = new Map<string, Tone>();
  const tones = TONED_LINES[category];
  if (!tones) return m;
  for (const tone of TONES) {
    for (const pool of Object.values(tones[tone] ?? {})) for (const line of pool) m.set(line, tone);
  }
  return m;
}

test("determinism: 2-day normalized transcript is identical for the same seed", () => {
  const transcript = (seed: number) => {
    const sim = new Simulation(createWorld(seed));
    const out: string[] = [];
    sim.bus.on("*", (e) => out.push(JSON.stringify(e).replace(/item-([a-z]+)-\d+/g, "item-$1-#")));
    for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200);
    return out;
  };
  const a = transcript(77);
  assert.deepEqual(a, transcript(77), "same-seed event streams match under tone-weighted selection");
  assert.ok(a.some((e) => e.includes('"ambient-window"')), "ambient windows appear in the stream");
});

test("save round-trip stays byte-exact after a day of tone-weighted dialogue", () => {
  const sim = new Simulation(createWorld(78));
  for (let t = 0; t < DAY_MS; t += 200) sim.tick(200);
  const snapshot = sim.save();
  const restored = Simulation.load(snapshot);
  assert.equal(restored.save(), snapshot, "reloaded world re-serializes byte-for-byte");
});

test("no-sort reachable: a heavily disfavored band still surfaces; the favored band leads", () => {
  const sim = new Simulation(createWorld(3));
  const cat = sim.world.cats[0];
  cat.identity.personality = "optimist"; // dark = 0.25, the weakest cell
  cat.lineHistory = {};
  cat.stage = "stable";
  const bands = bandOf("campfire_talk");
  const rng = new Rng(12345);
  const now = 1_000_000;
  const tally: Record<Tone, number> = { normal: 0, dry: 0, unhinged: 0, dark: 0 };
  for (let i = 0; i < 4000; i++) {
    const pick = selectLine(cat, "campfire_talk", now, rng);
    assert.ok(pick, "a line is always available with empty history and fixed now");
    const band = bands.get(pick!.text);
    assert.ok(band, `returned text maps to an authored band: "${pick!.text}"`);
    tally[band!]++;
  }
  assert.ok(tally.dark >= 1, `disfavored optimist-dark stays reachable (saw ${tally.dark})`);
  assert.ok(tally.normal > tally.dark, `favored normal leads (${tally.normal} vs dark ${tally.dark})`);
  // side-effect-free contract: selection never touched cat state
  assert.deepEqual(cat.lineHistory, {}, "selectLine leaves lineHistory untouched");
});

test("near-death urgency down-weights the grim bands but never zeroes them", () => {
  const sim = new Simulation(createWorld(4));
  const cat = sim.world.cats[0];
  cat.identity.personality = "chaos"; // leans unhinged (1.7): a meaningful grim share
  cat.lineHistory = {};
  const bands = bandOf("campfire_talk");
  const now = 2_000_000;
  const grimFraction = (stage: CatState["stage"]): number => {
    cat.stage = stage;
    const rng = new Rng(999); // same stream for both stages → apples to apples
    let grim = 0;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const band = bands.get(selectLine(cat, "campfire_talk", now, rng)!.text)!;
      if (band === "unhinged" || band === "dark") grim++;
    }
    return grim / N;
  };
  const stable = grimFraction("stable");
  const critical = grimFraction("critical");
  assert.ok(critical < stable, `critical grim share strictly lower (${critical.toFixed(3)} < ${stable.toFixed(3)})`);
  assert.ok(critical > 0, "grim humor stays reachable near death (soft ×0.2 damper, not a filter)");
});

test("TONE_WEIGHTS audit: all 20 cells are at or above the tone floor (never zeroed)", () => {
  let cells = 0;
  for (const p of PERSONALITIES) {
    for (const tone of TONES) {
      const w = TONE_WEIGHTS[p]?.[tone];
      assert.equal(typeof w, "number", `${p}.${tone} is defined`);
      assert.ok(w! >= DIALOGUE.toneFloor, `${p}.${tone}=${w} >= toneFloor ${DIALOGUE.toneFloor}`);
      assert.ok(w! > 0, `${p}.${tone} is strictly positive`);
      cells++;
    }
  }
  assert.equal(cells, 20, "5 personalities x 4 tones audited");
});

test("campfire fix: a seated cat at a lit, peopled fire talks campfire_talk and nothing else", () => {
  // Emit carve-out: a bonfire perform emits an ambient window (other performs
  // stay suppressed — tested separately). One controlled tick proves it.
  const emitSim = new Simulation(createWorld(555));
  const seated = emitSim.world.cats[0];
  for (const k of Object.keys(seated.needs)) seated.needs[k as keyof typeof seated.needs] = 1;
  seated.condition = 1;
  seated.stage = "stable";
  seated.action = { id: "bonfire", phase: "perform", startedAt: emitSim.world.time, duration: 10 * DAY_MS };
  seated.lastAmbientAt = -1e9; // long overdue
  let windowFired = false;
  emitSim.bus.on("ambient-window", (e) => {
    if (e.type === "ambient-window" && e.cat === seated.id) windowFired = true;
  });
  emitSim.tick(200);
  assert.ok(windowFired, "a bonfire perform emits an ambient window (M3 carve-out)");

  // Subscriber routing: pin the scenario and drive windows directly so nothing
  // moves — only campfire_talk may be produced.
  const sim = new Simulation(createWorld(2024));
  const names = sim.world.cats.map((c) => c.identity.name);
  const campfireTexts = textsOf("campfire_talk", names);
  const otherAmbient = new Set<string>();
  for (const c of AMBIENT_CATEGORIES) {
    if (c.id === "campfire_talk") continue;
    for (const t of textsOf(c.id, names)) otherAmbient.add(t);
  }
  const cat = sim.world.cats[0];
  const fire = sim.world.buildings.find((b) => b.type === "bonfire")!;
  fire.state!.lit = 1;
  cat.pos = { ...fire.pos };
  cat.stage = "stable";
  const mate = sim.world.cats[1];
  mate.pos = { x: fire.pos.x + 10, y: fire.pos.y };
  mate.stage = "stable";
  mate.action = undefined;
  for (const c of sim.world.cats.slice(2)) c.pos = { x: -5000, y: -5000 };

  const thoughts: string[] = [];
  sim.bus.on("bubble", (e) => {
    if (e.type === "bubble" && e.cat === cat.id && e.kind === "thought" && e.text) thoughts.push(e.text);
  });
  for (let i = 0; i < 400; i++) {
    // advance past the suppression window and clear the on-screen bubble cap so
    // every 0.5-chance success can produce a fresh line; re-pin the perform.
    sim.world.bubbles.length = 0;
    sim.world.time += LINE_SUPPRESS_MS + 1000;
    sim.bus.setClock(sim.world.time);
    cat.action = { id: "bonfire", phase: "perform", startedAt: sim.world.time, duration: 10 * DAY_MS };
    sim.bus.emit({ type: "ambient-window", cat: cat.id });
  }
  assert.ok(thoughts.length > 0, "the seated cat eventually makes campfire talk");
  for (const t of thoughts) {
    assert.ok(campfireTexts.has(t), `only campfire_talk mid-perform, got "${t}"`);
    assert.ok(!otherAmbient.has(t), `no non-campfire ambient category fires mid-perform: "${t}"`);
  }
});

test("other performs (fishing) still suppress the ambient window", () => {
  const sim = new Simulation(createWorld(556));
  const c = sim.world.cats[0];
  for (const k of Object.keys(c.needs)) c.needs[k as keyof typeof c.needs] = 1;
  c.condition = 1;
  c.stage = "stable";
  c.lastAmbientAt = -1e9; // overdue — only the perform suppression should hold it back
  let windowFired = false;
  sim.bus.on("ambient-window", (e) => {
    if (e.type === "ambient-window" && e.cat === c.id) windowFired = true;
  });
  for (let i = 0; i < 60; i++) {
    c.action = { id: "fish", phase: "perform", startedAt: sim.world.time, duration: 10 * DAY_MS };
    sim.tick(200);
  }
  assert.ok(!windowFired, "a fishing perform emits no ambient window");
});

test("flat LINES (storm_fear) stay uniform — no tone weighting applied", () => {
  const sim = new Simulation(createWorld(8));
  const cat = sim.world.cats[0];
  cat.identity.personality = "cryptic"; // personality must not skew a flat category
  cat.lineHistory = {};
  const lines = LINES.storm_fear.any!;
  const tally: Record<string, number> = {};
  for (const l of lines) tally[l] = 0;
  const rng = new Rng(42);
  const now = 500_000;
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const pick = selectLine(cat, "storm_fear", now, rng)!;
    assert.ok(pick.text in tally, `storm_fear returns an authored flat line, got "${pick.text}"`);
    tally[pick.text]++;
  }
  const expected = N / lines.length;
  for (const l of lines) {
    assert.ok(tally[l] > 0, `flat line reached: "${l}"`);
    assert.ok(Math.abs(tally[l] - expected) < expected * 0.15, `"${l}" ~uniform (${tally[l]} vs ~${expected})`);
  }
});

test("campfire cadence: bonfire sits now catch ambient windows (mechanism)", () => {
  // Problem 3b: a ~9s bonfire sit almost never caught a 150s ambient window
  // (~1/3days observed), so campfire_talk was effectively dead. The short
  // campfire cadence is what M3 fixes — windows now land DURING sits many times
  // per run. This is the robust, seed-independent guard on the fix itself.
  // (Whether a landed window becomes a campfire_talk BUBBLE is gate-emergent —
  // it needs a lit fire + awake company — and gets frequent in M4 when cats
  // gather at the fire; the aggregate test below covers that it fires at all.)
  const sim = new Simulation(createWorld(42));
  let duringBonfire = 0;
  sim.bus.on("ambient-window", (e) => {
    if (e.type !== "ambient-window") return;
    const c = sim.world.cats.find((x) => x.id === e.cat);
    if (c && c.action?.id === "bonfire" && c.action.phase === "perform") duringBonfire++;
  });
  for (let t = 0; t < 3 * DAY_MS; t += 200) sim.tick(200);
  assert.ok(duringBonfire >= 10, `campfire cadence lands windows during sits (saw ${duringBonfire}, pre-fix ~1)`);
});

test("campfire_talk fires organically in aggregate across seeds", () => {
  // End-to-end: over several 3-day runs, a lit, peopled fire produces campfire
  // lines with no scripting. Per-seed counts are small and some seeds see none
  // (gathering is emergent — M4 strengthens it), so the honest assertion is that
  // it fires at all across a spread of seeds. Deterministic (seeded rng).
  let total = 0;
  for (const seed of [77, 123, 100, 333, 11, 5]) {
    const sim = new Simulation(createWorld(seed));
    const campfireTexts = textsOf("campfire_talk", sim.world.cats.map((c) => c.identity.name));
    sim.bus.on("bubble", (e) => {
      if (e.type === "bubble" && e.kind === "thought" && campfireTexts.has(e.text)) total++;
    });
    for (let t = 0; t < 3 * DAY_MS; t += 200) sim.tick(200);
  }
  assert.ok(total > 0, `campfire_talk fires organically across seeds (saw ${total})`);
});

test("silence stays the common outcome across a 2-day run", () => {
  const sim = new Simulation(createWorld(1337));
  const names = sim.world.cats.map((c) => c.identity.name);
  const ambientTexts = new Set<string>();
  for (const c of AMBIENT_CATEGORIES) for (const t of textsOf(c.id, names)) ambientTexts.add(t);
  let windows = 0;
  let spoken = 0;
  sim.bus.on("*", (e) => {
    if (e.type === "ambient-window") windows++;
    if (e.type === "bubble" && e.kind === "thought" && ambientTexts.has(e.text)) spoken++;
  });
  for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200); // weather stays clear
  assert.ok(windows > 0, "windows fired");
  assert.ok(spoken > 0, "some windows produced ambient thoughts");
  assert.ok(spoken < windows / 2, `silence is the common outcome (${spoken}/${windows})`);
});
