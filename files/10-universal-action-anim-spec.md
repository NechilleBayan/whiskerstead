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
  → **Biscuit reinstated 2026-07-20, see Addendum A**; other cats remain open.
- Simplification candidates 4–7 (§4).

## 7. Addendum A — hand-drawn wiggle frames (2026-07-20)

User decision: the "procedural-only, no `wiggle_[ab]` loader widening" call is
REVERSED for wiggle pairs. When `cat_<name>_wiggle_a.png` **and** `_b.png` both
exist in `assets/cats/2x/`, the perform-phase wiggle swaps those two frames on
the existing sim-time clock instead of tilting the neutral sprite; cats without
a complete pair keep the procedural tilt exactly as shipped.

### Approach

Two small passes, code first (the loader hook is inert until files exist, same
pattern as the M4 world-sprite wiring):

- **M-A (builder, code):** widen the cat loader + amend the `drawCat` wiggle
  branch in `src/render/canvas-renderer.ts`. Render-only; `src/sim/` untouched;
  no new tuning keys.
- **M-B (asset normalization):** re-canvas the two Biscuit raws from
  `assets/raw/` to spec and ship to `assets/cats/{2x,1x}/`.

### M-A — code changes (`src/render/canvas-renderer.ts` only)

**A1. Loader**

- Add a second `import.meta.glob` beside `CAT_SPRITE_URLS` (globs must be
  static strings): `"../../assets/cats/2x/cat_*_wiggle_*.png"` with the same
  `{ eager, query: "?url", import: "default" }` options.
- Match paths with `/cat_([a-z]+)_wiggle_([ab])\.png$/` and store into the
  **existing** `catSprites` map under keys `${name}_wiggle_a` /
  `${name}_wiggle_b`. No collision with `${name}_${view}` keys (no view is
  named `wiggle_a`).
- Private helper `wigglePair(catId): { a, b } | undefined` — returns the pair
  **only if both images exist, are `complete`, and have `naturalWidth > 0`**.
  Anything less (one file, still decoding, broken) → `undefined` → procedural
  fallback. This is the entire per-cat fallback rule; no config, no lists.

**A2. `drawCat` wiggle branch**

Behavioral contract — everything not listed is byte-for-byte today's behavior:

- `wiggling` predicate unchanged (`!beat && !cat.grabbed && phase === "perform"
  && !WIGGLE_EXEMPT.has(id)`).
- Frame clock unchanged — `Math.floor(world.time / ANIM.wiggleFrameMs) % 2`,
  sim time. Parity 0 → frame **a**, parity 1 → frame **b** (matches today's
  parity-0 = `-wiggleTiltRad` left lean; frame A is authored as the left lean).
- **When `wigglePair(cat.id)` resolves and the cat is wiggling:**
  - Draw the a/b frame as `img` instead of the neutral. **Procedural tilt is
    fully dropped** (`tilt = 0`) — the frames encode the lean; residual
    rotation would double-lean and read as drift.
  - **View:** frames are front-view art and win over `anim.view` for the
    duration of the wiggle — same rule as the done beat. Accepted consequence:
    a cat that starts performing before the stop-hold elapses pops tqfront →
    front one transition earlier than today (same transition that already
    happens at every full stop). Do NOT gate frames on `anim.view === "front"`
    (art-style swap mid-wiggle is worse).
  - **Mirroring:** keep `ctx.scale(-anim.dir, 1)` exactly as today (the a/b
    rock is symmetric; mirroring merely swaps which half-cycle shows which
    lean — visually identical).
  - **Strained squish:** unchanged — frames go through the same
    `h = SPRITE_H * (strained ? 0.94 : 1)` and baseline drop. Walk-squish
    suppression (`wob = 0` while wiggling): unchanged.
  - **Inventory item icon** and **done-beat priority** unchanged; frames never
    draw during a beat.
- **When the pair is absent** (moss/pepper/ink/bramble, or mid-decode): the
  current procedural tilt path runs unmodified, including the doodle-fallback
  tilt for sprite-less cats.
- Update the §1.2 comment block above the branch to mention the sprite upgrade.

No changes to `src/config/tuning.ts` (`wiggleFrameMs` reused; `wiggleTiltRad`
stays for fallback cats), `src/main.ts`, or `src/sim/**`.

### M-B — asset normalization (Biscuit only)

Inputs: `assets/raw/cat_biscuit_wiggle_{a,b}.png` (RGBA, transparent,
~1024×1254 raw generator canvas, off-registration). Outputs:
`assets/cats/2x/cat_biscuit_wiggle_{a,b}.png` (256×256) and `assets/cats/1x/…`
(128×128, clean 50% downscale per SPRITE-SPEC-REFERENCE §6). Engine reads 2x
only; 1x ships for convention parity.

Process (art-import-wave-1 precedent — raws are re-canvased, never straight-
copied):

1. **Measure the reference** `assets/cats/2x/cat_biscuit_front_neutral.png`:
   subject alpha bbox (threshold α ≥ 8), lowest opaque row = feet baseline
   `yRef`, x-centroid of the feet region (bottom ~10% of subject rows) = `xRef`.
2. **Measure each raw** the same way.
3. **One shared scale factor for both frames** (a/b must not breathe in size):
   start from `subjectHeight(ref) / subjectHeight(rawA)`, apply identically to
   B, visually compare against the neutral at display size (~64–96 px), adjust
   within ±5% if the lean makes height misleading. Lock one number for both.
4. **Placement:** feet-region x-centroid → `xRef`; lowest opaque row → `yRef`.
   Aligning by the feet region (not the full bbox, which the head lean skews)
   guarantees the §11 "flip shows only intended movement" check. Same rule for
   both frames.
5. **Tooling:** throwaway script in the session scratchpad (PowerShell
   `System.Drawing` or equivalent). No npm dependencies; script not committed.
   Raws stay archived in `assets/raw/` as sources, now marked imported.

### Acceptance criteria

**M-A (before M-B lands — hook must be inert):**
- `npm run typecheck`, `npm test` (untouched — render-only), `npm run build`
  all green.
- Dev server: all 5 cats wiggle procedurally exactly as before; sleep/
  collapsed/done-beat/walk unchanged; F fast-forward still scales the wiggle.

**M-B (per SPRITE-SPEC §11 plus this feature):**
- Both 2x files 256×256 RGBA, all four corner pixels α = 0, nothing clipped.
- Feet baseline within ±2 px of the neutral's `yRef`; subject scale visually
  matches the neutral side-by-side at display size.
- A/B flip test (offline pixel diff): changed pixels concentrated in the upper
  body; feet-band (bottom ~20% of subject) diff a small fraction of the
  head-band diff (M1 precedent shape: feet 29 px vs head 509 px).
- In-browser probe (`window.__renderer` / `window.__sim`, D overlay, F):
  Biscuit mid-perform draws the frames (opposite-frame pixel diff well above
  same-frame noise, per the M1 probe pattern), **no rotation applied**; the
  other four cats still tilt procedurally; frame swap freezes on pause and
  speeds under F; temporarily removing the two files restores Biscuit's
  procedural tilt.
- `npm run build` green with the files in place.

### Doc updates (part of the milestones, not optional)

1. This file — done by this addendum (§1.2 hook reinstated, §6 annotated).
2. `assets/SPRITE-SPEC-REFERENCE.txt` §5 — add: *"Exception (locked
   2026-07-20b): `cat_<name>_wiggle_<a|b>.png` is the ONE sanctioned frame
   pair. A complete pair auto-upgrades that cat's perform-phase wiggle;
   missing pair = procedural tilt. Everything else remains one-image."*
3. `assets/ASSET-CHECKLIST.txt` — P0 banner softened (wiggle pairs are the
   sole permitted cat art); `wiggle` row reworded to "procedural fallback;
   hand-drawn a/b pair auto-upgrades per cat"; P1 IMPORT NOTE's "NEVER-import"
   clause for wiggle frames removed; cancelled-list drops "wiggle frames".
4. `assets/ASSET-CHECKLIST-DETAILED.txt` — flip the two biscuit wiggle rows to
   `[ADDED]` with import note; other cats' rows stay `[ ]` (ENGINE: READY).
5. `assets/BATCH-1-PROMPTS.txt` — amend the CANCELLED banner: wiggle-frame
   prompts reinstated; all other cancelled cat prompts remain cancelled.
6. `CLAUDE.md` (project) — the "never propose new cat sprites" sentence gets a
   wiggle-pair exception, or future sessions will fight this change.
7. `PROJECT-STATE.md` — log entry under item 7's build log.

### Edge cases

- Only one of a/b present → procedural (pair helper requires both ready).
- Sprites decoding on first frames after load → procedural until `complete`.
- Grabbed / done beat / sleep / collapsed → wiggle (either kind) never draws.
- Strained/critical cat with frames → same 0.94 squish + baseline drop.
- Save/load, determinism, tests: zero sim surface; clock stays on `world.time`.

### Out of scope

- Wiggle frames for moss/pepper/ink/bramble (plug-and-play once generated from
  BATCH-1 prompts — drop files in, zero code).
- Sleep/collapsed frame pairs (still procedural, §7 P2 reserved names only).
- Any new cat art proposals; any `src/sim/` change; real "retrieve" phase.

## 8. Addendum B — Worship pose (2026-07-20c)

User decision: a SECOND sanctioned hand-drawn pose joins the wiggle a/b pair — a
`cat_<name>_worship.png` reverence sprite (arms raised) for the cult beats. Same
plug-and-play discipline as Addendum A: the loader hook is inert until a file
exists, and a cat with no worship sprite of its own falls back to ink's body
until its own ships (auto-upgrades, zero code). Render-only; `src/sim/`
untouched; no new serialized state (the convert-beat map is ephemeral, exactly
like `doneBeats`).

### Approach — one code pass + one asset normalization

- **Loader (`canvas-renderer.ts`):** a third `import.meta.glob` beside
  `CAT_WIGGLE_URLS` — `"../../assets/cats/2x/cat_*_worship.png"`, same options.
  Match `/cat_([a-z]+)_worship\.png$/` and store into the existing `catSprites`
  map under `${name}_worship` (e.g. `ink_worship`). No key collision.
- **Generic lookup with ink default:** `worshipSprite(catId)` returns the cat's
  own `${catId}_worship` if decoded (`complete && naturalWidth > 0`), else the
  ink default (`WORSHIP_DEFAULT_CAT = "ink"`), else `undefined` (missing/decoding
  → falls through to the procedural wiggle). This is the entire per-cat fallback
  rule; no config, no lists.

### Triggers (three)

1. **`artifact_visit` perform** — a cat at the shrine reads as reverent.
2. **`recruit` perform** — the founder's pitch reads the same.
3. **Convert beat** — a successful recruit holds the pose briefly after the
   perform ends. `main.ts` (which owns the bus wiring; the renderer stays a pure
   snapshot-reader) subscribes to the `recruited` event and calls
   `renderer.noteConvert(target)` **only when `outcome === "join"`** — refusals
   never worship. The renderer stamps `worshipBeats: Map<catId, { until }>`,
   `until < 0` = stamp on the next painted frame (mirrors `doneBeats`), held
   `ANIM.worshipBeatMs`, cleared under grab / collapse / sleep.

### Rendering

- **Pose ladder:** `collapsed > sleep > WORSHIP > done beat > wiggle > walk/idle`.
  The worship branch sits between the sleep block and the awake `else`, gated on
  a decoded `worshipImg`.
- **Feet-anchored idle bob on the SIM clock** (pause freezes it, fast-forward
  quickens it — no `Math.random`/`Date.now`): `bob = worshipBobAmp *
  sin(world.time / worshipBobMs * 2π)`, `h = SPRITE_H*(1+bob)`,
  `w = SPRITE_H*(1−bob)`, drawn `SPRITE_BASELINE − h` so the feet stay pinned at
  the baseline exactly like the neutral (no jump on swap-in). Symmetric pose —
  **no facing mirror**, no carried-item icon, no strained modifier.
- **Wiggle suppression is by branch precedence only** — the worship branch sits
  above the wiggle-bearing `else`, so nothing is added to `WIGGLE_EXEMPT`. The
  deliberate consequence: when no worship sprite is decoded, `artifact_visit` /
  `recruit` still fall through to the normal procedural wiggle.

### Tuning (three keys appended to `ANIM`)

```ts
worshipBobMs: 1000,   // full bob period (2π); brisker than the 1600 sleep breath
worshipBobAmp: 0.09,  // ~2.25x sleep-breathe amp, under the 0.12 fire ceiling
worshipBeatMs: 1200,  // convert-beat hold; > 900 done beat so >=1 full bob cycle shows
```

### Intentional caveat

Only `cat_ink_worship.png` ships today. A **non-ink** cat worshipping shows
**ink's body** (the `WORSHIP_DEFAULT_CAT` fallback) until it ships its own
`cat_<name>_worship.png` — at which point it auto-upgrades with zero code. This
is accepted on purpose: the cult founder/converts are usually few, and a shared
reverence silhouette reads fine as a placeholder.

### Files touched

| File | Change |
|---|---|
| `src/render/canvas-renderer.ts` | worship glob + loader loop, `worshipSprite()` helper, `worshipBeats` map + `noteConvert()`, worship branch in `drawCat` |
| `src/config/tuning.ts` | `ANIM` += `worshipBobMs / worshipBobAmp / worshipBeatMs` |
| `src/main.ts` | one `recruited`/`join` bus subscription forwarding to `noteConvert` |
| `assets/cats/{2x,1x}/cat_ink_worship.png` | raw re-canvased to 256/128, feet baseline matched to the ink neutral |
| `src/sim/**` | **no changes** (render-only) |

### Out of scope

- Worship sprites for biscuit/moss/pepper/bramble (plug-and-play — drop a
  `cat_<name>_worship.png` in, zero code; ink's body stands in until then).
- Any `src/sim/` change; any real "retrieve"/reverence sim phase.
