# PROJECT-STATE

## Current milestone
**Universal action animation + one-image asset wiring COMPLETE (task 7,
M1–M6)** — committed 2026-07-20 (`73afecc`, `aca0aab`). Plus **M7 worship
pose** (render-only, reviewed PASS 2026-07-21, UNCOMMITTED) — see task 7
build log. Before that:
dialogue arc complete (M0–M4, 2026-07-18; commits M0 `3e70a4b`, M1 `ddacb2c`,
M2w1 `7845ff7`, M2w2 `a7a720a`, M3 `1aaacb6`, M4 `9084883`/`37f9a29`/
`1c509c0`). Full suite 73/73 green, typecheck clean, build green. The only
remaining roadmap items are gated: **M5 expansion** (seasons / festival /
add-a-cat arrivals) — each behind its OWN explicit go-ahead per the locked
filters — and small logged cleanups (see Known issues). Do not start M5
expansion without the user's go-ahead.

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
   APPROVED + IN BUILD (2026-07-20). Wiggle (perform-phase; §1.2 sprite hook
   reinstated 2026-07-20b — see M6/Addendum A) + done beat (render-only,
   `YIELD_EVENTS`), then a small helper-dedup cleanup. Sim untouched in
   steps 1–2. Real "retrieve" sim phase explicitly deferred (spec §6).
   Build log (2026-07-20):
   - **M1 wiggle** ← DONE. `ANIM` block in tuning.ts (5 keys); universal
     two-frame tilt in `drawCat` for any `perform`-phase action (sleep exempt
     via `WIGGLE_EXEMPT`; collapsed never reaches the branch), frame =
     `floor(world.time / ANIM.wiggleFrameMs) % 2`, rotation about the foot
     anchor for both sprite and doodle paths; walk squish suppressed while
     wiggling. Verified: typecheck clean, 73/73 untouched; dev-server canvas
     probe — opposite wiggle frames differ 1552 px vs 398 px same-frame noise,
     and the tilt is feet-anchored (head band 509 changed px vs feet band 29).
     Sim-time clock verified by driving `world.time` directly (F-scaling by
     construction).
   - **M2 done beat** ← DONE. `YIELD_EVENTS` map in main.ts (fished-catch→fish,
     chopped→wood, gathered→vegetable, cooked→soup, scavenged→item; steal
     excluded) forwarding over the bus to `renderer.noteYield`; renderer holds
     an ephemeral `doneBeats` map (never serialized — renderer state only),
     stamps `until` on first painted frame, expires by SIM time, suppressed on
     grab/collapse; front-view + item icon at `doneItemLiftU`/`doneItemScale`.
     Verified: typecheck clean, 73/73 untouched; live-page probes — doneBeats
     after synthetic bus events = exactly the mapped items (miss/stole → empty);
     trophy band above the head: 0 px control noise, 314 px with beat, 0 px
     after sim-time expiry. Note: verification emitted a few synthetic events
     into the running village (harmless cosmetic memories).
   - **M3 sleep/collapsed poses** ← DONE. One-image model: sleep = neutral
     front sprite rotated on its side + slow breathing squish off the SIM clock
     (`sleepBreatheMs`/`sleepBreatheAmp`); collapsed = laid flat the OTHER way
     + `collapsedFlatten`/`collapsedStretch`/`collapsedSplayRad`, motionless.
     Doodle fallbacks kept for sprite-less cats. Verified: typecheck clean,
     73/73 untouched; cloned-sim canvas probes (live village untouched) —
     sleep breathes (1076 px per half-breath vs ~216 px scene noise), collapsed
     still (216 px ≈ noise) and much flatter (63 px vs 103 px silhouette
     height), sleep-vs-collapsed differ by 5055 px (hard rule: not readable as
     sleep — holds).
   - **M4 world-image loader** ← DONE (inert until art lands). Generic loader
     over `assets/world/{2x,1x}` (2x preferred, keyed by basename, per-file
     graceful fallback to the procedural drawings — same pattern as cats).
     Registration constants live at the top of canvas-renderer.ts (§11a "code
     absorbs the residue"). Wired per checklist rows: bonfire = layer_woodpile
     + layer_fire squish-bounce flicker (`ANIM.fireFlicker*`, sim clock; unlit
     = pile alone); tree/stump in-place swap (variety = flip/hue-rotate/lean,
     growth = scale); house stages = woodpile → `HOUSE_SKETCH_ALPHA` sketch →
     full with cached ownerTint wash; market/forage/soupstation-ready stock =
     stacked prop draws (prop image or icon fallback); soupstation cooking =
     fire layer in the pot gap + shipped steam; item icons via prop_* (soup →
     prop_bowl); tile_grass = pattern ground (P4 optional). decal_path loads
     but has no draw site — the sim has no path data (documented in-code).
     prop_rod/ladle/book load; held-prop poses are future work. Verified:
     typecheck, 73/73, `npm run build` green with the world dir empty;
     temp-copied layer_fire+layer_woodpile into world/2x → pile drew from the
     image (0 px wobble noise vs 463 px procedural), lit added 1119 px of
     flame, flicker moved 448 px per half-cycle; files removed → fallback
     returned (loader empty, wobble noise back). `assets/world/{2x,1x}/` dirs
     created with .gitkeep.
   - **Art import wave 1 (2026-07-20, after M1–M5)**: P1 layer kit + P4 ground
     imported to `assets/world/{2x,1x}` — layer_fire, layer_woodpile,
     env_tree (from raw env_roundtree; matches BATCH-4's single round-canopy
     tree), env_stump, tile_grass (LIVE ground tile), decal_path (loads,
     unwired). Raw 1024/1254 generator output was normalized on import
     (subject re-canvased: base→90% line, flame base/pile top→shared 60%
     line) — the raws were each framed differently, so straight copies would
     have floated/misregistered. Raw sources moved to `assets/raw/`
     (env_pinetree.png kept there as an unimported spare; cat wiggle frames
     kept there too — NEVER imported per one-image model). Verified: offline
     composed preview (flame seats on pile top, tree+stump share the ground
     line), in-game probes (all 6 keys loaded; tree draws from image — 0 px
     wobble; lit bonfire flickers 594 px/half-cycle), `npm run build` green.
     Checklist rows flipped to [ADDED] with import note.
   - **M5 helper cleanup (spec §4 items 1–2)** ← DONE. `src/sim/actions/util.ts`
     now owns clamp/writeMemory/trait (verbatim moves; index.ts + reconcile.ts
     import them — reconcile's deliberate M4-era local copies retired now that
     a second consumer exists); `boost(cat, need, delta)` added to
     `src/sim/needs.ts` replacing all 19 inline `Math.min(1, needs + d)` sites
     across index.ts + reconcile.ts (grep-verified none remain; rescue's
     `Math.max` floors intentionally untouched). Pure refactor: typecheck
     clean, 73/73 green, and the 2-day 3-seed digest (1337/42/7 — event
     tallies, final stages/condition, needs sums, final rngState) is
     byte-identical before vs after.
   - **M6 wiggle sprite-hook reinstated (2026-07-20b)** ← DONE. User reversed
     the "procedural-only, no wiggle_[ab] loader widening" call. Spec: anim
     spec Addendum A (§7). Render-only, `src/render/canvas-renderer.ts` only:
     second `import.meta.glob` for `assets/cats/2x/cat_*_wiggle_*.png` → keyed
     `${name}_wiggle_a/b` in the same `catSprites` map; `wigglePair()` returns
     a pair only when both frames are `.complete` && `naturalWidth>0`. In the
     `drawCat` wiggle branch, a resolved pair swaps frames on the SAME
     `floor(world.time/wiggleFrameMs)%2` clock (parity 0=a, 1=b) with `tilt=0`
     and view forced front; no pair → the procedural tilt path runs
     byte-for-byte unchanged (reviewer confirmed by trace). No tuning keys,
     no sim touch. Biscuit's two raw frames (assets/raw/, 1254 px) re-canvased
     to 256/128 with feet baseline + centroid matched to the biscuit neutral
     (baseline 231/231, centroid 137.7/138.1 vs 138.3, subjH 193/193 — no size
     breathing) and imported to `assets/cats/{2x,1x}/`. Verified: typecheck,
     73/73, `npm run build` green with frames present; live-renderer probe
     (drove `world.time` + captured `drawImage`) — biscuit draws wiggle_a at
     parity 0 / wiggle_b at parity 1 with rotation 0; frames hidden → biscuit
     falls back to the neutral at rot ∓0.10 (procedural tilt intact); other
     four cats still procedural (plug-and-play once their pairs are generated
     from BATCH-1). Docs synced: anim spec Addendum A, SPRITE-SPEC §5
     exception, both ASSET-CHECKLISTs, BATCH-1 banner, project CLAUDE.md.
   - **M7 worship pose (built 2026-07-20, reviewed/verified 2026-07-21)** ←
     DONE, UNCOMMITTED. User-supplied `cat_ink_worship.png` (Ink, arms-raised
     "praise" pose) wired as a GENERIC worship pose. Render-only; sim untouched;
     no new serialized state. Spec: anim spec Addendum B. Triggers: `drawCat`
     shows the pose during the `perform` phase of `artifact_visit` or `recruit`
     (any cat in the role — user chose "whoever is in the role", not Ink-only),
     PLUS a transient convert-beat on a freshly-recruited cat — `main.ts`
     subscribes to `recruited` and calls `renderer.noteConvert(e.target)` only
     when `outcome === "join"` (refusals show nothing; verified `"join"` is the
     success literal at actions/index.ts:591). Render (`canvas-renderer.ts`
     only): third `import.meta.glob` for `cat_*_worship.png` → keyed
     `${name}_worship`; `worshipSprite()` returns the cat's own sprite if
     decoded, else the `WORSHIP_DEFAULT_CAT="ink"` default, else undefined
     (→ falls through to the procedural wiggle). New pose branch sits
     collapsed > sleep > **worship** > awake(done-beat/wiggle/walk); wiggle
     suppressed by BRANCH PRECEDENCE, not `WIGGLE_EXEMPT`, so a missing worship
     sprite still wiggles. Feet-anchored idle bob off the SIM clock —
     `h=SPRITE_H*(1+bob)`, `w=SPRITE_H*(1-bob)`, bob = `worshipBobAmp *
     sin(world.time/worshipBobMs*2π)` — pause freezes it, F quickens it. Three
     new `ANIM` keys: `worshipBobMs` 1000, `worshipBobAmp` 0.09,
     `worshipBeatMs` 1200. `worshipBeats` map is ephemeral (never serialized,
     like `doneBeats`). Asset: 760 KB raw re-canvased to 256/128 with feet
     baseline + centroid matched to the Ink neutral (baseline 231/231, centroid
     137.6/138.2 → no jump on swap), all corners α=0, nothing clipped; raw
     archived to `assets/raw/`; `pngjs` added as a devDependency for OFFLINE
     normalization only (grep-confirmed not imported by `src/`). INTENTIONAL
     caveat (documented in Addendum B): a non-Ink convert renders Ink's white
     body until it ships its own `cat_<name>_worship.png` (plug-and-play, zero
     code). Verified: reviewer PASS (13/13 checkpoints), 73/73 tests unchanged,
     typecheck clean, `npm run build` green (`cat_ink_worship` bundled). Docs
     synced: anim spec Addendum B, ASSET-CHECKLIST worship row + never-assets
     note, SPRITE-SPEC §7 naming, project CLAUDE.md pose exception. Deferred
     (each own go-ahead): per-cat worship art for moss/pepper/bramble/biscuit,
     desynced per-cat bob phase, a worship bubble/SFX, any sim-side ritual.
   Asset pipeline (2026-07-20, v2 SIMPLIFIED): user locked a ONE-IMAGE
   model — one image per distinct thing; animation = code transforms (like
   the walk squish), quantity = stacked draws, state = composed layers
   (bonfire = woodpile + bouncing fire layer), variants = code
   flip/lean/tint. `assets/ASSET-CHECKLIST.txt` (v2, 26 required images;
   cats P0 = DONE, sleep/collapsed/emotions procedural; wiggle a/b frame
   pairs are the ONE sanctioned hand-drawn exception (reinstated 2026-07-20b,
   see M6 above — biscuit shipped, others plug-and-play). Detailed 146-name
   list archived as `ASSET-CHECKLIST-DETAILED.txt`; BATCH-2/3-PROMPTS.txt
   CANCELLED, BATCH-1 (wiggle) PARTIALLY REINSTATED. Anim spec §1.2 sprite
   hook restored (Addendum A). `assets/SPRITE-SPEC-REFERENCE.txt`
   still canonical for style/canvas/naming (§11a layer registration added).
   `assets/BATCH-4-PROMPTS.txt`: P1 layer kit (fire/woodpile/tree/stump)
   via 5 prompts — fire+woodpile decomposed from one bonfire image, stump
   derived from the tree. `assets/BATCH-5-PROMPTS.txt`: P2 buildings
   (8 prompts, registration lines for code-composed states; market/forage
   drawn EMPTY, house in tintable pale neutral). `assets/BATCH-6-PROMPTS.txt`:
   P3 items (12 prompts — completes the 26-image required set; P4 ground
   optional). `assets/BATCH-7-PROMPTS.txt`: P4 optional ground (2 prompts —
   seamless grass tile + chainable path decal; import only if it beats the
   procedural ground; LAST planned batch). Prompt authoring method codified in
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
- Task 7 (universal action anim + world-image wiring, M1–M6): built and
  verified 2026-07-20 (73/73, typecheck, build, 3-seed digest byte-identical
  across the M5 refactor). COMMITTED 2026-07-20 (`73afecc` checkpoint asset
  imports, `aca0aab` wiggle sprite-hook).
- Task 7 / **M7 worship pose**: built 2026-07-20, reviewed/verified 2026-07-21
  (reviewer PASS 13/13, 73/73 unchanged, typecheck, build green; asset baseline
  matched to Ink neutral — no jump). Render-only, no serialized state.
  UNCOMMITTED — commit when ready.
- Full suite **73/73** green, typecheck clean. Dialogue arc M0–M4 complete.
- Next (gated, needs go-ahead): M5 expansion. Logged cleanups below are
  optional and also want their own go-ahead.
