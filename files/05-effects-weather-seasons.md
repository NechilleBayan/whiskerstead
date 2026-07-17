# Assets — Effects, Weather, Day Cycle, Seasons

## Specs
- Effects: sprite overlays, 2–4 frame loops, PNG RGBA transparent. Author at target display size ×2.
- Weather/day tinting is done by the ENGINE (full-screen color overlay) — you only draw particles and props, never tinted duplicates of assets.

## Day-cycle tints (engine values, decide with art eyes)
| Phase | Tint direction |
|---|---|
| Dawn | pale peach, low alpha |
| Morning | none/neutral |
| Afternoon | faint warm |
| Sunset | orange-pink, medium alpha |
| Night | desaturated blue, medium alpha + window-glow overlays activate |

## Weather particles (Pri A)
| Asset | Frames | Notes |
|---|---|---|
| rain streaks | 2–3 | doodle dashes, two densities (drizzle/storm) |
| puddle | 2 | appears during rain, cats avoid or stomp by personality |
| storm flash | 1 | brief white overlay + engine shake optional |
| snow flecks | 2 | winter season dressing (visual only in MVP) |

## Ambient effects (Pri A/B)
| Asset | Pri | Notes |
|---|---|---|
| bonfire flame + spark motes | A | 2–3 frame flicker; the centerpiece at night |
| chimney/pot steam wisp | A | reused: soup, bakery, hot bowls |
| pond ripple + splash | A | splash doubles for accidents and playful cats |
| zzz drift | A | sleeping cats |
| dust poof | B | chaos aftermath, drops, construction |
| firefly motes | C | summer nights, pure charm |
| butterfly | B | 2-frame flap; mandatory: one orange idiot must have something to chase in the rain |

## Seasonal skins (visual only — mechanics unchanged)
- Forage patches ×3 types × 4 seasons = 12 variants (spring herbs / summer tomatoes / autumn mushrooms / winter roots).
- Grass tile: 4 seasonal recolors (engine can shift hue; only draw winter separately if snow patches are wanted).
- Priority: ship ONE season for MVP, add the other three in Phase 2.

## Cult atmosphere (Pri A, subtle)
| Asset | Notes |
|---|---|
| candle glow ring | night ritual spots |
| accent-color shimmer | rare, ambiguous artifact "sign" — must be deniable as a trick of the light |
