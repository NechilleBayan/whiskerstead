// Trees — renewable wood source framing the playable field.
//
// Trees are Buildings of type "tree" so perception, painter's-order rendering,
// and persistence all come free. State machine (per tree, in building.state):
//
//   growing → mature → reserved → chopping → stump → regrowing → mature …
//
// Time-driven transitions use a `since` timestamp against world.time and are
// advanced by a cheap sweep each tick. Reservation transitions are made by the
// chop action (one cat per tree); the sweep self-heals leaked reservations
// (grabbed cats, interrupted actions) by checking the reserver still targets
// the tree.

import { FOREST, TREES } from "../config/tuning.ts";
import { Rng } from "./rng.ts";
import type { Building, CatState, Site, WorldState } from "./types.ts";

export type TreeStage = "growing" | "mature" | "reserved" | "chopping" | "stump" | "regrowing";

export function isTree(b: Building): boolean {
  return b.type === "tree";
}

/** Deterministic forest generation. Uses its own RNG stream (seed-derived) so
 *  spawning never perturbs the simulation's RNG sequence. */
export function spawnForest(
  existing: Building[],
  sites: Site[],
  seed: number,
  bounds: { w: number; h: number },
): Building[] {
  const rng = new Rng((seed ^ 0x51f07a3e) >>> 0);
  const { w: W, h: H } = bounds;
  const cx = W / 2;
  const cy = H / 2;
  const clearW = (W * FOREST.clearingFrac) / 2;
  const clearH = (H * FOREST.clearingFrac) / 2;

  // Configurable exclusion zones from what's actually in the world.
  const excl = [
    ...existing.map((b) => ({
      x: b.pos.x,
      y: b.pos.y,
      r: FOREST.exclusionRadius[b.type] ?? FOREST.exclusionRadius.default,
    })),
    ...sites.map((s) => ({ x: s.pos.x, y: s.pos.y, r: FOREST.exclusionRadius.site })),
  ];

  const trees: Building[] = [];
  let n = 0;

  const tryPlace = (x: number, y: number): void => {
    // Trunks stay reachable: canopies may overflow the edge visually, trunk
    // positions stay just inside the boundary.
    if (x < 8 || x > W - 8 || y < 12 || y > H - 4) return;
    // The readable central field stays clear.
    if (Math.abs(x - cx) < clearW && Math.abs(y - cy) < clearH) return;
    for (const e of excl) if (Math.hypot(x - e.x, y - e.y) < e.r + 12) return;
    for (const t of trees) if (Math.hypot(x - t.pos.x, y - t.pos.y) < FOREST.minTreeSpacing) return;

    const mature = rng.chance(FOREST.matureFraction);
    trees.push({
      id: `tree-${++n}`,
      kind: "building",
      type: "tree",
      pos: { x, y },
      active: false,
      fixed: true,
      state: {
        stage: mature ? "mature" : "growing",
        // growing trees spawn mid-growth (negative since = head start)
        since: mature ? 0 : -Math.floor(rng.range(0, TREES.growMs * 0.8)),
        variant: rng.int(0, 2),
        scale: rng.range(0.8, 1.25),
        lean: rng.range(-0.07, 0.07),
        reservedBy: "",
      },
    });
  };

  // Uneven clusters with jitter — gaps fall out of random cluster centers and
  // exclusion rejections; overlapping bands make corners naturally denser.
  const cluster = (x0: number, y0: number, count: readonly [number, number]) => {
    const k = rng.int(count[0], count[1]);
    for (let i = 0; i < k; i++) tryPlace(x0 + rng.range(-40, 40), y0 + rng.range(-32, 32));
  };

  const z = FOREST.zones;
  for (let i = 0; i < z.left.clusters; i++) {
    const depth = rng.range(z.left.depthFrac[0], z.left.depthFrac[1]) * W;
    cluster(rng.range(10, depth), rng.range(20, H - 20), z.left.treesPerCluster);
  }
  for (let i = 0; i < z.right.clusters; i++) {
    const depth = rng.range(z.right.depthFrac[0], z.right.depthFrac[1]) * W;
    cluster(W - rng.range(10, depth), rng.range(20, H - 20), z.right.treesPerCluster);
  }
  for (let i = 0; i < z.top.clusters; i++) {
    const depth = rng.range(z.top.depthFrac[0], z.top.depthFrac[1]) * H;
    cluster(rng.range(20, W - 20), rng.range(14, depth), z.top.treesPerCluster);
  }
  // Bottom: sparse, corners only — the middle-bottom stays open.
  for (let i = 0; i < z.bottom.clusters; i++) {
    const depth = rng.range(z.bottom.depthFrac[0], z.bottom.depthFrac[1]) * H;
    const x0 = rng.chance(0.5) ? rng.range(20, W * 0.26) : rng.range(W * 0.74, W - 20);
    cluster(x0, H - rng.range(8, depth), z.bottom.treesPerCluster);
  }

  return trees;
}

/** Advance time-driven tree states and self-heal leaked reservations.
 *  Cheap (~50 trees, string compares); runs every sim tick. */
export function updateTrees(world: WorldState): void {
  const now = world.time;
  for (const tr of world.buildings) {
    if (!isTree(tr)) continue;
    const s = tr.state!;
    const since = s.since as number;
    switch (s.stage as TreeStage) {
      case "growing":
        if (now - since >= TREES.growMs) {
          s.stage = "mature";
          s.since = now;
        }
        break;
      case "stump":
        if (now - since >= TREES.stumpMs) {
          s.stage = "regrowing";
          s.since = now;
        }
        break;
      case "regrowing":
        if (now - since >= TREES.regrowMs) {
          s.stage = "mature";
          s.since = now;
        }
        break;
      case "reserved":
      case "chopping": {
        // Reservation is only valid while the reserving cat still targets
        // this tree (drag interruptions, re-decisions, collapse all release).
        const holder = world.cats.find((c) => c.id === s.reservedBy);
        if (!holder || holder.action?.targetId !== tr.id) {
          s.stage = "mature";
          s.reservedBy = "";
        }
        break;
      }
    }
  }
}

/** Nearest mature, unreserved trees — capped so a large forest doesn't flood
 *  the decision roll. */
export function choppableTrees(cat: CatState, world: WorldState): Building[] {
  const mature = world.buildings.filter((b) => isTree(b) && b.state!.stage === "mature");
  mature.sort(
    (a, b) =>
      Math.hypot(a.pos.x - cat.pos.x, a.pos.y - cat.pos.y) - Math.hypot(b.pos.x - cat.pos.x, b.pos.y - cat.pos.y),
  );
  return mature.slice(0, TREES.maxCandidates);
}
