// Reconcile — 06-dialogue M4 §A. A cat walks over to a rival and tries to make
// up. A NEW ActionDef, so the decision loop (decide()) is untouched (CLAUDE.md
// rule 3). Reconciliation is purely ADDITIVE (rule 5): on success the drift
// nudges up and a positive memory is written on both cats, but the pre-existing
// negative argument memories are NEVER scaled or deleted — a mended rivalry
// still carries its history, and a deep grudge needs repeated reconciles.

import { RECONCILE } from "../../config/tuning.ts";
import { nudgeRel, relBand } from "../relationships.ts";
import type { CatState } from "../types.ts";
import type { ActionDef } from "./types.ts";

function clamp(lo: number, hi: number, v: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Local memory writer — mirrors the private helper in actions/index.ts (kept
 *  local rather than exported, per M4 §A). Caps memory at 40 entries. */
function writeMemory(cat: CatState, subject: string, event: string, charge: number, now: number): void {
  cat.memory.push({ subject, event, charge, at: now });
  if (cat.memory.length > 40) cat.memory.shift();
}

function trait(cat: CatState, t: string): boolean {
  return cat.identity.traits.includes(t);
}

/** A cat inclined to let things go: the generous trait or the optimist bent. */
function forgiving(cat: CatState): boolean {
  return trait(cat, "generous") || cat.identity.personality === "optimist";
}

export const reconcile: ActionDef = {
  id: "reconcile",
  intent: "social",
  needs: ["social"],
  requiresProximity: true,
  reach: 30,
  // Awake, ungrabbed, non-collapsed cats this cat currently reads as a rival,
  // not attempted inside the cooldown window (one try per rival per game day).
  candidates: (cat, world) =>
    world.cats.filter(
      (c) =>
        c.id !== cat.id &&
        !c.grabbed &&
        c.stage !== "collapsed" &&
        relBand(cat.relationships[c.id] ?? 0) === "rival" &&
        world.time - (cat.reconcileCooldowns[c.id] ?? -Infinity) >= RECONCILE.cooldownMs,
    ),
  appeal: (cat, _world, t) => {
    const other = t as CatState | undefined;
    if (!other) return 0;
    // Trait lean is a FLOORED multiplier, never a gate (rule 4): leanGenerous
    // and leanProud are both > 0, so a proud cat reconciles LESS but is never
    // silenced. Personality lean also rides in via actionBias.reconcile.
    let lean = 1;
    if (forgiving(cat)) lean *= RECONCILE.leanGenerous;
    if (trait(cat, "proud")) lean *= RECONCILE.leanProud;
    return RECONCILE.baseAppeal * lean;
  },
  duration: () => RECONCILE.durationMs, // fixed — no rng draw here
  onComplete: ({ cat, world, target, rng, emit, now }) => {
    const other = target as CatState | undefined;
    // Re-guard: the target may have collapsed / been grabbed / drifted off rival
    // while this cat walked over.
    if (!other || other.grabbed || other.stage === "collapsed") return;
    if (relBand(cat.relationships[other.id] ?? 0) !== "rival") return;
    // Stamp the per-target cooldown in BOTH branches (mirrors recruit): one
    // attempt per rival per game day whether it lands or not.
    cat.reconcileCooldowns[other.id] = now;
    // ONE rng draw: the other cat's willingness. Base ± their forgiving bent and
    // the depth of THEIR grudge toward this cat (how negatively they see them).
    const grudge = RECONCILE.grudgePenalty * clamp(0, 1, -(other.relationships[cat.id] ?? 0));
    const accept = RECONCILE.acceptBase + (forgiving(other) ? RECONCILE.forgivingBonus : 0) - grudge;
    if (rng.chance(clamp(RECONCILE.minAccept, RECONCILE.maxAccept, accept))) {
      // Drift up on both sides (initiator more). A single repairUp crosses
      // rival→neutral only from a shallow rivalry; deep grudges take several.
      nudgeRel(cat, other.id, RECONCILE.repairUp, emit);
      nudgeRel(other, cat.id, RECONCILE.repairUpOther, emit);
      // ADDITIVE positive memories — the old argument memories stay untouched.
      writeMemory(cat, other.id, `made up with ${other.identity.name}`, RECONCILE.memoryCharge, now);
      writeMemory(other, cat.id, `${cat.identity.name} made peace`, RECONCILE.memoryChargeOther, now);
      cat.needs.social = Math.min(1, cat.needs.social + 0.3);
      other.needs.social = Math.min(1, other.needs.social + 0.2);
      cat.emotion = "happy";
      other.emotion = "happy";
      emit({ type: "reconciled", a: cat.id, b: other.id, outcome: "accepted" });
    } else {
      // Rebuffed: a tiny drift down (still rival), a sour memory — no erasure.
      nudgeRel(cat, other.id, -RECONCILE.rebuffDown, emit);
      writeMemory(cat, other.id, `${other.identity.name} wasn't ready`, RECONCILE.rebuffMemoryCharge, now);
      cat.needs.social = Math.min(1, cat.needs.social + 0.1);
      cat.emotion = "sad";
      emit({ type: "reconciled", a: cat.id, b: other.id, outcome: "rebuffed" });
    }
  },
  bubble: () => undefined, // icon only at commit; the voice arrives on the event
};
