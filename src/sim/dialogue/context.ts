// Derived dialogue context queries — 06-dialogue-integration-spec §6 (M1).
// Pure reads over world state for the M2 gates: no mutation, no rng, no DOM.
// The full DialogueContext snapshot shape lands with the gates (M2/M3),
// not here — these are the individual questions those gates will ask.

import { SOUP, TREES } from "../../config/tuning.ts";
import { distance } from "../perception.ts";
import type { CatState, WorldState } from "../types.ts";

export interface FoodShortage {
  soup: boolean; // no soup-station holds enough ingredients for a pot
  bread: boolean; // the bakery is out of bread
  forage: boolean; // every forage patch is picked clean
  any: boolean;
}

/** Village food pinch, per source. A source only counts as short when EVERY
 *  building of that type is drained (one stocked bakery is not a shortage). */
export function foodShortage(world: WorldState): FoodShortage {
  const drained = (type: string, key: string, min: number) => {
    const bs = world.buildings.filter((b) => b.type === type);
    return bs.length > 0 && bs.every((b) => (((b.state?.[key] as number) ?? 0) < min));
  };
  const soup = drained("soup-station", "ingredients", SOUP.restockUnits);
  const bread = drained("bakery", "bread", 1);
  const forage = drained("forage", "veg", 1);
  return { soup, bread, forage, any: soup || bread || forage };
}

/** True when the bonfire can't afford its next lighting. */
export function fuelShortage(world: WorldState): boolean {
  const fire = world.buildings.find((b) => b.type === "bonfire");
  return !!fire && ((fire.state?.fuel as number) ?? 0) < TREES.campfireCost;
}

/** Other cats within radius — perception's idiom: grabbed cats are in the
 *  player's hand and not "here"; collapsed cats count (highly reactable). */
export function nearbyCats(cat: CatState, world: WorldState, radius: number): CatState[] {
  return world.cats.filter((c) => c.id !== cat.id && !c.grabbed && distance(cat.pos, c.pos) <= radius);
}

/** Time spent in the current action's perform phase; undefined while idle or
 *  still walking there (goto). */
export function workElapsedMs(cat: CatState, now: number): number | undefined {
  if (cat.action?.phase !== "perform") return undefined;
  return now - cat.action.startedAt;
}
