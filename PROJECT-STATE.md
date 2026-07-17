# PROJECT-STATE

## Current milestone
**Dialogue M4 — social depth** (campfire convos, rumors via `heard:` memories,
reconcile action). Next after M3 landed 2026-07-18. M0 `3e70a4b`, M1 `ddacb2c`,
M2 wave 1 `7845ff7`, M2 wave 2 `a7a720a`, M3 `<pending>`. M4 is the last
dialogue-arc milestone; M5 (seasons/festival/arrivals) stays gated behind its
own go-ahead.

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
   replaced, tally comment). Committed `7845ff7`.
   Accepted/deferred from review: voice-drift NITs kept (internet-casual is
   in-register), gates live in content/dialogue/categories.ts (relocate to
   sim/dialogue/gates.ts if they grow logic in wave 2), campfire_talk gate
   almost never passes (cats near fire are mid-perform — needs an ambient
   carve-out; wave 2 / M3 item).
4. **M2 wave 2** — migrate 21 event categories from flat `LINES` into toned
   `TONED_LINES` (~40 lines/full, 24–30/moderate; 754 new lines) so M3 tone
   weighting reaches the core event bubbles. Selector falls through
   `LINES`→`TONED_LINES` so `say()` sites are unchanged; behavior code
   untouched. Terse crisis (pond_accident, steal_caught, rescue, recovered)
   and dormant (greeting, sleep, rain, storm_fear, chase) stay flat.
   ← DONE (spec `files/07-dialogue-m2w2-spec.md`; authored + adversarially
   verified per-category via workflow; reviewed PASS, 45/45 tests, typecheck
   clean; 3-seed 2-day digest healthy — 222–259 migrated-category bubbles/run,
   no permanent collapse). Committed `a7a720a`.
   Note: `weather_ambient` (wave 1) has "puddle inventory: rising" — "inventory"
   is plain stock-taking, not the RPG term; left as-is. Deleting the 5 dormant
   LINES categories is a later cleanup pass (own go-ahead).
5. **M3** — tone-weighted selection + urgency damper + campfire plumbing (spec
   `files/08-dialogue-m3-spec.md`). `TONE_WEIGHTS` per-personality × per-band
   multipliers in tuning (floored `toneFloor` 0.15, never zeroed); `select.ts`
   weights each fresh line by its band and rolls one `weightedIndex` (roll,
   don't max — every line reachable, no sort, one rng draw preserves
   determinism). Urgency: at critical/collapsed, unhinged/dark ×`urgencyGrimMult`
   0.2 — this IS §4's "near-death blocks jokes", realized as a down-weight not a
   hard filter (§4↔§5 reconciliation). Priority: NO new code — the narration
   layer has no tier system to reject; weighted ambient roll + force-through-
   cooldown already satisfy §4 (a tier/argmax system is explicitly rejected).
   Campfire: bonfire-perform carve-out (emit + subscriber route to
   `campfire_talk` only) PLUS a short campfire window cadence
   (`campfireIntervalMs` 3500 / `campfireJitterMs` 1200) so ~9s sits catch
   windows (pre-fix ~1/3days → now 42–78/run). ← DONE (reviewed PASS on the
   tone/urgency/routing core, 54/54; campfire CADENCE delta found in producer
   digest verification and added after — 2 tuning keys + 6-line emit change +
   test split, producer-verified via multi-seed probes + expanded suite 56/56,
   typecheck clean, tone bands balanced, no permanent collapse). Committed
   `<pending>`.
   Known limit (by design → M4): campfire_talk chatter is sparse (~0–2/3days,
   many seeds 0) because its gate correctly requires a LIT fire + awake company,
   and cats rarely gather+linger at a lit fire yet. Frequency strengthens in M4
   ("campfire convos") when cats gather; M3 ships the correct plumbing, not the
   gathering behavior. campfireTalkChance left at 0.5 (M4 will revisit).
6. **M4** — social depth (campfire convos, rumors via `heard:` memories,
   reconcile action). Campfire convos should also make cats gather+linger at the
   lit fire (the lever that makes M3's campfire_talk frequent).

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
- Dialogue M0 `3e70a4b`, M1 `ddacb2c`, M2 wave 1 `7845ff7` — all reviewed PASS,
  committed. Grid map + `7d1819c` sprites earlier, green.
- M2 wave 2 `a7a720a`: reviewer PASS. Dialogue library now 56 toned categories
  (~1265 lines) + 9 flat crisis/dormant categories.
- M3 (`<pending>`): 56/56 headless tests green, typecheck clean, reviewer PASS
  on core + producer-verified cadence delta. Selection is now tone-weighted
  (roll-don't-max, one rng draw), near-death damps grim humor, campfire plumbing
  in place (chatter sparse until M4 gathering).
- Uncommitted at handoff: none expected after the M3 commit lands.
