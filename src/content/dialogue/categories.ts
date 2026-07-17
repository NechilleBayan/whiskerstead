// M2 ambient dialogue categories — gates + weights (06-dialogue spec, M2).
// Each gate is a PURE truth check over real state: rain lines require rain,
// grumbles require the actually-low need, campfire talk requires a lit fire
// and awake company, sleep_talk requires mid-sleep. Weights come from
// AMBIENT_WEIGHTS in tuning; the subscriber rolls weighted-random among the
// gate-passing categories — roll, don't max. Personality never appears here:
// personality is a flavor pool inside the line tables, never a gate.

import { AMBIENT_WEIGHTS, DIALOGUE, THEFT } from "../../config/tuning.ts";
import { nearbyCats } from "../../sim/dialogue/context.ts";
import { distance } from "../../sim/perception.ts";
import type { Building, CatState, WorldState } from "../../sim/types.ts";

export type AmbientGate = (cat: CatState, world: WorldState) => boolean;

function near(cat: CatState, world: WorldState, type: string): Building | undefined {
  return world.buildings.find((b) => b.type === type && distance(cat.pos, b.pos) <= DIALOGUE.nearRadiusU);
}

function litFireNearby(cat: CatState, world: WorldState): boolean {
  const fire = near(cat, world, "bonfire");
  return !!fire && (fire.state?.lit as number) === 1;
}

/** Awake company: nearbyCats() includes collapsed cats (highly reactable), but
 *  collapsed neighbors are not chatter partners — filter them out here. */
function company(cat: CatState, world: WorldState): CatState[] {
  return nearbyCats(cat, world, DIALOGUE.nearRadiusU).filter((c) => c.stage !== "collapsed");
}

const pref = (cat: CatState, key: string): number => cat.identity.preferences[key] ?? 0;

export const GATES: Record<string, AmbientGate> = {
  // idling with nothing urgent: every need sits above its grumble band
  idle_thought: (cat) =>
    cat.needs.hunger >= THEFT.begBelow &&
    cat.needs.energy >= DIALOGUE.grumbleBelow &&
    cat.needs.social >= DIALOGUE.grumbleBelow &&
    cat.needs.comfort >= DIALOGUE.grumbleBelow &&
    cat.needs.curiosity >= DIALOGUE.grumbleBelow,
  philosophical: (cat, world) => world.phase === "night" || litFireNearby(cat, world),
  // night-observing musings must never fire in daylight (the fire is lit
  // most evenings) — strict phase gate, unlike the broader category above
  philosophical_night: (_cat, world) => world.phase === "night",
  nonsense: () => true,
  // likes/dislikes: preference AND the matching present context, both required
  like_rain: (cat, world) => world.weather === "rain" && pref(cat, "rain") > 0,
  dislike_rain: (cat, world) =>
    (world.weather === "rain" && pref(cat, "rain") < 0) ||
    (world.weather === "storm" && pref(cat, "storms") < 0),
  like_library: (cat, world) => pref(cat, "libraries") > 0 && !!near(cat, world, "library"),
  like_pond: (cat, world) => pref(cat, "ponds") > 0 && !!near(cat, world, "pond"),
  like_fire: (cat, world) => pref(cat, "campfires") > 0 && litFireNearby(cat, world),
  dislike_crowds: (cat, world) => pref(cat, "crowds") < 0 && company(cat, world).length >= DIALOGUE.crowdMin,
  like_solitude: (cat, world) => pref(cat, "solitude") > 0 && company(cat, world).length === 0,
  time_dawn: (_cat, world) => world.phase === "dawn",
  time_morning: (_cat, world) => world.phase === "morning",
  time_afternoon: (_cat, world) => world.phase === "afternoon",
  time_sunset: (_cat, world) => world.phase === "sunset",
  time_night: (_cat, world) => world.phase === "night",
  weather_ambient: (_cat, world) => world.weather !== "clear",
  memory_musing: (cat) => cat.memory.some((m) => Math.abs(m.charge) >= DIALOGUE.memoryChargeMin),
  // grumbles gate on the ACTUAL low need — a fed cat never grumbles hunger
  need_hunger: (cat) => cat.needs.hunger < THEFT.begBelow,
  need_energy: (cat) => cat.needs.energy < DIALOGUE.grumbleBelow,
  need_social: (cat) => cat.needs.social < DIALOGUE.grumbleBelow,
  need_comfort: (cat) => cat.needs.comfort < DIALOGUE.grumbleBelow,
  need_curiosity: (cat) => cat.needs.curiosity < DIALOGUE.grumbleBelow,
  campfire_talk: (cat, world) => litFireNearby(cat, world) && company(cat, world).length >= 1,
  // mid-sleep only; the ambient subscriber additionally restricts a sleeping
  // cat's roll to this single category (at its own lower chance)
  sleep_talk: (cat) => cat.action?.id === "sleep" && cat.action.phase === "perform",
};

export interface AmbientCategory {
  id: string;
  weight: number;
  gate: AmbientGate;
}

export const AMBIENT_CATEGORIES: AmbientCategory[] = Object.entries(GATES).map(([id, gate]) => ({
  id,
  weight: AMBIENT_WEIGHTS[id] ?? 1,
  gate,
}));
