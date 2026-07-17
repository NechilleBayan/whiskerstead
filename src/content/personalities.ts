// Personality archetypes — 03-content-tables. Decision-weight flavor.
// RULE: personality *influences*, never *determines*. These are multipliers on
// action scores, never gates. Every value stays finite and positive-ish so no
// option is ever fully suppressed (near-miss options must be able to fire).

import type { PersonalityId } from "../sim/types.ts";

export interface Archetype {
  id: PersonalityId;
  core: string;
  /** Multipliers per action id (missing = 1.0 neutral). */
  actionBias: Record<string, number>;
  /** Cult openness baseline (0..1) before situational inputs. */
  cultOpenness: number;
  /** Sleep timing lean: negative = earlier, positive = later/night owl. */
  sleepShift: number;
}

export const ARCHETYPES: Record<PersonalityId, Archetype> = {
  planner: {
    id: "planner",
    core: "wants everything organized",
    actionBias: { cook: 1.35, serve: 1.3, gather: 1.15, build: 1.25, wander: 0.7, socialize: 0.85 },
    cultOpenness: 0.2,
    sleepShift: -0.15,
  },
  chaos: {
    id: "chaos",
    core: "acts first, thinks never",
    actionBias: { explore: 1.6, wander: 1.5, fish: 0.9, steal: 1.4, socialize: 1.1, build: 0.8, chase: 1.8 },
    cultOpenness: 0.75,
    sleepShift: 0.25,
  },
  optimist: {
    id: "optimist",
    core: "believes everyone is good",
    actionBias: { socialize: 1.5, serve: 1.2, comfort: 1.4, fish: 1.1, gather: 1.05 },
    cultOpenness: 0.5,
    sleepShift: 0.0,
  },
  cynic: {
    id: "cynic",
    core: "assumes everything is doomed",
    actionBias: { gather: 1.3, wander: 1.2, socialize: 0.75, gossip: 1.4, serve: 0.85, join_cult: 0.4 },
    cultOpenness: 0.15,
    sleepShift: 0.1,
  },
  cryptic: {
    id: "cryptic",
    core: "knows more than everyone",
    actionBias: { read: 1.5, explore: 1.3, wander: 1.2, socialize: 0.7, offer: 1.6, artifact_visit: 1.7 },
    cultOpenness: 0.3,
    sleepShift: 0.3,
  },
};

export function actionBias(personality: PersonalityId, actionId: string): number {
  return ARCHETYPES[personality].actionBias[actionId] ?? 1.0;
}
