# Assets — Bubbles & UI

## Specs
- Canvas: 9-slice-friendly bubble bodies (author at **128×96 px**, stretchable), icons at **48×48 px**. PNG RGBA, transparent. Export 2× and 1×.
- Doodle rule: bubble outlines are shaky hand-drawn loops, tails are little scribble triangles. NOT clean comic bubbles.
- Text rendered by engine; pick a hand-drawn font (or hand-letter a mini glyph set later). Font must stay readable at 12–14 px display.

## Bubble bodies (Pri A)
| Asset | Notes |
|---|---|
| speech bubble | 9-slice, tail variants: left/right |
| thought bubble | cloud + dot trail; holds intention ICONS, not text |
| reaction burst | spiky small bubble for "!" "ew" "♥" |
| gossip bubble | speech bubble with a subtle double outline (visually distinct = "talking about someone") |

## Thought-intention icons (Pri A — one per common action)
fish · soup/food · sleep (zzz) · book · social (two cats) · build (hammer) · explore (footprints) · home · trade (two arrows) · artifact (accent-color glyph) · rain-shelter (cloud) · help/rescue (paw+heart)

## Reaction glyphs (Pri A)
! · ? · ♥ · ew/squiggle · zzz · anger tick · sweat drop · music note · sparkle · storm-fear squiggle

## Status posture cues (Pri B — prefer body language, these are backups)
tiny sweat-drop overlay (strained) · wobble lines (critical) · dizzy swirl (collapsed)

## Player-facing UI (Pri A, minimal by design — the game answers glances without menus)
| Asset | Notes |
|---|---|
| grab cursor / open paw cursor | hover + holding states |
| cat picker card frame | for choosing starter + added cats: portrait window, name plate, 2–3 trait doodle icons |
| weather toggle icons | sun / rain / storm (player nudge power) |
| tiny settings gear | doodle style, unobtrusive corner |

## Debug overlay (dev-only, no art needed)
Plain engine-rendered text/boxes. Do not spend doodle effort here.
