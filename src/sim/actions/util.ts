// Shared action helpers — extracted from actions/index.ts once reconcile.ts
// became a second verbatim consumer (anim spec §4 candidate 1). Pure moves:
// identical bodies, zero behavior change.

import type { CatState } from "../types.ts";

export function clamp(lo: number, hi: number, v: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Append a memory entry, capped at 40 (oldest evicted). Memories are the
 *  additive consequence trail (rule 5) — nothing here ever rewrites one. */
export function writeMemory(cat: CatState, subject: string, event: string, charge: number, now: number): void {
  cat.memory.push({ subject, event, charge, at: now });
  if (cat.memory.length > 40) cat.memory.shift();
}

export function trait(cat: CatState, t: string): boolean {
  return cat.identity.traits.includes(t);
}
