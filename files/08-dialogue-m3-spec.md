# Dialogue M3 spec (APPROVED 2026-07-18)

Tone-weighted selection + near-death urgency damper + campfire ambient fix.
Priority needs NO new code. No new serialized state; saves round-trip exact;
`selectLine` keeps its exact one-rng-draw count.

## Grounding (current behavior)
- `select.ts:39-59`: toned categories flatten all 4 bands into one flat pool,
  freshness-filter, roll uniformly `fresh[floor(rng.next()*len)]` — ONE draw.
  `LINES[category]` resolves FIRST; else `TONED_LINES`. The 9 flat categories
  stay uniform via the LINES-first branch.
- `rng.weightedIndex(w)` (`rng.ts:41-51`): one `next()` draw regardless of
  array length. `chance`/`range`/`next` = one draw each.
- Ambient emit (`simulation.ts:85-91`): window suppressed during perform except
  `sleepPerform`. A `bonfire` perform → no window (the campfire bug).
- Ambient subscriber (`:518-533`): sleeping→sleepTalkChance+sleep_talk-only;
  else ambientSpeakChance + `id!=="sleep_talk"`.
- Narration (`:537-653`): events map 1:1 to categories via `say()`; rare beats
  pass `force:true`. NO tier system, NO argmax anywhere.
- Condition: `cat.stage: "stable"|"strained"|"critical"|"collapsed"`
  (`types.ts:74`); critical when `condition <= HEALTH.criticalBelow` (0.3).
  Collapsed cats early-return from `updateCat` (`:76`).
- `bonfire` action (`actions/index.ts:356-387`): id "bonfire", perform seats
  the cat at the fire; may leave fire UNLIT if no fuel.
- `campfire_talk` gate (`categories.ts:69`): litFireNearby && company>=1.
  UNCHANGED by M3.

## Problem 1 — TONE_WEIGHTS + tone-weighted roll
### tuning.ts (avoid config↔types cycle: plain string-keyed records, no
### PersonalityId/Tone import)
```ts
export const TONE_WEIGHTS: Record<string, Record<string, number>> = {
  planner:  { normal: 1.4, dry: 1.3, unhinged: 0.3,  dark: 0.5  },
  chaos:    { normal: 0.8, dry: 0.4, unhinged: 1.7,  dark: 0.7  },
  optimist: { normal: 1.6, dry: 0.5, unhinged: 0.8,  dark: 0.25 },
  cynic:    { normal: 0.4, dry: 1.5, unhinged: 0.6,  dark: 1.4  },
  cryptic:  { normal: 0.6, dry: 0.3, unhinged: 1.4,  dark: 1.5  },
};
```
Add to `DIALOGUE`: `toneFloor: 0.15`, `urgencyGrimMult: 0.2`,
`campfireTalkChance: 0.5`.

### select.ts
Keep the band tag per candidate (`{ line, band? }`; band undefined = flat
LINES). Freshness-filter. Weight each fresh line:
`band===undefined ? 1 : max(DIALOGUE.toneFloor, TONE_WEIGHTS[p]?.[band] ?? 0) * urgencyMod(band, cat)`.
Pick with a SINGLE `rng.weightedIndex(weights)` — one draw, mirrors decide(),
no sort, every line reachable. Both `t[personality]` and `t.any` lines carry
their band's weight (personality expressed only via band lean). Flat categories
all-weight-1 → uniform (unchanged).
```ts
function urgencyMod(band, cat) {
  const nearDeath = cat.stage === "critical" || cat.stage === "collapsed";
  return nearDeath && (band === "unhinged" || band === "dark") ? DIALOGUE.urgencyGrimMult : 1;
}
```
This IS the §4 "near-death blocks jokes" rule — realized as a ×0.2 down-weight
(§5 "not to zero"), not a hard filter.

## Problem 2 — Priority: NO new code
The narration layer has no tier system to reject; §4's "priority biases score"
is already done (weighted AMBIENT_WEIGHTS roll + weightedIndex decide); "rare
beats land" is already done (force:true). The one hard-suppression (near-death
jokes) is Problem 1's urgencyMod. Building a tier/argmax system would VIOLATE §4
and MVP discipline. Do not.

## Problem 3 — Campfire fix (two coupled edits in simulation.ts; both required)
### Emit carve-out (updateCat ~:85-91)
Add `campfirePerform = performing && cat.action!.id === "bonfire"` to the emit
condition: `(!performing || sleepPerform || campfirePerform)`. Other performs
stay suppressed.
### Subscriber routing (~:518-533)
`atCampfire = cat.action?.id === "bonfire" && phase === "perform"`. chance =
sleeping?sleepTalkChance : atCampfire?campfireTalkChance : ambientSpeakChance.
`only = sleeping?"sleep_talk" : atCampfire?"campfire_talk" : undefined`.
eligible filter: `only ? c.id===only : c.id!=="sleep_talk" && c.id!=="campfire_talk"`
(exclude campfire_talk from the general pool now, like sleep_talk). Gate still
runs → unlit/lonely fire = silence. No new state (`atCampfire` reads
cat.action, already serialized).

## Problem 3b — Campfire CADENCE (amendment 2026-07-18, post-digest)
Verification found the 3a/3b carve-out unblocks the gate but campfire_talk still
fires ~0×/3 days naturally: a bonfire perform is only ~9s (`rng.range(6000,
12000)`), vs the 150s `ambientIntervalMs`, so a window almost never lands during
a sit (1 in 3 days observed). Fix: give campfire performs a SHORT window cadence.
- Add `DIALOGUE.campfireIntervalMs: 3500` and `DIALOGUE.campfireJitterMs: 1200`.
- In the updateCat emit block, when `campfirePerform`, use those instead of
  `ambientIntervalMs`/`ambientJitterMs` for the interval check AND the
  `lastAmbientAt` jitter reset:
  ```ts
  const interval = campfirePerform ? DIALOGUE.campfireIntervalMs : DIALOGUE.ambientIntervalMs;
  const jitter   = campfirePerform ? DIALOGUE.campfireJitterMs   : DIALOGUE.ambientJitterMs;
  if ((!performing || sleepPerform || campfirePerform) && this.world.time - cat.lastAmbientAt >= interval) {
    cat.lastAmbientAt = this.world.time + this.rng.range(-jitter, jitter);
    this.bus.emit({ type: "ambient-window", cat: cat.id });
  }
  ```
  Because the general interval is 150s, a cat entering a bonfire perform has
  almost always waited > 3.5s, so it gets an immediate window on entry, then
  ~1-2 more across the ~9s sit. Each rolls `campfireTalkChance` (0.5) + the gate.
- NO new serialized state (reuses `lastAmbientAt`); same rng draw shape (one
  `range` per emit); determinism preserved. Expected ~a few campfire lines/day,
  not a flood (~22 sits/3 days, gate-filtered).
- Add a test: a natural (or lightly-seeded) multi-day run produces >=1
  campfire_talk bubble (and the "silence common" ratio still holds).

## Determinism & save
No new serialized state (all static tuning + derived stage + existing action).
`selectLine` still consumes exactly one `rng.next()` (weightedIndex). Campfire
fix adds MORE windows (new draws) → changes texture, not determinism. Same-seed
self-comparison tests stay green.

## Tests — test/dialogue-m3.test.ts (new)
1. Determinism: 2-day normalized transcript identity, same seed twice.
2. Save round-trip byte-exact after a day.
3. No-sort/reachable: heavily disfavored band (e.g. optimist dark 0.25) still
   selected >=1 over many side-effect-free selectLine rolls; favored more often.
4. Urgency: unhinged+dark fraction strictly lower at stage="critical" vs "stable".
5. TONE_WEIGHTS audit: all 20 cells >= toneFloor.
6. campfire_talk fires for a seated bonfire-perform cat at a lit fire with
   company; no OTHER ambient category fires for it mid-perform.
7. Other performs (fish) still emit no ambient-window.
8. Flat LINES (storm_fear) still uniform, all reached, no tone logic.
9. Silence-common regression: 2-day clear, spoken < windows/2.

## Files touched
tuning.ts, select.ts, simulation.ts, test/dialogue-m3.test.ts. NOT: lines.ts,
categories.ts, bubbles.ts, types.ts, needs.ts.

## DONE checklist (reviewer)
1. npm test green (m1/m2 untouched + new m3); typecheck clean, no import cycle.
2. selectLine = exactly one rng.next(); no sort in selection path.
3. All 20 TONE_WEIGHTS cells >= toneFloor (>0), never zeroed.
4. critical/collapsed → unhinged/dark down-weighted, normal/dry unchanged, grim
   still reachable.
5. campfire_talk fires seated at lit fire w/ company; no other category
   mid-perform; fish/other performs no window; unlit/lonely → silence.
6. No new CatState field; save round-trip byte-exact.
7. Flat LINES still uniform.
8. No new priority/tier code.
9. PROJECT-STATE updated (note §4↔§5 reconciliation: near-death block = ×0.2).
