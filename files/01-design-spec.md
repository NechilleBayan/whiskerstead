# Whiskerstead — Design Spec

## North Star
A tiny world that keeps living while you live yours.

One-sentence test: "It's a tiny village that quietly lives on your desktop while you do your own work."

## The Fantasy (Phase 0)
The player is quietly sharing their desktop with an autonomous village that has its own routines, relationships, and stories.

### Locked design filters (every feature must pass all four)
1. **No-fail contract.** The village is genuinely fine without the player. No streaks, alerts, guilt loops, or obligation. Player influence is optional garnish.
2. **Routine-based life.** Daily rhythms (morning fishing, evening bonfire) are the backbone; personality is variation on top.
3. **Persistent world.** Cross-session memory is load-bearing. A village that forgets has no stories of its own.
4. **Quiet output.** Nothing functions as an alert. All output is ignorable by design and rewarding on return.

## Design Pillars
Living / Personality / Emergent Stories / Ambient / Gentle Influence / Delight.

Governing rules collected during planning:
- Personality **influences** behavior, never **determines** it. No absolute responses anywhere.
- Bad outcomes create **stories before punishment**.
- Needs create **decisions and social pressure**, not chores.
- The village can scare you and worry you, but it never permanently takes a cat away.
- No outcome-softening guardrails: consequences land fully and persist as memory.

## Player Interaction (Gentle Influence)
Player can: pick up / place cats, build houses, place furniture, designate jobs, throw toys, feed, change weather, move/hide the artifact, place offerings, interrupt rituals.
Player cannot: command belief, issue orders, disband factions, prevent consequences.

Drag mechanic: grab sets an override flag → cat drops current intention → on release, a **local evaluation** runs (score only what's here, filtered by identity) → brief reaction → return to internal compass. The interruption may write a memory (positive or negative) that permanently shifts that place's weight for that cat.

## The World
- **Fixed landmarks:** pond (fishing, gathering, rare accident site) and central bonfire (social anchor, rain refuge, festival/funeral site). Never move.
- **Soft grid:** buildings snap to a loose grid for pathing; visuals stay organic. Paths emerge where cats actually walk.
- **Starting infrastructure:** self-built houses, bakery, library, soup station, small market stall, forage patches, pond, bonfire.
- **Seasons (visual only in MVP):** forage spots re-skin per season (spring herbs, summer tomatoes, autumn mushrooms, winter roots). Mechanically one "vegetable" resource.
- **Weather:** clear, rain, occasional storms. Weather is a scoring input (cats shelter, bonfire gathers crowds, one idiot chases butterflies).

## Cat Identity Stack (a cat is layers, not an archetype)
1. **Name + appearance** (unique doodle design)
2. **Occupation** (cook, fisher, explorer, librarian, gatherer; self-adopted or player-nudged)
3. **Dominant personality** (one of the roster archetypes — decision-weight table + expression set + dialogue flavor)
4. **Secondary traits** (~3–5: "afraid of storms", "collects flowers", "sleeps early")
5. **Preferences** (10–20 weighted likes/dislikes: rain, libraries, crowds, mushrooms, specific cats...)
6. **Memories** (accumulated at runtime)
7. **Relationships** (accumulated at runtime)

Scoring uses **identity bias** = dominant personality + relevant traits + relevant preferences combined. Two Planners diverge because their preference tables differ.

## Human-like Behavior
Cats are bipedal villagers: carry items, do chores, hold jobs, queue, sit at tables, run errands, form society.

## Dark Events (no sinister guardrail)
Theft, feuds, ousting, cult formation, near-drowning, collapse — all allowed emergent outcomes. Tone stays doodle-cute; the contrast is the point. System response is always memory + story (grief bubbles, gatherings, gossip, grudges), never prevention or erasure. Permanent death: none (see simulation spec, Near-Death).

## Desktop Integration Rules (Phase 3, encoded now)
1. Cats live on a desktop overlay layer.
2. When any window/browser is focused above them: cats render **semi-transparent and fully click-through**. Never a nuisance.
3. Grabbable only on plain desktop.
4. Folders/icons: never nap targets, never landmarks; cats go translucent when overlapping so icons stay readable.
5. Cats may climb over windows, parade across the screen, wander off-screen and return.
6. May react when apps open (bubble on Chrome launch), never blocking input.
7. Mouse never repels cats — player must always be able to grab.
8. Ships only after the village is fun in a plain window.

## Scale Provisions (hooks, not features)
Economy growth, families/kittens, festivals, children, visitors/strays, new districts, professions, religion/cults beyond the first. Constraint: each must be addable as new entities + actions + event types with zero core-loop rewrites.
