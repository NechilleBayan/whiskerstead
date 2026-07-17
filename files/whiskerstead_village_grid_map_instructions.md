# Whiskerstead — Village Grid Map Instructions

Companion to **`whiskerstead_village_grid_map.png`**.

This is a **structural layout and positioning guide**, not the finished background. Its job is to let any future prompt — art generation or code — say *exactly where* something goes, in terms both a person and the simulation agree on.

> **The map is derived from the running simulation, not invented.** Every anchor below was dumped from `createWorld(1337)` in `src/sim/world.ts`. Zone bands come from `FOREST` in `src/config/tuning.ts`. If the sim moves a building, this map is stale — regenerate it rather than hand-editing.

---

## 1. Grid dimensions, coordinate system, scale, orientation

| Property | Value |
|---|---|
| World size | **960 × 600 world units** (`WORLD_W` × `WORLD_H`, `src/sim/world.ts`) |
| Grid | **16 columns × 10 rows** |
| Cell size | **60 × 60 world units** |
| Columns | **A–P**, left → right |
| Rows | **1–10**, top → bottom |
| Origin | **`A1` top-left = world (0, 0)** |
| Far corner | **`P10` bottom-right = world (960, 600)** |
| Orientation | **Top-down planning view.** Buildings are drawn in-game at a gentle top-down-ish 3/4 angle (`02-buildings.md`); the *plan* is straight top-down. |
| PNG export scale | 2 px per world unit (grid area 1920 × 1200 px) |
| Aspect | 1.6 : 1 |

### Coordinate system

- **Cell reference** = column letter + row number, e.g. `I6`, `D2`, `N3`.
- **Range** = top-left cell + en-dash + bottom-right cell, e.g. `G4–J7`.

Converting between the two:

```
col_index = floor(x / 60)        # 0 = A, 15 = P
row_number = floor(y / 60) + 1   # 1 .. 10

cell_center_x = col_index * 60 + 30
cell_center_y = (row_number - 1) * 60 + 30
```

**Boundary convention (matters — several real anchors sit exactly on a grid line):** a coordinate that lands on a cell edge belongs to the cell **right of / below** the line. Affected anchors: the bonfire (`x=480`, `y=300`), the soup station (`y=240`), forage-2 (`x=600`), forage-3 (`x=420`), pond (`x=780`), and the Biscuit / Ink / Pepper / Moss houses.

### Scale reference

- 1 cell = 60u. **A cat sprite is 56 world units tall** (`SPRITE_H`, `src/render/canvas-renderer.ts`) — **just under one cell.** Use this constantly: *a cat is a cell.*
- Don't confuse that with the style guide's **64–96 px** figure (`00-style-guide.md`) — that is the cat's *on-screen* size, in pixels, after the renderer's letterbox scale. World units and screen pixels are only equal at 1× zoom.
- The renderer letterboxes the world into the window (uniform scale, 20 px margin, `src/render/canvas-renderer.ts`), so **the world edge *is* the screen edge**. There is no camera and no scrolling.

### Footprint vs anchor

- **Anchor** = the exact world position from `createWorld`. Authoritative; the sim paths to it.
- **Footprint** = the cells this plan *reserves* for the feature. Author's judgment, chosen to contain the drawn art and sit on the anchor.

A building's art is drawn **relative to its anchor**, not inside its footprint: `hut()` spans ±36u horizontally and reaches **46u above** the anchor (`canvas-renderer.ts`). So art routinely overhangs its footprint by a few units — e.g. the soup station's roof tip reaches ~6u into `G5`. Footprints are planning zones, not sprite bounding boxes.

---

## 2. What each colour and symbol means

Colours and their names are sampled from **`master-color-palette.png`**. `00-style-guide.md` reserves *"one accent color … for cult/artifact content (a slightly 'off' tone, e.g., pale violet)"* without naming it; the palette's **Lavender bloom `#B9ACCF`** is that tone. This map therefore uses it for the artifact site *only* — do not reuse it for another zone.

| Swatch | Colour | Meaning |
|---|---|---|
| ▉ | Soft coral `#E7A493` | Central village / bonfire commons |
| ▉ | Robin egg `#A9CFD2` | Pond (water) |
| ▉ | Buttercup `#E8D98B` | Food production — soup station, bakery |
| ▉ | Morning mist `#C8DCE0` | Library |
| ▉ | Fresh mint `#A8D5C2` | Market stall |
| ▉ | Petal pink `#E7C6CD` | Cat homes |
| ▉ | Meadow sage `#A9C49A` | Forage patches (resource gathering) |
| ▉ | New leaf `#C9D9B8` | Trees / forest bands |
| ▉ | Lavender bloom `#B9ACCF` | **Artifact / cult — reserved accent** |
| ▉ | Soft stone `#D5D4CB` | Resource storage *(proposed)* |
| ▉ | Dusty mauve `#B88E9F` | Workbench & crafting *(proposed)* |
| ▨ | Grey hatch | Expansion reserve *(proposed)* |

### Line conventions

| Line | Meaning |
|---|---|
| **Solid outline** | Exists in the simulation today |
| **Dashed outline** | **Proposed — no such entity in `src/sim/` yet** |
| Brown dashed line | Desire-line path — **emergent**, cats wear these in. Indicative only |
| Green dashed rectangle | Tree-free clearing (`FOREST.clearingFrac = 0.66`) |
| Coral dashed rectangle | Trunk-safe inset (x 8–952, y 12–596) |
| Heavy black rectangle | Screen-edge boundary |

### Symbols

🔥 bonfire · 🍲 soup pot · 🍞 bread · 📖 book · ⛺ market awning · 🏠 cat home · 🌳 tree · 🌿 forage bush · ◆ artifact · ⊠ storage crate · 🪚 workbench

---

## 3. Coordinates assigned to each village feature

### 3.1 Exists in the simulation

| Feature | Grid range | Anchor cell | World (x, y) | Notes |
|---|---|---|---|---|
| **Central village / commons** | `G4–J7` | `I6` | **(480, 300)** | **FIXED.** Exact world centre. Social anchor + rain refuge (both implemented). The bonfire's own art occupies ~`H5–I6`; `G4–J7` is its gathering apron (80u tree-exclusion) |
| **Pond** | `L2–O4` | `N3` | **(780, 160)** | **FIXED.** Fishing, gathering, accident site |
| **Cooking — soup station** | `E4–F5` | `F5` | (330, 240) | Pot states + bench queue spots. Roof tip overhangs ~6u into `G5` |
| **Bakery** | `D6–E6` | `D6` | (220, 340) | Chimney-smoke overlay |
| **Library** | `K7–L8` | `L7` | (670, 410) | Ink's world; night window glow |
| **Market stall** | `I8–J8` | `I8` | (520, 450) | Stocked / empty states |
| **Cat home — Ink** (librarian) | `D2` | `D2` | (180, 90) | |
| **Cat home — Bramble** (gatherer) | `L1` | `L1` | (700, 40) | |
| **Cat home — Pepper** (explorer) | `O5` | `O5` | (840, 260) | |
| **Cat home — Biscuit** (cook) | `C8` | `C8` | (120, 470) | |
| **Cat home — Moss** (fisher) | `N9` | `N9` | (800, 480) | |
| **Forage patch 1** | `C3` | `C3` | (160, 150) | |
| **Forage patch 2** | `K2` | `K2` | (600, 90) | |
| **Forage patch 3** | `H9` | `H9` | (420, 530) | |
| **Artifact site** | `B5` | `B5` | (100, 270) | Hidden until discovered → shrine when cult forms |

All five houses **start as material piles** (`stage: 0`) — the gather → build arc is the village's first story. Art needs 3 stages per house: materials pile → frame → done.

**Spec-planned but not implemented:** `01-design-spec.md` also calls the bonfire the *festival / funeral site*, and `02-buildings.md` lists a shed and a memorial marker. None of these exist in `src/sim/` today. The cult/shrine arc **is** real. Don't paint a festival ground or a memorial into the background yet — it would promise something the village never does.

### 3.2 Trees and vegetation

Forest is generated deterministically from the seed and **frames** the field. 32 trees at seed 1337, spanning x 17–952, y 19–569.

The cluster counts below are config (`FOREST.zones`); **the grid ranges are what seed 1337 actually produced.** Cluster centres get ±40u of jitter (`trees.ts`), so other seeds can push a tree a cell beyond a band. Re-derive the ranges if you change the seed.

| Band | Grid range (seed 1337) | Density (`FOREST.zones`) |
|---|---|---|
| Left | `A1–C10` | Dense — 9 clusters, 3–5 trees |
| Top | `A1–P2` | Dense — 9 clusters, 3–5 trees |
| Right | `N1–P10` | Dense — 8 clusters, 3–5 trees |
| Bottom corners | `A10–E10` and `M10–P10` | Sparse — 3 clusters, 1–2 trees; mid-bottom stays open |
| **Central clearing** | **`D3–M8` fully clear** | **No trees, any seed.** World x 163–797, y 102–498 (`clearingFrac 0.66`) |

Trees are the renewable **wood** source (chop → carry → build / fuel the bonfire), so their placement is gameplay, not decoration. Don't paint trees into the clearing.

### 3.3 Proposed — NOT in the simulation yet

> These zones answer the layout brief, but **no such building exists in `src/sim/`**. Placing them in the background art commits the sim to building them. Each was checked to be **tree-free at seed 1337** and to **contain no existing anchor** from §3.1.

| Feature | Grid range | World rect | Status |
|---|---|---|---|
| **Resource storage** | `D8–E9` | x 180–300, y 420–540 | **Proposed.** Today the only store is the bonfire's `fuel` state — a small woodpile drawn at its base. There is no stockpile entity |
| **Workbench & crafting** | `F8–G9` | x 300–420, y 420–540 | **Proposed.** No crafting system exists; building is currently a direct wood → house-stage conversion |
| **Expansion reserve A** | `J3–K4` | x 540–660, y 120–240 | Reserved — north-east, between bonfire and pond |
| **Expansion reserve B** | `J9–L9` | x 540–720, y 480–540 | Reserved — south, village growth |

Storage `D8–E9` and workbench `F8–G9` are deliberately **adjacent**, forming a south-west work yard fed by the left/bottom forest and feeding the bakery (`D6`) and market (`I8`).

Two clearances to respect if these are ever built:
- The workbench's **east edge (x = 420) touches forage patch 3's exact anchor** (420, 530) in `H9`. Leave a walkable gap; don't let workbench art bleed into `H9`.
- Expansion reserve A `J3–K4` overlaps the lower edge of forage-2's 45u **tree**-exclusion. That only keeps trees out, not buildings — but keep the patch itself reachable.

### 3.4 "Gathering zones" — two different things

The brief's term is ambiguous, so both are mapped separately:

| Sense | Where |
|---|---|
| **Social gathering** (cats congregate) | Bonfire commons `G4–J7` · pond shore `L2–O4` · market `I8–J8` |
| **Resource gathering** (foraging) | Forage patches `C3`, `K2`, `H9` |

### 3.5 Paths

**Do not pre-paint paths as finished roads.** Per `01-design-spec.md`, *"paths emerge where cats actually walk."* The brown dashed lines on the map are the **desire lines** the sim will actually produce — spokes from the bonfire `I6` to each home, the pond, soup station, market and library, plus forage → soup and forage → market runs.

Art guidance: supply **chainable worn-dirt path segments** (straight / curve / end) that overlay grass with soft edges, so the renderer can lay them along real traffic. The dashed lines tell you *where traffic will be heaviest*, not where to draw a road.

### 3.6 Decorative spaces

Decoration belongs in the **rim** — the band between the clearing edge and the forest — and in the gaps the map leaves empty:

- Column `C` and columns `M–N`, rows 3–9 (clearing rim), **excluding the anchors that live there: `C3`, `C8`, `N3`, `N9`** — see the clearance rule in §4
- Pond shore `L4–O4` (lily pads, dock, reeds)
- Bottom-centre `F10–L10` (open, sparse — good for scatter)
- The outer 30u rim, which no cat ever walks (see §4) — the safest place for dense canopy
- Around home cells, personality-flavoured (Biscuit tidy, Pepper crooked)

Use scatter decals only: flowers, pebbles, grass tufts, stepping stones, fence bits. **Nothing decorative may read as a landmark or a nap target.**

---

## 4. What must stay open

| Must stay open | Where | Why |
|---|---|---|
| **Bonfire commons** | `G4–J7` | Every cat gathers here — festivals, funerals, rain refuge. Keep the floor readable; no tall art |
| **Speech-bubble headroom** | **~1 cell (60u) above any cat-occupied cell** | Bubbles render at **`cat.y − 56` to `cat.y − 36`**, width ≈ text + 12u, min 24u (`canvas-renderer.ts`). Art that occupies that band will be covered by bubbles |
| **The clearing** | `D3–M8` | Pathing space. This is where cats walk, queue, argue and carry things. Silhouettes must read against it |
| **Interactive object clearance** | Every anchor cell in §3.1 | Cats path *to* these and the player can grab/place. Don't bury an anchor in decoration |
| **Trunk-safe inset** | x 8–952, y 12–596 | Canopies may overflow the edge visually; **trunks stay inside** so they remain reachable |
| **Building clearings** | Per `FOREST.exclusionRadius` | pond 115u · bonfire 80u · soup/bakery/library 60u · house/market 55u · forage 45u · artifact 45u |

### Where cats can actually go

**Cats are clamped inside the world — they never leave it.** Wander and explore destinations are both `clamp(30, bounds - 30, …)` (`src/sim/actions/index.ts`), giving a reachable area of **x 30–930, y 30–570**.

Two consequences for the artwork:

- **The outer 30u rim — half a cell around the whole map — is never walked.** It is the *safest* place for dense art: canopy, deep forest, overhang. It does not need to stay clear.
- **Cats do reach into row `10` and columns `A` / `P`** (just not the outermost 30u), so those cells are live, not scenery.

The design spec's *"cats may wander off-screen and return"* and *"parade across the screen"* are **Phase 3 desktop-overlay rules** (`01-design-spec.md` §Desktop Integration) — encoded as intent, not implemented. There is no off-map exit and no parade in the sim today. Don't design edge art that depends on cats walking out of frame.

### Rules from the spec that constrain the art directly

1. **Buildings snap to a loose grid for pathing; visuals stay organic.** The grid is a *planning* tool. Do not draw the grid, and do not make the village look grid-aligned — wobbly and crooked is correct.
2. **Desktop rule:** folders and icons are never landmarks. Nothing in the background may imply a fixed structure the sim doesn't know about.

---

## 5. Using the grid in future prompts

### The template

```
Place [object or area] within cells [coordinates], using the grid map as the positioning reference.
```

### Worked examples

```
Place the soup station within cells E4–F5, anchored at F5, using the grid map as the
positioning reference.

Place a worn-dirt path from the bonfire commons G4–J7 to the pond L2–O4, following the
desire line shown on the grid map, using the grid map as the positioning reference.

Place dense doodle forest within cells A1–C10, keeping trunks inside the trunk-safe inset
and leaving the clearing D3–M8 completely tree-free, using the grid map as the positioning
reference.

Place scatter decoration (flowers, pebbles, grass tufts) within cells F10–L10, using the
grid map as the positioning reference. No landmarks, no nap targets.
```

### Rules for writing grid-referenced prompts

1. **Name the range, then the anchor.** `"within cells D6–E6, anchored at D6"` — the range is the footprint, the anchor is the exact world position the sim uses.
2. **State the coordinate system once** when it matters: *"grid A–P × 1–10, 60 world units per cell, A1 = top-left = world (0,0)."*
3. **Say what must stay open**, not just what to place. `"leave the clearing D3–M8 walkable"` prevents an over-filled background.
4. **Flag proposed zones explicitly.** Storage `D8–E9` and workbench `F8–G9` do not exist in the sim — if a prompt places them, the code must follow, or the art will promise something the village never does.
5. **Never ask for a grid overlay in the artwork.** The final background has no visible grid.
6. **Keep terminology identical to this file.** "bonfire commons", "clearing", "forage patch", "trunk-safe inset", "desire line". The PNG, this doc, and the prompts must all use one vocabulary.

### For development prompts

The same references work in code, because they map to real coordinates:

```
Add a stockpile building at the centre of cells D8–E9 (world 240, 480), following the
Building type in src/sim/types.ts. Put every tuning number in src/config/tuning.ts.
```

---

## 6. Regenerating this map

The PNG is generated from a live world dump, so it can't drift silently:

1. Dump the world: import `createWorld(1337)` from `src/sim/world.ts`, serialise `bounds`, `buildings`, `sites`.
2. Run the generator against that JSON.
3. Re-check this file's §3 tables against the dump — **the PNG and this doc must always agree.**

Change the seed and the **trees move** (deterministic per seed) but every building, house, forage patch and the artifact stay put — those positions are hard-coded in `createWorld`. Seed 1337 is what's drawn here.
