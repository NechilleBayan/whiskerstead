// Scoring — spec §2. score = identity bias × need urgency × memory × time-of-day
// fit. Then ROLL, don't max (weighted random) so near-miss options fire.

import { URGENCY_EXPONENT, type NeedId } from "../config/tuning.ts";
import { actionBias } from "../content/personalities.ts";
import type { RollBreakdown } from "./events.ts";
import { timeFit } from "./time.ts";
import { urgency } from "./needs.ts";
import type { BaseEntity, CatState, WorldState } from "./types.ts";
import type { ActionDef } from "./actions/types.ts";

export interface Candidate {
  action: ActionDef;
  target?: BaseEntity;
  score: number;
  breakdown: RollBreakdown;
}

/** Memory multiplier for a target — accumulated charge shifts this place/cat's
 *  weight permanently (spec §10). Neutral = 1.0. */
export function memoryFactor(cat: CatState, target?: BaseEntity): number {
  if (!target) return 1;
  let sum = 0;
  for (const m of cat.memory) {
    if (m.subject === target.id || (target.kind === "building" && m.subject === (target as any).type)) {
      sum += m.charge;
    }
  }
  return Math.max(0.15, 1 + sum * 0.5);
}

/** Preference multiplier from the cat's weighted likes/dislikes. */
export function preferenceFactor(cat: CatState, keys: string[]): number {
  let f = 1;
  for (const k of keys) {
    const w = cat.identity.preferences[k];
    if (w != null) f *= 1 + w * 0.6;
  }
  return Math.max(0.1, f);
}

/** Urgency factor from the most-pressing need the action serves. */
function urgencyFactor(cat: CatState, needs: NeedId[]): number {
  if (needs.length === 0) return 1;
  let max = 0;
  for (const n of needs) max = Math.max(max, urgency(cat, n));
  return 0.25 + Math.pow(max, URGENCY_EXPONENT) * 2.5;
}

const OUTDOOR_ACTIONS = new Set(["fish", "gather", "explore", "wander", "build", "chase"]);

/** Weather is a scoring input (design spec §The World): cats shelter, the
 *  bonfire gathers crowds, and one idiot chases butterflies in the rain. */
export function weatherFit(cat: CatState, actionId: string, weather: string): number {
  if (weather === "clear") return 1;
  const likesRain = (cat.identity.preferences.rain ?? 0) + (cat.identity.preferences.getting_wet ?? 0);
  if (OUTDOOR_ACTIONS.has(actionId)) {
    let f = weather === "storm" ? 0.35 : 0.6;
    f *= 1 + Math.max(-0.5, likesRain) * 0.8; // rain-lovers barely care
    if (weather === "storm" && cat.identity.traits.includes("storm-fearing")) f *= 0.25;
    return Math.max(0.05, f);
  }
  if (actionId === "bonfire") return weather === "storm" ? 1.6 : 1.35; // rain refuge
  if (actionId === "read" || actionId === "sleep") return 1.2;
  return 1;
}

export function scoreCandidate(
  cat: CatState,
  world: WorldState,
  action: ActionDef,
  target: BaseEntity | undefined,
): Candidate {
  const appeal = action.appeal(cat, world, target); // base opportunity/preference
  const bias = actionBias(cat.identity.personality, action.id);
  const urg = urgencyFactor(cat, action.needs);
  const mem = memoryFactor(cat, target);
  const sched = cat.identity.scheduleCurve[world.phase] ?? 1;
  // Habitual anchors: this cat, this phase, this action — a routine pull.
  let anchor = 1;
  for (const a of cat.identity.anchors ?? []) {
    if (a.phase === world.phase && a.action === action.id) anchor = Math.max(anchor, a.boost);
  }
  const tf = timeFit(action.id, world.phase as any) * sched * anchor * weatherFit(cat, action.id, world.weather);

  const score = Math.max(0, appeal * bias * urg * mem * tf);
  return {
    action,
    target,
    score,
    breakdown: {
      action: action.id,
      target: target?.id,
      bias: round(bias * appeal),
      urgency: round(urg),
      memory: round(mem),
      timeFit: round(tf),
      score: round(score),
    },
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
