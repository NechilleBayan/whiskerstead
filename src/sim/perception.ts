// Generic perception — spec §5 (architecture). A cat perceives "nearby
// reactable things" as ONE list: buildings, items, sites, and other cats are the
// same kind of entry. This is what makes every future entity free.

import type { BaseEntity, CatState, WorldState } from "./types.ts";

export interface Percept {
  entity: BaseEntity;
  dist: number;
}

const PERCEPTION_RADIUS = 100000; // village is small; everything is "reachable"

export function perceive(cat: CatState, world: WorldState): Percept[] {
  const out: Percept[] = [];
  const push = (e: BaseEntity) => {
    if (e.id === cat.id) return;
    const dist = distance(cat.pos, e.pos);
    if (dist <= PERCEPTION_RADIUS) out.push({ entity: e, dist });
  };
  for (const b of world.buildings) push(b);
  for (const s of world.sites) if (s.discovered) push(s);
  for (const it of world.groundItems) push(it);
  for (const c of world.cats) if (!c.grabbed && c.stage !== "collapsed") push(c);
  // Also perceive collapsed cats — they're highly reactable (rescue).
  for (const c of world.cats) if (c.stage === "collapsed") push(c);
  out.sort((a, b) => a.dist - b.dist);
  return out;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
