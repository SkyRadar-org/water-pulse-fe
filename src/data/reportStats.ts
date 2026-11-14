import type { Choropleth, CommuneProps, Maturity, Scene, Track } from './types.ts';

/** Same thresholds as the overview cards and map legend. */
export type WaterClass = 'high' | 'medium' | 'low';
export const classOf = (pct: number): WaterClass => (pct >= 30 ? 'high' : pct >= 10 ? 'medium' : 'low');

export interface ReportFilter {
  from: string; // inclusive YYYY-MM-DD
  to: string; // inclusive YYYY-MM-DD
  province: string; // '' = all
  track: 'all' | Track;
}

export interface SceneStat {
  date: string;
  track: Track;
  maturity: Maturity;
  observed: number;
  high: number;
  medium: number;
  low: number;
  /** Communes in scope with no value in this acquisition (outside the swath). */
  missing: number;
}

export interface CommuneStat {
  p: CommuneProps;
  obs: number;
  max: number | null;
  maxDate: string | null;
  maxTrack: Track | null;
  mean: number | null;
  highCount: number;
  /** Days from first ≥20% to below half of peak (or to the last image when still wet). */
  floodDays: number | null;
  floodOngoing: boolean;
}

export interface ProvinceStat {
  province: string;
  communes: number;
  observed: number;
  high: number;
  medium: number;
  low: number;
  noObs: number;
  meanMax: number | null;
}

export interface MonthStat {
  month: string; // YYYY-MM
  onset: number;
  peak: number;
  recession: number;
}

export const DURATION_BINS = ['lt30', '30to59', '60to89', 'ge90'] as const;
export type DurationBin = (typeof DURATION_BINS)[number];

export interface Report {
  filter: ReportFilter;
  scenes: SceneStat[];
  communes: CommuneStat[];
  provinces: ProvinceStat[];
  months: MonthStat[];
  duration: Record<DurationBin, { done: number; ongoing: number }>;
  neverFlooded: number;
  totals: {
    communes: number;
    observed: number;
    everHigh: number;
    acquisitions: number;
    validated: number;
    busiest: SceneStat | null;
  };
}

export const sceneKey = (date: string, track: Track): string => `${date}_${track}`;

const DAY = 86400000;
const days = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

export function scenesInPeriod(scenes: Scene[], f: Pick<ReportFilter, 'from' | 'to' | 'track'>): Scene[] {
  return scenes
    .filter((s) => s.date >= f.from && s.date <= f.to && (f.track === 'all' || s.track === f.track))
    .sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track));
}

export function floodDuration(p: CommuneProps): { days: number | null; ongoing: boolean } {
  if (!p.first_flood_date) return { days: null, ongoing: false };
  if (p.recession_date) return { days: Math.max(0, days(p.first_flood_date, p.recession_date)), ongoing: false };
  if (!p.last_date) return { days: null, ongoing: false };
  return { days: Math.max(0, days(p.first_flood_date, p.last_date)), ongoing: true };
}

export function durationBin(d: number): DurationBin {
  return d < 30 ? 'lt30' : d < 60 ? '30to59' : d < 90 ? '60to89' : 'ge90';
}

/** Months (YYYY-MM) touched by the inclusive date range. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const end = to.slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push(key);
    if (key >= end) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const mean = (v: number[]): number | null => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/**
 * Period report from per-acquisition commune values. Tracks are never merged: each acquisition stays its own
 * row, and per-commune figures are the max/mean of whatever acquisitions observed that commune.
 */
export function computeReport(all: CommuneProps[], scenes: Scene[], choro: Map<string, Choropleth>, f: ReportFilter): Report {
  const scope = all.filter((p) => !f.province || p.province === f.province);
  const inPeriod = scenesInPeriod(scenes, f);

  const acc = new Map<string, { values: { v: number; date: string; track: Track }[] }>();
  for (const p of scope) acc.set(p.osm_id, { values: [] });

  const sceneStats: SceneStat[] = [];
  for (const s of inPeriod) {
    const values = choro.get(sceneKey(s.date, s.track));
    if (!values) continue;
    const st: SceneStat = { date: s.date, track: s.track, maturity: s.maturity, observed: 0, high: 0, medium: 0, low: 0, missing: 0 };
    for (const p of scope) {
      const v = values[p.osm_id];
      if (typeof v !== 'number') {
        st.missing += 1;
        continue;
      }
      st.observed += 1;
      st[classOf(v)] += 1;
      acc.get(p.osm_id)!.values.push({ v, date: s.date, track: s.track });
    }
    sceneStats.push(st);
  }

  const communes: CommuneStat[] = scope.map((p) => {
    const vals = acc.get(p.osm_id)!.values;
    let top: (typeof vals)[number] | null = null;
    for (const r of vals) if (!top || r.v > top.v) top = r;
    const d = floodDuration(p);
    return {
      p,
      obs: vals.length,
      max: top ? top.v : null,
      maxDate: top ? top.date : null,
      maxTrack: top ? top.track : null,
      mean: mean(vals.map((r) => r.v)),
      highCount: vals.filter((r) => r.v >= 30).length,
      floodDays: d.days,
      floodOngoing: d.ongoing,
    };
  });

  const byProvince = new Map<string, CommuneStat[]>();
  for (const c of communes) {
    const list = byProvince.get(c.p.province) ?? [];
    list.push(c);
    byProvince.set(c.p.province, list);
  }
  const provinces: ProvinceStat[] = [...byProvince.entries()]
    .map(([province, list]) => {
      const observed = list.filter((c) => c.max !== null);
      return {
        province,
        communes: list.length,
        observed: observed.length,
        high: observed.filter((c) => classOf(c.max!) === 'high').length,
        medium: observed.filter((c) => classOf(c.max!) === 'medium').length,
        low: observed.filter((c) => classOf(c.max!) === 'low').length,
        noObs: list.length - observed.length,
        meanMax: mean(observed.map((c) => c.max!)),
      };
    })
    .sort((a, b) => b.communes - a.communes || a.province.localeCompare(b.province, 'vi'));

  const months: MonthStat[] = monthsBetween(f.from, f.to).map((month) => ({
    month,
    onset: scope.filter((p) => p.first_flood_date?.startsWith(month)).length,
    peak: scope.filter((p) => p.peak_date?.startsWith(month) && p.peak_pct !== null && p.peak_pct >= 20).length,
    recession: scope.filter((p) => p.recession_date?.startsWith(month)).length,
  }));

  const duration = Object.fromEntries(DURATION_BINS.map((b) => [b, { done: 0, ongoing: 0 }])) as Report['duration'];
  let neverFlooded = 0;
  for (const c of communes) {
    if (c.floodDays === null) {
      neverFlooded += 1;
      continue;
    }
    duration[durationBin(c.floodDays)][c.floodOngoing ? 'ongoing' : 'done'] += 1;
  }

  let busiest: SceneStat | null = null;
  for (const s of sceneStats) if (s.high > 0 && (!busiest || s.high > busiest.high)) busiest = s;

  return {
    filter: f,
    scenes: sceneStats,
    communes,
    provinces,
    months,
    duration,
    neverFlooded,
    totals: {
      communes: scope.length,
      observed: communes.filter((c) => c.obs > 0).length,
      everHigh: communes.filter((c) => c.highCount > 0).length,
      acquisitions: sceneStats.length,
      validated: sceneStats.filter((s) => s.maturity === 'validated').length,
      busiest,
    },
  };
}

/** Scenes that saw fewer communes than this are too partial to show as a trend point. */
export const TREND_MIN_OBSERVED = 10;

export interface TrendPoint {
  date: string;
  track: Track;
  /** Share (%) of the communes observed in this image that had ≥ 30% water. */
  share: number;
  high: number;
  observed: number;
}

export interface Trend {
  points: TrendPoint[];
  peak: TrendPoint | null;
  latest: TrendPoint | null;
  /** Highest point of the latest image's own orbit: the fair comparison for "is it receding?". */
  latestTrackPeak: TrendPoint | null;
  direction: 'rising' | 'falling' | 'steady' | 'none';
  onsetMonth: MonthStat | null;
  recessionMonth: MonthStat | null;
  stillWet: number;
}

/** Plain-language season trend. Orbits stay separate: "falling" compares the latest image with its own orbit's peak. */
export function computeTrend(r: Report): Trend {
  const points: TrendPoint[] = r.scenes
    .filter((s) => s.observed >= TREND_MIN_OBSERVED)
    .map((s) => ({ date: s.date, track: s.track, share: (s.high / s.observed) * 100, high: s.high, observed: s.observed }));
  const top = (list: TrendPoint[]) => list.reduce<TrendPoint | null>((a, p) => (!a || p.share > a.share ? p : a), null);
  const peak = top(points);
  const latest = points.at(-1) ?? null;
  const latestTrackPeak = latest ? top(points.filter((p) => p.track === latest.track)) : null;
  let direction: Trend['direction'] = 'none';
  if (latest && latestTrackPeak) {
    const drop = latestTrackPeak.share - latest.share;
    direction = latest === latestTrackPeak ? 'rising' : drop >= 5 ? 'falling' : 'steady';
  }
  const busiest = (k: 'onset' | 'recession') => r.months.reduce<MonthStat | null>((a, m) => (m[k] > 0 && (!a || m[k] > a[k]) ? m : a), null);
  return {
    points,
    peak,
    latest,
    latestTrackPeak,
    direction,
    onsetMonth: busiest('onset'),
    recessionMonth: busiest('recession'),
    stillWet: r.communes.filter((c) => c.floodOngoing).length,
  };
}
