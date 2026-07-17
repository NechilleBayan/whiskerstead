// Typed event bus — spec §4 (architecture). Everything notable emits an event;
// memory, gossip, relationships, stats, and debug all subscribe. Nothing polls.

/** Relationship label bands, cut at REL_THRESHOLDS (06-dialogue M1). */
export type RelBand = "rival" | "neutral" | "friend" | "crush";

export type GameEvent =
  | { type: "phase-changed"; phase: string; day: number }
  | { type: "weather-changed"; from: "clear" | "rain" | "storm"; to: "clear" | "rain" | "storm" }
  | { type: "relationship-milestone"; a: string; b: string; from: RelBand; to: RelBand }
  | { type: "ambient-window"; cat: string }
  | { type: "decision"; cat: string; action: string; target?: string; roll: RollBreakdown[] }
  | { type: "action-started"; cat: string; action: string; target?: string }
  | { type: "action-completed"; cat: string; action: string; target?: string }
  | { type: "moved-in"; cat: string; place: string }
  | { type: "ate"; cat: string; food: string; quality?: string }
  | { type: "fished"; cat: string; result: "catch" | "miss"; detail: string }
  | { type: "cooked"; cat: string; quality: string }
  | { type: "served"; cook: string; customer: string; quality: string }
  | { type: "traded"; from: string; to: string; give: string; get: string }
  | { type: "stole"; thief: string; victim: string; item: string }
  | { type: "gathered"; cat: string; item: string }
  | { type: "chopped"; cat: string; tree: string; wood: number }
  | { type: "built"; cat: string; building: string }
  | { type: "chatted"; a: string; b: string; topic: string }
  | { type: "argued"; a: string; b: string }
  | { type: "befriended"; a: string; b: string }
  | { type: "reconciled"; a: string; b: string; outcome: "accepted" | "rebuffed" }
  | { type: "gossiped"; from: string; about: string; event: string }
  | { type: "rumor-shared"; cat: string; about: string; charge: "good" | "bad" }
  | { type: "campfire-gathered"; cat: string; fire: string }
  | { type: "campfire-chatted"; cat: string; fire: string }
  | { type: "discovered-artifact"; cat: string }
  | { type: "cult-founded"; founder: string }
  | { type: "recruited"; founder: string; target: string; outcome: string }
  | { type: "condition-changed"; cat: string; stage: string }
  | { type: "collapsed"; cat: string; cause: string }
  | { type: "rescued"; rescuer: string; victim: string }
  | { type: "grabbed"; cat: string }
  | { type: "dropped"; cat: string }
  | { type: "theft-caught"; thief: string; victim: string }
  | { type: "pond-accident"; cat: string }
  | { type: "offered"; cat: string; item: string }
  | { type: "comforted"; from: string; to: string }
  | { type: "scavenged"; cat: string; item: string }
  | { type: "begged"; beggar: string; target: string; outcome: "gave" | "refused" }
  | { type: "build-progressed"; cat: string; building: string; stage: number }
  | { type: "oust-started"; cook: string; instigator: string }
  | { type: "oust-dissolved"; cook: string }
  | { type: "confronted"; cook: string; instigator: string; outcome: string }
  | { type: "ousted"; cook: string; instigator: string }
  | { type: "bubble"; cat: string; text: string; kind: string };

export type GameEventType = GameEvent["type"];

export interface RollBreakdown {
  action: string;
  target?: string;
  bias: number;
  urgency: number;
  memory: number;
  timeFit: number;
  score: number;
}

type Handler = (e: GameEvent) => void;

export class EventBus {
  private handlers = new Map<GameEventType | "*", Set<Handler>>();
  /** Rolling log for the debug toolkit (spec §Debug: filterable event log). */
  readonly log: Array<{ t: number; e: GameEvent }> = [];
  private maxLog = 500;
  private clock = 0;

  setClock(t: number) {
    this.clock = t;
  }

  on(type: GameEventType | "*", fn: Handler): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit(e: GameEvent): void {
    this.log.push({ t: this.clock, e });
    if (this.log.length > this.maxLog) this.log.shift();
    this.handlers.get(e.type)?.forEach((h) => h(e));
    this.handlers.get("*")?.forEach((h) => h(e));
  }
}
