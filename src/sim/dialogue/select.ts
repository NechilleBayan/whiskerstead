// Dialogue selection — 06-dialogue-integration-spec §4 (M0 plumbing).
// Pure and side-effect-free: never writes cat.lineHistory or any world state.
// The suppression record is committed by Simulation.speak() only when the
// bubble actually shows (§3 bug 2 — no more lines burned by dropped bubbles).
// Shaped candidates → filter → roll so scoring/tone weighting can slot in
// later (M3) without restructuring. Headless: no render imports, no DOM.

import { LINE_SUPPRESS_MS, NEVER_MS } from "../../config/tuning.ts";
import { LINES } from "../../content/bubbles.ts";
import type { Rng } from "../rng.ts";
import type { CatState } from "../types.ts";

/** A selected line plus the suppression key speak() commits on success. */
export interface LinePick {
  text: string;
  key: string;
}

/** THE one suppression-key format, shared by freshness filtering here and the
 *  speak-time commit (§3 bug 3 — no more double bookkeeping). Keyed on the
 *  unfilled template so `{who}` variants share a record. */
export function lineKey(category: string, line: string): string {
  return `${category}:${line}`;
}

/** Select a line for a cat, honoring per-cat duplicate suppression. Returns
 *  undefined if every candidate was used too recently (silence is fine). */
export function selectLine(
  cat: CatState,
  category: string,
  now: number,
  rng: Rng,
  fill?: Record<string, string>,
): LinePick | undefined {
  const table = LINES[category];
  if (!table) return undefined;
  // candidates: personality pool merged with `any` — a merge, never a gate
  const pool = [...(table[cat.identity.personality] ?? []), ...(table.any ?? [])];
  // filter: freshness against the cat's committed history
  const fresh = pool.filter((l) => now - (cat.lineHistory[lineKey(category, l)] ?? NEVER_MS) >= LINE_SUPPRESS_MS);
  if (fresh.length === 0) return undefined;
  // roll: flat pool for now — one rng draw ("roll, don't max")
  const line = fresh[Math.floor(rng.next() * fresh.length)];
  const key = lineKey(category, line);
  let text = line;
  if (fill) for (const [k, v] of Object.entries(fill)) text = text.replaceAll(`{${k}}`, v);
  return { text, key };
}
