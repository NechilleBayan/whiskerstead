// Entity-component types — spec §2 (architecture). Cats, buildings, items and
// sites are all entities; a cat perceives them as one generic list.

import type { NeedId } from "../config/tuning.ts";

export interface Vec2 {
  x: number;
  y: number;
}

export type PersonalityId = "planner" | "chaos" | "optimist" | "cynic" | "cryptic";

/** Any entity a cat can perceive/react to. Buildings, items, cats all share it. */
export type EntityKind = "cat" | "building" | "item" | "site";

export interface BaseEntity {
  id: string;
  kind: EntityKind;
  pos: Vec2;
}

export interface Building extends BaseEntity {
  kind: "building";
  type: string; // soup-station | bakery | library | market | house | forage | bonfire | pond
  owner?: string; // cat id for houses
  active: boolean; // "active tell" toggle (smoke/glow) for renderer
  fixed: boolean;
  state?: Record<string, number | string | boolean>; // e.g. soup pot state
}

export interface Site extends BaseEntity {
  kind: "site";
  type: "artifact";
  discovered: boolean;
  shrined: boolean;
}

export interface Item extends BaseEntity {
  kind: "item";
  type: string; // fish | wood | vegetable | bread | soup | yarn | flowers | trinket | junk
  quality?: number; // 0..1
  holder?: string; // cat id if carried; undefined if on ground
}

/** Identity stack — spec design §Cat Identity Stack. */
export interface Identity {
  name: string;
  color: string; // placeholder appearance until art exists
  accent: string;
  occupation: string;
  personality: PersonalityId;
  traits: string[];
  preferences: Record<string, number>; // signed weights, e.g. { rain: -0.6, ponds: 0.5 }
  /** Per-cat time-of-day activity weights (never displayed). */
  scheduleCurve: Record<string, number>; // phaseId -> multiplier
  /** Habitual anchors — "Biscuit opens the station pre-dawn, pond every
   *  evening". Boost a specific action during a specific phase. Discovered by
   *  watching over days, never displayed (spec §3 Personal Schedules). */
  anchors: Array<{ phase: string; action: string; boost: number }>;
}

export interface MemoryEntry {
  subject: string; // entity id or place type
  event: string;
  charge: number; // emotional charge, -1..1
  at: number; // sim time
}

export interface CatState extends BaseEntity {
  kind: "cat";
  identity: Identity;
  needs: Record<NeedId, number>; // satisfaction 0..1
  condition: number; // health 0..1 (derived, floored)
  stage: "stable" | "strained" | "critical" | "collapsed";
  inventory: Item[];
  memory: MemoryEntry[];
  relationships: Record<string, number>; // otherCatId -> drift -1..1
  fishSkill: { attempts: number; catches: number; tier: keyof typeof import("../config/tuning.ts").FISH_TIERS };
  // runtime action state
  action?: ActiveAction;
  grabbed: boolean;
  facing: number; // -1 left, 1 right
  emotion: string; // last expressed emotion for renderer
  lastBubbleAt: number;
  /** Ambient speech window timer (06-dialogue M1) — last window fire time. */
  lastAmbientAt: number;
  /** Consecutive completions of the same action — M2 repetition lines gate on it. */
  repetition: { actionId: string; count: number };
  /** Bubble duplicate-suppression: line id -> last time used (spec §8). */
  lineHistory: Record<string, number>;
  /** Reconcile attempt stamps (06-dialogue M4 §A): rival id -> last attempt time.
   *  One reconcile per rival per game day (RECONCILE.cooldownMs). Serialized. */
  reconcileCooldowns: Record<string, number>;
  cultRole?: string;
}

export interface ActiveAction {
  id: string;
  targetId?: string;
  startedAt: number;
  duration: number;
  phase: "goto" | "perform";
  data?: Record<string, unknown>;
}

export interface Bubble {
  cat: string;
  text: string;
  kind: "speech" | "thought" | "reaction" | "gossip";
  bornAt: number;
  ttl: number;
}

export interface WorldState {
  seed: number;
  rngState: number;
  time: number; // sim ms elapsed (frozen while app closed)
  day: number;
  phase: string;
  weather: "clear" | "rain" | "storm";
  cats: CatState[];
  buildings: Building[];
  sites: Site[];
  groundItems: Item[];
  bubbles: Bubble[];
  cult?: { founder: string; members: string[]; stage: string; attempts: Record<string, number> };
  /** Active soup-cook removal campaign (spec §4 Ousting). */
  oustCampaign?: { cook: string; instigator: string; since: number };
  bounds: { w: number; h: number };
}
