// Centralized relationship mutation — 06-dialogue M1. EVERY write to
// cat.relationships flows through nudgeRel, so band crossings are detected at
// the write itself and emitted as relationship-milestone events (rule 7:
// subscribers react — no polling, no snapshot-diff loops).

import { REL_THRESHOLDS } from "../config/tuning.ts";
import type { GameEvent, RelBand } from "./events.ts";
import type { CatState } from "./types.ts";

/** Label band for a drift value (-1..1), cut at the REL_THRESHOLDS keys. */
export function relBand(v: number): RelBand {
  if (v <= REL_THRESHOLDS.rival) return "rival";
  if (v >= REL_THRESHOLDS.crush) return "crush";
  if (v >= REL_THRESHOLDS.friend) return "friend";
  return "neutral";
}

/** Nudge a's opinion of b by delta, clamped to -1..1. Emits a
 *  relationship-milestone when the value crosses a band edge in either
 *  direction — exactly once per crossing, never while staying in-band. */
export function nudgeRel(a: CatState, bId: string, delta: number, emit: (e: GameEvent) => void): void {
  const prev = a.relationships[bId] ?? 0;
  const next = prev + delta < -1 ? -1 : prev + delta > 1 ? 1 : prev + delta;
  a.relationships[bId] = next;
  const from = relBand(prev);
  const to = relBand(next);
  if (from !== to) emit({ type: "relationship-milestone", a: a.id, b: bId, from, to });
}
