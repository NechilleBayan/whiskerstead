// Dialogue selection — 06-dialogue-integration-spec §4 (M0 plumbing).
// Pure and side-effect-free: never writes cat.lineHistory or any world state.
// The suppression record is committed by Simulation.speak() only when the
// bubble actually shows (§3 bug 2 — no more lines burned by dropped bubbles).
// Shaped candidates → filter → roll so scoring/tone weighting can slot in
// later (M3) without restructuring. Headless: no render imports, no DOM.

import { LINE_SUPPRESS_MS, NEVER_MS, TONE_WEIGHTS, DIALOGUE } from "../../config/tuning.ts";
import { LINES } from "../../content/bubbles.ts";
import { TONED_LINES, TONES, type Tone } from "../../content/dialogue/lines.ts";
import type { Rng } from "../rng.ts";
import type { CatState } from "../types.ts";

/** Near-death down-weight (06-dialogue M3 §4↔§5): a critical/collapsed cat leans
 *  off the grim bands (unhinged/dark) by ×urgencyGrimMult — a soft damper, never
 *  zero, so grim humor stays reachable. Reads cat.stage only; no rng, no writes. */
function urgencyMod(band: Tone, cat: CatState): number {
  const nearDeath = cat.stage === "critical" || cat.stage === "collapsed";
  return nearDeath && (band === "unhinged" || band === "dark") ? DIALOGUE.urgencyGrimMult : 1;
}

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
  // candidates: personality pool merged with `any` — a merge, never a gate.
  // Legacy LINES resolves first (flat, band undefined = weight 1); otherwise the
  // M2 toned tables, each candidate tagged with its tone band so M3 can weight it.
  const personality = cat.identity.personality;
  const candidates: { line: string; band?: Tone }[] = [];
  const table = LINES[category];
  if (table) {
    for (const l of table[personality] ?? []) candidates.push({ line: l });
    for (const l of table.any ?? []) candidates.push({ line: l });
  } else {
    const toned = TONED_LINES[category];
    if (!toned) return undefined;
    for (const tone of TONES) {
      const t = toned[tone];
      if (!t) continue;
      for (const l of t[personality] ?? []) candidates.push({ line: l, band: tone });
      for (const l of t.any ?? []) candidates.push({ line: l, band: tone });
    }
  }
  // filter: freshness against the cat's committed history
  const fresh = candidates.filter(
    (c) => now - (cat.lineHistory[lineKey(category, c.line)] ?? NEVER_MS) >= LINE_SUPPRESS_MS,
  );
  if (fresh.length === 0) return undefined;
  // roll: weight each fresh line by its band's per-personality lean (flat LINES
  // stay weight 1 → uniform), floored so no band is silenced, then dampened near
  // death. ONE rng draw via weightedIndex — mirrors decide(), no sort, every
  // line reachable ("roll, don't max").
  const weights = fresh.map((c) =>
    c.band === undefined
      ? 1
      : Math.max(DIALOGUE.toneFloor, TONE_WEIGHTS[personality]?.[c.band] ?? 0) * urgencyMod(c.band, cat),
  );
  const line = fresh[rng.weightedIndex(weights)].line;
  const key = lineKey(category, line);
  let text = line;
  if (fill) for (const [k, v] of Object.entries(fill)) text = text.replaceAll(`{${k}}`, v);
  return { text, key };
}
