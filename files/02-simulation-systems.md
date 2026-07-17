# Whiskerstead — Simulation Systems Spec

## 1. Time
- One game day = **60 real minutes**: Dawn 10 / Morning 15 / Afternoon 15 / Sunset 10 / Night 10.
- Phase changes shift **scoring weights only** — never force activity switches. Cats finish or re-roll naturally, so transitions stagger (organic, not synchronized).
- **App closed = time frozen.** Nothing advances. Deterministic saves, instant resume. Catch-up sim is Phase 2.

## 2. Decision Loop (two clocks)
**Frame update (continuous):** move toward target, animate, micro-decay needs, watch for player grab.
**Decision tick (on idle / action complete):**
1. Settle needs (apply decay since last decision).
2. Check interrupt (mid-drag / just dropped → disruption branch: local personality-filtered evaluation, then return to compass).
3. Perceive: generic list of nearby reactable things (buildings, objects, items, **cats** — all the same kind of entry).
4. Score every option: `identity bias × need urgency × memory × time-of-day fit`.
5. **Roll, don't max** — weighted random. Near-miss options firing is what stories are made of.
6. Commit + narrate (bubble explains the roll — legibility layer).
7. Act until done; loop refires.

No outcome-softening step exists. Consequences write memories and persist.

## 3. Needs & Health
Needs: **hunger, energy, social, curiosity, comfort.** Social sits dormant until a valid target exists.

### Hunger
- 2 meals per game day. Full meal restores most hunger; snack restores less. Cats seek food before critical.
- Missed one meal: mild mood penalty. Full day hungry: strong behavior changes (low patience, worse work, shorter chats, higher theft odds, bad barters, eats own inventory, skips optional activities).
- **No starvation death.** Severe failure is behavioral: stops working, steals, argues, withdraws, sleeps more, moves in with a friend.
- Theft escalation: mild hunger → seeks food normally; strong → asks/barters/hovers; severe → steals if personality + opportunity align; chronic → accumulating mood/relationship penalties. Traits modify (honest resists, proud won't ask, chaos steals early, social asks friends, planner rations, optimist assumes rescue).

### Sleep
- Core sleep: **20–25% of game day** (~12–15 real min), during game night by default.
- Personality shifts timing/location: early riser, night owl, hard worker, chaos (random naps), lazy, social (delays for gatherings), anxious (broken sleep after conflict), cryptic (unexplained absences).
- Quiet-hours principle: at any phase some cats are off-cycle; the village never moves in lockstep.
- Sleep locations: usually home; memorable exceptions allowed (library chair, pond edge, another cat's house, shrine, outdoors after exhaustion).
- Fatigue: slower movement, longer tasks, worse cooking/fishing, irritability, accidental naps. No death, no permanent damage.

### Health (derived, never a sixth need)
`Needs → condition modifiers (cold, heat, injury, illness, stress) → Health`.
Health never self-drains — it changes because something happened, and recovers via food + rest + safety + time.

### Personal Schedules
Per-cat preferred active hours + habitual anchors (Biscuit opens bakery pre-dawn, visits pond every evening). Implemented as per-cat time-of-day weight curves. **Never displayed** — discovered by watching over days.

## 4. Soup Station (emergent role, no assignment)
A personality-fit cat self-adopts cook via normal scoring.
- Cook cycle: obtain ingredients → cook pot **90s** → serve 6 bowls → clean **15s** → restock decision.
- Serving: **8–14s per customer (avg 10)**, personality variance. Queue cap: **4 visible**; overflow reconsiders/waits/seeks other food.
- Restock: **2 ingredient units** per pot. Recipes: 2 fish / 1 fish + 1 vegetable / 2 vegetables (weaker soup). Cook may fetch, ask, trade, or close — by personality and relationships.
- Quality tiers: **good / mediocre / bad / awful**, driven by cook skill, ingredient quality, recipe familiarity, mood/fatigue, interruptions, rushed/neglected pot.
  - Mediocre: less hunger restored, doubtful reaction, little rep loss.
  - Bad: much less hunger, disgust bubble, opinion of cook drops.
  - Awful: barely feeds, strong reaction, meaningful rep loss, gossip topic.
- **Three separate variables:** dislike-the-soup / dislike-the-cook / want-them-removed. ("The soup is terrible, but Biscuit is trying.")
- Ousting requires a pattern: 3+ removal supporters, sustained 2 game days, ≥2 distinct bad-pot incidents, an instigator, and failed reputation repair.
- Confrontation is a branching scene (apology + probation, new-recipe promise, cook-off challenge, angry quit, temporary closure, a friend defends, village splits into camps) resolved by cook confidence, ringleader relationship, complaint strength, recent good memories, and whether someone wants the job.
- Ousted cook: stays in village, loses role, grudge toward ringleader, avoids station temporarily, may refuse trades, may reconcile/retaliate/reclaim later. Village departure reserved for much later systems.
- Rule: **bad soup creates stories before it creates punishment.**

## 5. Fishing
- Attempt: **35–65s** variable, no visible countdown (cast, wait, look around, adjust, doze, react, pull/miss). Rare long wait 75–90s.
- Skill tiers (from behavior, not visible XP): Novice 50–65s / 40% miss → Familiar 42–58s / 32% → Skilled 35–50s / 24% → Expert 30–45s / 18%. Miss floor ~15%.
- Miss variety: no bite, fish escapes ("It was huge."), distraction, snag, another cat startles fish, junk pull (may yield collectible/gossip).
- Skill memory tracks: attempts, catches, recent frequency, favorite spot, preferred time. Long inactivity = slight rust, never major loss.
- Personality: patient tolerates waits, bored abandons, competitive keeps going after rivals catch, lazy naps poolside, curious inspects other spots.
- Yield: standard 1 fish; rare 2 (noteworthy); junk 0.

## 6. Economy — Barter & Ownership
- Resources: wood, fish, vegetable (seasonal skins), bread, soup, yarn, flowers, trinkets. Physical, visibly carried.
- **No global inventory.** A cat owns what it carries until it eats / delivers / barters / stores / gifts / loses it / has it stolen.
- Personality drives flow: generous fisher donates, greedy hoards, social trades with friends only, hungry eats the catch, spiteful refuses a rival cook.
- Barter chains (wood → fish → soup) via informal ratios, no currency.
- Failed supply creates **behavior, not error messages**: cook visits pond, barters, serves vegetable soup, closes early, complains, fishes personally, recruits a friend.
- Theft is legal: victim writes negative memory → rivalry → gossip.
- Jobs: player-nudged or self-adopted by fit.

## 7. The Cult
Safeguard: funny, unsettling, socially disruptive — never mechanically dominant.

### Artifact & discovery
- Hidden artifact spawns. Low base discovery chance per exploration; strong bonus for high-curiosity, extra for cryptic/chaos-aligned; requires meaningful investigation of the spot.
- Target: 70–80% of villages discover by end of Day 3; 20–30% later. Discovery ≠ cult.

### Founding
Finder interprets by identity (sacred / valuable / dangerous / funny / hide it / tell everyone / organize). **The first cat to form a persistent belief and recruit someone** becomes founder.

### Recruitment
Founder picks eligible target → approaches when not need-critical → **10–15s exchange** → visible reaction → conviction roll → both gain memories → **1-game-day retry cooldown** per target.
Outcomes: join / polite refuse / aggressive refuse / curious-undecided / pretend to join / report founder / demand proof / attempt takeover.
Conviction inputs (never personality alone): trust in founder, loneliness, belonging need, curiosity, fear, recent bad luck, resentment, member count, what the cult offers, recent "signs".

### Personality tendencies (influence, not determination)
- Optimist: high openness, especially if they like founder; leaves if rituals harm others.
- Chaos: very high join (for spectacle), low discipline, least loyal.
- Cynic: low join; mocks, counter-gossips; may infiltrate ironically and turn sincere.
- Planner: low initially; warms when structure appears (3+ members = a system); may reform or take over.
- Cryptic: rarely joins openly; advises, manipulates, observes, leaves anonymous offerings, warns members, appears uninvited, knows artifact facts nobody else does.

### Activity stages
Early: whispers, small offerings, solo artifact visits, 1:1 recruitment, secret symbols.
Established: nightly gatherings, roles, chants, offerings, skipped routines, group gossip.
Escalated: bigger offering demands, rituals over needs/work, claiming a space, rank disputes, rival interpretations, counter-group.
Escalation emerges from membership size, founder traits, ritual "successes".

### Roles (at 3+ members)
Founder, interpreter, recruiter, keeper of offerings, internal skeptic, enforcer, opportunist, secret doubter. Planner may organize without founding; Chaos invents unapproved rituals.

### Supernatural ambiguity
Never confirm or deny. Coincidences, weather shifts, found objects, sounds, dreams, brief fishing luck, or nothing (reinterpreted as meaningful).

### Commitment gradient (schedule warping)
New: attends occasionally → committed: rearranges evenings → devout: skips sleep/work/meals/relationships → fanatic: aggressive recruiting, defends founder.

### Endings (transformation allowed, not just destruction)
Founder removed / loses belief, Planner formalizes it, schism into sects, Cynic disproves a claim, artifact vanishes, apparent miracle, needs-driven drift, harmless village tradition, quiet fade.

### Player levers (no "disband" button)
Move/hide/display artifact, place offerings, drag a cat from ritual, build near the spot, resource the founder, interrupt repeatedly, or just watch.

## 8. Interactions & Bubbles
- Lifetime: 0.3s in / **4s hold** / 1s fade. Reaction bubbles ("!", "ew"): 2–3s hold.
- Limits: 1 bubble per cat per 20s; max 3 on screen; **one full dialogue exchange at a time** (5-cat MVP); duplicate-line suppression across several game days.
- Priority: major emergent event > argument/confrontation/discovery/recruitment > trade or failed task > need complaint > ambient chatter. Rare events interrupt chatter; hunger never blocks a discovery bubble.
- Durations: greeting 2–4s, short chat 6–10s, long chat 12–18s, trade 8–12s (approach → exchange → visible handoff → reaction → separate), argument 5–9s (followed by lingering emotional state: annoyed, embarrassed, smug, hurt), recruitment 10–15s, comforting 8–12s.
- **Body language before text:** tail, ears, turning away, bouncing, slumping, pacing, holding/hiding items. Bubbles reveal meaning, never narrate the visible.
- Thought bubbles: current intention as icon (fish icon = heading to fish). No history, no log, no click-to-expand — ephemeral by design.

## 9. Near-Death & Recovery (no permanent death)
- Causes (severe/compounded only): prolonged hunger, extreme exhaustion, pond accident, storm exposure, untreated injury, strain while weak, rare emergent accident. Never from one missed meal or one bad night.
- Warning stages: **Stable → Strained** (slow walk, worse work, complaints, stumbles) **→ Critical** (refuses tasks, urgent seeking, lies down publicly, cats notice, direct bubbles) **→ Collapsed**.
- Collapse: activity stops, items drop, distinct visual, nearby cats panic/gather/help/ignore/gossip, cat unavailable for work, village may redirect resources. **State stabilizes at a critical floor** — no indefinite decline, nothing irreversible while app closed, no collapse from invisible variables.
- Rescue: villagers can rescue on their own (essential to the fantasy); player can also intervene (feed, carry, drag from pond). Recovery actions match cause (food for hunger, sleep for exhaustion, fire/warmth after pond).
- Post-rescue: returns at **~50% condition**, slower movement, restricted work, reduced mood, ~1 game day recovery period (sleeps more, refuses hard work, avoids accident site, accepts help, becomes grateful/embarrassed/fearful/angry).
- Relapse: temporary vulnerability (higher fatigue gain, lower tolerance); pushing too early can re-collapse; care resolves it.
- Social consequences: memories ("Moss saved me", "no one helped"), affecting trust, gratitude, resentment, fear, location choices, rescue priority. Saved cats grow loyal; ignored cats grow withdrawn or bitter.
- Personality shapes the event, never overrides survival logic.
- Pond accidents: condition-gated, uncommon, likelier for exhausted/clumsy/reckless/distracted cats, always with a rescue window. Failure to intervene = prolonged collapse, never death.

## 10. Memory, Relationships, Gossip
- Memory: small per-cat list — place, cat, and event memories, each with emotional charge. Modify future scores; fuel gossip; created by disruptions, trades, thefts, rescues, arguments, rituals.
- Relationships: pairwise drifting values from shared time + interaction outcomes. Thresholds unlock labels: friend, rival, crush, mentor, follower.
- Gossip: idle pairs reference recent events via bubbles; subscribes to the event bus; the cult's Cynic counter-gossip and the cook's reputation both run through this system.
