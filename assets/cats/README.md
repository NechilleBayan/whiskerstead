# Cat sprites

Real doodle-cat art. Placeholder canvas doodles in `src/render/canvas-renderer.ts`
stand in until these land. See `files/00-style-guide.md` for the full style spec.

## Folders
- `2x/` — authoring canvas, **256 × 256 px** (subject ~128–192 px tall, centered, ~10% padding)
- `1x/` — display export, **128 × 128 px**

Same filename in both folders. PNG, RGBA, fully transparent background.
Feet on the **same y** in every frame/view so sprites swap without jitter.

## Naming
`cat_<name>_<view>_<emotion>.png` — lowercase, underscores.

- **names** (locked in `src/content/cats.ts`): `biscuit` `moss` `pepper` `ink` `bramble`
- **view**: `front` · `tqfront` (three-quarter front)
- **emotion**: `neutral` `happy` `annoyed` `scared` `tired`
  (`smug`/`sad` also occur in-sim but fall back to neutral/tired — skip for now)

Example: `cat_biscuit_tqfront_happy.png`

## Order
1. `cat_biscuit_front_neutral.png` + `cat_biscuit_tqfront_neutral.png` — validate first
2. Base set: all 5 cats × 2 views, `neutral` (10 files)
3. Emotion expansion: × {happy, annoyed, scared, tired} (up to 50 files total)
