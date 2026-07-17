// World construction — design spec §The World. Pond + central bonfire are fixed
// landmarks; other buildings snap to a loose grid. Cats start needing a home
// (spawn build-arc) but MVP begins with houses present so life is legible fast.

import { ROSTER, makeIdentity } from "../content/cats.ts";
import { DIALOGUE, NEED_IDS, NEVER_MS } from "../config/tuning.ts";
import { spawnForest } from "./trees.ts";
import type { Building, CatState, Site, WorldState } from "./types.ts";

const WORLD_W = 960;
const WORLD_H = 600;

export function createWorld(seed = 1337): WorldState {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  const buildings: Building[] = [
    b("bonfire", "bonfire", cx, cy, true, { lit: 0, fuel: 1 }),
    b("pond", "pond", cx + 300, cy - 140, true, {}),
    b("soup-station", "soup-station", cx - 150, cy - 60, false, { pot: "empty", bowls: 0, ingredients: 2 }),
    b("bakery", "bakery", cx - 260, cy + 40, false, { bread: 2 }),
    b("library", "library", cx + 190, cy + 110, false, {}),
    b("market", "market", cx + 40, cy + 150, false, { stocked: 1 }),
    b("forage-1", "forage", cx - 320, cy - 150, false, { veg: 3 }),
    b("forage-2", "forage", cx + 120, cy - 210, false, { veg: 3 }),
    b("forage-3", "forage", cx - 60, cy + 230, false, { veg: 3 }),
  ];

  // One house per cat, personality-flavored placement in a loose ring.
  const ring: Array<[number, number]> = [
    [cx - 360, cy + 170],
    [cx + 320, cy + 180],
    [cx + 360, cy - 40],
    [cx - 300, cy - 210],
    [cx + 220, cy - 260],
  ];
  // Houses start as material piles — the spawn build-arc (gather → build) is
  // the village's first visible story (04-technical-architecture Phase 1).
  ROSTER.forEach((seedCat, i) => {
    const [hx, hy] = ring[i];
    buildings.push(b(`house-${seedCat.id}`, "house", hx, hy, false, { stage: 0 }, seedCat.id));
  });

  // Hidden artifact — tucked at a wanderable edge (spec §7 discovery).
  const sites: Site[] = [
    { id: "artifact", kind: "site", type: "artifact", pos: { x: cx - 380, y: cy - 30 }, discovered: false, shrined: false },
  ];

  // Forest frames the field: dense left/top/right bands, sparse bottom
  // corners, central clearing kept open. Deterministic from the world seed.
  buildings.push(...spawnForest(buildings, sites, seed, { w: WORLD_W, h: WORLD_H }));

  const cats: CatState[] = ROSTER.map((seedCat, i) => {
    // Everyone starts gathered at the bonfire — homes don't exist yet.
    const angle = (i / ROSTER.length) * Math.PI * 2;
    const cat: CatState = {
      id: seedCat.id,
      kind: "cat",
      pos: { x: cx + Math.cos(angle) * 55, y: cy + Math.sin(angle) * 40 },
      identity: makeIdentity(seedCat),
      needs: Object.fromEntries(NEED_IDS.map((n) => [n, 0.6 + i * 0.03])) as CatState["needs"],
      condition: 1,
      stage: "stable",
      inventory: [],
      memory: [],
      relationships: {},
      fishSkill: { attempts: 0, catches: 0, tier: "novice" },
      grabbed: false,
      facing: 1,
      emotion: "neutral",
      lastBubbleAt: NEVER_MS, // serializable stand-in for -Infinity
      // First ambient windows staggered across one interval by roster index —
      // deterministic (no rng draw at world build) and the village never
      // fires its opening chatter chorus on the same tick.
      lastAmbientAt: -(i / ROSTER.length) * DIALOGUE.ambientIntervalMs,
      repetition: { actionId: "", count: 0 },
      lineHistory: {},
    };
    return cat;
  });

  return {
    seed,
    rngState: seed >>> 0,
    time: 0,
    day: 1,
    phase: "dawn",
    weather: "clear",
    cats,
    buildings,
    sites,
    groundItems: [],
    bubbles: [],
    bounds: { w: WORLD_W, h: WORLD_H },
  };
}

function b(
  id: string,
  type: string,
  x: number,
  y: number,
  fixed: boolean,
  state: Record<string, number | string | boolean> = {},
  owner?: string,
): Building {
  return { id, kind: "building", type, pos: { x, y }, active: false, fixed, state, owner };
}
