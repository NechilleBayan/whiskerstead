// Bubble line tables — 03-content-tables §Bubble Content Guidelines.
// Voice: short, lowercase-casual, personality-flavored. Duplicate suppression:
// same line ≤ once per several game days (LINE_SUPPRESS_MS), tracked per cat.
// Expand these tables from playtest gaps — data only, no code changes needed.

import { selectLine } from "../sim/dialogue/select.ts";
import type { Rng } from "../sim/rng.ts";
import type { CatState, PersonalityId } from "../sim/types.ts";

type LineTable = Partial<Record<PersonalityId | "any", string[]>>;

export const LINES: Record<string, LineTable> = {
  greeting: {
    any: ["hey", "oh. hi", "nice day for it", "you again!", "mrow"],
    planner: ["you're late", "i had this hour planned differently"],
    chaos: ["GUESS WHAT", "watch this", "i did a thing"],
    optimist: ["today feels lucky!", "good to see you!!"],
    cynic: ["what now", "this won't end well", "hm."],
    cryptic: ["you were expected", "…it's almost time"],
  },
  fish_catch: {
    any: ["got one!", "dinner!", "look at this one"],
    optimist: ["knew it!!", "the pond loves me"],
    cynic: ["huh. one actually bit", "probably poisoned"],
    chaos: ["FISH!!!", "caught it with my EYES CLOSED"],
    cryptic: ["the pond offered this one willingly"],
    planner: ["right on schedule"],
  },
  fish_miss: {
    any: ["nothing today…", "it was huge.", "so close", "the water's laughing at me"],
    cynic: ["of course.", "typical"],
    optimist: ["next cast for sure!"],
    chaos: ["the fish CHEATED"],
    cryptic: ["it wasn't meant to be caught"],
    planner: ["recalculating…"],
  },
  eat_good: {
    any: ["so good", "mm.", "needed that", "warm ♥"],
    optimist: ["best soup ever!!"],
    cynic: ["…fine. it's good. whatever"],
  },
  eat_bad: {
    any: ["ew", "what IS this", "…i've had worse. barely", "did something die in this"],
    planner: ["this violates several standards"],
    optimist: ["it's… made with love?"],
  },
  cook_done: {
    any: ["soup's on!", "come get it", "fresh pot!"],
    planner: ["ration queue forms LEFT"],
    chaos: ["i made a THING. it might be soup"],
  },
  sleep: {
    any: ["time to rest…", "so sleepy", "just five minutes"],
    cryptic: ["the dreams are waiting"],
    chaos: ["sleep is a scam. anyway goodnight"],
  },
  build: {
    any: ["needs more nails", "almost home", "this wall is fine. probably", "hammer time"],
    planner: ["measure twice. cut once. perfect"],
    chaos: ["walls are a suggestion"],
    cynic: ["it'll fall down. building it anyway"],
  },
  gossip_open: {
    any: ["did you hear…", "don't tell anyone but", "so about {who}…", "psst"],
    cynic: ["called it. {who}, i mean"],
    optimist: ["i'm sure {who} didn't mean it…"],
  },
  steal_success: {
    any: ["mine now", "borrowing this forever", "they weren't using it"],
    chaos: ["heist complete"],
  },
  steal_caught: {
    any: ["I CAN EXPLAIN", "this isn't what it looks like", "…hi"],
  },
  beg: {
    any: ["spare a bite?", "i'm SO hungry", "please. anything"],
    optimist: ["you're the generous type, right?"],
  },
  beg_refused: {
    any: ["fine. FINE.", "i'll remember this"],
  },
  rain: {
    any: ["wet.", "my fur…", "to the fire"],
    chaos: ["PUDDLES!!"],
    optimist: ["the plants needed this!"],
  },
  storm_fear: {
    any: ["nope nope nope", "hiding now", "the sky is ANGRY"],
  },
  argue: {
    any: ["you always do this", "take it back", "hmph.", "unbelievable"],
    planner: ["this is why nothing works around here"],
    cynic: ["i knew you'd say that"],
  },
  cult_visit: {
    any: ["…don't ring the fourth bell.", "it hums. do you hear it", "the shape knows"],
  },
  cult_recruit: {
    any: ["you should see what i found.", "there's… something you need to witness", "it chose us"],
  },
  rescue: {
    any: ["hold on!", "i've got you", "someone help!!"],
  },
  recovered: {
    any: ["…thanks", "i owe you", "never speak of this"],
  },
  oust_campaign: {
    any: ["the soup situation is a PROBLEM", "we need to talk about the cook", "how many bad pots is too many"],
  },
  confront_apology: {
    any: ["i'll do better. new recipes. i promise", "you're right. i'm sorry"],
  },
  confront_quit: {
    any: ["FINE. cook it yourselves", "may your soup be forever lukewarm"],
  },
  confront_defended: {
    any: ["the soup is terrible but they're TRYING", "back off. everyone has bad pots"],
  },
  chase: {
    any: ["butterfly!!", "COME BACK", "almost had it"],
  },
  pond_accident: {
    any: ["HELP", "glub—", "cold cold COLD"],
  },
  comfort: {
    any: ["it's okay", "i'm here", "breathe. slowly", "rough day, huh"],
    optimist: ["tomorrow will be better. promise"],
    cryptic: ["this too was foreseen. it passes"],
  },
  scavenge: {
    any: ["finders keepers", "ooh, shiny", "someone dropped this. tragic"],
    cynic: ["one cat's shrine is another's supply cache"],
  },
  cookoff: {
    any: ["may the best pot win", "taste test. RIGHT NOW", "MY LADLE. MY RULES."],
  },
  chop: {
    any: ["timber!!", "sorry, tree", "good wood, this", "one more swing"],
    planner: ["sustainable forestry. probably"],
    chaos: ["TREE. DOWN."],
    cynic: ["it'll grow back. they always do"],
    optimist: ["thanks, tree!"],
    cryptic: ["the grove permits it"],
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
