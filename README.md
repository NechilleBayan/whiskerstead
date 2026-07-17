# Whiskerstead

> A tiny world that keeps living while you live yours.

An autonomous doodle-cat village that quietly lives on your desktop. Five cats with layered identities — occupation, personality, traits, preferences, memories, relationships — make weighted-random decisions, form routines, cook questionable soup, fish, gossip, occasionally found a cult, and rescue each other from collapse. No fail states, no alerts, no chores. You can watch, or gently interfere.

Design documents live in [`files/`](files/) — they are the source of truth for every system.

## Run it

```bash
npm install
npm run dev      # opens http://localhost:5173
```

- **Drag a cat** — it drops its intention, reacts, and may permanently remember where you put it.
- **D** — debug overlay (per-cat needs/actions, live event log)
- **F** — 12× fast-forward
- **1 / 2 / 3** — clear / rain / storm

State autosaves to localStorage; closing the tab freezes time (per design: nothing advances while away).

```bash
npm test         # headless fast-forward tests (no browser, no rendering)
npm run typecheck
npm run build
```

## Architecture (per files/04-technical-architecture.md)

```
src/
  config/tuning.ts      # every tuning constant, named, in one place
  content/              # data: roster cats, personality weight tables
  sim/                  # HEADLESS core — zero imports from render/
    rng.ts              # deterministic seeded RNG (saves reproduce exactly)
    events.ts           # typed event bus; memory/gossip/debug subscribe
    types.ts            # entity-component state (cats/buildings/items/sites)
    world.ts            # village construction
    time.ts             # 60-min game day, 5 phases, scoring-weight shifts only
    needs.ts            # 5 needs + derived floored health (no death)
    perception.ts       # generic "nearby reactable things" list
    scoring.ts          # identity bias × urgency × memory × time-of-day
    simulation.ts       # two-clock loop: frame update + decision tick
    actions/            # actions-as-data; one file adds a behavior
  render/               # canvas doodle renderer — reads state, never writes
  main.ts               # the only place sim and render meet
test/                   # node --test headless harness
```

Key invariants (locked by the design spec):
- **Roll, don't max** — decisions are weighted-random; near-misses firing is where stories come from.
- **Personality influences, never determines** — archetype tables are multipliers, never gates.
- **No permanent death** — condition floors at critical; collapse waits for rescue (villager or player).
- **Consequences persist** — no outcome-softening; bad soup, theft, and grudges write memories that permanently shift future scoring.
- **Deterministic** — same seed ⇒ same village history; saves round-trip exactly (tested).

## Roadmap status

- **Phase 1 (MVP, plain window)** — **complete.** Core loop, needs/health, identity stack, fishing (with condition-gated pond accidents + rescue), soup station with the full ousting drama chain (pattern → campaign → defended / apology / cook-off / angry-quit branches), theft/begging escalation ladder, spawn build-arc (materials → frame → house), gossip with secondhand-opinion spread, comforting, cult offerings + shrine + scavenging, schedule anchors (Biscuit opens the station pre-dawn; Ink reads at night), bubble content pass with per-cat duplicate suppression, weather as a scoring input (shelter, bonfire refuge, one idiot chasing butterflies in the rain), artifact discovery + cult founding/recruitment (per-target cooldown, never mechanically dominant), near-death/rescue, grab/drag/release, save/load (`?fresh` to restart), debug overlay, 16-test headless harness. Passes the 10-minute acceptance probe across seeds: recognizable per-cat patterns emerge unprompted.
- **Phase 2** — catch-up sim, weather/seasons, festivals, more cats.
- **Phase 3** — desktop overlay (transparent, click-through; sim core unchanged).
- **Phase 4** — families, visitors, districts.

**Wood economy** — a regrowing forest frames the field (dense left/top/right bands, sparse bottom corners, open center; deterministic per seed with configurable exclusion zones in `FOREST`). Trees run a state machine: growing → mature → reserved → chopping → stump → regrowing → mature. One cat per tree (reserved at decision-commit, self-healing on interruption), 3–5 wood per chop, ~4s base chop scaled by cat work speed. Wood is consumed by house construction (per-stage cost) and the campfire (lighting costs fuel from the woodpile or a carried bundle; cats deliver spare wood). All costs live in `TREES` config — future workbench/recipe sinks plug into the same resource.

Placeholder canvas doodles stand in for art; the real asset plan (palette-first, Biscuit-first) is in `files/00-style-guide.md`.
