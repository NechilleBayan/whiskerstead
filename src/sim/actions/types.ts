// Actions as data — spec §3 (architecture). Every doable thing is a self-
// contained definition: eligibility, score inputs, duration, effects, events,
// bubble hooks. Adding "hold festival" later = one new action file.

import type { NeedId } from "../../config/tuning.ts";
import type { EventBus } from "../events.ts";
import type { Rng } from "../rng.ts";
import type { BaseEntity, CatState, WorldState } from "../types.ts";

export interface ActionCtx {
  cat: CatState;
  world: WorldState;
  target?: BaseEntity;
  rng: Rng;
  emit: EventBus["emit"];
  now: number;
}

export interface ActionDef {
  id: string;
  /** Thought-intention icon id (04-bubbles-ui). */
  intent: string;
  /** Needs this action can satisfy — feeds the urgency multiplier. */
  needs: NeedId[];
  /** Must the cat walk to the target before performing? */
  requiresProximity: boolean;
  /** Distance considered "at" the target. */
  reach: number;

  /** Enumerate valid (target-or-undefined) candidates in the world. */
  candidates(cat: CatState, world: WorldState): Array<BaseEntity | undefined>;

  /** Base appeal for a candidate (preferences/opportunity). > 0. */
  appeal(cat: CatState, world: WorldState, target?: BaseEntity): number;

  /** Where the cat must stand to perform. Defaults to target.pos when a target
   *  exists; return a point for target-less actions (e.g. wander). */
  destination?(ctx: ActionCtx): { x: number; y: number } | undefined;

  /** Duration in ms once performing begins. */
  duration(ctx: ActionCtx): number;

  /** Fires when the cat commits to this action (before walking). Use for
   *  claims/reservations that must be exclusive while the cat is en route. */
  onCommit?(ctx: ActionCtx): void;

  /** Fires when the perform phase begins (after arrival). */
  onStart?(ctx: ActionCtx): void;

  /** Fires when the action completes. Effects + events live here. */
  onComplete(ctx: ActionCtx): void;

  /** Speech/thought bubble text at commit (legibility layer). */
  bubble?(cat: CatState, target?: BaseEntity): string | undefined;
}
