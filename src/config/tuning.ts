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
  queueCap: 8, // world.bubbles array bound — oldest is evicted past this
  /** Word-wrap safety net (06-dialogue M1). Units are world units. */
  maxWidthU: 160, // text wider than this wraps
  maxLines: 3, // wrapped text truncates with an ellipsis past this
  lineHeightU: 12, // vertical advance per extra wrapped line
  /** Hard authoring cap on line length (chars) — 06-dialogue M2. The line
   *  audit in test/dialogue-m2.test.ts fails any authored line over this. */
  maxChars: 64,
} as const;

/** Ambient speech windows (06-dialogue M1). One game day = 60 real minutes,
 *  so game ms == real ms: a ~2.5-minute interval gives each cat a couple
 *  dozen window chances per day — occasional, not chatty, since most windows
 *  pass silent once M2/M3 wire content in. Jitter (± on each next interval)
 *  drifts cats out of sync so the village never speaks in chorus. */
export const DIALOGUE = {
  ambientIntervalMs: 150_000,
  ambientJitterMs: 45_000,
  /** M2: chance an ambient window produces a thought at all. Silence stays the
   *  common outcome — ~24 windows/cat/day at best, so ~1 in 3 keeps ambient
   *  speech occasional without flooding the narration bubbles. */
  ambientSpeakChance: 0.35,
  /** Sleeping cats mumble much less often than awake cats muse — a sleep chunk
   *  usually catches at most one window, so this is roughly per-nap odds. */
  sleepTalkChance: 0.15,
  /** M3: chance a seated bonfire-perform cat's ambient window becomes
   *  campfire_talk. Higher than ambientSpeakChance — the fire is the social,
   *  chatty part of the day — but a window is still often silent. */
  campfireTalkChance: 0.5,
  /** M3 cadence fix: short ambient-window interval WHILE seated at a bonfire
   *  perform. A bonfire sit is only ~9s, so the 150s ambientIntervalMs almost
   *  never lands a window during it — this 3.5s cadence reliably gives a sit a
   *  chatter opportunity (usually one on entry, ~1-2 more across the sit). */
  campfireIntervalMs: 3_500,
  /** M3 cadence fix: small jitter for the campfire cadence — the ±45s ambient
   *  jitter would be nonsensical against a 3.5s interval. */
  campfireJitterMs: 1_200,
  /** M3: floor applied to every tone-band multiplier in selection, so a
   *  disfavored band is damped but never silenced (roll-don't-max §4 — every
   *  authored line stays reachable). */
  toneFloor: 0.15,
  /** M3: near-death (critical/collapsed) down-weight on the unhinged/dark
   *  bands. This IS §4's "no jokes near death" rule, realized as a soft ×0.2
   *  damper (§5 "not to zero") rather than a hard filter — grim humor stays
   *  reachable, just rare. */
  urgencyGrimMult: 0.2,
  /** Chance of a dream report right after a sleep chunk completes — modest, so
   *  waking is usually quiet and dreams stay a treat. */
  dreamChance: 0.2,
  /** Same-action completions in a row before "again?" lines unlock. */
  repetitionStreak: 3,
  /** When the streak qualifies, chance the repetition line REPLACES the usual
   *  catch/chop/gather line — replacement keeps the base lines undrowned. */
  repetitionChance: 0.25,
  /** Per-cat chance to react to a weather change, capped at weatherReactMax
   *  speakers, so a change gets a few scattered reactions and never a chorus. */
  weatherReactChance: 0.6,
  weatherReactMax: 3,
  /** "Near" radius (world units) for ambient gate queries: campfire circle,
   *  library shelf-distance, nearby-company checks. */
  nearRadiusU: 90,
  /** Awake company within nearRadiusU that counts as a "crowd" for the
   *  crowd-hater grumble gate. */
  crowdMin: 2,
  /** Need level below which grumble lines unlock for energy/social/comfort/
   *  curiosity. Hunger reuses THEFT.begBelow — the same "strong hunger" band
   *  that drives begging, so a fed cat can never grumble hunger. */
  grumbleBelow: 0.35,
  /** Minimum absolute memory charge before memory-musing lines unlock. */
  memoryChargeMin: 0.35,
} as const;

/** Relative weights for the ambient category roll (06-dialogue M2): among the
 *  categories whose gates pass, one is picked by weighted random — roll, don't
 *  max. Grumbles and campfire talk lead; time/filler flavor trails. */
export const AMBIENT_WEIGHTS: Record<string, number> = {
  idle_thought: 1.0,
  philosophical: 0.7,
  philosophical_night: 0.7,
  nonsense: 0.8,
  like_rain: 0.9,
  dislike_rain: 0.9,
  like_library: 0.9,
  like_pond: 0.9,
  like_fire: 0.9,
  dislike_crowds: 0.9,
  like_solitude: 0.9,
  time_dawn: 0.6,
  time_morning: 0.6,
  time_afternoon: 0.6,
  time_sunset: 0.6,
  time_night: 0.6,
  weather_ambient: 1.0,
  memory_musing: 0.7,
  need_hunger: 1.4,
  need_energy: 1.4,
  need_social: 1.2,
  need_comfort: 1.2,
  need_curiosity: 1.2,
  campfire_talk: 1.6,
  sleep_talk: 1.0, // moot in practice — the only eligible category mid-sleep
  // rumors (M4 §B): a resurfaced heard: memory, valence-split. Mid pack — they
  // only ever roll when a real heard: memory is held, so they stay occasional.
  rumor_good: 0.9,
  rumor_bad: 0.9,
};

/** Per-personality tone-band lean (06-dialogue M3): multipliers over the four
 *  tone bands (normal/dry/unhinged/dark) when selecting a toned line. These are
 *  MULTIPLIERS, never gates (CLAUDE.md rule 4 "roll, don't max"): DIALOGUE.
 *  toneFloor keeps every band reachable, so personality only *leans* a cat's
 *  voice, never locks it. Plain string-keyed records on purpose — importing
 *  PersonalityId/Tone here would create a config↔types/content import cycle. */
export const TONE_WEIGHTS: Record<string, Record<string, number>> = {
  planner:  { normal: 1.4, dry: 1.3, unhinged: 0.3,  dark: 0.5  },
  chaos:    { normal: 0.8, dry: 0.4, unhinged: 1.7,  dark: 0.7  },
  optimist: { normal: 1.6, dry: 0.5, unhinged: 0.8,  dark: 0.25 },
  cynic:    { normal: 0.4, dry: 1.5, unhinged: 0.6,  dark: 1.4  },
  cryptic:  { normal: 0.6, dry: 0.3, unhinged: 1.4,  dark: 1.5  },
};

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

/** Reconcile action — 06-dialogue M4 §A. A cat makes up with a rival: an
 *  ADDITIVE repair (rule 5 — old argument memories are never scaled or scrubbed).
 *  Kept modest/occasional; the accept roll is the ONE rng draw per attempt. */
export const RECONCILE = {
  cooldownMs: DAY_MS, // one attempt per rival per game day (mirrors CULT.recruitCooldownMs)
  durationMs: 8_000, // a short sit-down
  baseAppeal: 0.5, // modest base — reconcile stays an occasional pull, not a dominant one
  leanGenerous: 1.5, // generous/optimist initiator leans toward making up (multiplier, never a gate)
  leanProud: 0.6, // a proud initiator reconciles less — floored above 0, never silenced
  acceptBase: 0.5, // base odds the other cat accepts the peace
  minAccept: 0.1, // clamp floor — even a deep grudge can thaw, rarely
  maxAccept: 0.9, // clamp ceiling — reconciliation is never a certainty
  forgivingBonus: 0.25, // other is generous/optimist → likelier to accept
  grudgePenalty: 0.35, // scaled by how negatively the OTHER sees the initiator
  repairUp: 0.3, // initiator's drift toward the other on accept (crosses rival→neutral from a shallow rivalry)
  repairUpOther: 0.2, // the other's smaller mutual repair
  memoryCharge: 0.3, // additive positive memory on the initiator
  memoryChargeOther: 0.25, // additive positive memory on the other
  rebuffDown: 0.05, // tiny drift down on a rebuff — stays rival, no erasure
  rebuffMemoryCharge: -0.15, // a sour "not ready" memory on the initiator
} as const;

/** Rumors from `heard:` memories — 06-dialogue M4 §B. A cat later re-voices a
 *  secondhand opinion it absorbed from gossip (a `heard:` memory), valence-split
 *  into the rumor_good/rumor_bad ambient categories. chargeMin sits at the very
 *  floor a `heard:` memory can carry: gossip writes charge×0.4 and only fires on
 *  a memory with |charge| ≥ 0.2, so the faintest heard rumor is 0.2×0.4 = 0.08.
 *  A HIGHER floor would silence ALL rumors — keep it here so real rumors surface.
 *  cooldownMs is one game day per subject (mirrors CULT/RECONCILE cooldowns). */
export const RUMOR = {
  chargeMin: 0.08,
  cooldownMs: DAY_MS,
} as const;

/** Campfire conversations + the gathering lever — 06-dialogue M4 §C. Two levers,
 *  no new serialized state:
 *  1) GATHER — the bonfire ActionDef's own appeal gains a BOUNDED, ADDITIVE
 *     company-pull term (companyPull × min(companyPullCap, seatedCount)). It's a
 *     bias, never a gate (rule 4); the cap keeps a busy fire from dominating the
 *     roll and starving eat/sleep/work. Evening bias stays in timeFit.bonfire —
 *     NOT duplicated here.
 *  2) LINGER — evening sits run sitMinMs..sitMaxMs (longer, so they OVERLAP and
 *     company≥1 holds, keeping the campfire_talk gate open across the 3.5s window
 *     cadence). sitMaxMs is capped so a long sit never starves needs.
 *  Turn-taking: a spoken campfire_talk line may draw ONE reply from a seated
 *  neighbor at the same lit fire, at replyChance (< 1, plus the 20s per-cat
 *  bubble cooldown → silence stays common; the reply never re-emits → chain
 *  depth capped at 1). campfireTalkChance stays 0.5 — frequency now comes from
 *  more/overlapping sits, not a higher per-window chance. */
export const CAMPFIRE = {
  companyPull: 0.6, // additive appeal per already-seated cat (a bias, never a gate)
  companyPullCap: 3, // ceiling on the company term — prevents bonfire domination
  sitMinMs: 12_000, // evening sit floor (longer than the ~6-12s daytime warm-up)
  sitMaxMs: 22_000, // evening sit ceiling — capped so a sit can't starve needs
  gatherCompanyMin: 1, // seated others needed at a lit fire to announce a gathering
  replyChance: 0.5, // odds a campfire_talk line draws one seated-neighbor reply
} as const;

/** Universal action animation — 10-universal-action-anim-spec. One wiggle for
 *  every perform-phase action (sleep/collapsed keep their distinct silhouettes)
 *  plus the "got it!" done beat. All render-side; the frame clock runs on SIM
 *  time so fast-forward scales it and pause freezes it. */
export const ANIM = {
  wiggleFrameMs: 260, // one wiggle half-cycle (A→B)
  wiggleTiltRad: 0.1, // procedural tilt of the neutral sprite, ± about the feet
  doneMs: 900, // how long the "got it!" beat holds
  doneItemLiftU: 30, // item icon raised above the head during the beat
  doneItemScale: 1.15, // slight pop on the held-up icon
  /** One-image sleep pose: neutral sprite laid on its side, breathing slowly.
   *  Period/amplitude of the squish (sim-time, so pause freezes breathing). */
  sleepBreatheMs: 1600,
  sleepBreatheAmp: 0.04,
  /** One-image collapsed pose: laid FLAT + splayed askew + motionless — the
   *  spec's hard rule is that collapsed must NOT read as sleep, so it is much
   *  flatter than the sleep pose, stretched wider, and never breathes. */
  collapsedFlatten: 0.45,
  collapsedStretch: 1.25,
  collapsedSplayRad: 0.18,
  /** layer_fire squish-bounce flicker (the "walk squish" of fire): two-phase
   *  on the SIM clock, vertical stretch with matching horizontal narrow. */
  fireFlickerMs: 240,
  fireFlickerAmp: 0.12,
} as const;

/** Near-death floors — spec §9. Condition never falls below this. */
export const HEALTH = {
  criticalFloor: 0.12,
  strainedBelow: 0.55,
  criticalBelow: 0.3,
  postRescueCondition: 0.5,
} as const;

/** Condition drain bands (spec §9): hunger/energy satisfaction levels that
 *  count as starving/exhausted, plus per-game-day drain/recovery rates. The
 *  dialogue layer reads the same bands (06-dialogue §3). */
export const CONDITION = {
  starvingBelow: 0.18,
  exhaustedBelow: 0.15,
  drainPerDay: 3.5,
  recoverPerDay: 2.0,
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

/** Per-cat lineHistory map bound — oldest suppression record evicted past this. */
export const LINE_HISTORY_CAP = 120;

/** "Never happened" timestamp sentinel — JSON-safe stand-in for -Infinity. */
export const NEVER_MS = -1e12;

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
