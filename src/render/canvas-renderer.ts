// Canvas renderer — reads sim state snapshots only (spec §Architecture 1: the
// view never mutates the sim). Placeholder doodle graphics stand in until the
// real hand-drawn assets from 00-style-guide land; swapping to sprites later is
// isolated to this file.

import { ANIM, BUBBLE, TREES } from "../config/tuning.ts";
import type { Building, CatState, WorldState } from "../sim/types.ts";

const TREE_GROW_MS = TREES.growMs;
const TREE_REGROW_MS = TREES.regrowMs;

// Hand-drawn cat sprites (Vite resolves these URLs at build time). Keyed by
// `<name>_<view>` e.g. "biscuit_front". Only the neutral emotion exists so far;
// sleeping/collapsed keep their doodle poses (distinct silhouettes, no sprite).
const CAT_SPRITE_URLS = import.meta.glob("../../assets/cats/2x/cat_*_neutral.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Generic world-image loader (one-image model, ASSET-CHECKLIST v2). Covers the
// whole checklist set — layers (layer_*), buildings (bldg_*), site_*, props
// (prop_*), and optional ground (tile_grass, decal_path) — keyed by basename.
// Every draw site falls back to the current procedural drawing while a file is
// missing (same pattern as cat sprites), so this wiring is inert until art
// lands in assets/world/. 2x is preferred; 1x is used when only it exists.
// decal_path has no draw site yet: the sim has no path data to chain it along.
const WORLD_SPRITE_URLS_1X = import.meta.glob("../../assets/world/1x/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const WORLD_SPRITE_URLS_2X = import.meta.glob("../../assets/world/2x/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Sprite footprint in world units. Feet sit on SPRITE_BASELINE so the sprite
// grounds where the old doodle's legs did; height/width are squished per-frame.
const SPRITE_H = 56;
const SPRITE_BASELINE = 18;
// Universal wiggle (anim spec §1.2): every perform-phase action rocks the
// neutral sprite; sleep keeps its spec-mandated distinct silhouette (collapsed
// never reaches the wiggle branch). Add ids here if a sit reads wrong.
const WIGGLE_EXEMPT = new Set(["sleep"]);
const SQUISH = 0.16; // bouncy — max ±16% on each axis while walking
const FACE_FLIP = 0.1; // smoothed horizontal speed needed to turn the sprite
const STOP_HOLD = 18; // frames a cat must be fully stopped before it faces front

interface CatAnim {
  px: number; // last-seen world position (for per-frame movement detection)
  py: number;
  phase: number; // squash-stretch oscillator, advances with travel speed
  amp: number; // 0 idle → 1 moving, eased so the squish fades in/out
  dir: number; // displayed facing (-1 left, 1 right), smoothed off the sim's
  vx: number; // low-passed horizontal velocity feeding the facing hysteresis
  view: "front" | "tqfront"; // 3/4 while travelling, front only at a full stop
  still: number; // frames since last movement; gates the return to the front view
}

// World-image registration constants (SPRITE-SPEC-REFERENCE §4/§11a): art
// anchors bottom-center with its ground line at 90% of canvas height; sizes
// below are the WORLD-UNIT span of the full authored canvas (subject ~75%).
// Code absorbs registration residue here — adjust these, never the art.
const WORLD_ANCHOR_FRAC = 0.9;
const BLDG_U = 80; // 512-canvas buildings → ~60u subject (matches doodle huts)
const POND_U = 176; // 768-canvas pond → ~132u water (doodle ellipse is 140u)
const LAYER_U = 56; // 256-canvas layers (fire, woodpile)
const TREE_U = 76; // env_tree 256 canvas, tree ~200px → ~59u
const FORAGE_U = 60; // low mound, wider than tall — drawn under BLDG scale
const SITE_U = 44; // site_artifact, ~140px subject in its canvas → ~24u
const PROP_U = 24; // 128-canvas items → ~17u subject (display 24–32 screen px)
const PROP_CENTER_FRAC = 0.65; // item icons draw centered on (x,y), not grounded
const FIRE_LINE_FRAC = 0.3; // shared 60%-canvas registration line (§11a): 30% above ground
const SOUP_FIRE_U = 26; // layer_fire scaled into the soup pot gap
const SOUP_FIRE_X = 0; // pot gap x-offset (registration residue absorber)
const MARKET_COUNTER_LIFT = 0.35; // counter top at 55% canvas = 35% above ground line
const STOCK_SPACING_U = 11; // stacked stock-prop spacing on the market counter
const HOUSE_SKETCH_ALPHA = 0.35; // stage-1 "sketch" ghost of the full house
const HOUSE_TINT_ALPHA = 0.4; // ownerTint wash strength over the pale neutral art
const TILE_GRASS_SCALE = 0.5; // tile_grass repeats at its 1x (128u) footprint

const PALETTE = {
  grass: "#c3d6b4",
  grassAlt: "#b7cca7",
  ink: "#4a3f36",
  water: "#a9cbe0",
  wood: "#b9946a",
  cream: "#f6f0e2",
  fire: "#f0a04b",
};

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offX = 0;
  private offY = 0;
  private catSprites = new Map<string, HTMLImageElement>();
  private catAnim = new Map<string, CatAnim>();
  /** "Got it!" done beats (anim spec §1.3), keyed by cat id. Ephemeral render
   *  state — NEVER serialized. until < 0 means "stamp on next painted frame"
   *  so a beat always shows a full ANIM.doneMs of sim time. */
  private doneBeats = new Map<string, { item: string; until: number }>();

  /** Called from main.ts bus wiring when a yield event lands (YIELD_EVENTS).
   *  The renderer stays a pure snapshot-reader — it never subscribes itself. */
  noteYield(catId: string, itemType: string): void {
    this.doneBeats.set(catId, { item: itemType, until: -1 });
  }

  private worldSprites = new Map<string, HTMLImageElement>();
  private tintCache = new Map<string, HTMLCanvasElement>();
  private grassPattern: CanvasPattern | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("no 2d context");
    this.ctx = c;
    this.loadCatSprites();
    this.loadWorldSprites();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private loadCatSprites(): void {
    for (const [path, url] of Object.entries(CAT_SPRITE_URLS)) {
      const m = path.match(/cat_([a-z]+)_([a-z]+)_neutral\.png$/);
      if (!m) continue;
      const img = new Image();
      img.src = url;
      this.catSprites.set(`${m[1]}_${m[2]}`, img); // e.g. "biscuit_front"
    }
  }

  private loadWorldSprites(): void {
    // 1x first, then 2x overwrites — 2x preferred, 1x a graceful stand-in.
    for (const urls of [WORLD_SPRITE_URLS_1X, WORLD_SPRITE_URLS_2X]) {
      for (const [path, url] of Object.entries(urls)) {
        const m = path.match(/([a-z0-9_]+)\.png$/);
        if (!m) continue;
        const img = new Image();
        img.src = url;
        this.worldSprites.set(m[1], img); // e.g. "layer_fire", "bldg_house"
      }
    }
  }

  /** A world sprite that is actually ready to draw — undefined signals the
   *  caller to use its procedural fallback (missing file OR still decoding). */
  private ws(name: string): HTMLImageElement | undefined {
    const img = this.worldSprites.get(name);
    return img && img.complete && img.naturalWidth > 0 ? img : undefined;
  }

  /** Draw a world image bottom-center-anchored: the art's ground line (90% of
   *  its canvas) lands on `baseY`; `u` is the canvas span in world units. */
  private drawWorldImg(img: CanvasImageSource, cx: number, baseY: number, u: number): void {
    this.ctx.drawImage(img, cx - u / 2, baseY - u * WORLD_ANCHOR_FRAC, u, u);
  }

  /** layer_fire with its squish-bounce flicker, flame BASE at (cx, flameBaseY)
   *  (the shared 60%-canvas registration line, §11a). Sim-time clock. Returns
   *  false when the layer art is missing so callers can fall back. */
  private drawFire(cx: number, flameBaseY: number, u: number, world: WorldState): boolean {
    const img = this.ws("layer_fire");
    if (!img) return false;
    const ctx = this.ctx;
    const s = Math.sin((world.time / ANIM.fireFlickerMs) * Math.PI);
    const sy = 1 + ANIM.fireFlickerAmp * s;
    const sx = 1 - ANIM.fireFlickerAmp * 0.6 * s;
    ctx.save();
    ctx.translate(cx, flameBaseY);
    ctx.scale(sx, sy);
    // the art's 60% line sits 0.6·u below its canvas top
    ctx.drawImage(img, -u / 2, -u * 0.6, u, u);
    ctx.restore();
    return true;
  }

  /** Stacked stock draw: the prop image when it exists, else the procedural
   *  item icon — so a building image can land before its props do. */
  private drawPropOrIcon(propName: string, iconType: string, x: number, y: number): void {
    const img = this.ws(propName);
    if (img) this.drawWorldImg(img, x, y, PROP_U);
    else this.drawItemIcon(iconType, x, y - 4, true);
  }

  /** ownerTint() wash over a world sprite (pale-neutral house art), cached per
   *  name|color. source-atop keeps the wash inside the art's alpha. */
  private tintedSprite(name: string, color: string): HTMLCanvasElement | undefined {
    const img = this.ws(name);
    if (!img) return undefined;
    const key = `${name}|${color}`;
    let cv = this.tintCache.get(key);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const c = cv.getContext("2d")!;
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = "source-atop";
      c.globalAlpha = HOUSE_TINT_ALPHA;
      c.fillStyle = color;
      c.fillRect(0, 0, cv.width, cv.height);
      this.tintCache.set(key, cv);
    }
    return cv;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Convert a screen point to world coordinates (for input/grab). */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.offX) / this.scale, y: (sy - this.offY) / this.scale };
  }

  render(world: WorldState, opts: { fast: boolean } = { fast: false }): void {
    const ctx = this.ctx;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // fit world into viewport with margin
    const margin = 20;
    this.scale = Math.min((vw - margin * 2) / world.bounds.w, (vh - margin * 2) / world.bounds.h);
    this.offX = (vw - world.bounds.w * this.scale) / 2;
    this.offY = (vh - world.bounds.h * this.scale) / 2;

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(this.offX, this.offY);
    ctx.scale(this.scale, this.scale);

    this.drawGround(world);
    // draw buildings first, then ground items, then cats (painter's order by y)
    const drawables = [
      ...world.buildings.map((b) => ({ y: b.pos.y, fn: () => this.drawBuilding(b, world) })),
      ...world.sites
        .filter((s) => s.discovered)
        .map((s) => ({ y: s.pos.y, fn: () => this.drawArtifact(s.pos.x, s.pos.y, s.shrined) })),
      ...world.groundItems.map((it) => ({ y: it.pos.y, fn: () => this.drawItemIcon(it.type, it.pos.x, it.pos.y) })),
      ...world.cats.map((c) => ({ y: c.pos.y, fn: () => this.drawCat(c, world) })),
    ].sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

    this.drawBubbles(world);
    ctx.restore();

    this.drawWeather(world, vw, vh);
    this.drawDayTint(world, vw, vh);
    if (opts.fast) this.drawFastBadge(vw);
  }

  // ---------- ground ----------
  private drawGround(world: WorldState): void {
    const ctx = this.ctx;
    // Optional P4 tile: seamless grass texture replaces the scribble tufts —
    // imported only if it beats the procedural look (checklist P4).
    const tile = this.ws("tile_grass");
    if (tile) {
      if (!this.grassPattern) this.grassPattern = ctx.createPattern(tile, "repeat");
      if (this.grassPattern) {
        ctx.save();
        ctx.fillStyle = this.grassPattern;
        ctx.scale(TILE_GRASS_SCALE, TILE_GRASS_SCALE);
        ctx.fillRect(0, 0, world.bounds.w / TILE_GRASS_SCALE, world.bounds.h / TILE_GRASS_SCALE);
        ctx.restore();
        return;
      }
    }
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, world.bounds.w, world.bounds.h);
    // subtle doodle scribble tufts
    ctx.strokeStyle = PALETTE.grassAlt;
    ctx.lineWidth = 2;
    for (let i = 0; i < 120; i++) {
      const x = (i * 137.5) % world.bounds.w;
      const y = (i * 71.3) % world.bounds.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y - 5);
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 6, y - 4);
      ctx.stroke();
    }
  }

  // ---------- buildings ----------
  private drawBuilding(b: Building, world: WorldState): void {
    const ctx = this.ctx;
    const { x, y } = b.pos;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineJoin = "round";
    switch (b.type) {
      case "pond": {
        // still water art; ripples/splash stay code (shipped wobble primitives)
        const img = this.ws("bldg_pond");
        if (img) {
          this.drawWorldImg(img, 0, 46, POND_U);
        } else {
          this.wobbleEllipse(0, 0, 70, 46, PALETTE.water);
          ctx.fillStyle = "#8bb6cf";
          this.wobbleEllipse(-18, 6, 10, 5, "#bfe0ee");
        }
        break;
      }
      case "bonfire": {
        // Composed state (checklist P1): lit = layer_woodpile + layer_fire
        // squish-bounce flicker on the shared 60% line; unlit = the pile alone.
        const pile = this.ws("layer_woodpile");
        if (pile) this.drawWorldImg(pile, 0, 16, LAYER_U);
        else this.wobbleRect(-26, 6, 52, 10, PALETTE.wood);
        if (b.state?.lit) {
          if (!this.drawFire(0, 16 - LAYER_U * FIRE_LINE_FRAC, LAYER_U, world)) {
            ctx.fillStyle = "#f0a04b";
            this.flame(0, -6, 18);
            ctx.fillStyle = "#f6c65a";
            this.flame(0, -2, 10);
          }
        } else if (!pile) {
          ctx.fillStyle = "#6b5a49";
          this.wobbleTriangle(0, -4, 12);
        }
        break;
      }
      case "soup-station": {
        // cooking = + layer_fire in the pot gap (+ shipped steam); ready = +
        // stacked prop_bowl draws; empty = the image alone.
        const img = this.ws("bldg_soupstation");
        if (img) {
          this.drawWorldImg(img, 0, 10, BLDG_U);
          if (b.active && b.state?.pot === "cooking") this.drawFire(SOUP_FIRE_X, 10, SOUP_FIRE_U, world);
          if (b.state?.pot === "ready") {
            const bowls = Math.min(3, (b.state?.bowls as number) || 0);
            for (let i = 0; i < bowls; i++) this.drawPropOrIcon("prop_bowl", "soup", (i - (bowls - 1) / 2) * STOCK_SPACING_U, 14);
          }
        } else {
          this.hut(PALETTE.wood, "soup");
        }
        if (b.active && b.state?.pot === "cooking") this.steam(0, -34);
        break;
      }
      case "bakery": {
        const img = this.ws("bldg_bakery");
        if (img) this.drawWorldImg(img, 0, 10, BLDG_U);
        else this.hut("#d9a86a", "bread");
        this.steam(14, -40); // chimney smoke stays procedural (NEVER-assets list)
        break;
      }
      case "library": {
        const img = this.ws("bldg_library");
        if (img) this.drawWorldImg(img, 0, 10, BLDG_U);
        else this.hut("#9fb0c8", "book");
        if (b.active || world.phase === "night") this.windowGlow();
        break;
      }
      case "market": {
        // EMPTY stall art; stocked = stacked prop draws on the counter line,
        // count from b.state.stocked (quantity = stacked draws, one image).
        const img = this.ws("bldg_market");
        if (img) {
          this.drawWorldImg(img, 0, 12, BLDG_U);
          const stocked = Math.min(4, Math.ceil((b.state?.stocked as number) || 0));
          const counterY = 12 - BLDG_U * MARKET_COUNTER_LIFT;
          for (let i = 0; i < stocked; i++) {
            const bread = i % 2 === 1;
            this.drawPropOrIcon(bread ? "prop_bread" : "prop_vegetable", bread ? "bread" : "vegetable", (i - (stocked - 1) / 2) * STOCK_SPACING_U, counterY);
          }
        } else {
          this.wobbleRect(-30, -18, 60, 30, "#cdb083");
          this.wobbleRect(-34, -30, 68, 14, "#c07d5a");
        }
        break;
      }
      case "forage": {
        // bare-patch art; remaining veg = stacked prop_vegetable on the mound
        const veg = (b.state?.veg as number) || 0;
        const img = this.ws("bldg_forage");
        if (img) {
          this.drawWorldImg(img, 0, 16, FORAGE_U);
          for (let i = 0; i < veg; i++) this.drawPropOrIcon("prop_vegetable", "vegetable", -8 + i * 7, -2 - (i % 2) * 4);
        } else {
          ctx.fillStyle = "#7fa25e";
          this.wobbleEllipse(0, 0, 22, 16, "#7fa25e");
          ctx.fillStyle = "#c05b6a";
          for (let i = 0; i < veg; i++) {
            this.dot(-8 + i * 7, -4 - (i % 2) * 4, 3, "#c05b6a");
          }
        }
        break;
      }
      case "house":
        this.house(b);
        break;
      case "tree":
        this.tree(b, world);
        break;
    }
    ctx.restore();
  }

  /** Doodle tree with growth stages. State machine: growing/regrowing scale up
   *  over time, mature/reserved/chopping draw full, stump is a stub. */
  private tree(b: Building, world: WorldState): void {
    const ctx = this.ctx;
    const s = b.state!;
    const stage = s.stage as string;
    const scale = (s.scale as number) ?? 1;
    const lean = (s.lean as number) ?? 0;
    const variant = (s.variant as number) ?? 0;
    const since = (s.since as number) ?? 0;

    if (stage === "stump") {
      // in-place swap with env_stump: its base is registered to the same
      // ground line the tree trunk stood on (BATCH-4 registration)
      const img = this.ws("env_stump");
      if (img) {
        this.drawWorldImg(img, 0, 3, TREE_U * scale);
        return;
      }
      ctx.fillStyle = "#a3805a";
      this.wobbleRect(-5, -5, 10, 8, "#a3805a");
      this.dot(0, -5, 3, "#c7a97e"); // rings
      return;
    }

    // size factor: saplings grow into full trees
    let k = 1;
    if (stage === "growing") k = 0.35 + 0.65 * Math.min(1, Math.max(0, (world.time - since) / TREE_GROW_MS));
    if (stage === "regrowing") k = 0.25 + 0.75 * Math.min(1, Math.max(0, (world.time - since) / TREE_REGROW_MS));

    ctx.save();
    ctx.rotate(lean);
    const sc = scale * k;

    // ONE tree image; variety = code flip / lean (above) / slight hue shift,
    // growth/regrowth = the same scale factor the doodle uses.
    const treeImg = this.ws("env_tree");
    if (treeImg) {
      if (variant === 1) ctx.scale(-1, 1);
      if (variant === 2) ctx.filter = "hue-rotate(-14deg)";
      this.drawWorldImg(treeImg, 0, 2, TREE_U * sc);
      ctx.filter = "none";
      ctx.restore();
      return;
    }
    const greens = ["#7fa25e", "#6f9455", "#89a968"];
    const green = greens[variant];
    // trunk
    ctx.fillStyle = "#8a6a44";
    this.wobbleRect(-3 * sc, -12 * sc, 6 * sc, 14 * sc, "#8a6a44");
    // canopy per variant
    if (variant === 2) {
      // tall narrow (pine-ish): stacked blobs
      this.wobbleEllipse(0, -20 * sc, 10 * sc, 9 * sc, green);
      this.wobbleEllipse(0, -32 * sc, 8 * sc, 8 * sc, green);
      this.wobbleEllipse(0, -42 * sc, 5.5 * sc, 6 * sc, green);
    } else if (variant === 1) {
      // two-blob canopy
      this.wobbleEllipse(-7 * sc, -24 * sc, 11 * sc, 10 * sc, green);
      this.wobbleEllipse(8 * sc, -28 * sc, 10 * sc, 9 * sc, green);
    } else {
      // round canopy
      this.wobbleEllipse(0, -27 * sc, 15 * sc, 13 * sc, green);
    }
    ctx.restore();
  }

  private hut(fill: string, label: string): void {
    const ctx = this.ctx;
    this.wobbleRect(-30, -24, 60, 34, fill);
    ctx.fillStyle = "#b06a4e";
    this.wobbleTriangleRoof(-36, -24, 36, -24, 0, -46);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = "9px 'Comic Sans MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 2);
  }

  private house(b: Building): void {
    const ctx = this.ctx;
    const tint = b.owner ? this.ownerTint(b.owner) : "#d8c3a2";
    const stage = (b.state?.stage as number) ?? 2;
    if (stage <= 0) {
      // stage 0 = materials pile: layer_woodpile reused (checklist P2)
      const pile = this.ws("layer_woodpile");
      if (pile) {
        this.drawWorldImg(pile, 0, 7, LAYER_U);
        return;
      }
      // doodle pile: stacked logs + plank
      ctx.fillStyle = "#a8865e";
      this.wobbleRect(-18, 0, 36, 7, "#a8865e");
      this.wobbleRect(-14, -7, 28, 7, "#b8946a");
      this.wobbleRect(-10, -13, 20, 6, "#a8865e");
      return;
    }
    // ONE house image: stage 1 = low-alpha "sketch", stage 2 = full, owner
    // personality via the existing ownerTint() as a code tint over the art.
    const houseImg = this.ws("bldg_house");
    if (houseImg) {
      if (stage === 1) {
        ctx.globalAlpha = HOUSE_SKETCH_ALPHA;
        this.drawWorldImg(houseImg, 0, 10, BLDG_U);
        ctx.globalAlpha = 1;
      } else {
        const tinted = b.owner ? this.tintedSprite("bldg_house", tint) : undefined;
        this.drawWorldImg(tinted ?? houseImg, 0, 10, BLDG_U);
      }
      return;
    }
    if (stage === 1) {
      // frame: outline only, no fill
      ctx.strokeStyle = "#8a7d6b";
      ctx.strokeRect(-26, -20, 52, 30);
      ctx.beginPath();
      ctx.moveTo(-31, -20);
      ctx.lineTo(0, -40);
      ctx.lineTo(31, -20);
      ctx.stroke();
      ctx.strokeStyle = "#4a3f36";
      return;
    }
    this.wobbleRect(-26, -20, 52, 30, tint);
    ctx.fillStyle = "#9c6b52";
    this.wobbleTriangleRoof(-31, -20, 31, -20, 0, -40);
    ctx.fillStyle = "#6b4a36";
    this.wobbleRect(-6, -6, 12, 16, "#7a5540");
  }

  private ownerTint(owner: string): string {
    const map: Record<string, string> = {
      biscuit: "#f0d7a8",
      moss: "#cdd7c8",
      pepper: "#b9b2c0",
      ink: "#e9e6dc",
      bramble: "#cbb28f",
    };
    return map[owner] ?? "#d8c3a2";
  }

  private drawArtifact(x: number, y: number, shrined: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    if (shrined) {
      // shrined = + code aura ellipse; offerings already render as ground items
      ctx.fillStyle = "#d9c7ea";
      this.wobbleEllipse(0, 8, 26, 10, "#d9c7ea");
    }
    const img = this.ws("site_artifact");
    if (img) {
      this.drawWorldImg(img, 0, 8, SITE_U);
    } else {
      ctx.fillStyle = "#b79fd6"; // reserved cult accent (pale violet)
      ctx.strokeStyle = "#6d5a8c";
      ctx.lineWidth = 2.5;
      this.wobbleTriangle(0, -4, 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Per-frame movement → squash-stretch state. Detects motion from the
   *  world-position delta between renders (covers walking, wandering, chasing),
   *  ignoring drag/teleport jumps so a fling doesn't spasm. */
  private updateCatAnim(cat: CatState, x: number, y: number): CatAnim {
    let a = this.catAnim.get(cat.id);
    if (!a) {
      a = { px: x, py: y, phase: 0, amp: 0, dir: cat.facing < 0 ? -1 : 1, vx: 0, view: "front", still: STOP_HOLD };
      this.catAnim.set(cat.id, a);
    }
    const dx = x - a.px;
    let speed = Math.hypot(dx, y - a.py);
    if (speed > 8) speed = 0; // drag/teleport — not a gait
    const moving = speed > 0.06 && !cat.grabbed && cat.stage !== "collapsed";
    a.phase += Math.min(speed, 2.5) * 0.9; // faster travel → quicker bounce
    a.amp += ((moving ? 1 : 0) - a.amp) * 0.18; // ease the squish in and out
    // View: the sim only nudges position once per tick, so `amp` dips between
    // ticks — thresholding it flickers front/side mid-walk. Instead latch to the
    // 3/4 view on any movement and only fall back to front after a real stop
    // (no movement for STOP_HOLD frames, which bridges the tick gaps).
    if (speed > 0.02) a.still = 0;
    else if (a.still < STOP_HOLD) a.still++;
    a.view = a.still >= STOP_HOLD ? "front" : "tqfront";
    // Facing: the sim rewrites cat.facing from the raw dx sign every tick, which
    // ping-pongs as a cat wanders. Low-pass the horizontal velocity and only
    // turn past a deadzone so the sprite commits to a direction instead of
    // twitching. (speed === 0 means a teleport/drag frame — skip it.)
    if (speed > 0) a.vx = a.vx * 0.82 + dx * 0.18;
    if (a.vx > FACE_FLIP) a.dir = 1;
    else if (a.vx < -FACE_FLIP) a.dir = -1;
    a.px = x;
    a.py = y;
    return a;
  }

  // ---------- cats ----------
  private drawCat(cat: CatState, world: WorldState): void {
    const ctx = this.ctx;
    const { x, y } = cat.pos;
    const focusFade = world.bubbles; // no-op ref
    void focusFade;
    const anim = this.updateCatAnim(cat, x, y);
    ctx.save();
    ctx.translate(x, y);

    const collapsed = cat.stage === "collapsed";
    const sleeping = cat.action?.id === "sleep" && cat.action.phase === "perform";

    // Done-beat lifecycle (anim spec §1.3): stamp the expiry on the first
    // painted frame, expire by SIM time (fast-forward shortens beats — correct),
    // and suppress under grab/collapse. Entries just expire out of the map.
    let beat = this.doneBeats.get(cat.id);
    if (beat) {
      if (beat.until < 0) beat.until = world.time + ANIM.doneMs;
      if (world.time >= beat.until || cat.grabbed || collapsed) {
        this.doneBeats.delete(cat.id);
        beat = undefined;
      }
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = PALETTE.ink;

    // One-image model: sleep/collapsed are code transforms of the neutral
    // front sprite (no pose art, ever). Sprite-less cats keep the doodle poses.
    const poseImg = this.catSprites.get(`${cat.id}_front`);
    const poseReady = !!poseImg && poseImg.complete && poseImg.naturalWidth > 0;

    if (collapsed) {
      if (poseReady) {
        // Laid FLAT, splayed askew, motionless — must NOT read as sleep (spec):
        // flatter than the sleep pose, wider, facing the other way, no breathing.
        const sv = SPRITE_H * ANIM.collapsedFlatten; // screen-vertical span
        const sh = SPRITE_H * ANIM.collapsedStretch; // screen-horizontal span
        ctx.save();
        ctx.translate(0, SPRITE_BASELINE);
        ctx.rotate(Math.PI / 2 + ANIM.collapsedSplayRad);
        ctx.drawImage(poseImg!, -sv, -sh / 2, sv, sh); // grounded at the baseline
        ctx.restore();
      } else {
        // splayed doodle — must NOT read as sleep (spec)
        this.wobbleEllipse(0, -2, 20, 9, cat.identity.color);
        this.dot(-10, -6, 2.5, PALETTE.ink);
        this.dot(-4, -6, 2.5, PALETTE.ink);
      }
    } else if (sleeping) {
      if (poseReady) {
        // On its side with a slow breathing squish off the SIM clock (pause
        // freezes the breath, fast-forward quickens it).
        const squish = ANIM.sleepBreatheAmp * Math.sin((world.time / ANIM.sleepBreatheMs) * Math.PI * 2);
        const sv = SPRITE_H * (1 + squish); // belly rises off the grounded base
        const sh = SPRITE_H * (1 - squish);
        ctx.save();
        ctx.translate(0, SPRITE_BASELINE);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(poseImg!, 0, -sh / 2, sv, sh);
        ctx.restore();
      } else {
        this.wobbleEllipse(0, -6, 16, 11, cat.identity.color);
      }
      ctx.fillStyle = PALETTE.ink;
      ctx.font = "9px sans-serif";
      ctx.fillText("z", 12, -14);
    } else {
      const strained = cat.stage === "strained" || cat.stage === "critical";
      // Universal wiggle (anim spec §1.2): any perform-phase action (sleep
      // exempt) rocks the whole cat about its feet. Two frames off the SIM
      // clock — fast-forward speeds it, pause freezes it — and the walk squish
      // is suppressed while it runs (amp is ~0 at a standstill anyway).
      // State priority (anim spec §1.2): done beat > wiggle > walk/idle.
      const wiggling = !beat && !cat.grabbed && cat.action?.phase === "perform" && !WIGGLE_EXEMPT.has(cat.action.id);
      const tilt = wiggling
        ? (Math.floor(world.time / ANIM.wiggleFrameMs) % 2 === 0 ? -1 : 1) * ANIM.wiggleTiltRad
        : 0;
      // 3/4-front while travelling, front only after a full stop (see
      // updateCatAnim); the done beat always faces the camera to show off.
      const view = beat ? "front" : anim.view;
      const img = this.catSprites.get(`${cat.id}_${view}`) ?? this.catSprites.get(`${cat.id}_front`);
      if (img && img.complete && img.naturalWidth > 0) {
        // Squash-and-stretch: widen as it flattens, anchored at the feet so it
        // reads as a grounded bounce. Amplitude is only nonzero while walking.
        const wob = wiggling ? 0 : SQUISH * anim.amp * Math.sin(anim.phase);
        const h = SPRITE_H * (1 - wob) * (strained ? 0.94 : 1);
        const w = SPRITE_H * (1 + wob);
        const baseline = SPRITE_BASELINE + (strained ? 3 : 0);
        // Art is drawn facing LEFT: mirror it (scaleX -1) to face right when the
        // smoothed direction is rightward (dir 1). dir -1 keeps the native art.
        ctx.save();
        if (tilt) {
          ctx.translate(0, baseline);
          ctx.rotate(tilt);
          ctx.translate(0, -baseline);
        }
        ctx.scale(-anim.dir, 1);
        ctx.drawImage(img, -w / 2, baseline - h, w, h);
        ctx.restore();
        const item = cat.inventory[0];
        if (item) this.drawItemIcon(item.type, 12, baseline - 22, true);
        if (beat) this.drawDoneItem(beat.item, baseline - SPRITE_H - ANIM.doneItemLiftU);
      } else {
        // Doodle fallback — sprite still decoding, or a name with no art yet.
        const droop = strained ? 4 : 0;
        ctx.save();
        if (tilt) {
          const feetY = 16 + droop;
          ctx.translate(0, feetY);
          ctx.rotate(tilt);
          ctx.translate(0, -feetY);
        }
        // legs
        ctx.strokeStyle = PALETTE.ink;
        ctx.beginPath();
        ctx.moveTo(-5, 6 + droop);
        ctx.lineTo(-5, 16 + droop);
        ctx.moveTo(5, 6 + droop);
        ctx.lineTo(5, 16 + droop);
        ctx.stroke();
        // torso
        this.wobbleEllipse(0, -2 + droop, 12, 15, cat.identity.color);
        // head
        this.wobbleEllipse(0, -20 + droop, 11, 10, cat.identity.color);
        // ears
        ctx.fillStyle = cat.identity.color;
        this.wobbleTriangle2(-8, -28 + droop, -3, -30 + droop, -5, -22 + droop);
        this.wobbleTriangle2(8, -28 + droop, 3, -30 + droop, 5, -22 + droop);
        // identifying accent blotch
        ctx.fillStyle = cat.identity.accent;
        this.dot(4, -4 + droop, 3, cat.identity.accent);
        // face
        this.eyes(cat.emotion, droop);
        // carried item
        const item = cat.inventory[0];
        if (item) this.drawItemIcon(item.type, 12, 0 + droop, true);
        if (beat) this.drawDoneItem(beat.item, -30 + droop - ANIM.doneItemLiftU);
        ctx.restore();
      }
    }
    ctx.restore();

    // name tag (small)
    ctx.fillStyle = PALETTE.ink;
    ctx.font = "8px 'Comic Sans MS', sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.7;
    ctx.fillText(cat.identity.name, x, y + 30);
    ctx.globalAlpha = 1;

    // cult mark
    if (cat.cultRole) {
      ctx.fillStyle = "#8b6fb0";
      ctx.fillText("✦", x + 14, y - 30);
    }
  }

  private eyes(emotion: string, droop: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.ink;
    const yy = -21 + droop;
    if (emotion === "happy") {
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-4, yy, 2, Math.PI, 0);
      ctx.arc(4, yy, 2, Math.PI, 0);
      ctx.stroke();
    } else if (emotion === "scared" || emotion === "tired") {
      this.dot(-4, yy, 1.5, PALETTE.ink);
      this.dot(4, yy, 1.5, PALETTE.ink);
    } else if (emotion === "annoyed") {
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, yy - 2);
      ctx.lineTo(-2, yy);
      ctx.moveTo(6, yy - 2);
      ctx.lineTo(2, yy);
      ctx.stroke();
    } else {
      this.dot(-4, yy, 2, PALETTE.ink);
      this.dot(4, yy, 2, PALETTE.ink);
    }
  }

  // ---------- bubbles ----------
  private drawBubbles(world: WorldState): void {
    const ctx = this.ctx;
    for (const bub of world.bubbles) {
      const cat = world.cats.find((c) => c.id === bub.cat);
      if (!cat) continue;
      const age = world.time - bub.bornAt;
      let alpha = 1;
      if (age < BUBBLE.fadeInMs) alpha = age / BUBBLE.fadeInMs;
      else if (age > bub.ttl - BUBBLE.fadeOutMs) alpha = Math.max(0, (bub.ttl - age) / BUBBLE.fadeOutMs);
      ctx.globalAlpha = alpha;
      const bx = cat.pos.x;
      const by = cat.pos.y - 40;
      const text = bub.text;
      ctx.font = "10px 'Comic Sans MS', sans-serif";
      // Word-wrap safety net (06-dialogue M1): long lines wrap at maxWidthU
      // and truncate with an ellipsis past maxLines. The box grows UPWARD so
      // the tail and anchor stay put; short lines render exactly as before.
      const lines = this.wrapBubbleText(text, BUBBLE.maxWidthU, BUBBLE.maxLines);
      let textW = 0;
      for (const l of lines) textW = Math.max(textW, ctx.measureText(l).width);
      const w = Math.max(24, textW + 12);
      const extra = (lines.length - 1) * BUBBLE.lineHeightU;
      ctx.fillStyle = bub.kind === "gossip" ? "#efe7f5" : PALETTE.cream;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      this.roundRectWobble(bx - w / 2, by - 16 - extra, w, 20 + extra, 8);
      ctx.fill();
      ctx.stroke();
      if (bub.kind === "gossip") ctx.stroke(); // double outline
      // tail
      ctx.beginPath();
      ctx.moveTo(bx - 4, by + 4);
      ctx.lineTo(bx + 2, by + 10);
      ctx.lineTo(bx + 4, by + 3);
      ctx.fillStyle = PALETTE.cream;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.ink;
      ctx.textAlign = "center";
      // last line sits where the single line always did; earlier lines stack up
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], bx, by - 2 - (lines.length - 1 - i) * BUBBLE.lineHeightU);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Greedy word-wrap against measureText (current font must be set).
   *  Returns 1..maxLines lines; overflow past maxLines is truncated onto the
   *  last line with an ellipsis. A single word wider than maxWidth stays on
   *  its own line (this is a safety net — the parse-time char budget is the
   *  real limit). Fast path: text that already fits comes back unchanged. */
  private wrapBubbleText(text: string, maxWidth: number, maxLines: number): string[] {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const lines: string[] = [""];
    for (const word of text.split(" ")) {
      const cur = lines[lines.length - 1];
      const tryLine = cur ? `${cur} ${word}` : word;
      if (cur && ctx.measureText(tryLine).width > maxWidth) lines.push(word);
      else lines[lines.length - 1] = tryLine;
    }
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last}…`;
    }
    return lines;
  }

  // ---------- items ----------
  /** The done-beat trophy: the yielded item held up above the head with a
   *  slight pop (ANIM.doneItemScale). Coordinates are cat-local. */
  private drawDoneItem(type: string, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(ANIM.doneItemScale, ANIM.doneItemScale);
    this.drawItemIcon(type, 0, 0);
    ctx.restore();
  }

  private drawItemIcon(type: string, x: number, y: number, small = false): void {
    const ctx = this.ctx;
    const s = small ? 0.7 : 1;
    // prop_*.png when it exists (soup serves in prop_bowl); doodle fallback.
    const prop = this.ws(type === "soup" ? "prop_bowl" : `prop_${type}`);
    if (prop) {
      const u = PROP_U * s;
      ctx.drawImage(prop, x - u / 2, y - u * PROP_CENTER_FRAC, u, u);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.ink;
    const map: Record<string, string> = {
      fish: "#8fb8cf",
      wood: "#b58a5c",
      vegetable: "#c0603f",
      bread: "#d8a45a",
      soup: "#e0b26a",
      yarn: "#c98aa0",
      flowers: "#d47a9a",
      trinket: "#e0c65a",
      junk: "#8a8577",
    };
    ctx.fillStyle = map[type] ?? "#999";
    if (type === "fish") {
      this.wobbleEllipse(0, 0, 7, 4, ctx.fillStyle);
      this.wobbleTriangle2(6, 0, 11, -4, 11, 4);
    } else if (type === "soup") {
      this.wobbleEllipse(0, 2, 7, 4, ctx.fillStyle);
    } else if (type === "wood") {
      // two short crossed branches
      ctx.strokeStyle = "#8a6a44";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-6, 3);
      ctx.lineTo(7, -4);
      ctx.moveTo(-6, -3);
      ctx.lineTo(7, 4);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.ink;
    } else {
      this.dot(0, 0, 5, ctx.fillStyle);
    }
    ctx.restore();
  }

  // ---------- overlays ----------
  private drawDayTint(world: WorldState, vw: number, vh: number): void {
    const tints: Record<string, [string, number]> = {
      dawn: ["#ffd9b0", 0.14],
      morning: ["#ffffff", 0],
      afternoon: ["#ffe9c8", 0.06],
      sunset: ["#ff9d6e", 0.2],
      night: ["#2a3a6a", 0.32],
    };
    const [color, alpha] = tints[world.phase] ?? ["#ffffff", 0];
    if (alpha <= 0) return;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, vw, vh);
    this.ctx.globalAlpha = 1;
  }

  private drawWeather(world: WorldState, vw: number, vh: number): void {
    if (world.weather === "clear") return;
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(120,150,190,0.55)";
    ctx.lineWidth = 1.5;
    const dense = world.weather === "storm" ? 260 : 120;
    for (let i = 0; i < dense; i++) {
      const x = (i * 97 + (world.time / 8) % vw) % vw;
      const y = (i * 53 + (world.time / 3)) % vh;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 10);
      ctx.stroke();
    }
    if (world.weather === "storm" && Math.floor(world.time / 900) % 7 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  private drawFastBadge(vw: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(80,60,40,0.8)";
    ctx.font = "12px 'Comic Sans MS', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("▶▶ fast", vw - 14, 22);
  }

  // ---------- doodle primitives ----------
  private wobble(): number {
    return (Math.random() - 0.5) * 1.6;
  }
  private wobbleEllipse(x: number, y: number, rx: number, ry: number, fill: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const px = x + Math.cos(a) * (rx + this.wobble());
      const py = y + Math.sin(a) * (ry + this.wobble());
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  private wobbleRect(x: number, y: number, w: number, h: number, fill: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + this.wobble(), y + this.wobble());
    ctx.lineTo(x + w + this.wobble(), y + this.wobble());
    ctx.lineTo(x + w + this.wobble(), y + h + this.wobble());
    ctx.lineTo(x + this.wobble(), y + h + this.wobble());
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  private roundRectWobble(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  private wobbleTriangle(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x - size, y + size);
    ctx.closePath();
    ctx.fill();
  }
  private wobbleTriangle2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  private wobbleTriangleRoof(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
    this.wobbleTriangle2(ax, ay, bx, by, cx, cy);
  }
  private flame(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x + size * 0.7, y, x, y + size * 0.4);
    ctx.quadraticCurveTo(x - size * 0.7, y, x, y - size);
    ctx.fill();
  }
  private steam(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const t = Date.now() / 400;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(t) * 6, y - 10, x, y - 20);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ink;
  }
  private windowGlow(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,220,140,0.85)";
    this.wobbleRect(-12, -14, 10, 10, "rgba(255,220,140,0.85)");
  }
  private dot(x: number, y: number, r: number, fill: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}
