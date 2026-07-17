# Asset Style Guide (applies to every category)

## Style
- **Hand-doodle look:** uneven, wobbly linework. Lines vary in weight mid-stroke. Corners slightly overshoot or don't quite meet. Nothing ruler-straight, no perfect circles.
- **Brush:** textured/pressure-varied brush (pencil or ink doodle brush), ~2–4 px stroke at authoring scale. Consistent brush across ALL assets — this is the #1 cohesion factor.
- **Fill:** flat, soft, slightly desaturated colors. No gradients, no realistic shading. Optional single flat shadow tone per object.
- **Charm over precision:** if it looks a little crooked, it's correct.

## Palette
- Soft pastels + warm neutrals (reference: the cozy village screenshot vibe — creams, sage greens, dusty pinks, warm browns, muted blues).
- Define an 18–24 swatch master palette FIRST (make it asset 0). Every asset samples only from it.
- One accent color reserved for cult/artifact content (a slightly "off" tone, e.g., pale violet).

## Technical Specs (defaults for all categories unless overridden)
- **Type:** PNG, RGBA.
- **Background:** fully transparent.
- **Authoring scale:** draw at 2× final display size, export both 2× and 1× (crisp on hi-DPI desktops).
- **Canvas:** power-of-two-friendly square canvases per sprite (e.g., 128×128, 256×256) with the subject centered and consistent padding (~10% margin) so frames swap without jitter.
- **Naming:** `category_subject_variant_frame.png`, lowercase, underscores. Examples: `cat_biscuit_walk_03.png`, `bldg_soupstation_idle.png`, `prop_fish_01.png`.
- **Pivot rule:** all cat frames share the same ground line (feet baseline at the same y in every frame).

## Animation Convention
- Doodle style suits **low frame counts**: 2–4 frames per loop, ~4–8 fps. The wobble does the work.
- Optional "boiling line" effect: redraw the same still 2–3 times and cycle them for a living, hand-drawn feel. Recommended for idles.

## Readability Targets
- Cats display at **64–96 px** tall on screen (author at 128–192 px).
- A cat's personality/emotion must read at 64 px: exaggerate posture and ears over facial detail.
- Every carried item must be identifiable at ~24–32 px display size.

## Production Order (generate slowly, in this order)
1. Master palette swatch sheet
2. One complete cat (Biscuit) — full pose set. This validates every downstream decision.
3. Bubble/UI kit (needed to see anything "speak")
4. Core props (fish, wood, bowl)
5. Soup station + bonfire + pond
6. Remaining 4 cats
7. Remaining buildings + environment
8. Effects/weather
9. Seasonal variants + cult set
