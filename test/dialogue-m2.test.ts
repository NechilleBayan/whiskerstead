// M2 dialogue content-wave tests — 06-dialogue-integration-spec (M2):
// authored-line audit (length, uniqueness), gate truth, ambient subscriber
// volume (silence is the common outcome), event hookups (weather reactions,
// relationship milestones), determinism, and save round-trip.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/sim/simulation.ts";
import { createWorld } from "../src/sim/world.ts";
import { nudgeRel } from "../src/sim/relationships.ts";
import { LINES } from "../src/content/bubbles.ts";
import { TONED_LINES, TONES } from "../src/content/dialogue/lines.ts";
import { AMBIENT_CATEGORIES, GATES } from "../src/content/dialogue/categories.ts";
import { BUBBLE, DAY_MS, DIALOGUE, THEFT } from "../src/config/tuning.ts";
import type { GameEvent } from "../src/sim/events.ts";
import type { NeedId } from "../src/config/tuning.ts";

/** All texts a category can produce, with {who} filled for every cat name. */
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

test("every authored line is non-empty, within the char cap, and globally unique", () => {
  const seen = new Map<string, string>(); // text -> origin (legacy LINES included)
  for (const [cat, table] of Object.entries(LINES))
    for (const pool of Object.values(table)) for (const line of pool) seen.set(line, `legacy:${cat}`);
  let total = 0;
  for (const [category, tones] of Object.entries(TONED_LINES)) {
    let count = 0;
    for (const tone of TONES) {
      const t = tones[tone];
      if (!t) continue;
      for (const [pkey, pool] of Object.entries(t)) {
        assert.ok(pool.length > 0, `${category}.${tone}.${pkey} has lines`);
        for (const line of pool) {
          count++;
          assert.ok(line.length > 0, `${category}.${tone}.${pkey}: empty line`);
          assert.ok(line.length <= BUBBLE.maxChars, `${category}: "${line}" is ${line.length} chars (cap ${BUBBLE.maxChars})`);
          assert.ok(!seen.has(line), `duplicate line "${line}" in ${category} and ${seen.get(line)}`);
          seen.set(line, category);
        }
      }
    }
    assert.ok(count >= 4, `${category} has a real pool (saw ${count})`);
    total += count;
  }
  assert.ok(total >= 400, `content wave landed (${total} lines)`);
  // every ambient category has lines and a positive weight
  for (const c of AMBIENT_CATEGORIES) {
    assert.ok(TONED_LINES[c.id], `lines exist for ambient category ${c.id}`);
    assert.ok(c.weight > 0, `${c.id} has a positive weight`);
  }
  // every event-driven category has lines too
  for (const id of [
    "repeat_fish", "repeat_chop", "repeat_gather", "dream_report",
    "weather_to_rain", "weather_to_storm", "weather_to_clear",
    "friend_milestone", "crush_milestone", "rival_milestone",
  ]) assert.ok(TONED_LINES[id], `lines exist for event category ${id}`);
});

test("gates enforce truth: grumbles, weather, sleep, campfire, likes, time", () => {
  const world = createWorld(101);
  const cat = world.cats[0];

  // all needs high → no grumble is eligible; one low → only that grumble
  for (const n of Object.keys(cat.needs) as NeedId[]) cat.needs[n] = 1;
  const grumbles = ["need_hunger", "need_energy", "need_social", "need_comfort", "need_curiosity"];
  for (const id of grumbles) assert.equal(GATES[id](cat, world), false, `${id} blocked when all needs are high`);
  cat.needs.hunger = THEFT.begBelow - 0.05;
  assert.equal(GATES.need_hunger(cat, world), true, "actual low hunger unlocks the grumble");
  assert.equal(GATES.need_energy(cat, world), false, "other grumbles stay shut");
  assert.equal(GATES.idle_thought(cat, world), false, "idle_thought requires no urgent need");
  cat.needs.hunger = 1;
  assert.equal(GATES.idle_thought(cat, world), true);

  // weather_ambient never eligible in clear weather
  assert.equal(world.weather, "clear");
  assert.equal(GATES.weather_ambient(cat, world), false, "no wet mutters under a clear sky");
  world.weather = "rain";
  assert.equal(GATES.weather_ambient(cat, world), true);
  // likes need preference AND context
  cat.identity.preferences.rain = 0.5;
  assert.equal(GATES.like_rain(cat, world), true);
  cat.identity.preferences.rain = -0.5;
  assert.equal(GATES.like_rain(cat, world), false, "rain-hater never speaks rain-lover lines");
  assert.equal(GATES.dislike_rain(cat, world), true);
  world.weather = "clear";
  assert.equal(GATES.dislike_rain(cat, world), false, "no rain grump in clear skies");

  // sleep_talk only while actually sleeping (perform phase)
  assert.equal(GATES.sleep_talk(cat, world), false, "idle cat can't sleep-talk");
  cat.action = { id: "sleep", phase: "goto", startedAt: 0, duration: 1000 };
  assert.equal(GATES.sleep_talk(cat, world), false, "walking home is not sleeping");
  cat.action.phase = "perform";
  assert.equal(GATES.sleep_talk(cat, world), true);
  cat.action = undefined;

  // campfire_talk requires a LIT fire and awake (non-collapsed) company
  const fire = world.buildings.find((b) => b.type === "bonfire")!;
  cat.pos = { ...fire.pos };
  const other = world.cats[1];
  other.pos = { x: fire.pos.x + 10, y: fire.pos.y };
  for (const c of world.cats.slice(2)) c.pos = { x: 0, y: 0 }; // far corner
  fire.state!.lit = 0;
  assert.equal(GATES.campfire_talk(cat, world), false, "unlit fire, no fire talk");
  fire.state!.lit = 1;
  assert.equal(GATES.campfire_talk(cat, world), true);
  other.stage = "collapsed";
  assert.equal(GATES.campfire_talk(cat, world), false, "collapsed company doesn't count");
  other.stage = "stable";

  // time gates match the current phase exactly
  const phases = ["dawn", "morning", "afternoon", "sunset", "night"];
  for (const phase of phases) {
    world.phase = phase;
    for (const p of phases) assert.equal(GATES[`time_${p}`](cat, world), p === phase, `time_${p} in ${phase}`);
  }
});

test("ambient windows speak on a minority of windows; weather reactions need a change", () => {
  const sim = new Simulation(createWorld(1337));
  const names = sim.world.cats.map((c) => c.identity.name);
  const ambientTexts = new Set<string>();
  for (const c of AMBIENT_CATEGORIES) for (const t of textsOf(c.id, names)) ambientTexts.add(t);
  const reactTexts = new Set<string>();
  for (const id of ["weather_to_rain", "weather_to_storm", "weather_to_clear"])
    for (const t of textsOf(id, names)) reactTexts.add(t);

  let windows = 0;
  let spoken = 0;
  sim.bus.on("*", (e) => {
    if (e.type === "ambient-window") windows++;
    if (e.type === "bubble") {
      if (e.kind === "thought" && ambientTexts.has(e.text)) spoken++;
      assert.ok(!reactTexts.has(e.text), "no weather_react line without a weather-changed event");
    }
  });
  for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200); // weather stays clear all run
  assert.ok(windows > 0, "windows fired");
  assert.ok(spoken > 0, "some windows produced ambient thoughts");
  assert.ok(spoken < windows / 2, `silence is the common outcome (${spoken}/${windows})`);
});

test("no ambient speech from collapsed cats", () => {
  const sim = new Simulation(createWorld(7));
  const c0 = sim.world.cats[0];
  c0.stage = "collapsed";
  c0.action = undefined;
  c0.lastAmbientAt = -1e9; // long overdue
  const events: GameEvent[] = [];
  sim.bus.on("*", (e) => events.push(e));
  for (let t = 0; t < 5000; t += 200) sim.tick(200);
  assert.ok(!events.some((e) => e.type === "ambient-window" && e.cat === c0.id), "no window while collapsed");
  assert.ok(
    !events.some((e) => e.type === "bubble" && e.cat === c0.id && e.kind === "thought" && e.text !== ""),
    "no ambient thoughts while collapsed",
  );
});

test("weather_react fires on the change event, capped below a chorus", () => {
  const sim = new Simulation(createWorld(1337));
  const names = sim.world.cats.map((c) => c.identity.name);
  const rainTexts = textsOf("weather_to_rain", names);
  const speakers = new Set<string>();
  sim.bus.on("bubble", (e) => {
    if (e.type === "bubble" && rainTexts.has(e.text)) speakers.add(e.cat);
  });
  // change the weather before any tick — cats haven't burned their chatter
  // cooldown on intent bubbles yet, so the reaction odds are clean
  sim.weather("rain");
  assert.ok(speakers.size >= 1, "someone reacted to the rain");
  assert.ok(speakers.size <= DIALOGUE.weatherReactMax, "never more than the reaction cap");
});

test("friend/crush/rival milestone lines fire on band crossings, spoken by cat a", () => {
  const sim = new Simulation(createWorld(9));
  const [a, b] = sim.world.cats;
  const names = sim.world.cats.map((c) => c.identity.name);
  const pools = {
    friend: textsOf("friend_milestone", names),
    crush: textsOf("crush_milestone", names),
    rival: textsOf("rival_milestone", names),
  };
  const bubbles: string[] = [];
  sim.bus.on("bubble", (e) => {
    if (e.type === "bubble" && e.cat === a.id && e.kind === "speech") bubbles.push(e.text);
  });
  const emit = (ev: GameEvent) => sim.bus.emit(ev);
  nudgeRel(a, b.id, 0.5, emit); // neutral → friend
  assert.ok(bubbles.some((t) => pools.friend.has(t)), "friend line on crossing up to friend");
  nudgeRel(a, b.id, 0.3, emit); // friend → crush
  assert.ok(bubbles.some((t) => pools.crush.has(t)), "crush line on crossing up to crush");
  nudgeRel(a, b.id, -1.9, emit); // straight down to rival
  assert.ok(bubbles.some((t) => pools.rival.has(t)), "rival line on crossing down to rival");
});

test("determinism: 2-day same-seed FULL event transcript identity with M2 wiring live", () => {
  const transcript = (seed: number) => {
    const sim = new Simulation(createWorld(seed));
    const out: string[] = [];
    // normalize module-counter item ids, as in the M0/M1 suites
    sim.bus.on("*", (e) => out.push(JSON.stringify(e).replace(/item-([a-z]+)-\d+/g, "item-$1-#")));
    for (let t = 0; t < 2 * DAY_MS; t += 200) sim.tick(200);
    return out;
  };
  const a = transcript(60);
  assert.deepEqual(a, transcript(60), "full event streams match");
  assert.ok(a.some((e) => e.includes('"ambient-window"')), "ambient windows appear in the stream");
});

test("save round-trip stays exact with ambient dialogue in play", () => {
  const sim = new Simulation(createWorld(61));
  for (let t = 0; t < DAY_MS; t += 200) sim.tick(200);
  const snapshot = sim.save();
  const restored = Simulation.load(snapshot);
  assert.deepEqual(JSON.parse(restored.save()), JSON.parse(snapshot), "world serializes identically after load");
});
