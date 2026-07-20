# PROJECT-STATE

## Current milestone
**Dialogue arc COMPLETE (M0–M4)** as of 2026-07-18. Commits: M0 `3e70a4b`,
M1 `ddacb2c`, M2 wave 1 `7845ff7`, M2 wave 2 `a7a720a`, M3 `1aaacb6`,
M4-A `9084883`, M4-B `37f9a29`, M4-C `1c509c0`. Full suite 73/73 green,
typecheck clean. **Nothing in progress.** The only remaining roadmap items are
gated: **M5** (seasons / festival / add-a-cat arrivals) — each behind its OWN
explicit go-ahead per the locked filters — and small logged cleanups (see
Known issues). Do not start M5 without the user's go-ahead.

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
   `1aaacb6`.
   Known limit (by design → M4): campfire_talk chatter is sparse (~0–2/3days,
   many seeds 0) because its gate correctly requires a LIT fire + awake company,
   and cats rarely gather+linger at a lit fire yet. Frequency strengthens in M4
   ("campfire convos") when cats gather; M3 ships the correct plumbing, not the
   gathering behavior. campfireTalkChance left at 0.5 (M4 will revisit).
6. **M4** — social depth, built as three separately-verified increments (spec
   `files/09-dialogue-m4-spec.md`). ← ALL DONE (each reviewed PASS):
   - **M4-A reconcile** `9084883`: new `reconcile` ActionDef — a cat seeks a
     rival, rolls accept/rebuff, nudges the band up toward neutral, writes
     ADDITIVE memories (old grudge memories persist — rule 5). `reconciled`
     event, `reconcileCooldowns` state (serialized), reconcile/reconcile_rebuffed
     categories, actionBias rows. 62/62.
   - **M4-B rumors** `37f9a29`: `rumor_good`/`rumor_bad` ambient gates surface a
     held `heard:` memory ({who}=real subject, valence=charge sign); silent when
     none held — no fabrication. `pickHeardRumor` helper, `rumor-shared` event,
     `rumorCooldowns` state. `speak()` now returns whether a bubble showed so the
     stamp/emit commit only on a real utterance (all other callers ignore it;
     determinism unaffected). 67/67.
   - **M4-C campfire convos** `1c509c0`: bonfire appeal gains a bounded additive
     company-pull + longer evening sits so cats gather+linger (the lever making
     M3 `campfire_talk` frequent); event-driven depth-1 turn-taking
     (`campfire-chatted`→`campfire_reply` from a seated neighbour). `campfire_reply`
     is event-only (never in the ambient GATES → no double-fire). No new state.
     `companyPull` tuned to 0.6 (1.5 skewed the comfort/scavenge canary). Digest:
     gathering ~4.6×, campfire_talk ~3.4×, routine unskewed, 0 permanent collapse.
     73/73.
   Deferred from M4 (own go-ahead): cross-tick delayed replies, reconcile reply
   from the other cat, rumor re-propagation, raising campfireTalkChance.

7. **Universal action animation** — spec `files/10-universal-action-anim-spec.md`
   DRAFT (2026-07-20), awaiting approval. Wiggle (perform-phase, procedural +
   sprite hook) + done beat (render-only, `YIELD_EVENTS`), then a small helper-
   dedup cleanup. Sim untouched in steps 1–2. User decisions locked in spec §0;
   real "retrieve" sim phase explicitly deferred (spec §6).
   Asset pipeline (2026-07-20, v2 SIMPLIFIED): user locked a ONE-IMAGE
   model — one image per distinct thing; animation = code transforms (like
   the walk squish), quantity = stacked draws, state = composed layers
   (bonfire = woodpile + bouncing fire layer), variants = code
   flip/lean/tint. `assets/ASSET-CHECKLIST.txt` (v2, 26 required images;
   cats P0 = DONE, no new cat art ever — sleep/collapsed/emotions/wiggle
   all procedural). Detailed 146-name list archived as
   `ASSET-CHECKLIST-DETAILED.txt`; BATCH-1/2/3-PROMPTS.txt CANCELLED
   (banner added — cat art dropped). Anim spec §1.2 sprite hook dropped
   accordingly (simplifies step 1). `assets/SPRITE-SPEC-REFERENCE.txt`
   still canonical for style/canvas/naming (§11a layer registration added).
   `assets/BATCH-4-PROMPTS.txt`: P1 layer kit (fire/woodpile/tree/stump)
   via 5 prompts — fire+woodpile decomposed from one bonfire image, stump
   derived from the tree. `assets/BATCH-5-PROMPTS.txt`: P2 buildings
   (8 prompts, registration lines for code-composed states; market/forage
   drawn EMPTY, house in tintable pale neutral). `assets/BATCH-6-PROMPTS.txt`:
   P3 items (12 prompts — completes the 26-image required set; P4 ground
   optional). Prompt authoring method codified in
   `assets/PROMPT-AUTHORING-GUIDE.txt`, referenced from CLAUDE.md — future
   asset-prompt requests follow it. Canvas follows the shipped pipeline
   (256/128), not files/01-cats.md's older 192 note.

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
- M3 `1aaacb6`: tone-weighted selection, near-death grim damper, campfire
  plumbing. Reviewer PASS.
- M4 `9084883`/`37f9a29`/`1c509c0`: reconcile action, rumors from `heard:`
  memories, campfire conversations + gathering. Each reviewer PASS.
- Full suite **73/73** green, typecheck clean at the tip of `main`
  (`1c509c0` + this doc). Dialogue arc M0–M4 complete; no work in progress.
- Next (gated, needs go-ahead): M5 expansion. Logged cleanups below are
  optional and also want their own go-ahead.
