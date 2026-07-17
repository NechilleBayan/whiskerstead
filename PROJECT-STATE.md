# PROJECT-STATE

## Current milestone
**Dialogue M2 wave 1 — fresh content, new-trigger categories** (spec:
`files/06-dialogue-integration-spec.md`). Wave 1 = 15 categories with live
triggers (ambient, weather-changed, relationship-milestone, repetition,
sleep/dream), ~40 lines each, 4 tone bands, locked voice. Builder dispatched
2026-07-17. Wave 2 (expand existing ~30 event categories to 40 lines) waits
for wave-1 verification. M0 committed `3e70a4b`, M1 committed `ddacb2c`.

## Task queue
1. **M0** — context-gated selector plumbing: `src/sim/dialogue/`, side-effect-free
   selection, fix bugs spec §3.2–3.4 (§3.1 weather-changed is M1), headless tests.
   ← DONE (reviewed PASS, 28/28 tests; MINOR eviction-order fix applied and
   verified — delete-before-set at the single write site). Committed `3e70a4b`.
   Note: "zero texture change" is read as *determinism* (same seed ⇒ identical
   transcript, tested) — bit-identity with the pre-fix baseline is impossible
   because un-burning lines shifts rng draw points; per-seed digests diverge
   from `7d1819c` but remain healthy (reviewer verified 3 seeds).
2. **M1** — state gaps: `weather-changed` + `relationship-milestone` events, derived
   context queries, ambient emitter (`lastAmbientAt`, serialized), repetition
   streak, renderer bubble wrap. ← DONE (reviewed PASS, 36/36 tests; save/load
   determinism of the ambient window verified empirically). Committed `ddacb2c`.
   M2 author note: `nearbyCats()` includes collapsed cats (perception idiom) —
   casual-chatter categories should add their own filter if needed.
3. **M2 wave 1** — 509 fresh lines, 34 gate-exact (sub)categories, ambient
   subscriber + event hookups. ← DONE (reviewed PASS, 44/44 tests; digest
   +7.8% bubbles, ambient silence dominant; four review fixes applied and
   spot-verified: crowd threshold key, philosophical_night split, snow line
   replaced, tally comment). Committed `<pending>`.
   Accepted/deferred from review: voice-drift NITs kept (internet-casual is
   in-register), gates live in content/dialogue/categories.ts (relocate to
   sim/dialogue/gates.ts if they grow logic in wave 2), campfire_talk gate
   almost never passes (cats near fire are mid-perform — needs an ambient
   carve-out; wave 2 / M3 item).
4. **M2 wave 2** — expand existing ~30 event categories to ~40 lines each.
5. **M3** — TONE_WEIGHTS multipliers + priority bias + campfire ambient fix.
6. **M4** — social depth (campfire convos, rumors via `heard:` memories,
   reconcile action).

## Reference assets
- `files/whiskerstead_village_grid_map.png` + `_instructions.md` — positioning
  source of truth for background art & placement prompts. All 15 anchors
  verified against `createWorld(1337)` on 2026-07-17. Regenerate (don't
  hand-edit) if `world.ts` moves a building. Storage/workbench/expansion
  zones on it are PROPOSED — not in the sim.
  Grid: 16×10, cols A–P, rows 1–10, 60u/cell, A1 = world (0,0). Generated from
  a live world dump, not hand-drawn; PNG + .md share one coordinate table.
  Reviewed 2026-07-17: FAIL → fixed → re-verified. Corrections worth keeping:
  cats are clamped to x 30–930, y 30–570 (`actions/index.ts`) so **no off-map
  exit exists** — spec's off-screen wandering/parades are Phase 3, unbuilt;
  cat sprite is 56u (`SPRITE_H`), the style guide's 64–96 is *screen px*, not
  world units; bakery/market footprints corrected to D6–E6 / I8–J8.
  Festival/funeral + shed + memorial are spec-only — keep them out of the art.

## Blocked / deferred
- Seasons, festival, add-a-cat arrivals → M5, each behind its own go-ahead.
- Tutorial hints / objective reminders / unlock reactions / story flags /
  predators → **never** (prohibited by locked design filters 1 & 4).

## Known issues (logged, not fixed)
- `actions/index.ts` module-level `itemCounter` is not serialized: loading a
  save in a fresh process re-mints item ids from 1 and can collide with saved
  item ids. Pre-existing since MVP; fix = derive ids from a serialized counter
  in WorldState. (Flagged M1 review, 2026-07-17.)
- `test/fast-forward.test.ts` `?? 0 > 0` precedence makes one assertion nearly
  vacuous — tighten in a future test pass.

## Last verified state
- Commit `7d1819c` pushed (cat sprites + walk squish + facing + view latch).
  Typecheck/build green; browser-verified; 16-test suite green.
- Commit `3e70a4b` — Dialogue M0 (pure selection plumbing + suppression fixes).
- Grid map delivered 2026-07-17 (`files/whiskerstead_village_grid_map.png` +
  `_instructions.md`). Reviewer PASS after fixes; no source touched; anchors
  re-dumped after `3e70a4b` landed and unchanged by it.
- Uncommitted: the two grid-map files and this file.
