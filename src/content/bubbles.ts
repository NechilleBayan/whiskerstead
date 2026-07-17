// Bubble line tables — 03-content-tables §Bubble Content Guidelines.
// Voice: short, lowercase-casual, personality-flavored. Duplicate suppression:
// same line ≤ once per several game days (LINE_SUPPRESS_MS), tracked per cat.
// Expand these tables from playtest gaps — data only, no code changes needed.

import { selectLine } from "../sim/dialogue/select.ts";
import type { Rng } from "../sim/rng.ts";
import type { CatState, PersonalityId } from "../sim/types.ts";

export type LineTable = Partial<Record<PersonalityId | "any", string[]>>;

export const LINES: Record<string, LineTable> = {
  greeting: {
    any: ["hey", "oh. hi", "nice day for it", "you again!", "mrow"],
    planner: ["you're late", "i had this hour planned differently"],
    chaos: ["GUESS WHAT", "watch this", "i did a thing"],
    optimist: ["today feels lucky!", "good to see you!!"],
    cynic: ["what now", "this won't end well", "hm."],
    cryptic: ["you were expected", "…it's almost time"],
  },
  sleep: {
    any: ["time to rest…", "so sleepy", "just five minutes"],
    cryptic: ["the dreams are waiting"],
    chaos: ["sleep is a scam. anyway goodnight"],
  },
  steal_caught: {
    any: ["I CAN EXPLAIN", "this isn't what it looks like", "…hi"],
  },
  rain: {
    any: ["wet.", "my fur…", "to the fire"],
    chaos: ["PUDDLES!!"],
    optimist: ["the plants needed this!"],
  },
  storm_fear: {
    any: ["nope nope nope", "hiding now", "the sky is ANGRY"],
  },
  rescue: {
    any: ["hold on!", "i've got you", "someone help!!"],
  },
  recovered: {
    any: ["…thanks", "i owe you", "never speak of this"],
  },
  chase: {
    any: ["butterfly!!", "COME BACK", "almost had it"],
  },
  pond_accident: {
    any: ["HELP", "glub—", "cold cold COLD"],
  },
};

/** Pick a line for a cat, honoring per-cat duplicate suppression. Thin adapter
 *  over the pure selector in sim/dialogue — no history commit here; speak()
 *  commits only when the bubble actually shows (06-dialogue §3). Returns
 *  undefined if every candidate was used too recently (silence is fine). */
export function pickLine(
  cat: CatState,
  category: string,
  now: number,
  rng: Rng,
  fill?: Record<string, string>,
): string | undefined {
  return selectLine(cat, category, now, rng, fill)?.text;
}
