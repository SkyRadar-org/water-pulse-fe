/**
 * [Claude] Sowing decision per commune: real NISAR water (latest share + measured trend on the same orbit)
 * combined with DEMO assumptions (sowing calendar, river levels, upstream release) from demoAgro.ts.
 * Pure function, no DOM: every number that drives the decision is returned so the UI can explain it.
 */
import type { CommuneProps } from './types.ts';
import { addDays, calendarFor, diffDays, DRY_PCT, PREP_DAYS, SEASON_DEADLINE, UPSTREAM_RELEASE, type SowingCalendar } from './demoAgro.ts';

/** ready: field ready, sow inside the window · wait: will be ready inside the window · risk: misses the window, pump · check: not enough data. */
export type Decision = 'ready' | 'wait' | 'risk' | 'check';

export type Detail =
  | 'ready_now' // ready and window open
  | 'ready_early' // ready, wait for the window to open
  | 'ready_late' // ready but the window already closed
  | 'wait' // will be ready inside the window
  | 'pump' // misses the window but not the season: pump to catch up
  | 'critical' // misses the season deadline
  | 'stagnant' // water is not draining (steady or rising)
  | 'no_coverage'
  | 'no_data';

export interface Advice {
  p: CommuneProps;
  cal: SowingCalendar;
  decision: Decision;
  detail: Detail;
  /** Estimated water share on the evaluation date (projection of the measured trend), %. */
  estPct: number | null;
  /** Measured change per day on the same orbit, percentage points (negative = draining). */
  ratePerDay: number | null;
  /** Estimated date the water share falls to DRY_PCT. */
  dryDate: string | null;
  /** Days added because the demo upstream release slows drainage. */
  releaseDelay: number;
  /** dryDate + PREP_DAYS. */
  readyDate: string | null;
  /** Suggested sowing date (never before the window opens). */
  sowDate: string | null;
  /** Days from the evaluation date to sowDate (wait), or days late past the window (risk). */
  days: number | null;
  /** Drainage needed to make the window: percentage points per day. */
  neededRate: number | null;
  /** Days between the latest NISAR image and the evaluation date. */
  dataAge: number | null;
}

/** Below this measured drop (pp per 12 days) the water is treated as not draining. */
const MIN_DRAIN_PP_12D = 3;

export function adviseCommune(p: CommuneProps, evalDate: string): Advice {
  const cal = calendarFor(p.province);
  const base: Advice = { p, cal, decision: 'check', detail: 'no_data', estPct: null, ratePerDay: null, dryDate: null, releaseDelay: 0, readyDate: null, sowDate: null, days: null, neededRate: null, dataAge: null };
  if (p.last_pct === null || p.last_pct === undefined || !p.last_date) return base;
  const dataAge = Math.max(0, diffDays(p.last_date, evalDate));
  base.dataAge = dataAge;
  if (p.coverage_sufficient === false) return { ...base, detail: 'no_coverage', estPct: p.last_pct };

  const pp12 = p.trend_pp_12d ?? (p.status === 'no_flood' ? 0 : null);
  const rate = pp12 === null ? null : pp12 / 12;
  base.ratePerDay = rate;

  let dryDate: string | null;
  let estPct: number;
  if (p.last_pct <= DRY_PCT) {
    // Never flooded this season: the field has been dry since before the first image.
    dryDate = p.status === 'no_flood' && p.first_flood_date === null ? addDays(p.last_date, -60) : p.last_date;
    estPct = p.last_pct;
  } else if (rate !== null && pp12! <= -MIN_DRAIN_PP_12D) {
    const toDry = Math.ceil((p.last_pct - DRY_PCT) / -rate);
    dryDate = addDays(p.last_date, toDry);
    estPct = Math.max(DRY_PCT, p.last_pct + rate * dataAge);
    if (diffDays(evalDate, dryDate) < 0) estPct = Math.max(0, Math.min(estPct, DRY_PCT));
  } else if (rate === null) {
    return { ...base, detail: 'no_data', estPct: p.last_pct };
  } else {
    // Steady or rising: no natural drain date. Needs active pumping regardless of the calendar.
    const neededBy = addDays(cal.windowEnd, -PREP_DAYS);
    const span = Math.max(1, diffDays(evalDate, neededBy));
    return { ...base, decision: 'risk', detail: 'stagnant', estPct: p.last_pct, neededRate: (p.last_pct - DRY_PCT) / span };
  }

  // Demo upstream release: fields still wet when the river rises drain a few days later.
  let releaseDelay = 0;
  if (diffDays(UPSTREAM_RELEASE.start, dryDate) >= -2 && diffDays(evalDate, UPSTREAM_RELEASE.end) >= 0) releaseDelay = cal.releaseDelayDays;
  dryDate = addDays(dryDate, releaseDelay);
  const readyDate = addDays(dryDate, PREP_DAYS);
  const out = { ...base, estPct: Math.round(estPct * 10) / 10, dryDate, releaseDelay, readyDate };

  if (diffDays(readyDate, evalDate) >= 0) {
    // Field is ready today.
    if (evalDate < cal.windowStart) return { ...out, decision: 'ready', detail: 'ready_early', sowDate: cal.windowStart, days: diffDays(evalDate, cal.windowStart) };
    if (evalDate <= cal.windowEnd) return { ...out, decision: 'ready', detail: 'ready_now', sowDate: evalDate, days: 0 };
    return { ...out, decision: 'risk', detail: 'ready_late', sowDate: evalDate, days: diffDays(cal.windowEnd, evalDate) };
  }
  const sowDate = readyDate < cal.windowStart ? cal.windowStart : readyDate;
  if (readyDate <= cal.windowEnd) return { ...out, decision: 'wait', detail: 'wait', sowDate, days: diffDays(evalDate, sowDate) };

  const neededBy = addDays(cal.windowEnd, -PREP_DAYS);
  const span = diffDays(evalDate, neededBy);
  const nowPct = out.estPct ?? p.last_pct;
  const neededRate = span > 0 ? (nowPct - DRY_PCT) / span : null;
  const detail: Detail = readyDate > SEASON_DEADLINE ? 'critical' : 'pump';
  return { ...out, decision: 'risk', detail, sowDate: readyDate, days: diffDays(cal.windowEnd, readyDate), neededRate };
}

export const DECISIONS: Decision[] = ['ready', 'wait', 'risk', 'check'];

export function adviseAll(list: CommuneProps[], evalDate: string): Advice[] {
  return list.map((p) => adviseCommune(p, evalDate));
}
