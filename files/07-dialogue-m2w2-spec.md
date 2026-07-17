# Dialogue M2 wave 2 spec (APPROVED 2026-07-18)

Expand the strongest existing event-driven bubble categories to ~40 fresh
locked-voice lines each across four tone bands, by **migrating** them from the
flat `LINES` table (`src/content/bubbles.ts`) into the toned `TONED_LINES`
table (`src/content/dialogue/lines.ts`). Content + one test file only — zero
behavior-code changes.

## Central decision: MIGRATE (delete from `LINES`, add to `TONED_LINES`)
`selectLine` resolves `LINES[category]` first, then falls through to
`TONED_LINES[category]`. Removing a category from `LINES` and adding it to
`TONED_LINES` under the **same name** makes selection fall through
automatically — every `say(cat, "fish_catch")` call in `simulation.ts` keeps
working unchanged. A category must live in exactly one table (LINES wins if in
both), so migration is a complete move, never a copy. Rationale: M3 applies
per-personality `TONE_WEIGHTS` at selection; the core, loudest event bubbles
must carry tone bands to participate. Files edited: `bubbles.ts`, `lines.ts`,
`test/dialogue-m2.test.ts` only. `simulation.ts`/`categories.ts`/`tuning.ts`
untouched (these are event-driven, not ambient — no gate/weight entries).

## Per-category plan (30 LINES categories classified)
Default full split: normal ~12 / dry ~10 / unhinged ~10 / dark ~8 (normal
heavy so M3's critical-state tone-down of unhinged/dark never starves lines).

**A. FULL EXPAND — migrate, ~40 lines, 4 bands (15):** fish_catch, fish_miss,
eat_good, eat_bad, cook_done, build, gossip_open (only category using `{who}`),
argue (NO `{who}`), beg, comfort, scavenge, chop, steal_success, cookoff,
oust_campaign (NO `{who}`).

**B. MODERATE EXPAND — migrate, narrower registers (6):** beg_refused ~30;
confront_apology ~24 (sincere; rephrase "new recipes"→"new pots"); confront_quit
~24 (dramatic); confront_defended ~24; cult_visit ~28 (eerie, cryptic-heavy,
"fourth bell"/"the shape"); cult_recruit ~24 (outward lure).

**C. KEEP TERSE — stay flat in `LINES`, NOT toned (4):** pond_accident,
steal_caught, rescue, recovered. Crisis/panic — padding to 40 breaks voice and
the near-death priority rule blocks jokes here. Optional modest flat bump to
~6-8 lines, still single-pool.

**D. DORMANT — leave byte-for-byte in `LINES` (5):** greeting, sleep, rain,
storm_fear, chase. No live `say()` trigger references them (rain/storm_fear/
sleep superseded by wave-1 toned categories). Expanding = content nothing
shows. Deletion is a later cleanup pass, own go-ahead.

Tally: 21 migrated + 4 terse-flat + 5 dormant = 30. With wave 1's 15 toned
categories → 36 toned categories, ~1265 toned lines (inside §0.4's 1000-1200).

## Personality→band map
`any` is ~65% of each band; add 0-3 fitting personality pools (1-2 lines).
planner→normal,dry · chaos→unhinged · optimist→normal · cynic→dry,dark ·
cryptic→unhinged,dark. Rehome existing distinctive personality lines into the
fitting band; never drop them. Valid personality keys: planner, chaos,
optimist, cynic, cryptic (+ any).

## Voice brief
1. Short: 2-6 words, hard cap `BUBBLE.maxChars`=64. One thought per bubble.
2. lowercase-casual; caps only for deliberate SHOUTING; minimal punctuation
   ("…" trailing, "!!" excitement); fragments/contractions.
3. Personality-flavored, never gated (pools merge with `any`).
4. Only real Whiskerstead nouns (allow/deny below).
5. Dark band = full mortality-joke license (§0.3 user override — do NOT
   soften). The joke is the speaker's wry musing, never a claim a cat died or
   was taken. Doodle-cute-dark, not grim.

## Nouns
ALLOW: fish, wood, vegetable (herb/tomato/mushroom/root), bread, soup, yarn,
flowers, trinket, junk; pond, bonfire/fire, library, bakery, soup station,
market/stall, house(s), forage patch, trees/grove/forest, field, stump,
sapling; pot, ladle, bowl, ration; wall, nail, hammer, log, wood pile, frame;
rain, storm, clear, sun, moon, stars, clouds, dew, puddle, mud, thunder, wind;
paw, whisker, fur, tail, ear, purr, toe beans, claw, hiss, nap, mrow/mrrp;
(cult only) the fourth bell, the shape, the artifact/site, it hums.
FORBID: seasons (winter/summer/spring/autumn/snow/frost/ice); predators/threats
(wolf/fox/hawk/snake/bear/hunter/monster/beast/danger/attack); visitors/humans
(human/person/hand/giant/owner/master/stranger/traveler); money (coin/gold/
price/wage); tools/geo the world lacks (map/compass/mine/quarry/stone-as-
material/basket/cart/boat/net/rod/road/mountain/river/ocean/sea/lake/city/farm);
meta/RPG (quest/objective/level/XP/unlock/mission/inventory/stats); "let us…"
and literary/capitalized register; recipe/recipes (use pot/soup). No line may
state a cat actually died or was taken (dark-band mortality JOKES are fine).

## {who} rule
Only `gossip_open` may use `{who}` (its `say()` passes `fill.who`). All other
wave-2 categories pass no fill — a `{who}` token would render literally. `{who}`
stays valid in untouched wave-1 friend/crush/rival_milestone + campfire_talk.

## Uniqueness
Every authored line unique across BOTH tables (raw string, `{who}` literal).
Migrated categories' old flat lines are freed (removed from LINES) — safe to
rehome. Do not duplicate lines that REMAIN in LINES (terse-flat + dormant) or
any wave-1 toned line. The test audit names colliding pairs on failure.

## Test changes (`test/dialogue-m2.test.ts`)
1. Wave floor `total >= 400` → `>= 900`.
2. Append the 21 migrated ids to the existence check.
3. New MIGRATED guard: for each of 21, assert `!(id in LINES) && id in TONED_LINES`.
4. Per-category minimums: 15 full ≥30, 6 moderate ≥18.
5. Assert 4 terse-flat + 5 dormant remain `in LINES`.
6. Uniqueness audit already spans both tables — unchanged.
7. Optional: extend non-empty + maxChars check to LINES lines too.

## DONE checklist (reviewer)
1. `npm test` + `npm run typecheck` green.
2. 21 migrated categories in TONED_LINES, absent from LINES; simulation.ts call
   sites unchanged.
3. 15 full ≥30 lines, 6 moderate ≥18; every band ≥1, every category ≥4.
4. 4 terse-flat + 5 dormant remain in LINES (dormant byte-for-byte).
5. Every line ≤64 chars, non-empty, globally unique across both tables.
6. No forbidden noun (spot-check; no "recipe").
7. `{who}` only in gossip_open (+ untouched wave-1 categories).
8. Dark mortality jokes present, not softened; no actual-death claim.
9. Personality lines distributed per band map; distinctive old lines rehomed.
10. Files changed: bubbles.ts, lines.ts, dialogue-m2.test.ts only.
11. 2-day digest healthy; per-seed divergence from wave-1 baseline expected
    (larger pools shift RNG alignment); determinism (same seed twice) holds.
