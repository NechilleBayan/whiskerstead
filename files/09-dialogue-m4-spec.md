# Dialogue M4 spec — social depth (APPROVED 2026-07-18)

Three separately-verified features. Build order: **A reconcile → B rumors →
C campfire convos**. Each: build → npm test + typecheck → digest → reviewer PASS
→ commit, before the next. All honor hard rules 1-7 and the 4 design filters
(no fail-state/obligation/alert; persistent memory; roll-don't-max; new
behaviors = new ActionDefs/subscribers, not decide() edits; determinism + save
round-trip; typed events).

## Shared grounding (verified)
- ActionDef (`actions/types.ts:19-55`): candidates/appeal/duration/onComplete/
  bubble; registered in `ACTIONS` (`index.ts:993-1016`). `decide()`
  (`simulation.ts:141-170`) weighted-picks pow(score,1/ROLL_TEMPERATURE) — DO
  NOT edit. `actionBias`/`timeFit` default 1.0 for unknown ids (`scoring.ts`).
- `nudgeRel(a,bId,delta,emit)` clamps ±1, emits `relationship-milestone` on band
  crossing. Bands: rival ≤ −0.4, neutral, friend ≥ 0.4, crush ≥ 0.7. The
  milestone say-handler is SILENT on to:"neutral" (reconcile carries that voice).
- `heard:` memory: only source is `gossip.onComplete` (`index.ts:838-851`):
  `writeMemory(other, subject, "heard: "+event, charge*0.4)`. subject is a real
  live cat, |charge| ≥ 0.08. MemoryEntry = {subject,event,charge,at} — NO tag
  field; detect via `event.startsWith("heard:")`.
- Ambient window emit (`simulation.ts:85-99`) + subscriber (`:526-546`); bonfire
  performs already get the 3.5s cadence + campfire_talk routing (M3).
- New per-cat state: init in `world.ts:75-77`, default with `??=` in
  `Simulation.load` (`:716-738`). New categories auto-covered by the m2 audit
  (≥4 lines, ≤64 chars, globally unique).

---
## FEATURE A — Reconcile action
New ActionDef `reconcile` (`actions/reconcile.ts`, registered in index).
- id "reconcile", intent "social", needs ["social"], requiresProximity, reach 30.
- candidates: awake ungrabbed non-collapsed cats where `relBand(rel)==="rival"`
  AND `world.time - reconcileCooldowns[c.id] >= RECONCILE.cooldownMs (DAY_MS)`.
- appeal: RECONCILE.baseAppeal × floored trait lean (generous/proud). Personality
  lean via new `actionBias.reconcile` rows in `content/personalities.ts` (never a
  gate). Keep modest (occasional).
- duration: fixed RECONCILE.durationMs (no rng draw).
- onComplete: re-guard target; STAMP cooldown (both branches); ONE rng draw
  `rng.chance(clamp(minAccept,maxAccept, acceptBase + forgiving − grudge))`.
  - accept: `nudgeRel(cat,other,+repairUp,emit)` (crosses rival→neutral when
    pre-value ~[−0.69,−0.4]; deep rivalry needs repeated reconciles — intended
    persistence), smaller mutual `+repairUpOther`; write ADDITIVE positive
    memories on both; DO NOT scale/scrub old negative memories (rule 5); bump
    social; `emit reconciled{accepted}`.
  - rebuff: tiny `nudgeRel(-rebuffDown)` (stays rival); negative memory; `emit
    reconciled{rebuffed}`.
- bubble: undefined (icon only); voice via event.
- Narration (`simulation.ts` say-switch): `reconciled` accepted → say(a,
  "reconcile", {force, fill:{who:name(b)}}); rebuffed → say(a,
  "reconcile_rebuffed", {fill}). Initiator only.
- New event: `reconciled{a,b,outcome:"accepted"|"rebuffed"}`.
- New state: `CatState.reconcileCooldowns: Record<string,number>` (init {} in
  world.ts; `??= {}` in load).
- Content: `reconcile` (~30, 4 bands, {who}), `reconcile_rebuffed` (~18).
- Tuning RECONCILE: cooldownMs=DAY_MS, durationMs, baseAppeal, leanGenerous,
  leanProud, acceptBase, min/maxAccept, forgivingBonus, grudgePenalty, repairUp
  (~0.3), repairUpOther, memoryCharge, memoryChargeOther, rebuffDown,
  rebuffMemoryCharge.
- Tests: repair rival→neutral + old memory persists; deep rival (−0.9) needs >1;
  cooldown blocks repeat; determinism; save round-trip (reconcileCooldowns).
- DONE: new ActionDef, decide() untouched; roll accept/rebuff floored lean; old
  memories persist; event both branches; cooldown serialized+load default; m2
  audit + determinism green.

---
## FEATURE B — Rumors from `heard:` memories
Two new ambient gates `rumor_good`/`rumor_bad` (valence split), reuse ambient
machinery.
- New pure helper `pickHeardRumor(cat,world,sign)` in `dialogue/context.ts`:
  find a `heard:` memory (event.startsWith), `sign(charge)===sign`, `|charge| >=
  RUMOR.chargeMin`, subject is LIVE, `world.time - rumorCooldowns[subject] >=
  RUMOR.cooldownMs`. Returns {subjectId,subjectName}|undefined. No rng/mutation.
- Gates (categories.ts): `rumor_good = !!pickHeardRumor(cat,world,+1)`,
  `rumor_bad = ...,-1`. Add to GATES + AMBIENT_WEIGHTS (~0.9).
- Subscriber branch (`simulation.ts` ambient handler): if category is a rumor,
  call pickHeardRumor; undefined → SILENCE (no fabrication); else fill={who:
  subjectName}, selectLine; on success stamp `rumorCooldowns[subjectId]=now` +
  `emit rumor-shared{cat,about,charge}`.
- Do NOT reuse gossip_open (that's the teller during the gossip action; rumor is
  the hearer re-voicing later, valence-split).
- Lines must NOT embed the raw event text — only "there's talk about {who}",
  valence per charge sign. No fabrication.
- New event: `rumor-shared{cat,about,charge:"good"|"bad"}`.
- New state: `CatState.rumorCooldowns: Record<string,number>` (init/load).
- Content: `rumor_good` (~24-30), `rumor_bad` (~24-30), 4 bands, {who}.
- Tuning RUMOR: chargeMin=0.08 (heard: ≥ 0.2×0.4; higher would silence ALL —
  reviewer verify rumors fire), cooldownMs=DAY_MS. AMBIENT_WEIGHTS entries.
- No new rng draws (reuses ambient path). Determinism preserved by construction.
- Tests: held heard: memory → rumor names subject + rumor-shared fires; subject
  removed → no fabrication; cooldown blocks repeat; valence split; determinism +
  save round-trip (rumorCooldowns).

---
## FEATURE C — Campfire conversations (+ gathering lever)
Part 1 edits the `bonfire` ActionDef's own appeal/duration (allowed — its
scoring, not decide()). Part 2 is event-driven turn-taking. No new state.
- Part 1 gather+linger (`bonfireGather` `index.ts:356-387`):
  - appeal += `CAMPFIRE.companyPull * min(companyPullCap, seatedCount)` where
    seatedCount = cats in bonfire-perform within reach of that fire (pure read).
    Additive to a positive base — biases, never gates; cap prevents domination.
  - duration: sunset/night → `rng.range(sitMinMs,sitMaxMs)` (~12-22s), else the
    existing ~6-12s. Longer overlapping sits → company≥1 holds → campfire_talk
    gate passes → 3.5s cadence lands windows. Cap sitMaxMs ≤ ~22s (needs).
  - onStart: if seatedCount ≥ gatherCompanyMin(1) at a lit fire, `emit
    campfire-gathered{cat,fire}`.
  - Leave campfireTalkChance 0.5 (frequency from more/overlapping sits).
- Part 2 turn-taking:
  - After speaking a campfire_talk line (ambient subscriber campfire branch),
    `emit campfire-chatted{cat,fire}`.
  - `bus.on("campfire-chatted")`: seated awake neighbors at SAME lit fire
    (id≠speaker, non-collapsed); roll `rng.chance(CAMPFIRE.replyChance)`; if pass
    `rng.pick` one, `say(replier,"campfire_reply",{fill:{who:speakerName}})`. The
    reply does NOT re-emit → chain depth capped at 1 (no flood). replyChance<1 +
    20s per-cat speak cooldown keep silence common.
  - `campfire_reply` is EVENT-ONLY — NOT in GATES/AMBIENT_CATEGORIES (never
    competes in ambient roll; no double-fire with campfire_talk).
- New events: `campfire-gathered{cat,fire}`, `campfire-chatted{cat,fire}`.
- New state: NONE.
- Content: `campfire_reply` (~24-30, 4 bands, {who}).
- Tuning CAMPFIRE: companyPull, companyPullCap, sitMinMs, sitMaxMs,
  gatherCompanyMin, replyChance. (Evening bias stays in timeFit.bonfire.)
- rng: bonfire duration 1 range (widened); reply 1 chance (+1 pick if pass) +
  selectLine. All this.rng.
- Tests: gather (≥2 concurrent seated at lit fire, campfire-gathered fires,
  campfire_talk frequency ≫ M3 baseline); conversation (campfire_talk →
  campfire-chatted → campfire_reply from a DIFFERENT seated cat); no double-fire
  same cat; silence-common regression; determinism; save round-trip.
- DIGEST re-check REQUIRED (riskiest): gathering happens, campfire_talk frequent,
  routine (eat/sleep/work) not skewed, no permanent collapse.

## Deferred (out of M4)
Cross-tick delayed replies (needs timer state); reconcile reply from the other
cat; rumor re-propagation (read-only surfacing only); deleting dormant flat
LINES; raising campfireTalkChance. M5 (seasons/festival/arrivals) gated.
