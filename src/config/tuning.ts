// Whiskerstead — central tuning config.
// Per 04-technical-architecture §7: every constant referenced in the systems
// spec gets a named key here from day one. Balancing never touches code.

/** Real milliseconds per game day. Spec: 60 real minutes. */
export const DAY_MS = 60 * 60 * 1000;

/** Day-phase split (fractions of a day). Spec §1: 10/15/15/10/10 minutes. */
export const PHASES = [
  { id: "dawn", frac: 10 / 60 },
  { id: "morning", frac: 15 / 60 },
  { id: "afternoon", frac: 15 / 60 },
  { id: "sunset", frac: 10 / 60 },
  { id: "night", frac: 10 / 60 },
] as const;

export type PhaseId = (typeof PHASES)[number]["id"];

/** Need decay per game day (satisfaction 1..0). Tuned so a cat cycles a few
 *  times per day and must act. Social only decays when a target exists. */
export const NEED_DECAY_PER_DAY = {
  hunger: 2.4, // ~2 meals/day pull it down
  energy: 1.6,
  social: 1.2,
  curiosity: 1.1,
  comfort: 1.3,
} as const;

export type NeedId = keyof typeof NEED_DECAY_PER_DAY;
export const NEED_IDS = Object.keys(NEED_DECAY_PER_DAY) as NeedId[];

/** How much a satisfied need still nudges scoring (urgency curve exponent). */
export const URGENCY_EXPONENT = 1.8;

/** Weighted-roll temperature. Higher = flatter (more near-miss options fire),
 *  which is where stories come from (spec §2.5 "roll, don't max"). */
export const ROLL_TEMPERATURE = 0.75;

/** Movement speed in world units / second at full condition. */
export const WALK_SPEED = 34;

/** Bubble timings (ms) — spec §8. */
export const BUBBLE = {
  fadeInMs: 300,
  holdMs: 4000,
  fadeOutMs: 1000,
  reactionHoldMs: 2500,
  perCatCooldownMs: 20000,
  maxOnScreen: 3,
} as const;

/** Action durations (ms) — pulled straight from the systems spec. */
export const ACTION_MS = {
  cookPot: 90_000,
  cookClean: 15_000,
  serveCustomer: 10_000, // 8–14 avg
  fishBase: 50_000, // novice; skill scales down
  eat: 6_000,
  sleepFrac: 0.22, // fraction of a game day (20–25%)
  gather: 12_000,
  build: 18_000,
  socialChat: 9_000,
  recruit: 12_000, // 10–15s
} as const;

/** Fishing skill tiers: [avgMs, missChance]. Spec §5. */
export const FISH_TIERS = {
  novice: { ms: 57_000, miss: 0.4 },
  familiar: { ms: 50_000, miss: 0.32 },
  skilled: { ms: 42_000, miss: 0.24 },
  expert: { ms: 37_000, miss: 0.18 },
} as const;

/** Soup station rules — spec §4. */
export const SOUP = {
  bowlsPerPot: 6,
  restockUnits: 2,
  queueCap: 4,
} as const;

/** Cult — spec §7. Base discovery chance per meaningful artifact investigation. */
export const CULT = {
  baseDiscoveryChance: 0.06,
  curiosityBonus: 0.18,
  recruitCooldownMs: DAY_MS, // 1 game day per target
} as const;

/** Near-death floors — spec §9. Condition never falls below this. */
export const HEALTH = {
  criticalFloor: 0.12,
  strainedBelow: 0.55,
  criticalBelow: 0.3,
  postRescueCondition: 0.5,
} as const;

/** Relationship label thresholds (pairwise drift value, -1..1). Spec §10. */
export const REL_THRESHOLDS = {
  friend: 0.4,
  rival: -0.4,
  crush: 0.7,
} as const;

/** Theft escalation (spec §3 Hunger): hunger satisfaction gates. */
export const THEFT = {
  begBelow: 0.4, // strong hunger → asks/barters/hovers
  stealBelow: 0.28, // severe → steals if personality + opportunity align
  catchChance: 0.35, // base odds of getting caught mid-theft
} as const;

/** Spawn build-arc: 3 construction stages per house (materials → frame → done). */
export const BUILDCFG = {
  stages: 3,
  msPerStage: 18_000,
} as const;

/** Soup ousting pattern requirements (spec §4). */
export const OUST = {
  minSupporters: 3,
  sustainMs: 2 * DAY_MS, // sustained 2 game days
  minBadPots: 2, // ≥2 distinct bad-pot incidents
  badPotQuality: 0.35,
} as const;

/** Bubble line duplicate suppression window (several game days, spec §8). */
export const LINE_SUPPRESS_MS = 3 * DAY_MS;

/** Trees & wood — the renewable wood economy. All costs live here, never in
 *  building/campfire logic. */
export const TREES = {
  yieldMin: 3, // TREE_WOOD_YIELD_MIN
  yieldMax: 5, // TREE_WOOD_YIELD_MAX
  chopMs: 4_000, // TREE_CHOP_DURATION_SECONDS; effective duration is scaled by
  // the existing cat work-speed system (fatigue slows, hard workers hasten)
  growMs: 0.1 * DAY_MS, // sapling → mature
  stumpMs: 0.05 * DAY_MS, // rest before regrowth begins
  regrowMs: 0.12 * DAY_MS, // regrowing → mature again
  /** Wood costs (centralized — see spec: no hard-coding in consumers). */
  buildWoodPerStage: 1,
  campfireCost: 1, // per evening lighting
  campfireFuelCap: 3,
  /** Cats only consider their nearest N mature trees, so a big forest doesn't
   *  dominate the decision roll. */
  maxCandidates: 3,
} as const;

/** Forest layout — trees frame the field, never fill it. */
export const FOREST = {
  zones: {
    left: { depthFrac: [0.08, 0.16], clusters: 9, treesPerCluster: [3, 5] },
    top: { depthFrac: [0.08, 0.14], clusters: 9, treesPerCluster: [3, 5] },
    right: { depthFrac: [0.08, 0.16], clusters: 8, treesPerCluster: [3, 5] },
    bottom: { depthFrac: [0.04, 0.08], clusters: 3, treesPerCluster: [1, 2] }, // sparse, corners only
  },
  /** Central fraction of each axis kept tree-free (the readable field). */
  clearingFrac: 0.66,
  /** Exclusion radii per building/site type — configurable clearings, no
   *  hard-coded positions. */
  exclusionRadius: {
    pond: 115,
    bonfire: 80,
    house: 55,
    "soup-station": 60,
    bakery: 60,
    library: 60,
    market: 55,
    forage: 45,
    site: 45,
    default: 50,
  } as Record<string, number>,
  /** Fraction of spawned trees that start mature (rest are growing). */
  matureFraction: 0.75,
  minTreeSpacing: 26,
} as const;
