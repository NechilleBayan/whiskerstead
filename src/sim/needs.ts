// Needs & derived health — spec §3. Needs decay over time; health is derived,
// never a sixth need, and never self-drains — it only moves when something
// happens, and it's floored (no permanent death, spec §9).

import { HEALTH, NEED_DECAY_PER_DAY, NEED_IDS, DAY_MS, type NeedId } from "../config/tuning.ts";
import type { CatState } from "./types.ts";

/** Apply decay accumulated over `dtMs` of sim time. Social decays only when a
 *  valid target exists (passed in), per spec "social sits dormant". */
export function decayNeeds(cat: CatState, dtMs: number, hasSocialTarget: boolean): void {
  const days = dtMs / DAY_MS;
  for (const n of NEED_IDS) {
    if (n === "social" && !hasSocialTarget) continue;
    const rate = NEED_DECAY_PER_DAY[n];
    // Fatigue makes work costlier: low condition steepens decay slightly.
    const conditionPenalty = cat.condition < HEALTH.strainedBelow ? 1.25 : 1.0;
    cat.needs[n] = clamp01(cat.needs[n] - rate * days * conditionPenalty);
  }
}

/** urgency 0..1 for a need (1 = desperate). */
export function urgency(cat: CatState, need: NeedId): number {
  return 1 - cat.needs[need];
}

/** Recompute derived health stage from condition. Condition itself is changed
 *  by events (eat, sleep, accident) — this only classifies it and floors it. */
export function updateHealthStage(cat: CatState): string {
  cat.condition = Math.max(HEALTH.criticalFloor, Math.min(1, cat.condition));
  let stage: CatState["stage"];
  if (cat.stage === "collapsed") {
    stage = "collapsed"; // only rescue/recovery lifts this, handled elsewhere
  } else if (cat.condition <= HEALTH.criticalBelow) {
    stage = "critical";
  } else if (cat.condition <= HEALTH.strainedBelow) {
    stage = "strained";
  } else {
    stage = "stable";
  }
  cat.stage = stage;
  return stage;
}

/** Feed the cat: restore hunger and a little condition. */
export function feed(cat: CatState, amount: number): void {
  cat.needs.hunger = clamp01(cat.needs.hunger + amount);
  cat.condition = Math.min(1, cat.condition + amount * 0.15);
}

/** Rest: restore energy and condition. */
export function rest(cat: CatState, amount: number): void {
  cat.needs.energy = clamp01(cat.needs.energy + amount);
  cat.condition = Math.min(1, cat.condition + amount * 0.2);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
