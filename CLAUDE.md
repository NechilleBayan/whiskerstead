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
