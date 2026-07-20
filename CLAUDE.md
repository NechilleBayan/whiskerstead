# Whiskerstead — working notes for Claude Code

## What this is
Autonomous doodle-cat village sim (TypeScript + Vite + canvas). The design docs in `files/` are the source of truth; read them before changing behavior. `01-design-spec.md` has four locked design filters every feature must pass.

## Commands
- `npm run dev` — Vite dev server (http://localhost:5173)
- `npm test` — headless sim tests via `node --test --experimental-strip-types` (no browser)
- `npm run typecheck` / `npm run build`

## Hard rules (from the specs — do not violate)
1. `src/sim/` must never import from `src/render/` or touch the DOM. The sim runs headless in tests.
2. Every tuning number lives in `src/config/tuning.ts` with a named key — never inline constants in behavior code.
3. New behaviors are new action files in `src/sim/actions/` conforming to `ActionDef` — not edits to the decision loop.
4. Decisions are weighted-random ("roll, don't max"), never argmax. Personality tables are multipliers, never gates or absolute responses.
5. No permanent death, no outcome-erasure: condition floors at `HEALTH.criticalFloor`, consequences write memories that persist.
6. Determinism: all randomness goes through the seeded `Rng` instance owned by `Simulation`. Never use `Math.random()` in `src/sim/` (renderer wobble is exempt). Saves must round-trip exactly — the test suite asserts this.
7. Everything notable emits a typed event on the bus (`src/sim/events.ts`); subscribers react, nothing polls.

## Verification habit
After sim changes: `npm test`, then run a 2-day digest (see scratchpad pattern: instantiate `Simulation(createWorld(seed))`, tick in 200ms steps, tally bus events) and sanity-check the story texture — cats should eat, sleep, argue, and recover; no cat should end permanently collapsed; the cult should grow slowly (recruit cooldown is 1 game-day per target).

## Dev hooks
`window.__sim` and `window.__renderer` are exposed in the browser for inspection.
Debug overlay: press **D**. Fast-forward: **F**. Weather: **1/2/3**.

## Asset generation prompts
When the user asks for image-generation prompts or an asset batch, follow
`assets/PROMPT-AUTHORING-GUIDE.txt` exactly (one-image model, decompose-don't-
compose layering, batch file format, checklist/PROJECT-STATE updates). Track
assets in `assets/ASSET-CHECKLIST.txt`; style/canvas rules live in
`assets/SPRITE-SPEC-REFERENCE.txt`. Cats are art-complete — never propose new
cat sprites; all cat states are code transforms of the 10 shipped neutrals.
The sanctioned exceptions are TWO hand-drawn pose types: (1) reinstated
2026-07-20b, `cat_<name>_wiggle_<a|b>.png` frame pairs — a complete pair
auto-upgrades that cat's perform-phase wiggle, a missing pair falls back to the
procedural tilt (Biscuit's pair is shipped; the other four cats' pairs are
plug-and-play — drop files in `assets/cats/{2x,1x}/`, zero code); and (2) added
2026-07-20c, `cat_<name>_worship.png` — an arms-raised reverence pose for the
artifact_visit/recruit performs and the convert beat. Ink's is shipped; a cat
with no worship sprite of its own shows ink's body until it ships one (drop a
file in, zero code). See `files/10-universal-action-anim-spec.md` Addenda A + B.
