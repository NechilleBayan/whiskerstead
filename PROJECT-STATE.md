# PROJECT-STATE

## Current milestone
**Dialogue M0 — selection plumbing** (spec: `files/06-dialogue-integration-spec.md`, approved 2026-07-17)

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
   flags, ambient emitter (`lastAmbientAt`, serialized), renderer bubble wrap.
3. **M2+** — fresh content waves: ~40 lines/category, locked voice, 4 tone bands
   incl. full dark (user-approved override), strongest categories first.
4. **M3** — ambient speech live + TONE_WEIGHTS + priority bias.
5. **M4** — social depth (campfire convos, rumors via `heard:` memories,
   relationship milestones, reconcile action).

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

## Last verified state
- Commit `7d1819c` pushed (cat sprites + walk squish + facing + view latch).
  Typecheck/build green; browser-verified; 16-test suite green.
- Commit `3e70a4b` — Dialogue M0 (pure selection plumbing + suppression fixes).
- Grid map delivered 2026-07-17 (`files/whiskerstead_village_grid_map.png` +
  `_instructions.md`). Reviewer PASS after fixes; no source touched; anchors
  re-dumped after `3e70a4b` landed and unchanged by it.
- Uncommitted: the two grid-map files and this file.
