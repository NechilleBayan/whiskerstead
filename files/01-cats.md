# Assets — Cats

## Specs
- Canvas: **192×192 px** authoring (displays ~64–96 px tall). Export 2× and 1×.
- Type: PNG RGBA, transparent background. Shared feet baseline across all frames.
- Bipedal build: villagers who stand, walk on two legs, carry things in paws.
- Each cat: distinct silhouette + 2–3 flat colors + one identifying feature (Biscuit's stripes, Ink's blotches, Bramble's scruff). Must be tellable apart at 64 px by silhouette alone.

## Pose Set (per cat — 5 cats total)
Priority A = MVP blocking, B = MVP polish, C = can ship after.

| # | Pose | Frames | Pri | Notes |
|---|---|---|---|---|
| 1 | idle | 2–3 (boiling) | A | neutral stand, tail sway |
| 2 | walk | 4 | A | bipedal amble |
| 3 | carry-walk | 4 | A | item slot in front paws (item drawn separately, overlaid) |
| 4 | sit | 2 | A | benches, pond edge, bonfire |
| 5 | sleep | 2 | A | curled; used home + odd locations |
| 6 | work-generic | 2–3 | A | stirring / hammering / shelving — reused per job via prop overlay |
| 7 | fish-cast/wait | 2+2 | A | rod prop; doze variant reuses sleep head |
| 8 | eat | 2 | A | bowl at face |
| 9 | grabbed (dangling) | 1–2 | A | held by player, limp + startled ears |
| 10 | talk | 2 | A | mouth open/gesture, pairs with bubbles |
| 11 | argue | 2 | B | leaning in, tail puffed |
| 12 | strained | 1–2 | B | drooping walk/stand overlay posture |
| 13 | critical | 1 | B | lying down, awake |
| 14 | collapsed | 1 | A | distinct! must not read as sleep — splayed, item dropped |
| 15 | rescue-carry | 2 | B | one cat carrying another (composite of two rigs is fine) |
| 16 | build/gather | 2–3 | A | spawn arc: picking up, hammering |
| 17 | celebrate/startle/grumpy micro-poses | 1 each | C | reaction seasoning |

## Expressions (small face overlays or head swaps)
happy · neutral · annoyed · sad · scared · smug · tired · suspicious · disgust ("ew") · love. Priority A: happy, neutral, annoyed, tired, scared. Rest B.

## Body-language checklist (rule: body language before text)
Tail up/down/puffed, ears forward/flat, turned-away stance, slump, bounce. Bake these into poses rather than separate assets where possible.

## Per-cat identity notes (finalize before drawing)
- Biscuit — cook, orange tabby, apron?, tidy posture
- Moss — fisher, grey longhair, relaxed posture
- Pepper — explorer, black cat, always mid-motion energy
- Ink — librarian, white + ink blotches, still/watchful posture
- Bramble — gatherer, brown scruffy, hunched posture

## Estimated count
~25–35 frames per cat × 5 cats ≈ 125–175 frames. Generate one cat completely (Biscuit) before starting the second.
