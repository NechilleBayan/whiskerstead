# 10 — Universal Action Animation (wiggle + done beat)

Status: **DRAFT — awaiting approval.** No build until approved (PRODUCER rule 1).

## 0. Premise correction (what the codebase actually says)

The request was framed as "collapse distinct per-action animations and logic into
one universal model." Reading the code shows:

- **Sim logic is already universal.** All 23 actions (fish, chop, cook, and 20
  others) are single data objects conforming to `ActionDef`
  (`src/sim/actions/types.ts`), registered in one list. Each plugs in with
  exactly the parameters the request asks for: `duration`, `candidates`,
  `appeal`, `onComplete` (where yields happen). Nothing to collapse.
- **No per-action cat animations exist.** `src/render/canvas-renderer.ts` draws
  three cat states: walking squash-stretch, sleep pose, collapsed pose. A cat
  fishing/chopping/cooking stands still in its neutral sprite.
- **No art becomes removable.** Only `cat_<name>_{front,tqfront}_neutral.png`
  exists (5 cats × 2 views × 2 scales).

So this spec is **additive**: the wiggle + done beat is the game's *first*
action animation, built once, universally. Its lasting value is a cap on future
work: any new action animates for free, and future art tops out at **2 wiggle
frames per cat, ever** — instead of frames per cat per action.

### Locked decisions (user, 2026-07-20)
1. **Wiggle art**: procedural now (transform the existing neutral sprite),
   with a sprite hook so hand-drawn `wiggle_a/b` frames auto-upgrade per cat
   whenever they land in `assets/cats/`.
2. **Done beat**: render-side visual only. A real sim "retrieve" phase
   (commit → travel → perform → retrieve) is **deferred, to circle back on** —
   logged in §6.
3. **Outcome logic stays.** Fishing keeps skill tiers + pond accidents, cooking
   keeps quality/bad-pot gossip, chopping keeps tree reservation. Simplification
   is limited to presentation and genuinely redundant code (§4).

## 1. The universal model

All render-side. The sim already provides everything needed:
`cat.action.phase === "perform"` marks a cat mid-action, and every yield already
emits a typed bus event (`fished`, `chopped`, `gathered`, `cooked`, `scavenged`).

### 1.1 Tuning (rule 2 — all numbers in `src/config/tuning.ts`)

```ts
export const ANIM = {
  wiggleFrameMs: 260,   // one wiggle half-cycle (A→B)
  wiggleTiltRad: 0.10,  // procedural tilt of the neutral sprite, ± about the feet
  doneMs: 900,          // how long the "got it!" beat holds
  doneItemLiftU: 30,    // item icon raised above the head during the beat
  doneItemScale: 1.15,  // slight pop on the held-up icon
};
```

### 1.2 Wiggle (perform-phase animation)

In `drawCat`, the state priority becomes:

```
collapsed pose  >  sleep pose  >  done beat  >  WIGGLE (perform)  >  walk/idle
```

- **Trigger**: `cat.action?.phase === "perform"` and action id not in
  `WIGGLE_EXEMPT = new Set(["sleep"])` (sleep and collapsed keep their
  spec-mandated distinct silhouettes; bonfire sitting wiggles for now — easy to
  add to the set if it reads wrong).
- **Frame clock**: `Math.floor(world.time / ANIM.wiggleFrameMs) % 2`. Keyed to
  sim time, not wall clock: fast-forward speeds the wiggle, pause freezes it,
  and no `Math.random()`/`Date.now()` is introduced (renderer wobble exemption
  not needed here).
- **Frame A/B, procedural**: the cat's current sprite (or doodle fallback)
  rotated `−wiggleTiltRad` / `+wiggleTiltRad` around the foot anchor
  (`SPRITE_BASELINE`). Reads as arms/body rocking side to side. Walk squish is
  suppressed while wiggling (amp is ~0 anyway at a standstill).
- ~~**Sprite hook**~~ **DROPPED (2026-07-20 addendum)**: the user has since
  locked a one-image asset model (`assets/ASSET-CHECKLIST.txt`) — cat art
  stops at the shipped neutrals and all states are code transforms. Wiggle
  is procedural-only; no `wiggle_[ab]` loader widening. This *simplifies*
  step 1.

### 1.3 Done beat (optional retrieve visual)

- **Data flow**: the renderer stays a pure snapshot-reader (spec §Architecture),
  so it does not subscribe to the bus. `src/main.ts` (which owns the bus wiring)
  forwards yield events: `renderer.noteYield(catId, itemType)`. The renderer
  stamps `doneBeats: Map<catId, { item, until: world.time + ANIM.doneMs }>`.
- **The one declarative map** (in `main.ts`, next to the wiring):

  ```ts
  const YIELD_EVENTS: Record<string, (e) => string | undefined> = {
    fished:    (e) => e.result === "catch" ? "fish" : undefined,  // miss = no beat
    chopped:   () => "wood",
    gathered:  () => "vegetable",
    cooked:    () => "soup",
    scavenged: (e) => e.item,
  };
  ```

  `steal` is deliberately excluded (a thief holding up the loot defeats the
  sneak); adding any future yield is one line here.
- **Drawing**: while `world.time < until` (and the cat isn't collapsed/grabbed),
  draw the front-view sprite plus `drawItemIcon(item)` lifted `doneItemLiftU`
  above the head at `doneItemScale`. Then the map entry expires naturally.
- **Actions with nothing to retrieve** (wander, socialize, read, bonfire,
  reconcile, …) never fire a mapped event → no beat, they just end. Requirement
  3 is satisfied structurally, not by per-action flags.
- **Edge cases**: fast-forward — beats expire by `world.time`, so they shorten
  visually with speed (correct); save/load — `doneBeats` is ephemeral render
  state, never serialized (save round-trip untouched); grabbed mid-beat — beat
  suppressed by the existing grabbed/collapsed checks.

## 2. Migration of existing actions

- **Sim**: zero changes. Fish/chop/cook already conform to `ActionDef`; per
  locked decision 3, their outcome logic is untouched.
- **Renderer**: nothing to delete — no per-action cat animation exists today.
  What *remains* special, on purpose:
  - sleep + collapsed poses (distinct silhouettes are a spec requirement —
    collapsed "must NOT read as sleep");
  - building effects (soup-pot steam, bonfire flame, library window glow) —
    these are world-state indicators on buildings, not cat action animations,
    and stay as-is.
- **Assets**: nothing removable. The model *prevents* a future asset explosion
  (2 wiggle frames per cat covers all current and future actions).

## 3. Files touched

| File | Change |
|---|---|
| `src/config/tuning.ts` | add `ANIM` block (5 keys) |
| `src/render/canvas-renderer.ts` | wiggle branch in `drawCat`, `WIGGLE_EXEMPT`, `doneBeats` map + `noteYield()`, loader glob widened |
| `src/main.ts` | `YIELD_EVENTS` map + one bus subscription forwarding to `noteYield` |
| `src/sim/**` | **no changes** (steps 1–3) |

## 4. Simplification pass — candidates found elsewhere

Reviewed the sim, renderer, and content for per-case code that could share a
generic pattern. Candidates, with tradeoffs:

1. **Duplicated helpers in `reconcile.ts`** (`clamp`, `writeMemory`, `trait`
   are verbatim copies of private helpers in `actions/index.ts`). → Extract
   `src/sim/actions/util.ts`. The M4 spec chose local copies deliberately, but
   a second consumer exists now and a third will come. Low risk, pure move.
   **Recommended.**
2. **Need-boost pattern** — `cat.needs.X = Math.min(1, cat.needs.X + d)`
   appears ~15 times across actions. → `boost(cat, "social", 0.3)` in
   `src/sim/needs.ts` (which already owns `feed`/`rest`). Mechanical, low risk;
   tradeoff is one hop of indirection. **Recommended.**
3. **Yield pattern** — `give(cat, makeItem(type, …)); emit(…); cat.emotion = …`
   repeats across fish/gather/chop/scavenge. → a 3-line `yieldItem(ctx, type,
   {quality, event})` helper. Keeps each action's distinctive logic (skill,
   accidents) fully intact. Tradeoff: the helper must stay tiny or it grows
   flags; only extract the literally-identical lines. **Optional.**
4. **`eat`'s per-building branching** (soup-station / market / bakery each
   bespoke) → data table `{buildingType → stateKey, food, decrement}`. Only 3
   cases; abstraction not yet cheaper than the switch. **Defer** until a 4th
   food source lands.
5. **Building effects** (steam/flame/glow) → generic `effects` descriptor per
   building. 3 bespoke cases, each visually distinct; a descriptor would cost
   more than it saves. **Not recommended.**
6. **`actions/index.ts` at ~1,055 lines** → split one file per action (rule 3
   already frames actions as files). Pure reorganization: no behavior change,
   but real churn + git-blame noise across the most-edited file. **Defer**;
   split opportunistically when an action is next touched.
7. **Item-type knowledge scattered** — `isFood()` in sim, icon color map in
   renderer, type strings inline everywhere → single `ITEMS` table in
   `src/content/`. Nice-to-have, medium churn. **Defer.**
8. *(Adjacent, already logged in PROJECT-STATE known issues, not part of this
   work)*: module-level `itemCounter` not serialized.

## 5. Implementation order (lowest risk first) + verification

Each step is independently shippable and verified before the next (rule 4).

1. **Wiggle + `ANIM` tuning + sprite hook** — render-only. Verify: `npm run
   typecheck`; `npm test` (must be untouched, 73/73); dev server — watch a
   fisher at the pond, a chopper at a tree, the cook at the pot all wiggle;
   press F to confirm fast-forward scales it; sleep/collapsed silhouettes
   unchanged.
2. **Done beat** (`YIELD_EVENTS` + `noteYield`) — render-only. Verify: catch vs
   miss at the pond (beat only on catch), chop yield, soup ready; wander/read/
   socialize end with no beat; grab a cat mid-beat.
3. **Cleanup: candidates 1 + 2** (helper extraction; optionally 3) — first
   sim-touching step. Verify: `npm test` + typecheck + 2-day digest per
   CLAUDE.md habit (same-seed event tallies should be identical — these are
   pure refactors with no rng-draw changes).
4. **Stop.** Candidates 4–7 want their own go-ahead.

## 6. Deferred (each behind its own go-ahead)

- **Real sim "retrieve" phase** — user wants to circle back: cat is genuinely
  busy holding up the catch (stealable window, duration in sim time). Touches
  `CatAction` phases, serialization, tests.
- Hand-drawn `cat_<name>_wiggle_a/b.png` frames (auto-upgrade via §1.2 hook).
- Simplification candidates 4–7 (§4).
