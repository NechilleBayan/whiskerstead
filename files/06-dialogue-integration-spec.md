# Dialogue Integration Spec (APPROVED 2026-07-17)

Reconciles the 6700-line dialogue library + the context-aware-dialogue suggestion
against Whiskerstead's actual state.

## 0. Resolved decisions (user-approved)

1. **Start over — write fresh lines to spec.** The library is inspiration and
   category structure only; no text is imported. Kills the noun-scanner, voice
   rewrite, bundle-size, and quarantine problems. Pipeline collapses to
   authoring + gating.
2. **Voice: locked style wins.** All new dialogue is short, lowercase-casual,
   matching the existing `LINES` table. Style guide unchanged.
3. **Dark humor: FULL band, user override.** Cats may joke about their own
   mortality even though the sim has no death. The user explicitly overrode the
   coherence concern (§1 finding 3) — this is approved creative direction, not
   an oversight. Do not "fix" it. Mechanically nothing changes: no death exists.
4. **Volume: ~40 lines per category** across the strongest ~25–30 categories
   (~1000–1200 lines total), four tone bands (normal/dry/unhinged/dark).
5. **Sequence: plumbing first.** M0 selection machinery + bug fixes → M1 state
   gaps + renderer wrap → M2+ content waves. Content lands into tested machinery.

Still open (non-blocking, default = not building): seasons (M5 or never),
predators (rec: never), tutorial/objectives/unlocks (rec: permanent no —
prohibited by locked filters 1 & 4), festival, add-a-cat arrival lines.

## 1. Headline findings

1. **The library was not written for Whiskerstead.** It references stones, baskets,
   maps, mining, harvesting, quarterly reports, visitors, and a first-person-plural
   expedition party ("let us head home with the haul"). This game has fish, wood,
   vegetable, bread, soup, yarn, flowers, trinket, junk — and one bounded field with
   no map. Category gating cannot fix wrong nouns.
2. **The voice violates a locked rule.** `03-content-tables.md` §Bubble Content
   Guidelines: *"short, lowercase-casual, personality-flavored."* The library is
   capitalized, punctuated, literary, long. The existing `LINES` table is correct
   and the library is not. A perfectly-gated wrong-voice line is still wrong.
3. **The Dark humor band (~1675 lines, 25%) contradicts a design pillar.** Cats
   joke about their own deaths in a game with no death ("tell my ghost the meeting
   was cancelled"). That is a factual contradiction about the world — exactly what
   the suggestion doc exists to prevent.
4. **The renderer cannot display these lines.** `canvas-renderer.ts` sizes bubbles
   `measureText + 12`, single line, no wrap, no cap.
5. **Realistic yield after gating + noun scan + voice rewrite: ~800–1200 lines,
   not 6700.** The library is raw material, not a drop-in.

## 2. Category audit summary (67 total)

~21 BACKED · ~32 PARTIAL · ~14 UNBACKED. **BACKED means *gateable*, not *usable*** —
most text in BACKED categories still fails the voice/noun check.

**Strongest fits:** Campfire conversations, Gossip, Memories, Rumors (the
`heard:` memory propagation in `gossip.onComplete` is a real mechanic), Arguments,
Friendship/Rivalry, Sleep talk, Hunger/Tiredness, Near-death/Recovery,
Likes & dislikes, Personality remarks.

**Prohibited — never build** (violate locked filters 1 & 4, not merely unbacked):
Tutorial hints, Objective reminders, Unlock reactions, Story flags.

**Drop:** Contextual one-liners (generic RPG filler), Personal goals, Hopes,
Secrets (no trust axis), Instructions to other cats (no co-op tasks),
Danger warnings (no threats — a harmless predator is theater, a harmful one
breaks the "never takes a cat away" pillar).

**Dormant, not dead:** New arrival (unblocked by the already-specced "add a cat"
feature in `04-bubbles-ui.md`), Celebration/festival, Seasonal.

**Remap rather than build:** Injury/illness → generic unwellness via `stage` +
`condition-changed`; Crafting → cooking (`cooked` carries a `qtier`); Departure →
`ousted`; Story-trigger → the real staged arcs (`world.cult.stage`, `oustCampaign`).

## 3. Bugs found (fix inside this work)

1. `Simulation.weather()` mutates `world.weather` and **emits nothing** — violates
   hard rule 7 and blocks all weather-change dialogue. Add `weather-changed`.
2. `pickLine()` mutates `cat.lineHistory` at pick time, but `speak()` may then drop
   the bubble on cooldown — **lines are burned by bubbles that never appear.**
   Selection must be side-effect-free; commit history only on successful `speak()`.
3. Double bookkeeping: `pickLine` writes `${category}:${line}`, `speak()` writes
   `spoke:${text}` — two suppression records per utterance, different windows.
4. Inline constants in `simulation.ts` (hunger `0.18`, energy `0.15`, bubble cap
   `8`, lineHistory cap `120`) — rule 2 violations, and the hunger/energy bands are
   exactly what the dialogue needs to read.

## 4. Architecture reconciliation (forced changes to the suggestion)

- **Roll, don't max.** Reject `sort desc` + `weightedPickFromTopCandidates`. Mirror
  `Simulation.decide()`: weights → `rng.weightedIndex`. **No sort anywhere.**
  `MIN_DIALOGUE_CONFIDENCE` survives as a hard floor *filter* (legal), not a ranking.
- **Personality = multipliers, never gates.** Delete `allowedPersonalities` /
  `blockedPersonalities`. Personality is a tone-weight multiplier floored at
  `DIALOGUE.toneFloor` so no personality is ever fully excluded.
- **Priority = weight bias, not a hard tier lock.** "Only the highest tier speaks"
  is argmax over tiers. Priority biases score; plus a small set of explicit hard
  suppressions (near-death blocks jokes) as correctness rules, not ranking.
- **Cooldowns use `world.time`, never wall clock.** All tuning to `config/tuning.ts`.
- **Context snapshot: real state only.** Delete `morale`, `isInjured`, `isIll`,
  `biome`, `nearbyThreats`, `temperatureState`, `settlementResources`, objectives,
  unlocks, story flags, player-select/help. Rename to sim vocabulary.
- **Multi-cat ownership:** the bus already names the speaker (`e.cat`, `e.thief`).
  Don't build a relevance-ranking layer.

## 5. Tone

Keep **4 bands** (normal/dry/unhinged/dark), free from line number (01-25/26-50/
51-75/76-100) — the suggestion's 3-tone enum loses information. Per-personality
multipliers in `TONE_WEIGHTS`, every cell floored (never zeroed). Urgency modifier:
at critical/collapsed, unhinged/dark multiply **down**, not to zero.

## 6. Pipeline / layout / milestones

**Committed generated file**, not build-time parse: `tools/build-dialogue.ts`
(dev-only, outside `src/`) → `src/content/dialogue/lines.generated.ts`. Diff-reviewable.

- **Tier 0 (auto, 100%):** id, category, tone.
- **Tier 1 (noun scanner):** allowlist of real Whiskerstead nouns + denylist
  (stones, mining, basket, map, visitor, predator, objective, recipe, "let us"…).
  Hits → **quarantined, not shipped.** Ship the quarantine report as the evidence
  for how much of the library is real.
- **Tier 2 (hand, ~300–600):** survivors naming a real noun get per-line conditions.
- **Tier 3:** voice rewrite against `src/content/bubbles.ts` as reference.
- Parse-time length budget `BUBBLE.maxChars` (~64); renderer wrap is the safety net.

**Layout:** `src/sim/dialogue/{types,context,gates,select}.ts` (headless, no DOM) ·
`src/content/dialogue/{categories,lines.generated,lines.curated}.ts` ·
inspector consumes a pure `trace` object from `select()` and lives in
`src/render/` (never `src/sim/`), off the D overlay; trace must not draw from `Rng`.

**Ambient emitter is NOT an ActionDef** — it would compete with eating/sleeping in
the decision roll. It's a per-cat window in `updateCat` emitting `ambient-window`;
the subscriber *may* speak; silence is the expected common outcome. `lastAmbientAt`
is new per-cat state → must serialize + get a `load()` default.

**Milestones:** M0 plumbing, zero texture change (2-day digest identical for same
seed) · M1 state gaps + renderer wrap · M2 pipeline + BACKED content wave ·
M3 ambient + tone + priority · M4 social depth · M5 expansion (seasons, festival,
arrival) each behind its own go-ahead.

**Tests:** 12 of the suggestion's 20 survive (6 are theater), plus three
non-negotiables it omits: determinism (same seed ⇒ identical bubble transcript),
save round-trip, and "no sort" (rigged scores ⇒ low scorer still reachable).

## 7. OPEN DECISIONS (blocking)

1. **Voice:** rewrite survivors to lowercase-casual (rec) vs amend the style guide?
2. **Dark humor band (~1675):** drop (rec) / hand-filter to ambient-dark-only / accept?
3. **6700 vs ~1000:** full or curated (rec)? Every other problem shrinks or vanishes.
4. **Season field:** cheap + design-sanctioned (`seasonAt(day)`) but is expansion. M5 or never?
5. **Predator/danger:** rec no.
6. **Tutorial / objectives / unlocks:** require overriding locked filters 1 & 4.
   Rec: permanent no. Needs explicit sign-off either way.
7. **Bundle budget:** ~150KB gzipped of strings? Moot under decision 3.
8. **"Add a cat":** confirm on roadmap so arrival lines can be authored dormant.
9. **"Funeral site"** (`01-design-spec.md`) in a no-death game — what is it for?
   Blocks the Departure/Celebration remap.
