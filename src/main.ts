// Browser entry — wires the headless sim to the canvas renderer and player
// input. This is the ONLY place sim and render meet; the sim never imports it.

import { CanvasRenderer } from "./render/canvas-renderer.ts";
import { Simulation } from "./sim/simulation.ts";
import { createWorld } from "./sim/world.ts";
import { phaseAt } from "./sim/time.ts";
import type { GameEvent } from "./sim/events.ts";

const SAVE_KEY = "whiskerstead-save-v1";

function boot(): Simulation {
  // dev: ?fresh discards the save and starts a new village
  if (new URLSearchParams(location.search).has("fresh")) {
    localStorage.removeItem(SAVE_KEY);
    return new Simulation(createWorld());
  }
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    try {
      return Simulation.load(saved);
    } catch {
      /* fall through to fresh world */
    }
  }
  return new Simulation(createWorld());
}

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const debugEl = document.getElementById("debug") as HTMLPreElement;
const sim = boot();
const renderer = new CanvasRenderer(canvas);

// ---- done beat (anim spec §1.3): the ONE declarative yield→icon map ----
// The renderer stays a pure snapshot-reader, so the bus wiring lives here and
// forwards yields to renderer.noteYield. Actions with no entry (wander, read,
// socialize, …) just end — no beat. `steal` is deliberately excluded: a thief
// holding up the loot defeats the sneak. Adding a future yield is one line.
const YIELD_EVENTS: { [T in GameEvent["type"]]?: (e: Extract<GameEvent, { type: T }>) => string | undefined } = {
  fished: (e) => (e.result === "catch" ? "fish" : undefined), // miss = no beat
  chopped: () => "wood",
  gathered: () => "vegetable",
  cooked: () => "soup",
  scavenged: (e) => e.item,
};
for (const [type, pick] of Object.entries(YIELD_EVENTS)) {
  sim.bus.on(type as GameEvent["type"], (e) => {
    const item = (pick as (e: GameEvent) => string | undefined)(e);
    if (item) renderer.noteYield((e as GameEvent & { cat: string }).cat, item);
  });
}

let fast = false;
let showDebug = false;
let held: string | null = null;

// ---- input: grab / drag / release (Gentle Influence) ----
canvas.addEventListener("pointerdown", (e) => {
  const w = renderer.screenToWorld(e.clientX, e.clientY);
  const cat = sim.catAt(w);
  if (cat) {
    held = cat.id;
    sim.grab(cat.id);
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (held) sim.dragTo(held, renderer.screenToWorld(e.clientX, e.clientY));
});
canvas.addEventListener("pointerup", () => {
  if (held) {
    sim.release(held);
    held = null;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "d" || e.key === "D") showDebug = !showDebug;
  if (e.key === "f" || e.key === "F") fast = !fast;
  if (e.key === "1") sim.weather("clear");
  if (e.key === "2") sim.weather("rain");
  if (e.key === "3") sim.weather("storm");
});

// ---- persistence: save on unload + periodically (freeze while closed) ----
window.addEventListener("beforeunload", () => localStorage.setItem(SAVE_KEY, sim.save()));
setInterval(() => localStorage.setItem(SAVE_KEY, sim.save()), 15000);

// ---- main loop ----
// Sim is driven by setInterval so an occluded/background window keeps living
// (Chrome throttles rAF to zero when covered; intervals only to ~1Hz, which
// the sim's internal 250ms step clamp absorbs). rAF only paints.
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  let dt = now - last;
  last = now;
  const steps = fast ? 12 : 1;
  // catch up in bounded slices — tick() clamps each to 250ms internally
  while (dt > 0) {
    const slice = Math.min(dt, 250);
    for (let i = 0; i < steps; i++) sim.tick(slice);
    dt -= slice;
  }
}, 100);

function frame(): void {
  renderer.render(sim.world, { fast });
  if (showDebug) {
    debugEl.style.display = "block";
    debugEl.textContent = debugText();
  } else {
    debugEl.style.display = "none";
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// dev hooks for the per-cat inspector / seed replay tooling
(window as unknown as { __sim: Simulation }).__sim = sim;
(window as unknown as { __renderer: CanvasRenderer }).__renderer = renderer;

function debugText(): string {
  const w = sim.world;
  const { dayFrac } = phaseAt(w.time);
  const lines: string[] = [];
  lines.push(`day ${w.day} · ${w.phase} · ${(dayFrac * 100).toFixed(0)}% · ${w.weather}`);
  if (w.cult) lines.push(`cult: ${w.cult.founder} +${w.cult.members.length - 1} (${w.cult.stage})`);
  lines.push("");
  for (const c of w.cats) {
    const n = c.needs;
    const act = c.action ? `${c.action.id}${c.action.phase === "goto" ? "→" : ""}` : "idle";
    lines.push(
      `${c.identity.name.padEnd(8)} ${c.stage.padEnd(9)} ${act.padEnd(14)} ` +
        `h${bar(n.hunger)} e${bar(n.energy)} s${bar(n.social)} cu${bar(n.curiosity)} co${bar(n.comfort)} ` +
        `hp${(c.condition * 100).toFixed(0)}`,
    );
  }
  lines.push("");
  lines.push("recent events:");
  for (const { e } of sim.bus.log.slice(-8)) lines.push("  " + summarize(e));
  return lines.join("\n");
}

function bar(v: number): string {
  const n = Math.round(v * 5);
  return "█".repeat(n) + "·".repeat(5 - n);
}

function summarize(e: { type: string } & Record<string, unknown>): string {
  const parts = Object.entries(e)
    .filter(([k]) => k !== "type" && k !== "roll")
    .map(([, v]) => (typeof v === "string" ? v : ""))
    .filter(Boolean);
  return `${e.type} ${parts.join(" ")}`;
}
