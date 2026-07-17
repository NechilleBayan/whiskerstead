# PROJECT-STATE

## Current milestone
**Dialogue M0 — selection plumbing** (spec: `files/06-dialogue-integration-spec.md`, approved 2026-07-17)

## Task queue
1. **M0** — context-gated selector plumbing: `src/sim/dialogue/`, side-effect-free
   selection, fix bugs spec §3.2–3.4 (§3.1 weather-changed is M1), headless tests.
   ← DONE (reviewed PASS, 28/28 tests; MINOR eviction-order fix applied and
   verified — delete-before-set at the single write site). Uncommitted.
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

## Blocked / deferred
- Seasons, festival, add-a-cat arrivals → M5, each behind its own go-ahead.
- Tutorial hints / objective reminders / unlock reactions / story flags /
  predators → **never** (prohibited by locked design filters 1 & 4).

## Last verified state
- Commit `7d1819c` pushed (cat sprites + walk squish + facing + view latch).
  Typecheck/build green; browser-verified; 16-test suite green.
- Uncommitted: `files/06-dialogue-integration-spec.md`, this file.
