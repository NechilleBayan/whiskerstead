// Core action set — 02-simulation-systems. Each action is self-contained data.
// This registry is what the decision loop scores and rolls over.

import { ACTION_MS, BUILDCFG, CULT, FISH_TIERS, OUST, SOUP, HEALTH, THEFT, TREES } from "../../config/tuning.ts";
import { feed, rest } from "../needs.ts";
import { preferenceFactor } from "../scoring.ts";
import { choppableTrees } from "../trees.ts";
import type { Building, CatState, Item, Site, WorldState } from "../types.ts";
import type { ActionDef } from "./types.ts";

// ---------- helpers ----------

let itemCounter = 0;
function makeItem(type: string, holder: string, quality = 0.7): Item {
  return { id: `item-${type}-${++itemCounter}`, kind: "item", type, pos: { x: 0, y: 0 }, quality, holder };
}
function carrying(cat: CatState, type: string): Item | undefined {
  return cat.inventory.find((i) => i.type === type);
}
function give(cat: CatState, item: Item) {
  item.holder = cat.id;
  cat.inventory.push(item);
}
function take(cat: CatState, type: string): Item | undefined {
  const i = cat.inventory.findIndex((it) => it.type === type);
  return i >= 0 ? cat.inventory.splice(i, 1)[0] : undefined;
}
function buildings(world: WorldState, type: string): Building[] {
  return world.buildings.filter((b) => b.type === type);
}
function home(cat: CatState, world: WorldState): Building | undefined {
  return world.buildings.find((b) => b.owner === cat.id);
}
function writeMemory(cat: CatState, subject: string, event: string, charge: number, now: number) {
  cat.memory.push({ subject, event, charge, at: now });
  if (cat.memory.length > 40) cat.memory.shift();
}
function nudgeRel(a: CatState, bId: string, delta: number) {
  a.relationships[bId] = clamp(-1, 1, (a.relationships[bId] ?? 0) + delta);
}
function clamp(lo: number, hi: number, v: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
function otherCats(cat: CatState, world: WorldState): CatState[] {
  return world.cats.filter((c) => c.id !== cat.id && !c.grabbed);
}
function trait(cat: CatState, t: string): boolean {
  return cat.identity.traits.includes(t);
}

// ---------- actions ----------

const wander: ActionDef = {
  id: "wander",
  intent: "explore",
  needs: ["curiosity"],
  requiresProximity: true,
  reach: 6,
  candidates: () => [undefined],
  appeal: () => 0.5,
  destination: ({ cat, world, rng }) => ({
    x: clamp(30, world.bounds.w - 30, cat.pos.x + rng.range(-160, 160)),
    y: clamp(30, world.bounds.h - 30, cat.pos.y + rng.range(-120, 120)),
  }),
  duration: ({ rng }) => rng.range(2500, 5000),
  onComplete: ({ cat }) => {
    cat.needs.curiosity = Math.min(1, cat.needs.curiosity + 0.08);
    cat.emotion = "neutral";
  },
  bubble: () => undefined,
};

const sleep: ActionDef = {
  id: "sleep",
  intent: "sleep",
  needs: ["energy"],
  requiresProximity: true,
  reach: 20,
  candidates: (cat, world) => {
    // Usually home; memorable exceptions (library, pond edge) allowed.
    // Until the house is built (spawn arc), sleep where you are or the library.
    const h = home(cat, world);
    const homeReady = h && (h.state?.stage as number) >= BUILDCFG.stages - 1;
    const alt = trait(cat, "night owl") ? buildings(world, "library")[0] : undefined;
    return [homeReady ? h : cat, alt].filter(Boolean) as Array<Building | CatState>;
  },
  appeal: (cat) => 0.4 + (1 - cat.needs.energy) * 1.4 + (cat.needs.energy < 0.25 ? 1.5 : 0),
  duration: () => ACTION_MS.sleepFrac * 60 * 60 * 1000 * 0.25, // one sleep chunk
  onStart: ({ cat, emit }) => {
    cat.emotion = "tired";
    emit({ type: "bubble", cat: cat.id, text: "zzz", kind: "thought" });
  },
  onComplete: ({ cat }) => {
    rest(cat, 0.9);
    cat.emotion = "neutral";
  },
  bubble: () => "time to rest…",
};

const eat: ActionDef = {
  id: "eat",
  intent: "food",
  needs: ["hunger"],
  requiresProximity: true,
  reach: 22,
  candidates: (cat, world) => {
    // Eat carried food, or head to soup station / market / bakery.
    if (carrying(cat, "soup") || carrying(cat, "bread") || carrying(cat, "fish")) return [cat];
    return [
      ...buildings(world, "soup-station").filter((b) => (b.state?.bowls as number) > 0),
      ...buildings(world, "bakery").filter((b) => (b.state?.bread as number) > 0),
      ...buildings(world, "market").filter((b) => (b.state?.stocked as number) > 0),
    ];
  },
  appeal: (cat) => 0.5 + (1 - cat.needs.hunger) * 2.6,
  duration: () => ACTION_MS.eat,
  onComplete: ({ cat, world, target, emit }) => {
    let food = "bread";
    let quality = 0.6;
    const carried = carrying(cat, "soup") || carrying(cat, "bread") || carrying(cat, "fish");
    if (target === cat && carried) {
      food = carried.type;
      quality = carried.quality ?? 0.6;
      take(cat, food);
    } else if (target && (target as Building).type === "soup-station") {
      const b = target as Building;
      const bowls = (b.state!.bowls as number) ?? 0;
      if (bowls > 0) {
        b.state!.bowls = bowls - 1;
        food = "soup";
        quality = (b.state!.quality as number) ?? 0.6;
        const cook = b.state!.cook as string | undefined;
        if (cook && cook !== cat.id) emit({ type: "served", cook, customer: cat.id, quality: qtier(quality) });
      }
    } else if (target && (target as Building).type === "market") {
      const b = target as Building;
      b.state!.stocked = Math.max(0, ((b.state!.stocked as number) ?? 1) - 0.34);
      food = "vegetable";
    } else if (target && (target as Building).type === "bakery") {
      const b = target as Building;
      b.state!.bread = Math.max(0, ((b.state!.bread as number) ?? 0) - 1);
      food = "bread";
    }
    feed(cat, 0.45 + quality * 0.3);
    cat.emotion = quality > 0.5 ? "happy" : "annoyed";
    emit({ type: "ate", cat: cat.id, food, quality: qtier(quality) });
  },
  bubble: (cat) => (cat.needs.hunger < 0.3 ? "starving…" : "snack time"),
};

const fish: ActionDef = {
  id: "fish",
  intent: "fish",
  needs: ["hunger", "curiosity"],
  requiresProximity: true,
  reach: 80, // pond ellipse is ~70 wide — cats fish from the bank, not in it
  candidates: (_cat, world) => buildings(world, "pond"),
  appeal: (cat) => {
    const occ = cat.identity.occupation === "fisher" ? 1.6 : 0.8;
    // Mild hunger pull only — a starving cat should EAT its catch, not keep
    // casting (eat's urgency curve must win as hunger gets critical).
    return occ * preferenceFactor(cat, ["ponds", "fish"]) * (0.7 + (1 - cat.needs.hunger) * 0.4);
  },
  duration: ({ cat }) => {
    const tier = FISH_TIERS[cat.fishSkill.tier];
    return tier.ms * (cat.condition < HEALTH.strainedBelow ? 1.25 : 1); // fatigue slows
  },
  onStart: ({ cat }) => {
    cat.emotion = "neutral";
  },
  onComplete: ({ cat, world, rng, emit, now }) => {
    cat.fishSkill.attempts++;
    // Pond accident (spec §9): condition-gated, uncommon, likelier for
    // exhausted/clumsy cats. Always leaves a rescue window — never death.
    const shaky = cat.condition < HEALTH.strainedBelow || cat.needs.energy < 0.3 || trait(cat, "clumsy");
    if (shaky) {
      let odds = 0.004;
      if (trait(cat, "clumsy")) odds += 0.012;
      if (cat.needs.energy < 0.3) odds += 0.012;
      if (cat.condition < HEALTH.strainedBelow) odds += 0.008;
      if (rng.chance(odds)) {
        cat.condition = HEALTH.criticalFloor;
        cat.stage = "collapsed";
        for (const it of cat.inventory) {
          it.holder = undefined;
          it.pos = { x: cat.pos.x + rng.range(-10, 10), y: cat.pos.y + rng.range(-6, 10) };
          world.groundItems.push(it);
        }
        cat.inventory = [];
        cat.emotion = "scared";
        emit({ type: "pond-accident", cat: cat.id });
        emit({ type: "collapsed", cat: cat.id, cause: "pond accident" });
        writeMemory(cat, "pond", "fell in", -0.45, now);
        return;
      }
    }
    const tier = FISH_TIERS[cat.fishSkill.tier];
    let miss = tier.miss;
    if (trait(cat, "patient")) miss -= 0.05;
    if (cat.needs.hunger < 0.25) miss += 0.05; // hungry = worse work
    if (rng.chance(Math.max(0.15, miss))) {
      const detail = rng.pick(["no bite", "it was huge.", "got distracted", "line snagged", "junk pull"]);
      if (detail === "junk pull" && rng.chance(0.5)) {
        give(cat, makeItem(rng.pick(["junk", "trinket"]), cat.id, 0.4));
      }
      emit({ type: "fished", cat: cat.id, result: "miss", detail });
      cat.emotion = "annoyed";
    } else {
      cat.fishSkill.catches++;
      const two = rng.chance(0.12);
      give(cat, makeItem("fish", cat.id, rng.range(0.5, 0.95)));
      if (two) give(cat, makeItem("fish", cat.id, 0.8));
      emit({ type: "fished", cat: cat.id, result: "catch", detail: two ? "two!" : "one" });
      cat.emotion = "happy";
      writeMemory(cat, "pond", "good catch", 0.2, now);
    }
    // skill progression
    const c = cat.fishSkill;
    c.tier = c.catches > 40 ? "expert" : c.catches > 20 ? "skilled" : c.catches > 8 ? "familiar" : "novice";
  },
  bubble: (cat) => (cat.identity.occupation === "fisher" ? "let's see what's biting" : "maybe just one fish"),
};

const gather: ActionDef = {
  id: "gather",
  intent: "explore",
  needs: ["curiosity", "hunger"],
  requiresProximity: true,
  reach: 30,
  candidates: (_cat, world) => buildings(world, "forage").filter((b) => (b.state?.veg as number) > 0),
  appeal: (cat, _w, t) => {
    const occ = cat.identity.occupation === "gatherer" ? 1.5 : 0.7;
    const veg = (t as Building)?.state?.veg as number;
    return occ * (veg > 0 ? 1 : 0.1) * preferenceFactor(cat, ["mushrooms"]);
  },
  duration: () => ACTION_MS.gather,
  onComplete: ({ cat, target, emit }) => {
    const b = target as Building;
    if ((b.state!.veg as number) > 0) {
      b.state!.veg = (b.state!.veg as number) - 1;
      give(cat, makeItem("vegetable", cat.id, 0.7));
      emit({ type: "gathered", cat: cat.id, item: "vegetable" });
      cat.emotion = "happy";
    }
  },
  bubble: () => "something good grows here",
};

const cook: ActionDef = {
  id: "cook",
  intent: "soup",
  needs: ["comfort"],
  requiresProximity: true,
  reach: 30,
  candidates: (cat, world) => {
    // A personality-fit cat self-adopts cook. No assignment.
    const st = buildings(world, "soup-station")[0];
    if (!st) return [];
    const bowls = st.state?.bowls as number;
    const potBusy = st.state?.pot === "cooking";
    if (bowls > 0 || potBusy) return [];
    return [st];
  },
  appeal: (cat, _w, t) => {
    const b = t as Building;
    const ingredients = (b?.state?.ingredients as number) ?? 0;
    const fit = cat.identity.occupation === "cook" ? 1.8 : cat.identity.personality === "planner" ? 1.1 : 0.5;
    return fit * (ingredients >= SOUP.restockUnits ? 1 : 0.35);
  },
  duration: () => ACTION_MS.cookPot,
  onStart: ({ cat, target, emit }) => {
    const b = target as Building;
    b.state!.pot = "cooking";
    b.state!.cook = cat.id;
    b.active = true;
    cat.emotion = "neutral";
    emit({ type: "bubble", cat: cat.id, text: "pot's on", kind: "speech" });
  },
  onComplete: ({ cat, world, target, rng, emit }) => {
    const b = target as Building;
    let ingredients = (b.state!.ingredients as number) ?? 0;
    // Prefer fish+veg from own inventory; else use station stock.
    const usedFish = take(cat, "fish");
    const usedVeg = take(cat, "vegetable");
    if (!usedFish && !usedVeg) ingredients = Math.max(0, ingredients - SOUP.restockUnits);
    b.state!.ingredients = ingredients;

    // Quality — skill × ingredients × mood/fatigue × rng.
    let q = 0.5;
    if (cat.identity.occupation === "cook") q += 0.15;
    if (usedFish && usedVeg) q += 0.1;
    if (cat.condition < HEALTH.strainedBelow) q -= 0.15;
    if (cat.needs.hunger < 0.3) q -= 0.1;
    q = clamp(0.05, 0.98, q + rng.range(-0.2, 0.2));

    b.state!.pot = "ready";
    b.state!.bowls = SOUP.bowlsPerPot;
    b.state!.quality = q;
    b.active = true;
    const tier = qtier(q);
    emit({ type: "cooked", cat: cat.id, quality: tier });
    cat.emotion = q > 0.5 ? "happy" : "annoyed";
    // Bad pots become stories: a distinct incident counter feeds the ousting
    // pattern (spec §4), and villagers sour on the cook via gossip.
    if (q < OUST.badPotQuality) {
      b.state!.badPots = ((b.state!.badPots as number) ?? 0) + 1;
      for (const other of otherCats(cat, world)) writeMemory(other, cat.id, "bad soup", -0.1, world.time);
    }
  },
  bubble: () => "something warm for everyone",
};

const socialize: ActionDef = {
  id: "socialize",
  intent: "social",
  needs: ["social"],
  requiresProximity: true,
  reach: 34,
  candidates: (cat, world) => otherCats(cat, world).filter((c) => c.stage !== "collapsed"),
  appeal: (cat, _w, t) => {
    const other = t as CatState | undefined;
    if (!other) return 0.2;
    const rel = cat.relationships[other.id] ?? 0;
    const social = 1 - cat.needs.social;
    const solitary = trait(cat, "solitary") ? 0.6 : 1;
    const likesThem = preferenceFactor(cat, [`cat_${other.id}`]);
    return (0.4 + social * 1.4) * (1 + rel * 0.8) * solitary * likesThem;
  },
  duration: () => ACTION_MS.socialChat,
  onComplete: ({ cat, world, target, rng, emit, now }) => {
    const other = target as CatState;
    if (!other) return;
    cat.needs.social = Math.min(1, cat.needs.social + 0.5);
    other.needs.social = Math.min(1, other.needs.social + 0.35);
    // Outcome depends on relationship + mood; can befriend or argue.
    const rel = cat.relationships[other.id] ?? 0;
    const argueChance = 0.12 + (rel < 0 ? 0.2 : 0) + (cat.needs.hunger < 0.3 ? 0.1 : 0);
    if (rng.chance(argueChance)) {
      nudgeRel(cat, other.id, -0.12);
      nudgeRel(other, cat.id, -0.1);
      cat.emotion = "annoyed";
      emit({ type: "argued", a: cat.id, b: other.id });
    } else {
      nudgeRel(cat, other.id, 0.04);
      nudgeRel(other, cat.id, 0.035);
      cat.emotion = "happy";
      const topic = pickGossipTopic(cat, world, rng) ?? "the weather";
      emit({ type: "chatted", a: cat.id, b: other.id, topic });
      if ((cat.relationships[other.id] ?? 0) > 0.4 && rng.chance(0.25)) {
        emit({ type: "befriended", a: cat.id, b: other.id });
        writeMemory(cat, other.id, "good friend", 0.15, now);
      }
    }
  },
  bubble: (_cat, t) => (t ? `hey, ${(t as CatState).identity.name.toLowerCase()}` : undefined),
};

const bonfireGather: ActionDef = {
  id: "bonfire",
  intent: "home",
  needs: ["comfort", "social"],
  requiresProximity: true,
  reach: 60,
  candidates: (_cat, world) => buildings(world, "bonfire"),
  appeal: (cat) => 0.6 * preferenceFactor(cat, ["campfires", "crowds"]) * (1 - cat.needs.comfort + 0.4),
  duration: ({ rng }) => rng.range(6000, 12000),
  onStart: ({ cat, target }) => {
    // Lighting the fire consumes wood — from the woodpile, or the arriving
    // cat's own bundle. No fuel, no flame (a cold gathering is a story too).
    const fire = target as Building;
    if (fire.state!.lit) return;
    const fuel = (fire.state!.fuel as number) ?? 0;
    if (fuel >= TREES.campfireCost) {
      fire.state!.fuel = fuel - TREES.campfireCost;
      fire.state!.lit = 1;
      fire.active = true;
    } else if (take(cat, "wood")) {
      fire.state!.lit = 1;
      fire.active = true;
    }
  },
  onComplete: ({ cat, target }) => {
    const lit = ((target as Building)?.state?.lit as number) === 1;
    cat.needs.comfort = Math.min(1, cat.needs.comfort + (lit ? 0.4 : 0.15));
    cat.needs.social = Math.min(1, cat.needs.social + 0.2);
    cat.emotion = lit ? "happy" : "neutral";
  },
  bubble: () => "warm by the fire",
};

const read: ActionDef = {
  id: "read",
  intent: "book",
  needs: ["curiosity", "comfort"],
  requiresProximity: true,
  reach: 26,
  candidates: (_cat, world) => buildings(world, "library"),
  appeal: (cat) => {
    const occ = cat.identity.occupation === "librarian" ? 1.7 : 0.6;
    return occ * preferenceFactor(cat, ["libraries", "solitude"]) * (1 - cat.needs.curiosity + 0.4);
  },
  duration: ({ rng }) => rng.range(9000, 16000),
  onStart: ({ target }) => ((target as Building).active = true),
  onComplete: ({ cat }) => {
    cat.needs.curiosity = Math.min(1, cat.needs.curiosity + 0.5);
    cat.needs.comfort = Math.min(1, cat.needs.comfort + 0.2);
    cat.emotion = "neutral";
  },
  bubble: () => "…",
};

const explore: ActionDef = {
  id: "explore",
  intent: "explore",
  needs: ["curiosity"],
  requiresProximity: true,
  reach: 24,
  candidates: (_cat, world) => {
    // Investigate the artifact site's ground even before discovery.
    const site = world.sites.find((s) => s.type === "artifact");
    return site && !site.discovered ? [site] : [undefined];
  },
  appeal: (cat, _w, t) => {
    const explorerFit = cat.identity.occupation === "explorer" ? 1.4 : 0.7;
    const curious = 1 - cat.needs.curiosity;
    const site = t as Site | undefined;
    return explorerFit * (0.5 + curious) * (site ? 1.2 : 0.6);
  },
  duration: ({ rng }) => rng.range(4000, 8000),
  onComplete: ({ cat, world, target, rng, emit }) => {
    cat.needs.curiosity = Math.min(1, cat.needs.curiosity + 0.2);
    const site = target as Site | undefined;
    if (site && !site.discovered) {
      let chance = CULT.baseDiscoveryChance;
      if (cat.needs.curiosity > 0.7) chance += CULT.curiosityBonus;
      if (cat.identity.personality === "cryptic" || cat.identity.personality === "chaos") chance += 0.1;
      if (rng.chance(chance)) {
        site.discovered = true;
        cat.emotion = "smug";
        emit({ type: "discovered-artifact", cat: cat.id });
        writeMemory(cat, "artifact", "i found it", 0.4, world.time);
      }
    }
  },
  bubble: (cat) => (cat.identity.occupation === "explorer" ? "what's over here?" : "hm, this spot…"),
};

const rescue: ActionDef = {
  id: "rescue",
  intent: "rescue",
  needs: [],
  requiresProximity: true,
  reach: 30,
  candidates: (cat, world) => world.cats.filter((c) => c.id !== cat.id && c.stage === "collapsed"),
  appeal: (cat, _w, t) => {
    const victim = t as CatState | undefined;
    if (!victim) return 0;
    const rel = cat.relationships[victim.id] ?? 0;
    const kind = trait(cat, "generous") || cat.identity.personality === "optimist" ? 1.5 : 1;
    return (2.5 + rel) * kind; // rescue is high-priority to the fantasy
  },
  duration: () => 6000,
  onComplete: ({ cat, target, emit, world, now }) => {
    const victim = target as CatState;
    if (!victim || victim.stage !== "collapsed") return;
    victim.stage = "strained";
    victim.condition = HEALTH.postRescueCondition;
    victim.needs.hunger = Math.max(victim.needs.hunger, 0.5);
    victim.needs.energy = Math.max(victim.needs.energy, 0.4);
    emit({ type: "rescued", rescuer: cat.id, victim: victim.id });
    writeMemory(victim, cat.id, `${cat.identity.name} saved me`, 0.6, now);
    nudgeRel(victim, cat.id, 0.4);
    cat.emotion = "happy";
    void world;
  },
  bubble: (_cat, t) => (t ? `${(t as CatState).identity.name}! hold on!` : "hold on!"),
};

const artifactVisit: ActionDef = {
  id: "artifact_visit",
  intent: "artifact",
  needs: ["curiosity", "comfort"],
  requiresProximity: true,
  reach: 26,
  candidates: (_cat, world) => world.sites.filter((s) => s.type === "artifact" && s.discovered),
  appeal: (cat, _w, t) => {
    if (!t) return 0;
    const mystic = cat.identity.personality === "cryptic" ? 1.3 : cat.identity.personality === "chaos" ? 1.1 : 0.7;
    const member = world_isMember(cat);
    // Early-stage devotion is "solo visits", not a full schedule takeover —
    // the commitment gradient (spec §7) escalates later, not at founding.
    return mystic * (member ? 1.1 : 0.5);
  },
  duration: ({ rng }) => rng.range(5000, 9000),
  onComplete: ({ cat, world, rng, emit }) => {
    cat.needs.comfort = Math.min(1, cat.needs.comfort + 0.2);
    const site = world.sites.find((s) => s.discovered);
    // Founding: first cat to form belief + recruit becomes founder (spec §7).
    if (!world.cult && (cat.identity.personality === "cryptic" || cat.identity.personality === "chaos")) {
      if (site) {
        world.cult = { founder: cat.id, members: [cat.id], stage: "early", attempts: {} };
        cat.cultRole = "founder";
        emit({ type: "cult-founded", founder: cat.id });
      }
    }
    // Offerings: members (and the cryptic, anonymously) leave small gifts.
    // Food offerings are ESCALATED-stage behavior ("rituals over needs") —
    // an established cult offering fish would starve the village (spec §7:
    // never mechanically dominant). Trinkets and flowers only, until then.
    if (site && (world_isMember(cat) || cat.identity.personality === "cryptic")) {
      const foodOk = world.cult?.stage === "escalated";
      const idx = cat.inventory.findIndex(
        (i) => i.type === "flowers" || i.type === "trinket" || (foodOk && i.type === "fish"),
      );
      if (idx >= 0 && rng.chance(0.2)) {
        const item = cat.inventory.splice(idx, 1)[0];
        item.holder = undefined;
        item.pos = { x: site.pos.x + rng.range(-16, 16), y: site.pos.y + rng.range(8, 18) };
        world.groundItems.push(item);
        emit({ type: "offered", cat: cat.id, item: item.type });
      }
    }
  },
  bubble: () => "…don't ring the fourth bell.",
};

const recruit: ActionDef = {
  id: "recruit",
  intent: "artifact",
  needs: ["social"],
  requiresProximity: true,
  reach: 34,
  candidates: (cat, world) => {
    if (!world.cult || world.cult.founder !== cat.id) return [];
    // 1-game-day retry cooldown per target (spec §7 Recruitment).
    return otherCats(cat, world).filter(
      (c) =>
        !world.cult!.members.includes(c.id) &&
        c.stage === "stable" &&
        world.time - (world.cult!.attempts[c.id] ?? -Infinity) >= CULT.recruitCooldownMs,
    );
  },
  appeal: (cat, world, t) => {
    const other = t as CatState | undefined;
    if (!other || !world.cult) return 0;
    const rel = cat.relationships[other.id] ?? 0;
    return 1 + rel;
  },
  duration: () => ACTION_MS.recruit,
  onComplete: ({ cat, world, target, rng, emit, now }) => {
    const other = target as CatState;
    if (!other || !world.cult) return;
    world.cult.attempts[other.id] = now;
    // Conviction is never personality alone (spec §7): trust + loneliness + luck.
    const trust = cat.relationships[other.id] ?? 0;
    const lonely = 1 - other.needs.social;
    const openness = { planner: 0.2, chaos: 0.75, optimist: 0.5, cynic: 0.15, cryptic: 0.3 }[
      other.identity.personality
    ];
    const conviction = openness * 0.6 + trust * 0.3 + lonely * 0.3;
    let outcome: string;
    if (rng.chance(clamp(0.05, 0.9, conviction))) {
      world.cult.members.push(other.id);
      other.cultRole = "member";
      outcome = "join";
      writeMemory(other, "artifact", "i believe now", 0.2, now);
      if (world.cult.members.length >= 3) {
        world.cult.stage = "established";
        const site = world.sites.find((s) => s.type === "artifact");
        if (site) site.shrined = true; // the spot gets claimed
      }
    } else {
      outcome = other.identity.personality === "cynic" ? "aggressive-refuse" : "polite-refuse";
      nudgeRel(other, cat.id, -0.05);
    }
    emit({ type: "recruited", founder: cat.id, target: other.id, outcome });
  },
  bubble: () => "you should see what i found.",
};

// deliver carried goods: fish/veg to the soup station, wood to the campfire.
const deliver: ActionDef = {
  id: "deliver",
  intent: "trade",
  needs: [],
  requiresProximity: true,
  reach: 30,
  candidates: (cat, world) => {
    const targets: Building[] = [];
    if (carrying(cat, "fish") || carrying(cat, "vegetable")) {
      // A well-stocked pantry needs nothing (prevents endless hoarding runs).
      targets.push(...buildings(world, "soup-station").filter((b) => ((b.state?.ingredients as number) ?? 0) < 6));
    }
    if (carrying(cat, "wood")) {
      targets.push(
        ...buildings(world, "bonfire").filter((b) => ((b.state?.fuel as number) ?? 0) < TREES.campfireFuelCap),
      );
    }
    return targets;
  },
  appeal: (cat, _w, t) => {
    const b = t as Building | undefined;
    if (b?.type === "bonfire") {
      // An empty woodpile before nightfall is everyone's problem.
      const fuel = (b.state?.fuel as number) ?? 0;
      return fuel < TREES.campfireCost ? 1.1 : 0.45;
    }
    const generous = trait(cat, "generous") || cat.identity.personality === "optimist" ? 1.2 : 0.4;
    const hungry = cat.needs.hunger < 0.35 ? 0.2 : 1; // hungry cats eat their catch
    return generous * hungry * 0.9;
  },
  duration: () => 3000,
  onComplete: ({ cat, target, emit }) => {
    const b = target as Building;
    let donated = 0;
    if (b.type === "bonfire") {
      while (((b.state!.fuel as number) ?? 0) < TREES.campfireFuelCap && take(cat, "wood")) {
        b.state!.fuel = ((b.state!.fuel as number) ?? 0) + 1;
        donated++;
      }
      if (donated > 0) emit({ type: "traded", from: cat.id, to: "bonfire", give: "wood", get: "warmth" });
    } else {
      for (const type of ["fish", "vegetable"]) {
        const it = take(cat, type);
        if (it) {
          b.state!.ingredients = ((b.state!.ingredients as number) ?? 0) + 1;
          donated++;
        }
      }
      if (donated > 0) emit({ type: "traded", from: cat.id, to: "soup-station", give: "ingredients", get: "goodwill" });
    }
    if (donated > 0) cat.emotion = "happy";
  },
  bubble: (_cat, t) => ((t as Building)?.type === "bonfire" ? "for the fire" : "for the pot"),
};

// Spawn build-arc: chop wood → carry → build house, 3 stages.
const build: ActionDef = {
  id: "build",
  intent: "build",
  needs: ["comfort"],
  requiresProximity: true,
  reach: 30,
  candidates: (cat, world) => {
    const h = home(cat, world);
    if (!h || (h.state?.stage as number) >= BUILDCFG.stages - 1) return [];
    // Each stage costs wood (TREES.buildWoodPerStage, centralized config).
    // Without it, this action drops out and chop takes over.
    return countWood(cat) >= TREES.buildWoodPerStage ? [h] : [];
  },
  appeal: (cat) => 1.3 + (1 - cat.needs.comfort) * 0.8, // a home is a strong pull
  duration: () => BUILDCFG.msPerStage,
  onStart: ({ cat }) => {
    cat.emotion = "neutral";
  },
  onComplete: ({ cat, target, emit, now }) => {
    const h = target as Building;
    for (let i = 0; i < TREES.buildWoodPerStage; i++) {
      if (!take(cat, "wood")) return; // materials gone (stolen/dropped) — no progress
    }
    const stage = ((h.state!.stage as number) ?? 0) + 1;
    h.state!.stage = stage;
    emit({ type: "build-progressed", cat: cat.id, building: h.id, stage });
    if (stage >= BUILDCFG.stages - 1) {
      emit({ type: "built", cat: cat.id, building: h.id });
      writeMemory(cat, h.id, "my home", 0.4, now);
      cat.needs.comfort = Math.min(1, cat.needs.comfort + 0.35);
      cat.emotion = "happy";
    }
  },
};

// Chop a mature tree for wood. One cat per tree: the tree is reserved at
// commit (onCommit), actively chopped on arrival, and the sweep in trees.ts
// releases leaked reservations if the cat is grabbed or re-decides.
const chop: ActionDef = {
  id: "chop",
  intent: "wood",
  needs: [],
  requiresProximity: true,
  reach: 24,
  candidates: (cat, world) => {
    // Cats only consider logging with a reason — otherwise three tree options
    // per decision would crowd flavor behaviors out of the roll.
    const woodCarried = countWood(cat);
    const h = home(cat, world);
    const buildingHome = h && (h.state?.stage as number) < BUILDCFG.stages - 1;
    const fire = buildings(world, "bonfire")[0];
    const fireLow = fire ? ((fire.state?.fuel as number) ?? 0) < TREES.campfireCost : false;
    const stocking = woodCarried === 0 && trait(cat, "hard worker"); // keeps a bundle around
    if (!(buildingHome && woodCarried < TREES.buildWoodPerStage) && !fireLow && !stocking) return [];
    return choppableTrees(cat, world);
  },
  appeal: (cat, world) => {
    const woodCarried = countWood(cat);
    const h = home(cat, world);
    const buildingHome = h && (h.state?.stage as number) < BUILDCFG.stages - 1;
    const fire = buildings(world, "bonfire")[0];
    const fireLow = fire ? ((fire.state?.fuel as number) ?? 0) < TREES.campfireCost : false;
    let f = 0.3;
    if (buildingHome && woodCarried < TREES.buildWoodPerStage) f = 1.6; // need materials
    else if (fireLow && woodCarried === 0) f = 0.7; // village needs firewood
    if (trait(cat, "hard worker")) f *= 1.2;
    return f;
  },
  duration: ({ cat }) => TREES.chopMs * (trait(cat, "hard worker") ? 0.8 : 1),
  onCommit: ({ cat, target }) => {
    const tree = target as Building | undefined;
    if (tree?.state?.stage === "mature") {
      tree.state.stage = "reserved";
      tree.state.reservedBy = cat.id;
    }
  },
  onStart: ({ cat, target }) => {
    const tree = target as Building | undefined;
    if (tree?.state?.stage === "reserved" && tree.state.reservedBy === cat.id) {
      tree.state.stage = "chopping";
    }
    cat.emotion = "neutral";
  },
  onComplete: ({ cat, world, target, rng, emit }) => {
    const tree = target as Building | undefined;
    if (!tree || tree.state?.stage !== "chopping" || tree.state.reservedBy !== cat.id) return;
    const yieldN = rng.int(TREES.yieldMin, TREES.yieldMax);
    for (let i = 0; i < yieldN; i++) give(cat, makeItem("wood", cat.id, 0.8));
    tree.state.stage = "stump";
    tree.state.since = world.time;
    tree.state.reservedBy = "";
    emit({ type: "chopped", cat: cat.id, tree: tree.id, wood: yieldN });
    cat.emotion = "happy";
  },
};

function countWood(cat: CatState): number {
  return cat.inventory.filter((i) => i.type === "wood").length;
}

// Theft escalation endpoint (spec §3): severe hunger + personality + opportunity.
const steal: ActionDef = {
  id: "steal",
  intent: "food",
  needs: ["hunger"],
  requiresProximity: true,
  reach: 26,
  candidates: (cat, world) => {
    if (cat.needs.hunger >= THEFT.stealBelow) return [];
    if (trait(cat, "honest") && cat.needs.hunger > 0.12) return []; // honest resists longest
    return otherCats(cat, world).filter((c) => c.inventory.some((i) => isFood(i.type)));
  },
  appeal: (cat, _w, t) => {
    const victim = t as CatState | undefined;
    if (!victim) return 0;
    // Opportunity: sleeping or absorbed victims are easy marks.
    const distracted = victim.action?.phase === "perform" ? 1.5 : 1;
    const rel = cat.relationships[victim.id] ?? 0;
    const desperation = (THEFT.stealBelow - cat.needs.hunger) * 6;
    return Math.max(0, desperation) * distracted * (1 - Math.max(0, rel) * 0.5);
  },
  duration: () => 2500,
  onComplete: ({ cat, target, rng, emit, now }) => {
    const victim = target as CatState;
    const item = victim?.inventory.find((i) => isFood(i.type));
    if (!item) return;
    const sneaky = victim.action?.id === "sleep" ? 0.15 : THEFT.catchChance;
    if (rng.chance(sneaky)) {
      emit({ type: "theft-caught", thief: cat.id, victim: victim.id });
      nudgeRel(victim, cat.id, -0.2);
      writeMemory(victim, cat.id, `caught ${cat.identity.name} stealing`, -0.35, now);
      cat.emotion = "scared";
    } else {
      victim.inventory.splice(victim.inventory.indexOf(item), 1);
      give(cat, item);
      emit({ type: "stole", thief: cat.id, victim: victim.id, item: item.type });
      cat.emotion = "smug";
    }
  },
};

// Strong hunger: ask/barter before stealing (spec §3 escalation ladder).
const beg: ActionDef = {
  id: "beg",
  intent: "food",
  needs: ["hunger"],
  requiresProximity: true,
  reach: 30,
  candidates: (cat, world) => {
    if (cat.needs.hunger >= THEFT.begBelow) return [];
    if (trait(cat, "proud")) return []; // proud won't ask
    return otherCats(cat, world).filter((c) => c.inventory.some((i) => isFood(i.type)));
  },
  appeal: (cat, _w, t) => {
    const other = t as CatState | undefined;
    if (!other) return 0;
    const rel = cat.relationships[other.id] ?? 0;
    return (0.6 + Math.max(0, rel)) * (THEFT.begBelow - cat.needs.hunger) * 5;
  },
  duration: () => 5000,
  onComplete: ({ cat, target, rng, emit, now }) => {
    const other = target as CatState;
    const item = other?.inventory.find((i) => isFood(i.type));
    if (!item) return;
    const rel = other.relationships[cat.id] ?? 0;
    const generous = trait(other, "generous") || other.identity.personality === "optimist";
    const giveChance = clamp(0.1, 0.95, 0.35 + rel * 0.5 + (generous ? 0.35 : 0) - (trait(other, "greedy") ? 0.3 : 0));
    if (rng.chance(giveChance)) {
      other.inventory.splice(other.inventory.indexOf(item), 1);
      give(cat, item);
      emit({ type: "begged", beggar: cat.id, target: other.id, outcome: "gave" });
      nudgeRel(cat, other.id, 0.15);
      writeMemory(cat, other.id, `${other.identity.name} shared food`, 0.3, now);
      cat.emotion = "happy";
    } else {
      emit({ type: "begged", beggar: cat.id, target: other.id, outcome: "refused" });
      nudgeRel(cat, other.id, -0.08);
      writeMemory(cat, other.id, "refused to share", -0.15, now);
      cat.emotion = "annoyed";
    }
  },
};

// Gossip (spec §10): idle pairs reference real recent events; opinions spread.
const gossip: ActionDef = {
  id: "gossip",
  intent: "social",
  needs: ["social"],
  requiresProximity: true,
  reach: 34,
  candidates: (cat, world) => {
    const juicy = juicyMemory(cat, world);
    if (!juicy) return [];
    return otherCats(cat, world).filter((c) => c.id !== juicy.subject && c.stage !== "collapsed");
  },
  appeal: (cat, world, t) => {
    const other = t as CatState | undefined;
    const juicy = juicyMemory(cat, world);
    if (!other || !juicy) return 0;
    return (0.2 + Math.abs(juicy.charge)) * (0.4 + (1 - cat.needs.social) * 0.6);
  },
  duration: ({ rng }) => rng.range(6000, 10000),
  onComplete: ({ cat, world, target, emit, now }) => {
    const other = target as CatState;
    const juicy = juicyMemory(cat, world);
    if (!other || !juicy) return;
    emit({ type: "gossiped", from: cat.id, about: juicy.subject, event: juicy.event });
    // Secondhand opinion: listener absorbs a diluted charge about the subject.
    writeMemory(other, juicy.subject, `heard: ${juicy.event}`, juicy.charge * 0.4, now);
    juicy.charge *= 0.7; // old news fades — the same story won't fuel gossip forever
    nudgeRel(cat, other.id, 0.02);
    nudgeRel(other, cat.id, 0.02);
    cat.needs.social = Math.min(1, cat.needs.social + 0.35);
    other.needs.social = Math.min(1, other.needs.social + 0.2);
  },
};

// One idiot chases butterflies in the rain (05-effects: mandatory charm).
const chase: ActionDef = {
  id: "chase",
  intent: "explore",
  needs: ["curiosity"],
  requiresProximity: true,
  reach: 8,
  candidates: (cat, world) => {
    if (world.weather === "clear") return [];
    const rainLover = cat.identity.personality === "chaos" || (cat.identity.preferences.getting_wet ?? 0) > 0;
    return rainLover ? [undefined] : [];
  },
  appeal: () => 1.4, // mandatory charm (05-effects): someone chases in the rain
  bubble: () => "butterfly!!",
  destination: ({ cat, world, rng }) => ({
    x: clamp(30, world.bounds.w - 30, cat.pos.x + rng.range(-120, 120)),
    y: clamp(30, world.bounds.h - 30, cat.pos.y + rng.range(-90, 90)),
  }),
  duration: ({ rng }) => rng.range(3500, 6500),
  onComplete: ({ cat }) => {
    cat.needs.curiosity = Math.min(1, cat.needs.curiosity + 0.25);
    cat.emotion = "happy";
  },
};

// Comforting (spec §8: 8–12s). A friend sits with a shaken or strained cat.
const comfort: ActionDef = {
  id: "comfort",
  intent: "rescue",
  needs: ["social"],
  requiresProximity: true,
  reach: 26,
  candidates: (cat, world) =>
    otherCats(cat, world).filter(
      (c) =>
        c.stage !== "collapsed" &&
        (c.stage === "strained" || c.stage === "critical" || c.emotion === "sad" || c.emotion === "scared"),
    ),
  appeal: (cat, _w, t) => {
    const other = t as CatState | undefined;
    if (!other) return 0;
    const rel = cat.relationships[other.id] ?? 0;
    const kind = trait(cat, "generous") || cat.identity.personality === "optimist" ? 1.4 : 0.8;
    return (0.6 + Math.max(0, rel)) * kind;
  },
  duration: ({ rng }) => rng.range(8000, 12000),
  onComplete: ({ cat, target, emit, now }) => {
    const other = target as CatState;
    if (!other) return;
    other.needs.comfort = Math.min(1, other.needs.comfort + 0.35);
    cat.needs.social = Math.min(1, cat.needs.social + 0.3);
    other.needs.social = Math.min(1, other.needs.social + 0.3);
    nudgeRel(other, cat.id, 0.08);
    nudgeRel(cat, other.id, 0.05);
    writeMemory(other, cat.id, `${cat.identity.name} sat with me`, 0.25, now);
    other.emotion = "neutral";
    cat.emotion = "happy";
    emit({ type: "comforted", from: cat.id, to: other.id });
  },
};

// Scavenge dropped items — closes the ground-item loop. Collectors and the
// greedy love it; a cynic pocketing cult offerings is a story waiting to happen.
const scavenge: ActionDef = {
  id: "scavenge",
  intent: "explore",
  needs: ["curiosity"],
  requiresProximity: true,
  reach: 16,
  candidates: (cat, world) => {
    if (cat.inventory.length >= 3) return [];
    // Members leave the shrine's offerings alone.
    const site = world.sites.find((s) => s.type === "artifact");
    return world.groundItems.filter((i) => {
      if (!site || !world_isMember(cat)) return true;
      const nearShrine = Math.hypot(i.pos.x - site.pos.x, i.pos.y - site.pos.y) < 30;
      return !nearShrine;
    });
  },
  appeal: (cat, world, t) => {
    const item = t as Item | undefined;
    if (!item) return 0;
    let f = 0.25;
    if (trait(cat, "collector")) f *= 1.6;
    if (trait(cat, "greedy")) f *= 1.5;
    if (item.type === "trinket") f *= 1.3;
    if (isFood(item.type) && cat.needs.hunger < 0.5) f *= 1.8;
    // Taking from the shrine is transgressive — a rare cynic move, not a
    // supply chain (an offer→scavenge loop would neuter the cult's story).
    const site = world.sites.find((s) => s.type === "artifact" && s.shrined);
    if (site && Math.hypot(item.pos.x - site.pos.x, item.pos.y - site.pos.y) < 30) {
      f *= cat.identity.personality === "cynic" ? 0.8 : 0.12;
    }
    return f;
  },
  duration: () => 2000,
  onComplete: ({ cat, world, target, emit }) => {
    const item = target as Item;
    const idx = world.groundItems.indexOf(item);
    if (idx < 0) return; // someone else got it first
    world.groundItems.splice(idx, 1);
    give(cat, item);
    emit({ type: "scavenged", cat: cat.id, item: item.type });
    cat.emotion = "smug";
  },
};

function isFood(type: string): boolean {
  return type === "fish" || type === "bread" || type === "soup" || type === "vegetable";
}

/** Most emotionally charged recent memory about ANOTHER CAT — gossip fuel.
 *  Gossip is about someone; your own house is not news. */
function juicyMemory(cat: CatState, world: WorldState) {
  let best: CatState["memory"][number] | undefined;
  for (const m of cat.memory.slice(-15)) {
    if (Math.abs(m.charge) < 0.2) continue;
    if (m.subject === cat.id) continue;
    if (!world.cats.some((c) => c.id === m.subject)) continue;
    if (!best || Math.abs(m.charge) > Math.abs(best.charge)) best = m;
  }
  return best;
}

function world_isMember(cat: CatState): boolean {
  return cat.cultRole === "member" || cat.cultRole === "founder";
}

function pickGossipTopic(cat: CatState, world: WorldState, rng: import("../rng.ts").Rng): string | undefined {
  // Reference a real recent event from the bus-fed memory.
  const recent = cat.memory[cat.memory.length - 1];
  void world;
  if (recent && rng.chance(0.5)) return recent.event;
  return undefined;
}

export function qtier(q: number): string {
  return q >= 0.7 ? "good" : q >= 0.45 ? "mediocre" : q >= 0.25 ? "bad" : "awful";
}

export const ACTIONS: ActionDef[] = [
  wander,
  sleep,
  eat,
  fish,
  gather,
  cook,
  socialize,
  bonfireGather,
  read,
  explore,
  rescue,
  artifactVisit,
  recruit,
  deliver,
  build,
  chop,
  steal,
  beg,
  gossip,
  chase,
  comfort,
  scavenge,
];
