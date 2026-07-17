# Assets — Buildings & Sites

## Specs
- Canvas: **256×256 px** small buildings, **384×384 px** large. Export 2× and 1×. PNG RGBA, transparent.
- View: gentle top-down-ish 3/4 angle (like the reference screenshot), consistent across every building.
- Doodle rule applies hardest here: wobbly walls, crooked roofs, uneven planks. A building that looks hand-sketched sells the whole style.
- Each building: 1 idle state + 1 "active" tell (smoke, glow, open sign) as a separate overlay layer so the sim can toggle it.

## List

| Asset | Size | Pri | States/notes |
|---|---|---|---|
| Soup station | 256 | A | pot overlay: empty / cooking (steam) / ready; bench queue spots |
| Bonfire (fixed, screen center) | 256 | A | unlit / lit (2-frame flicker) / big gathering glow |
| Pond (fixed) | 384 | A | still water + 2-frame ripple overlay; lily pads; small dock; **accident splash overlay** |
| Bakery | 256 | A | chimney smoke overlay |
| Library | 256 | A | warm window glow (night) |
| Market stall | 256 | A | stocked / empty versions |
| Cat house ×5 | 192–256 | A | one per cat, personality-flavored: Biscuit tidy/square, Pepper crooked, Bramble far-off scrappy, etc. |
| House construction stages | — | A | 3 stages per house style: materials pile → frame → done (spawn build-arc needs these) |
| Shed (generic) | 192 | B | optional extras after house |
| Forage patches ×3 types | 192 | A | bush / mushroom log / herb patch, each with 4 seasonal skins (see 06) |
| Artifact site | 128 | A | hidden state (disturbed ground) / revealed artifact / shrine-ified (cult established) |
| Memorial/rest marker | 128 | C | for later dark-event flavor |

## Ground & paths
- Tileable grass texture (subtle doodle scribble), 256×256 seamless.
- Path segments: worn-dirt strokes that can chain (straight, curve, end). Paths appear where cats walk, so pieces must overlay grass with soft edges.
- Stepping stones, fence bits, flowers as scatter decals (see props).
