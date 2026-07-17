# Whiskerstead — Technical Architecture & Roadmap

## Architecture Principles
Built for **constant evolution/expansion** and **targeted debugging**. New content = new data, rarely new code. Nothing added later may require a core-loop rewrite.

### 1. Headless core, light view
- Simulation runs as its own process/module with zero rendering dependencies.
- Renderer (window now, desktop overlay in Phase 3) only reads state snapshots.
- Sim must run graphics-free for tests and fast-forward.

### 2. Entity-component design
- Cats, buildings, items, sites = entities with components: needs, identity (personality + traits + preferences), inventory, memory, relationships, schedule curves, condition/health.
- Adding a cat, building, or resource is a data operation.

### 3. Actions as data
- Every doable thing (fish, cook, serve, trade, steal, gossip, build, recruit, ritual, rescue, deliver-care, comfort) is a self-contained action definition: eligibility, score inputs, duration, effects, emitted events, bubble hooks.
- Adding "hold festival" later = one new action file.

### 4. Event bus
- Everything notable emits a typed event (traded, stole, collapsed, rescued, befriended, discovered-artifact, joined-cult, ousted…).
- Memory writing, gossip, relationships, stats, and debugging all subscribe. Nothing polls.

### 5. Generic perception
- Cats perceive "nearby reactable things" as one list — buildings, items, and other cats are the same kind of entry. This is what made cat #2 free and keeps every future entity free.

### 6. Persistence
- Full village state saved continuously; app close freezes time (no offline sim in MVP).
- Deterministic RNG with stored seeds → every save reproduces exactly.

### 7. Config-driven tuning
- All numbers from the systems spec (timings, decay rates, weights, thresholds, personality tables, preferences) live in editable data files. Balancing never requires code changes.

## Targeted Debugging Toolkit
1. **Per-cat inspector:** dump one cat's current scores, needs, memories, relationships, last 20 decisions with the multiplier breakdown of each roll.
2. **Event log:** filterable by cat, type, time range.
3. **Seed replay:** reproduce any weird moment from a save + seed.
4. **Headless fast-forward tests:** "run 3 sim-days, assert nobody collapsed / soup station served / no deadlocks."
5. **Time controls (dev only):** pause, step one decision tick, 10× speed.

## Phased Roadmap

### Phase 1 — MVP (plain window)
Soft-grid world with pond, bonfire (center), soup station, bakery, library, market stall, forage patches. Five roster cats with the full identity stack. Complete decision loop, needs + derived health, personal schedules, sleep variation. Spawn build-arc (gather → build house). Grab/drop disruption. Speech/thought bubbles with all limits. Barter + ownership + theft. Soup station full drama chain. Fishing full spec. Cult full spec. Memory, relationships, gossip. Near-death/rescue/recovery. Save/load with freeze. Debug toolkit.

**MVP acceptance test:** launch, don't click, watch ~10 minutes. Distinct recognizable patterns must emerge unprompted (a habitual reader, a sunset pair, a thief, a follower, a shy watcher — the *kind* of thing, not that exact list). Every glance answers "what are they doing?" without menus.

### Phase 2 — Depth
Catch-up sim while closed ("while you were away"). Weather expansion + seasonal visual pass. Deeper gossip chains. Festivals as first new action-file proof. More cats/roles.

### Phase 3 — Desktop
Transparent overlay, click-through + translucency rules (per design spec §Desktop Integration), window climbing, parades, app-launch reactions.

### Phase 4 — Scale
Families/kittens, visitors/strays, districts, professions, second-generation cult/religion systems, village departure events.

## Build Notes for Claude Code
- Language/engine: decide at kickoff (needs: 2D sprites, transparency-capable window later, low idle CPU). Candidates: Godot, Electron+canvas, Tauri+canvas, or native. Idle CPU budget matters more than raw power — this runs all day.
- Structure the repo so `sim/` has no imports from `render/`.
- Write the headless test harness in the first milestone, not last.
- Every tuning constant referenced in 02-simulation-systems.md gets a named config key from day one.
