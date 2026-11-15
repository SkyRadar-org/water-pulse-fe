/**
 * [Claude] DỮ LIỆU DEMO GIẢ ĐỊNH (assumed demo data) for the sowing-advice tab.
 *
 * Nothing in this file is measured or official. The sowing calendars, Mekong water levels and the
 * upstream release are invented, plausible values so the decision logic can be demonstrated.
 * Replace them with the provinces' official "lịch xuống giống né rầy", the Southern Regional
 * Hydro-Meteorological Center gauges (Tân Châu, Châu Đốc) and MRC release notices before real use.
 */
import { fold } from '../format.ts';

export interface SowingCalendar {
  /** Matched against the folded province name. */
  key: string;
  label: string;
  /** Recommended "né rầy" sowing window (centre ± 7 days), ISO dates. */
  windowStart: string;
  windowEnd: string;
  /** Rough share of communes in this province that drain by gravity into the Tiền / Hậu rivers. */
  releaseDelayDays: number;
  station: 'tanchau' | 'chaudoc';
}

export const SEASON_LABEL = 'Đông Xuân 2026–2027';
/** Latest sowing date for the winter–spring crop in the whole region (demo). */
export const SEASON_DEADLINE = '2027-01-10';
/** Days needed after the field is dry: drain the last puddles, clear straw, plough, level (demo). */
export const PREP_DAYS = 10;
/** Commune water share at or below which rice fields count as drained; the rest is canals, ponds and rivers. */
export const DRY_PCT = 15;

export const CALENDARS: SowingCalendar[] = [
  { key: 'an giang', label: 'An Giang', windowStart: '2026-11-21', windowEnd: '2026-12-05', releaseDelayDays: 3, station: 'chaudoc' },
  { key: 'dong thap', label: 'Đồng Tháp', windowStart: '2026-11-24', windowEnd: '2026-12-08', releaseDelayDays: 3, station: 'tanchau' },
  { key: 'tay ninh', label: 'Tây Ninh', windowStart: '2026-12-01', windowEnd: '2026-12-15', releaseDelayDays: 2, station: 'tanchau' },
  { key: 'can tho', label: 'Cần Thơ', windowStart: '2026-11-28', windowEnd: '2026-12-12', releaseDelayDays: 1, station: 'chaudoc' },
  { key: 'vinh long', label: 'Vĩnh Long', windowStart: '2026-12-08', windowEnd: '2026-12-22', releaseDelayDays: 1, station: 'tanchau' },
];

const FALLBACK: SowingCalendar = { key: '', label: '', windowStart: '2026-11-28', windowEnd: '2026-12-12', releaseDelayDays: 2, station: 'tanchau' };

export function calendarFor(province: string): SowingCalendar {
  const f = fold(province);
  return CALENDARS.find((c) => f.includes(c.key)) ?? { ...FALLBACK, label: province };
}

/** Upstream reservoir release (demo): raises the river for a few days and slows field drainage. */
export const UPSTREAM_RELEASE = {
  start: '2026-11-20',
  end: '2026-11-26',
  extraFlow: 1500, // m³/s at Kratie
  peakRiseCm: 12, // at Tân Châu
};

export interface Station {
  id: 'tanchau' | 'chaudoc';
  name: string;
  river: string;
  /** Alert level I (m), shown as a reference line. */
  alert1: number;
}

export const STATIONS: Station[] = [
  { id: 'tanchau', name: 'Tân Châu', river: 'sông Tiền', alert1: 3.5 },
  { id: 'chaudoc', name: 'Châu Đốc', river: 'sông Hậu', alert1: 3.0 },
];

const MS_DAY = 86400000;
const ms = (d: string) => Date.parse(d + 'T00:00:00Z');
export const addDays = (d: string, n: number): string => new Date(ms(d) + n * MS_DAY).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string): number => Math.round((ms(b) - ms(a)) / MS_DAY);

export const LEVEL_FROM = '2026-10-10';
export const LEVEL_TO = '2026-12-31';

/** Daily water level (m) at a station: a falling post-flood limb, a half-monthly tide and the demo release bump. */
export function stationLevels(id: Station['id']): { date: string; level: number }[] {
  const base = id === 'tanchau' ? 3.25 : 2.95;
  const fall = id === 'tanchau' ? 0.026 : 0.023; // m/day early in the recession, easing off later
  const floor = id === 'tanchau' ? 1.35 : 1.25;
  const out: { date: string; level: number }[] = [];
  const n = diffDays(LEVEL_FROM, LEVEL_TO);
  const rStart = diffDays(LEVEL_FROM, UPSTREAM_RELEASE.start);
  const rEnd = diffDays(LEVEL_FROM, UPSTREAM_RELEASE.end);
  for (let i = 0; i <= n; i++) {
    const recession = floor + (base - floor) * Math.exp((-fall / (base - floor)) * i * 1.15);
    const tide = 0.07 * Math.sin((2 * Math.PI * i) / 14.8);
    let bump = 0;
    if (i >= rStart - 1 && i <= rEnd + 4) {
      const t = (i - (rStart - 1)) / (rEnd + 5 - (rStart - 1));
      bump = (UPSTREAM_RELEASE.peakRiseCm / 100) * Math.sin(Math.PI * t) * (id === 'tanchau' ? 1 : 0.8);
    }
    out.push({ date: addDays(LEVEL_FROM, i), level: Math.round((recession + tide + bump) * 100) / 100 });
  }
  return out;
}
