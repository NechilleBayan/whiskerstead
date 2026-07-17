// Time & phases — spec §1. One game day = 60 real min, split into 5 phases.
// Phase changes shift SCORING WEIGHTS ONLY; they never force an activity switch.

import { DAY_MS, PHASES, type PhaseId } from "../config/tuning.ts";

export function phaseAt(timeMs: number): { phase: PhaseId; day: number; dayFrac: number } {
  const day = Math.floor(timeMs / DAY_MS) + 1;
  const dayFrac = (timeMs % DAY_MS) / DAY_MS;
  let acc = 0;
  for (const p of PHASES) {
    acc += p.frac;
    if (dayFrac < acc) return { phase: p.id, day, dayFrac };
  }
  return { phase: PHASES[PHASES.length - 1].id, day, dayFrac };
}

/** Default time-of-day fit for an action, before per-cat schedule curve.
 *  Returns a multiplier ~0.4..1.5. Spec: weights, never hard switches. */
export function timeFit(actionId: string, phase: PhaseId): number {
  const table: Record<string, Partial<Record<PhaseId, number>>> = {
    sleep: { dawn: 0.5, morning: 0.3, afternoon: 0.4, sunset: 0.7, night: 1.5 },
    cook: { dawn: 1.2, morning: 1.3, afternoon: 1.0, sunset: 1.1, night: 0.5 },
    serve: { dawn: 0.9, morning: 1.2, afternoon: 1.1, sunset: 1.2, night: 0.6 },
    fish: { dawn: 1.3, morning: 1.2, afternoon: 1.0, sunset: 1.2, night: 0.6 },
    gather: { dawn: 1.1, morning: 1.3, afternoon: 1.2, sunset: 0.9, night: 0.4 },
    socialize: { dawn: 0.7, morning: 0.9, afternoon: 1.0, sunset: 1.4, night: 1.2 },
    explore: { dawn: 1.2, morning: 1.0, afternoon: 1.0, sunset: 1.0, night: 1.1 },
    read: { dawn: 0.6, morning: 0.9, afternoon: 1.1, sunset: 1.2, night: 1.4 },
    bonfire: { sunset: 1.5, night: 1.4, dawn: 0.6, morning: 0.5, afternoon: 0.6 },
  };
  return table[actionId]?.[phase] ?? 1.0;
}
