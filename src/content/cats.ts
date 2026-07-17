// Launch roster — 03-content-tables. Five fixed individuals. Personality is one
// layer; traits + preferences + schedule make two same-personality cats diverge.

import type { Identity, PersonalityId } from "../sim/types.ts";

interface CatSeed {
  id: string;
  name: string;
  color: string;
  accent: string;
  occupation: string;
  personality: PersonalityId;
  traits: string[];
  preferences: Record<string, number>;
  scheduleCurve: Record<string, number>; // phase -> activity multiplier
  anchors: Array<{ phase: string; action: string; boost: number }>;
}

export const ROSTER: CatSeed[] = [
  {
    id: "biscuit",
    name: "Biscuit",
    color: "#e8a24a", // orange tabby
    accent: "#c67d24",
    occupation: "cook",
    personality: "planner",
    traits: ["loves baking", "afraid of storms", "collects flowers", "dislikes arguments", "sleeps early"],
    preferences: { warm_soup: 0.7, bread: 0.6, flowers: 0.5, crowds: -0.2, storms: -0.8, mornings: 0.6 },
    // opens station pre-dawn, long lunch, pond every evening
    scheduleCurve: { dawn: 1.4, morning: 1.2, afternoon: 0.9, sunset: 1.1, night: 0.4 },
    anchors: [{ phase: "dawn", action: "cook", boost: 2.2 }, { phase: "sunset", action: "fish", boost: 1.6 }],
  },
  {
    id: "moss",
    name: "Moss",
    color: "#9aa79a", // grey longhair
    accent: "#6f7d70",
    occupation: "fisher",
    personality: "optimist",
    traits: ["patient", "generous", "water-loving", "social", "hard worker"],
    preferences: { ponds: 0.8, fish: 0.7, company: 0.5, rain: 0.2, campfires: 0.5, solitude: -0.2 },
    scheduleCurve: { dawn: 1.1, morning: 1.3, afternoon: 1.1, sunset: 1.2, night: 0.5 },
    anchors: [{ phase: "morning", action: "fish", boost: 1.6 }, { phase: "sunset", action: "bonfire", boost: 1.4 }],
  },
  {
    id: "pepper",
    name: "Pepper",
    color: "#3b3a42", // black cat
    accent: "#6b6a75",
    occupation: "explorer",
    personality: "chaos",
    traits: ["easily bored", "brave", "clumsy", "night owl", "superstitious"],
    preferences: { crowds: 0.4, ponds: 0.3, solitude: -0.3, nighttime: 0.6, trinkets: 0.7, getting_wet: 0.3 },
    // hyperactive at dawn, random afternoon naps, restless when windy
    scheduleCurve: { dawn: 1.5, morning: 1.0, afternoon: 0.8, sunset: 1.1, night: 1.3 },
    anchors: [{ phase: "dawn", action: "explore", boost: 1.8 }, { phase: "afternoon", action: "sleep", boost: 1.5 }],
  },
  {
    id: "ink",
    name: "Ink",
    color: "#f2efe6", // white with ink-blot patches
    accent: "#2c2a33",
    occupation: "librarian",
    personality: "cryptic",
    traits: ["solitary", "superstitious", "night owl", "patient", "collector"],
    preferences: { libraries: 0.9, solitude: 0.6, nighttime: 0.5, crowds: -0.5, rain: 0.3, trinkets: 0.4 },
    // wakes late, reads until midnight, sleeps in library when raining
    scheduleCurve: { dawn: 0.5, morning: 0.8, afternoon: 1.1, sunset: 1.2, night: 1.5 },
    anchors: [{ phase: "night", action: "read", boost: 2.0 }, { phase: "dawn", action: "sleep", boost: 1.6 }],
  },
  {
    id: "bramble",
    name: "Bramble",
    color: "#8a6a44", // brown scruffy
    accent: "#5f472c",
    occupation: "gatherer",
    personality: "cynic",
    traits: ["proud", "solitary", "honest", "hard worker", "storm-fearing"],
    preferences: { mushrooms: 0.6, solitude: 0.5, crowds: -0.4, flowers: 0.3, company: -0.2, loud_places: -0.5 },
    scheduleCurve: { dawn: 1.2, morning: 1.4, afternoon: 1.2, sunset: 0.8, night: 0.4 },
    anchors: [{ phase: "morning", action: "gather", boost: 1.8 }],
  },
];

export function makeIdentity(seed: CatSeed): Identity {
  return {
    name: seed.name,
    color: seed.color,
    accent: seed.accent,
    occupation: seed.occupation,
    personality: seed.personality,
    traits: [...seed.traits],
    preferences: { ...seed.preferences },
    scheduleCurve: { ...seed.scheduleCurve },
    anchors: seed.anchors.map((a) => ({ ...a })),
  };
}
