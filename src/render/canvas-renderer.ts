// Canvas renderer — reads sim state snapshots only (spec §Architecture 1: the
// view never mutates the sim). Placeholder doodle graphics stand in until the
// real hand-drawn assets from 00-style-guide land; swapping to sprites later is
// isolated to this file.

import { BUBBLE, TREES } from "../config/tuning.ts";
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

// Sprite footprint in world units. Feet sit on SPRITE_BASELINE so the sprite
// grounds where the old doodle's legs did; height/width are squished per-frame.
const SPRITE_H = 56;
const SPRITE_BASELINE = 18;
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

  constructor(private canvas: HTMLCanvasElement) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("no 2d context");
    this.ctx = c;
    this.loadCatSprites();
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
      case "pond":
        this.wobbleEllipse(0, 0, 70, 46, PALETTE.water);
        ctx.fillStyle = "#8bb6cf";
        this.wobbleEllipse(-18, 6, 10, 5, "#bfe0ee");
        break;
      case "bonfire":
        this.wobbleRect(-26, 6, 52, 10, PALETTE.wood);
        if (b.state?.lit) {
          ctx.fillStyle = "#f0a04b";
          this.flame(0, -6, 18);
          ctx.fillStyle = "#f6c65a";
          this.flame(0, -2, 10);
        } else {
          ctx.fillStyle = "#6b5a49";
          this.wobbleTriangle(0, -4, 12);
        }
        break;
      case "soup-station":
        this.hut(PALETTE.wood, "soup");
        if (b.active && b.state?.pot === "cooking") this.steam(0, -34);
        break;
      case "bakery":
        this.hut("#d9a86a", "bread");
        this.steam(14, -40);
        break;
      case "library":
        this.hut("#9fb0c8", "book");
        if (b.active || world.phase === "night") this.windowGlow();
        break;
      case "market":
        this.wobbleRect(-30, -18, 60, 30, "#cdb083");
        this.wobbleRect(-34, -30, 68, 14, "#c07d5a");
        break;
      case "forage":
        ctx.fillStyle = "#7fa25e";
        this.wobbleEllipse(0, 0, 22, 16, "#7fa25e");
        ctx.fillStyle = "#c05b6a";
        for (let i = 0; i < ((b.state?.veg as number) || 0); i++) {
          this.dot(-8 + i * 7, -4 - (i % 2) * 4, 3, "#c05b6a");
        }
        break;
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
      // materials pile: stacked logs + plank
      ctx.fillStyle = "#a8865e";
      this.wobbleRect(-18, 0, 36, 7, "#a8865e");
      this.wobbleRect(-14, -7, 28, 7, "#b8946a");
      this.wobbleRect(-10, -13, 20, 6, "#a8865e");
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
      ctx.fillStyle = "#d9c7ea";
      this.wobbleEllipse(0, 8, 26, 10, "#d9c7ea");
    }
    ctx.fillStyle = "#b79fd6"; // reserved cult accent (pale violet)
    ctx.strokeStyle = "#6d5a8c";
    ctx.lineWidth = 2.5;
    this.wobbleTriangle(0, -4, 12);
    ctx.stroke();
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
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = PALETTE.ink;

    if (collapsed) {
      // splayed — must NOT read as sleep (spec)
      this.wobbleEllipse(0, -2, 20, 9, cat.identity.color);
      this.dot(-10, -6, 2.5, PALETTE.ink);
      this.dot(-4, -6, 2.5, PALETTE.ink);
    } else if (sleeping) {
      this.wobbleEllipse(0, -6, 16, 11, cat.identity.color);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = "9px sans-serif";
      ctx.fillText("z", 12, -14);
    } else {
      const strained = cat.stage === "strained" || cat.stage === "critical";
      // 3/4-front while travelling, front only after a full stop (see updateCatAnim).
      const img = this.catSprites.get(`${cat.id}_${anim.view}`) ?? this.catSprites.get(`${cat.id}_front`);
      if (img && img.complete && img.naturalWidth > 0) {
        // Squash-and-stretch: widen as it flattens, anchored at the feet so it
        // reads as a grounded bounce. Amplitude is only nonzero while walking.
        const wob = SQUISH * anim.amp * Math.sin(anim.phase);
        const h = SPRITE_H * (1 - wob) * (strained ? 0.94 : 1);
        const w = SPRITE_H * (1 + wob);
        const baseline = SPRITE_BASELINE + (strained ? 3 : 0);
        // Art is drawn facing LEFT: mirror it (scaleX -1) to face right when the
        // smoothed direction is rightward (dir 1). dir -1 keeps the native art.
        ctx.save();
        ctx.scale(-anim.dir, 1);
        ctx.drawImage(img, -w / 2, baseline - h, w, h);
        ctx.restore();
        const item = cat.inventory[0];
        if (item) this.drawItemIcon(item.type, 12, baseline - 22, true);
      } else {
        // Doodle fallback — sprite still decoding, or a name with no art yet.
        const droop = strained ? 4 : 0;
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
  private drawItemIcon(type: string, x: number, y: number, small = false): void {
    const ctx = this.ctx;
    const s = small ? 0.7 : 1;
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
