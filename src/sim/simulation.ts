// Simulation orchestrator — the headless core. Zero render imports (spec
// §Architecture 1). Two clocks (spec §2): a continuous frame update and a
// decision tick fired on idle / action-complete.

import { ROLL_TEMPERATURE, WALK_SPEED, HEALTH, CONDITION, BUBBLE, DIALOGUE, OUST, LINE_SUPPRESS_MS, LINE_HISTORY_CAP, NEVER_MS } from "../config/tuning.ts";
import { ACTIONS, qtier } from "./actions/index.ts";
import type { ActionCtx, ActionDef } from "./actions/types.ts";
import { AMBIENT_CATEGORIES } from "../content/dialogue/categories.ts";
import { EventBus, type GameEvent } from "./events.ts";
import { nearbyCats } from "./dialogue/context.ts";
import { selectLine } from "./dialogue/select.ts";
import { clamp01, decayNeeds, updateHealthStage } from "./needs.ts";
import { perceive, distance } from "./perception.ts";
import { nudgeRel } from "./relationships.ts";
import { Rng } from "./rng.ts";
import { scoreCandidate, type Candidate } from "./scoring.ts";
import { phaseAt } from "./time.ts";
import { spawnForest, updateTrees } from "./trees.ts";
import type { BaseEntity, CatState, Vec2, WorldState } from "./types.ts";

export class Simulation {
  readonly world: WorldState;
  readonly bus = new EventBus();
  private rng: Rng;
  private actionById = new Map<string, ActionDef>();

  constructor(world: WorldState) {
    this.world = world;
    this.rng = new Rng(world.rngState);
    for (const a of ACTIONS) this.actionById.set(a.id, a);
    this.wireSubscribers();
  }

  // ---------- main step ----------

  /** Advance the sim by dtMs of real time (== game time; frozen while closed). */
  tick(dtMs: number): void {
    const dt = Math.min(dtMs, 250); // clamp big gaps (tab was backgrounded)
    this.world.time += dt;
    this.bus.setClock(this.world.time);

    const { phase, day } = phaseAt(this.world.time);
    if (phase !== this.world.phase || day !== this.world.day) {
      this.world.phase = phase;
      this.world.day = day;
      this.bus.emit({ type: "phase-changed", phase, day });
      this.evaluateSoupDrama();
      // Lit bonfire relaxes back to unlit outside gathering hours.
      const fire = this.world.buildings.find((b) => b.type === "bonfire");
      if (fire && phase !== "sunset" && phase !== "night") {
        fire.state!.lit = 0;
        fire.active = false;
      }
      // Forage patches regrow one unit per phase (seasonal skins are visual
      // only — mechanically one "vegetable" resource, design spec §The World).
      for (const b of this.world.buildings) {
        if (b.type === "forage") b.state!.veg = Math.min(3, ((b.state!.veg as number) ?? 0) + 1);
        if (b.type === "market") b.state!.stocked = Math.min(1, ((b.state!.stocked as number) ?? 0) + 0.34);
        if (b.type === "bakery") b.state!.bread = Math.min(2, ((b.state!.bread as number) ?? 0) + 1);
      }
    }

    updateTrees(this.world);
    for (const cat of this.world.cats) this.updateCat(cat, dt);
    this.expireBubbles();
    this.world.rngState = this.rng.state;
  }

  private updateCat(cat: CatState, dt: number): void {
    if (cat.grabbed) return; // player holds it; frozen until release

    const hasSocial = this.world.cats.some((c) => c.id !== cat.id && !c.grabbed);
    decayNeeds(cat, dt, hasSocial);
    this.updateCondition(cat, dt);

    if (cat.stage === "collapsed") return; // waits for rescue

    // Ambient speech window (06-dialogue M1): deliberately NOT an ActionDef —
    // it must never compete with eating/sleeping in the decision roll. Fires
    // only in idle-ish moments (idle or goto; grabbed/collapsed return above)
    // — plus DURING sleep's perform phase specifically, whose windows can
    // only mumble sleep_talk (M2). The timer resets whether or not the
    // subscriber speaks — silence is the common outcome and must not pile
    // windows up.
    const performing = cat.action?.phase === "perform";
    const sleepPerform = performing && cat.action!.id === "sleep";
    // M3 campfire fix: a bonfire perform seats the cat at the fire — a social,
    // chatty beat, so its windows must fire (routed to campfire_talk below).
    // Other performs stay suppressed (work is heads-down).
    const campfirePerform = performing && cat.action!.id === "bonfire";
    // M3 cadence fix: a ~9s bonfire sit needs a short window cadence, else the
    // 150s general interval almost never lands one mid-sit. Reuses lastAmbientAt.
    const interval = campfirePerform ? DIALOGUE.campfireIntervalMs : DIALOGUE.ambientIntervalMs;
    const jitter = campfirePerform ? DIALOGUE.campfireJitterMs : DIALOGUE.ambientJitterMs;
    if ((!performing || sleepPerform || campfirePerform) && this.world.time - cat.lastAmbientAt >= interval) {
      // jitter the NEXT interval so cats drift out of sync (seeded rng only)
      cat.lastAmbientAt = this.world.time + this.rng.range(-jitter, jitter);
      this.bus.emit({ type: "ambient-window", cat: cat.id });
    }

    if (!cat.action) {
      this.decide(cat);
      return;
    }

    const act = this.actionById.get(cat.action.id)!;
    if (cat.action.phase === "goto") {
      const dest = this.actionDest(cat, act);
      if (!dest || this.moveToward(cat, dest, dt) <= act.reach) {
        cat.action.phase = "perform";
        cat.action.startedAt = this.world.time;
        const ctx = this.ctx(cat, act);
        cat.action.duration = act.duration(ctx);
        act.onStart?.(ctx);
        this.bus.emit({ type: "action-started", cat: cat.id, action: act.id, target: cat.action.targetId });
      }
    } else {
      // perform: fatigue lengthens tasks slightly
      const slow = cat.condition < HEALTH.strainedBelow ? 1.2 : 1;
      if (this.world.time - cat.action.startedAt >= cat.action.duration * slow) {
        const ctx = this.ctx(cat, act);
        act.onComplete(ctx);
        // Repetition tally (06-dialogue M1): streak of identical completed
        // actions; M2 "again?" categories gate on it. Ordering: the action's
        // own onComplete events (fished/chopped/gathered) fired ABOVE, before
        // this tally — their handlers add this completion themselves
        // (repetitionSay's count + 1). Only action-completed, emitted below,
        // sees the updated streak.
        cat.repetition =
          cat.repetition.actionId === act.id
            ? { actionId: act.id, count: cat.repetition.count + 1 }
            : { actionId: act.id, count: 1 };
        this.bus.emit({ type: "action-completed", cat: cat.id, action: act.id, target: cat.action.targetId });
        cat.action = undefined; // → re-decides next tick
      }
    }
  }

  // ---------- decision tick (spec §2) ----------

  private decide(cat: CatState): void {
    const percepts = perceive(cat, this.world);
    const byId = new Map<string, BaseEntity>();
    for (const p of percepts) byId.set(p.entity.id, p.entity);

    const candidates: Candidate[] = [];
    for (const action of ACTIONS) {
      const targets = action.candidates(cat, this.world);
      for (const target of targets) {
        // Targets an action enumerates are trusted even if far (village is small).
        const c = scoreCandidate(cat, this.world, action, target);
        if (c.score > 0) candidates.push(c);
      }
    }
    if (candidates.length === 0) return;

    // Roll, don't max — weighted random with temperature (spec §2.5).
    const weights = candidates.map((c) => Math.pow(c.score, 1 / ROLL_TEMPERATURE));
    const idx = this.rng.weightedIndex(weights);
    const chosen = candidates[idx];

    this.commit(cat, chosen);
    this.bus.emit({
      type: "decision",
      cat: cat.id,
      action: chosen.action.id,
      target: chosen.target?.id,
      roll: candidates.map((c) => c.breakdown).sort((a, b) => b.score - a.score).slice(0, 6),
    });
  }

  private commit(cat: CatState, c: Candidate): void {
    cat.action = {
      id: c.action.id,
      targetId: c.target?.id,
      startedAt: this.world.time,
      duration: 0,
      phase: c.action.requiresProximity ? "goto" : "perform",
    };
    if (cat.action.phase === "perform") cat.action.startedAt = this.world.time;
    c.action.onCommit?.(this.ctx(cat, c.action)); // e.g. reserve a tree en route
    const text = c.action.bubble?.(cat, c.target);
    if (text) this.speak(cat, text, "speech");
    else this.speak(cat, "", "thought", c.action.intent); // intention icon
  }

  private actionDest(cat: CatState, act: ActionDef): Vec2 | undefined {
    if (act.destination) {
      const d = act.destination(this.ctx(cat, act));
      if (d) {
        if (cat.action && !cat.action.targetId) {
          // stash synthetic dest so it stays stable across frames
          cat.action.data = cat.action.data ?? {};
          if (!cat.action.data.dest) cat.action.data.dest = d;
          return cat.action.data.dest as Vec2;
        }
        return d;
      }
    }
    if (cat.action?.targetId) {
      const t = this.findEntity(cat.action.targetId);
      return t?.pos;
    }
    return undefined;
  }

  // ---------- movement ----------

  /** Move cat toward dest; returns remaining distance. */
  private moveToward(cat: CatState, dest: Vec2, dt: number): number {
    const dx = dest.x - cat.pos.x;
    const dy = dest.y - cat.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return 0;
    const speed = WALK_SPEED * (0.55 + 0.45 * cat.condition) * (dt / 1000);
    const step = Math.min(d, speed);
    cat.pos.x += (dx / d) * step;
    cat.pos.y += (dy / d) * step;
    cat.facing = dx < 0 ? -1 : 1;
    return d - step;
  }

  // ---------- health / near-death (spec §9) ----------

  private updateCondition(cat: CatState, dt: number): void {
    const days = dt / (60 * 60 * 1000);
    const starving = cat.needs.hunger < CONDITION.starvingBelow;
    const exhausted = cat.needs.energy < CONDITION.exhaustedBelow;
    if (starving || exhausted) {
      cat.condition = Math.max(HEALTH.criticalFloor, cat.condition - days * CONDITION.drainPerDay);
    } else if (cat.needs.hunger > 0.5 && cat.needs.energy > 0.5) {
      cat.condition = Math.min(1, cat.condition + days * CONDITION.recoverPerDay); // recover with food+rest
    }
    const prev = cat.stage;
    updateHealthStage(cat);

    // Collapse only from compounded severe state, never one bad moment.
    if (cat.stage !== "collapsed" && cat.condition <= HEALTH.criticalFloor + 0.001 && (starving || exhausted)) {
      cat.stage = "collapsed";
      // drop carried items to the ground (distinct from sleep — spec §Near-Death)
      for (const it of cat.inventory) {
        it.holder = undefined;
        it.pos = { x: cat.pos.x, y: cat.pos.y };
        this.world.groundItems.push(it);
      }
      cat.inventory = [];
      cat.action = undefined;
      cat.emotion = "scared";
      this.bus.emit({ type: "collapsed", cat: cat.id, cause: exhausted ? "exhaustion" : "hunger" });
    } else if (prev !== cat.stage) {
      this.bus.emit({ type: "condition-changed", cat: cat.id, stage: cat.stage });
    }
  }

  // ---------- player interaction (Gentle Influence) ----------

  grab(catId: string): void {
    const cat = this.byId(catId);
    if (!cat) return;
    cat.grabbed = true;
    cat.action = undefined; // drop current intention
    cat.emotion = "scared";
    this.bus.emit({ type: "grabbed", cat: cat.id });
  }

  dragTo(catId: string, pos: Vec2): void {
    const cat = this.byId(catId);
    if (cat?.grabbed) cat.pos = { ...pos };
  }

  /** Release → local evaluation (score only what's here), brief reaction, then
   *  return to internal compass. May write a memory that shifts this place's
   *  weight for this cat (spec §Player Interaction). */
  release(catId: string): void {
    const cat = this.byId(catId);
    if (!cat) return;
    cat.grabbed = false;
    cat.emotion = "neutral";
    this.bus.emit({ type: "dropped", cat: cat.id });

    // Local evaluation: nearest reactable thing biases a memory.
    const near = perceive(cat, this.world).filter((p) => p.dist < 90)[0];
    if (near) {
      const liked = this.localAppeal(cat, near.entity);
      const charge = clamp01((liked - 0.5) * 2) * (liked >= 0.5 ? 1 : -1) * 0.25;
      if (Math.abs(charge) > 0.03) {
        const subject = near.entity.kind === "building" ? (near.entity as any).type : near.entity.id;
        cat.memory.push({ subject, event: charge > 0 ? "nice here" : "put me here", charge, at: this.world.time });
      }
    }
    // brief reaction
    this.speak(cat, this.rng.chance(0.5) ? "!" : "?", "reaction");
  }

  private localAppeal(cat: CatState, e: BaseEntity): number {
    if (e.kind === "building") {
      const t = (e as any).type as string;
      const map: Record<string, string> = {
        pond: "ponds",
        library: "libraries",
        bonfire: "campfires",
        "soup-station": "warm_soup",
      };
      const key = map[t];
      const w = key ? cat.identity.preferences[key] ?? 0 : 0;
      return 0.5 + w * 0.5;
    }
    if (e.kind === "cat") {
      return 0.5 + (cat.relationships[e.id] ?? 0) * 0.5;
    }
    return 0.5;
  }

  weather(w: WorldState["weather"]): void {
    const from = this.world.weather;
    if (from === w) return; // no event on a same-value set (06-dialogue §3 bug 1)
    this.world.weather = w;
    this.bus.emit({ type: "weather-changed", from, to: w });
  }

  // ---------- soup ousting drama chain (spec §4) ----------

  /** Evaluated on each phase change. Ousting requires a PATTERN: 3+ removal
   *  supporters, sustained 2 game days, ≥2 distinct bad pots, an instigator,
   *  and failed reputation repair. Three separate variables per villager:
   *  dislike-the-soup (memories) / dislike-the-cook (relationship) / both. */
  evaluateSoupDrama(): void {
    const station = this.world.buildings.find((b) => b.type === "soup-station");
    if (!station) return;
    const cookId = station.state?.cook as string | undefined;
    const cook = cookId ? this.byId(cookId) : undefined;
    if (!cook) return;
    const badPots = (station.state!.badPots as number) ?? 0;

    const supporters = this.world.cats.filter((c) => {
      if (c.id === cook.id) return false;
      const badSoupMemories = c.memory.filter(
        (m) => m.subject === cook.id && m.charge < 0 && m.event.includes("soup"),
      ).length;
      const dislikesCook = (c.relationships[cook.id] ?? 0) < 0.1;
      return badSoupMemories >= 2 && dislikesCook; // wants-them-removed = both
    });

    const campaign = this.world.oustCampaign;
    if (!campaign) {
      if (supporters.length >= OUST.minSupporters && badPots >= OUST.minBadPots) {
        const instigator = supporters.reduce((a, b) =>
          (a.relationships[cook.id] ?? 0) <= (b.relationships[cook.id] ?? 0) ? a : b,
        );
        this.world.oustCampaign = { cook: cook.id, instigator: instigator.id, since: this.world.time };
        this.bus.emit({ type: "oust-started", cook: cook.id, instigator: instigator.id });
      }
      return;
    }

    // Reputation repair worked — support fell below the pattern threshold.
    if (supporters.length < OUST.minSupporters) {
      this.world.oustCampaign = undefined;
      this.bus.emit({ type: "oust-dissolved", cook: campaign.cook });
      return;
    }

    // Sustained long enough → confrontation (branching scene).
    if (this.world.time - campaign.since >= OUST.sustainMs) {
      this.confrontCook(cook, campaign.instigator, supporters, station);
      this.world.oustCampaign = undefined;
    }
  }

  private confrontCook(
    cook: CatState,
    instigatorId: string,
    supporters: CatState[],
    station: import("./types.ts").Building,
  ): void {
    const instigator = this.byId(instigatorId);
    const defender = this.world.cats.find(
      (c) => c.id !== cook.id && (c.relationships[cook.id] ?? 0) > 0.4 && !supporters.includes(c),
    );

    // Branch 1: a friend defends — campaign collapses, village splits into camps.
    if (defender && this.rng.chance(0.35)) {
      this.bus.emit({ type: "confronted", cook: cook.id, instigator: instigatorId, outcome: "defended" });
      station.state!.badPots = Math.floor(((station.state!.badPots as number) ?? 0) / 2);
      for (const s of supporters) {
        s.memory.push({ subject: defender.id, event: "took the cook's side", charge: -0.15, at: this.world.time });
      }
      const pick = selectLine(defender, "confront_defended", this.world.time, this.rng);
      if (pick) this.speak(defender, pick.text, "speech", undefined, true, pick.key);
      return;
    }

    // Branch 2: cook-off — resolution hinges on whether someone wants the job.
    // Ambition varies by personality; a challenger must be in decent shape.
    const ambition: Record<string, number> = { planner: 0.8, chaos: 0.5, cynic: 0.35, optimist: 0.25, cryptic: 0.15 };
    const challenger = supporters.find(
      (s) => s.condition > 0.5 && this.rng.chance(ambition[s.identity.personality] ?? 0.3),
    );
    if (challenger && this.rng.chance(0.45)) {
      const roll = (c: CatState) =>
        (c.identity.occupation === "cook" ? 0.15 : 0) + c.condition * 0.3 + this.rng.range(0, 0.5);
      const cookWins = roll(cook) >= roll(challenger);
      const outcome = cookWins ? "cook-off:cook-won" : "cook-off:challenger-won";
      this.bus.emit({ type: "confronted", cook: cook.id, instigator: instigatorId, outcome });
      station.state!.badPots = 0;
      if (cookWins) {
        // Proved themselves — reputation repair by demonstration.
        for (const s of supporters) {
          for (const m of s.memory) if (m.subject === cook.id && m.charge < 0) m.charge *= 0.3;
        }
        cook.memory.push({ subject: "soup-station", event: "defended my kitchen", charge: 0.4, at: this.world.time });
        challenger.memory.push({ subject: cook.id, event: "lost the cook-off", charge: -0.2, at: this.world.time });
      } else {
        // Fair contest: role changes hands with less bitterness than a quit.
        cook.identity.occupation = "villager";
        challenger.identity.occupation = "cook";
        station.state!.cook = challenger.id;
        cook.memory.push({ subject: challenger.id, event: "lost my kitchen fair and square", charge: -0.25, at: this.world.time });
        challenger.memory.push({ subject: "soup-station", event: "won the cook-off", charge: 0.45, at: this.world.time });
      }
      const pick = selectLine(cookWins ? cook : challenger, "cookoff", this.world.time, this.rng);
      if (pick) this.speak(cookWins ? cook : challenger, pick.text, "speech", undefined, true, pick.key);
      return;
    }

    // Cook confidence: condition + standing with the ringleader.
    const conf = 0.3 + cook.condition * 0.4 + (cook.relationships[instigatorId] ?? 0) * 0.3;
    if (this.rng.chance(Math.max(0.1, Math.min(0.85, conf)))) {
      // Branch 2: apology + probation — reputation repair.
      this.bus.emit({ type: "confronted", cook: cook.id, instigator: instigatorId, outcome: "apology" });
      station.state!.badPots = 0;
      for (const s of supporters) {
        for (const m of s.memory) if (m.subject === cook.id && m.charge < 0) m.charge *= 0.4;
      }
      const pick = selectLine(cook, "confront_apology", this.world.time, this.rng);
      if (pick) this.speak(cook, pick.text, "speech", undefined, true, pick.key);
    } else {
      // Branch 3: angry quit / ousted. Stays in village, loses role, grudge
      // toward ringleader, avoids the station (negative memory drives it).
      this.bus.emit({ type: "confronted", cook: cook.id, instigator: instigatorId, outcome: "quit" });
      this.bus.emit({ type: "ousted", cook: cook.id, instigator: instigatorId });
      cook.identity.occupation = "villager";
      station.state!.cook = "";
      station.state!.badPots = 0;
      cook.memory.push({ subject: instigatorId, event: "turned everyone against me", charge: -0.6, at: this.world.time });
      cook.memory.push({ subject: "soup-station", event: "not my kitchen anymore", charge: -0.35, at: this.world.time });
      if (instigator) {
        nudgeRel(cook, instigatorId, -0.4, (ev) => this.bus.emit(ev));
      }
      const pick = selectLine(cook, "confront_quit", this.world.time, this.rng);
      if (pick) this.speak(cook, pick.text, "speech", undefined, true, pick.key);
    }
  }

  // ---------- bubbles ----------

  private speak(
    cat: CatState,
    text: string,
    kind: "speech" | "thought" | "reaction" | "gossip",
    icon?: string,
    force = false,
    suppressKey?: string,
  ): void {
    const now = this.world.time;
    if (!force && kind !== "reaction" && now - cat.lastBubbleAt < BUBBLE.perCatCooldownMs) return;
    if (!force && this.world.bubbles.length >= BUBBLE.maxOnScreen && kind === "thought") return;
    // Duplicate-line suppression across several game days (spec §8): a line
    // said too recently downgrades to a thought icon — intent stays legible.
    // ONE record per spoken line, committed only now that the bubble really
    // shows (06-dialogue §3 bugs 2+3) — selection itself is side-effect-free.
    // M2 ambient lines arrive as kind "thought" WITH a suppress key — they
    // commit history too, so ambient musings honor the same freshness window.
    if ((kind === "speech" || kind === "gossip" || (kind === "thought" && suppressKey)) && text) {
      const k = suppressKey ?? `spoke:${text}`; // spoke: = freeform action-bubble text
      if (now - (cat.lineHistory[k] ?? NEVER_MS) < LINE_SUPPRESS_MS) {
        kind = "thought";
        text = "";
      } else {
        delete cat.lineHistory[k]; // refresh insertion order so cap-eviction stays oldest-first
        cat.lineHistory[k] = now;
        // keep the history map bounded
        const keys = Object.keys(cat.lineHistory);
        if (keys.length > LINE_HISTORY_CAP) delete cat.lineHistory[keys[0]];
      }
    }
    cat.lastBubbleAt = now;
    const ttl = kind === "reaction" ? BUBBLE.reactionHoldMs : BUBBLE.holdMs + BUBBLE.fadeInMs + BUBBLE.fadeOutMs;
    this.world.bubbles.push({ cat: cat.id, text: text || (icon ? `[${icon}]` : "…"), kind, bornAt: now, ttl });
    if (this.world.bubbles.length > BUBBLE.queueCap) this.world.bubbles.shift();
    this.bus.emit({ type: "bubble", cat: cat.id, text: text || icon || "", kind });
  }

  private expireBubbles(): void {
    this.world.bubbles = this.world.bubbles.filter((b) => this.world.time - b.bornAt < b.ttl);
  }

  // ---------- event subscribers: memory, relationships, gossip ----------

  private wireSubscribers(): void {
    this.bus.on("served", (e) => {
      if (e.type !== "served") return;
      const customer = this.byId(e.customer);
      const cook = this.byId(e.cook);
      if (!customer || !cook) return;
      // three separate variables: soup quality vs opinion of cook (spec §4)
      const good = e.quality === "good" || e.quality === "mediocre";
      customer.memory.push({ subject: cook.id, event: `${e.quality} soup`, charge: good ? 0.06 : -0.12, at: this.world.time });
      nudgeRel(customer, cook.id, good ? 0.02 : -0.05, (ev) => this.bus.emit(ev));
    });

    this.bus.on("stole", (e) => {
      if (e.type !== "stole") return;
      const victim = this.byId(e.victim);
      if (victim) {
        victim.memory.push({ subject: e.thief, event: `${e.thief} stole my ${e.item}`, charge: -0.4, at: this.world.time });
        nudgeRel(victim, e.thief, -0.25, (ev) => this.bus.emit(ev));
      }
    });

    // Ambient speech (06-dialogue M2): a window MAY become a thought — the
    // chance roll comes first, so most windows pass in silence. Eligible =
    // gate-passing categories; one is chosen by weighted random (roll, don't
    // max), then the toned pool supplies the line. A sleeping cat's only
    // eligible category is sleep_talk, at its own lower chance.
    this.bus.on("ambient-window", (e) => {
      if (e.type !== "ambient-window") return;
      const cat = this.byId(e.cat);
      if (!cat) return;
      const sleeping = cat.action?.id === "sleep" && cat.action.phase === "perform";
      // M3: a bonfire perform routes to campfire_talk only, at its own chance;
      // the gate (lit fire + company) still runs, so an unlit/lonely fire → silence.
      const atCampfire = cat.action?.id === "bonfire" && cat.action.phase === "perform";
      const chance = sleeping ? DIALOGUE.sleepTalkChance : atCampfire ? DIALOGUE.campfireTalkChance : DIALOGUE.ambientSpeakChance;
      if (!this.rng.chance(chance)) return;
      const only = sleeping ? "sleep_talk" : atCampfire ? "campfire_talk" : undefined;
      const eligible = AMBIENT_CATEGORIES.filter(
        (c) => (only ? c.id === only : c.id !== "sleep_talk" && c.id !== "campfire_talk") && c.gate(cat, this.world),
      );
      if (eligible.length === 0) return;
      const category = eligible[this.rng.weightedIndex(eligible.map((c) => c.weight))];
      const others = nearbyCats(cat, this.world, DIALOGUE.nearRadiusU).filter((c) => c.stage !== "collapsed");
      const fill = others.length > 0 ? { who: others[0].identity.name } : undefined;
      const pick = selectLine(cat, category.id, this.world.time, this.rng, fill);
      if (pick) this.speak(cat, pick.text, "thought", undefined, false, pick.key);
    });

    // Narration layer: notable events become personality-flavored bubbles.
    // Priority per spec §8: rare events force through the chatter cooldown.
    this.bus.on("*", (e) => {
      const say = (catId: string | undefined, category: string, opts?: { force?: boolean; kind?: "speech" | "gossip"; fill?: Record<string, string> }) => {
        const cat = catId ? this.byId(catId) : undefined;
        if (!cat) return;
        const pick = selectLine(cat, category, this.world.time, this.rng, opts?.fill);
        if (pick) this.speak(cat, pick.text, opts?.kind ?? "speech", undefined, opts?.force ?? false, pick.key);
      };
      // Repetition flavor (06-dialogue M2): when a work streak qualifies, a
      // small chance swaps the usual line for an "again?" one — replacement,
      // not addition, so the base catch/miss lines aren't drowned. Work
      // events fire from onComplete, BEFORE the streak tally updates — count
      // this completion on top of the stored streak.
      const repetitionSay = (catId: string, actionId: string, category: string): boolean => {
        const cat = this.byId(catId);
        if (!cat) return false;
        const streak = cat.repetition.actionId === actionId ? cat.repetition.count + 1 : 1;
        if (streak < DIALOGUE.repetitionStreak || !this.rng.chance(DIALOGUE.repetitionChance)) return false;
        say(catId, category);
        return true;
      };
      switch (e.type) {
        case "fished":
          if (!repetitionSay(e.cat, "fish", "repeat_fish"))
            say(e.cat, e.result === "catch" ? "fish_catch" : "fish_miss");
          break;
        case "ate":
          if (e.quality === "bad" || e.quality === "awful") say(e.cat, "eat_bad");
          else if (e.quality === "good") say(e.cat, "eat_good");
          break;
        case "cooked":
          say(e.cat, "cook_done");
          break;
        case "stole":
          say(e.thief, "steal_success");
          break;
        case "theft-caught":
          say(e.thief, "steal_caught", { force: true });
          break;
        case "begged":
          say(e.beggar, e.outcome === "refused" ? "beg_refused" : "beg");
          break;
        case "build-progressed":
          say(e.cat, "build");
          break;
        case "argued":
          say(e.a, "argue");
          break;
        case "reconciled": {
          // Spoken by the initiator only (06-dialogue M4 §A). An accepted peace
          // is a rare beat — forced through the chatter cooldown; a rebuff isn't.
          const fill = { who: this.byId(e.b)?.identity.name ?? e.b };
          if (e.outcome === "accepted") say(e.a, "reconcile", { force: true, fill });
          else say(e.a, "reconcile_rebuffed", { fill });
          break;
        }
        case "gossiped":
          say(e.from, "gossip_open", { kind: "gossip", fill: { who: this.byId(e.about)?.identity.name ?? e.about } });
          break;
        case "discovered-artifact":
          say(e.cat, "cult_visit", { force: true });
          break;
        case "recruited":
          say(e.founder, "cult_recruit", { force: true });
          break;
        case "collapsed":
          say(e.cat, "rescue", { force: true });
          break;
        case "rescued":
          say(e.victim, "recovered", { force: true });
          break;
        case "oust-started":
          say(e.instigator, "oust_campaign", { force: true, kind: "gossip" });
          break;
        case "pond-accident":
          say(e.cat, "pond_accident", { force: true });
          break;
        case "comforted":
          say(e.from, "comfort");
          break;
        case "offered":
          say(e.cat, "cult_visit");
          break;
        case "scavenged":
          say(e.cat, "scavenge");
          break;
        case "chopped":
          if (!repetitionSay(e.cat, "chop", "repeat_chop")) say(e.cat, "chop");
          break;
        case "gathered":
          repetitionSay(e.cat, "gather", "repeat_gather"); // no base gather line to fall back on
          break;
        case "action-completed":
          // Waking words (06-dialogue M2): a modest chance of a dream report
          // right as a sleep chunk ends — waking is usually quiet.
          if (e.action === "sleep" && this.rng.chance(DIALOGUE.dreamChance)) say(e.cat, "dream_report");
          break;
        case "weather-changed": {
          // A change gets a few scattered reactions, never a village chorus:
          // awake, non-collapsed cats roll individually up to the cap.
          const category =
            e.to === "rain" ? "weather_to_rain" : e.to === "storm" ? "weather_to_storm" : "weather_to_clear";
          let quota: number = DIALOGUE.weatherReactMax;
          for (const c of this.world.cats) {
            if (quota === 0) break;
            if (c.grabbed || c.stage === "collapsed") continue;
            if (c.action?.id === "sleep" && c.action.phase === "perform") continue; // asleep — missed it
            if (!this.rng.chance(DIALOGUE.weatherReactChance)) continue;
            quota--;
            say(c.id, category);
          }
          break;
        }
        case "relationship-milestone": {
          // Spoken by cat a, forced through the chatter cooldown — band
          // crossings are rare beats and must land (06-dialogue M2). Only
          // upward crossings get friend/crush lines; any drop to rival bites.
          const fill = { who: this.byId(e.b)?.identity.name ?? e.b };
          if (e.to === "crush") say(e.a, "crush_milestone", { force: true, fill });
          else if (e.to === "friend" && (e.from === "neutral" || e.from === "rival"))
            say(e.a, "friend_milestone", { force: true, fill });
          else if (e.to === "rival") say(e.a, "rival_milestone", { force: true, fill });
          break;
        }
      }
    });
  }

  // ---------- lookups ----------

  private ctx(cat: CatState, act: ActionDef): ActionCtx {
    return {
      cat,
      world: this.world,
      target: cat.action?.targetId ? this.findEntity(cat.action.targetId) : undefined,
      rng: this.rng,
      emit: (e: GameEvent) => this.bus.emit(e),
      now: this.world.time,
    };
  }

  private byId(id: string): CatState | undefined {
    return this.world.cats.find((c) => c.id === id);
  }

  findEntity(id: string): BaseEntity | undefined {
    return (
      this.world.cats.find((c) => c.id === id) ??
      this.world.buildings.find((b) => b.id === id) ??
      this.world.sites.find((s) => s.id === id) ??
      this.world.groundItems.find((i) => i.id === id)
    );
  }

  /** Nearest cat to a world point, within radius — for click-to-grab. */
  catAt(pos: Vec2, radius = 40): CatState | undefined {
    let best: CatState | undefined;
    let bestD = radius;
    for (const c of this.world.cats) {
      const d = distance(c.pos, pos);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }

  // ---------- persistence (spec §6): deterministic save/load ----------

  save(): string {
    this.world.rngState = this.rng.state;
    return JSON.stringify(this.world);
  }

  static load(json: string): Simulation {
    const world = JSON.parse(json) as WorldState;
    if (world.cult && !world.cult.attempts) world.cult.attempts = {}; // pre-cooldown saves
    for (const [i, c] of world.cats.entries()) {
      c.lineHistory ??= {};
      c.identity.anchors ??= [];
      if (typeof c.lastBubbleAt !== "number") c.lastBubbleAt = NEVER_MS; // -Infinity → null in JSON
      // Pre-M1-dialogue saves: stagger the default by index (same reasoning
      // as world.ts) so an old save doesn't chorus ambient windows on load.
      if (typeof c.lastAmbientAt !== "number")
        c.lastAmbientAt = world.time - (i / world.cats.length) * DIALOGUE.ambientIntervalMs;
      c.repetition ??= { actionId: "", count: 0 };
      c.reconcileCooldowns ??= {}; // pre-M4 saves
      const house = world.buildings.find((b) => b.owner === c.id);
      if (house && house.state?.stage == null) house.state = { ...house.state, stage: 2 }; // pre-build-arc saves
    }
    // Pre-forest saves: grow the forest in place (seed-derived, deterministic).
    if (!world.buildings.some((b) => b.type === "tree")) {
      world.buildings.push(...spawnForest(world.buildings, world.sites, world.seed, world.bounds));
    }
    const fire = world.buildings.find((b) => b.type === "bonfire");
    if (fire && fire.state!.fuel == null) fire.state!.fuel = 1;
    return new Simulation(world);
  }
}

export { qtier };
