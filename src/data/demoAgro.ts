/**
 * [Claude] DỮ LIỆU DEMO GIẢ ĐỊNH (assumed demo data) for the sowing-advice tab.
 *
 * Nothing in this file is measured or official. The sowing calendars, Mekong water levels and the
 * upstream release are invented, plausible values so the decision logic can be demonstrated.
 * Replace them with the provinces' official "lịch xuống giống né rầy", the Southern Regional
 * Hydro-Meteorological Center gauges (Tân Châu, Châu Đốc) and MRC release notices before real use.
 */
import Papa from 'papaparse';
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

/** Filled from public/demo-data/lich_ne_ray.csv by loadDemoData(). */
export const CALENDARS: SowingCalendar[] = [];

const FALLBACK: SowingCalendar = { key: '', label: '', windowStart: '2026-11-28', windowEnd: '2026-12-12', releaseDelayDays: 2, station: 'tanchau' };

export function calendarFor(province: string): SowingCalendar {
  const f = fold(province);
  return CALENDARS.find((c) => f.includes(c.key)) ?? { ...FALLBACK, label: province };
}

/** Upstream reservoir release (demo): raises the river for a few days and slows field drainage. */
/** Filled from public/demo-data/lich_xa_lu.csv by loadDemoData() (first release). */
export const UPSTREAM_RELEASE = { start: '2026-11-20', end: '2026-11-26', extraFlow: 0, peakRiseCm: 0 };

export interface Station {
  id: 'tanchau' | 'chaudoc';
  name: string;
  river: string;
  /** Alert level I (m), shown as a reference line. */
  alert1: number;
}

/** Filled from public/demo-data/tram_thuy_van.csv. */
export const STATIONS: Station[] = [];

const MS_DAY = 86400000;
const ms = (d: string) => Date.parse(d + 'T00:00:00Z');
export const addDays = (d: string, n: number): string => new Date(ms(d) + n * MS_DAY).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string): number => Math.round((ms(b) - ms(a)) / MS_DAY);

export const LEVEL_FROM = '2026-10-10';
export const LEVEL_TO = '2026-12-31';

const LEVELS = new Map<string, { date: string; level: number }[]>();

/** Daily water level (m) at a station, from public/demo-data/muc_nuoc_tram.csv. */
export function stationLevels(id: Station['id']): { date: string; level: number }[] {
  return LEVELS.get(id) ?? [];
}

/** The demo tables as loaded, for the "data used" section (rows exactly as in the CSV files). */
export interface DemoTable {
  file: string;
  rows: Record<string, string>[];
  columns: string[];
}
export const DEMO_TABLES: DemoTable[] = [];
export const DEMO_BASE = '/demo-data';
export const DEMO_FILES = ['lich_ne_ray.csv', 'tram_thuy_van.csv', 'muc_nuoc_tram.csv', 'lich_xa_lu.csv', 'tram_bom_xa.csv', 'phu_sa_phan_bon.csv', 'phan_bon_khuyen_cao.csv', 'dieu_tra_sinh_vat_hai.csv', 'nguong_sinh_vat_hai.csv'] as const;

export function demoRows(file: (typeof DEMO_FILES)[number]): Record<string, string>[] {
  return DEMO_TABLES.find((t) => t.file === file)?.rows ?? [];
}

async function loadCsv(file: string): Promise<DemoTable> {
  const res = await fetch(`${DEMO_BASE}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const parsed = Papa.parse<Record<string, string>>(await res.text(), { header: true, skipEmptyLines: true });
  return { file, rows: parsed.data, columns: parsed.meta.fields ?? [] };
}

let loading: Promise<void> | null = null;
/** Loads the demo CSV tables once and fills CALENDARS, STATIONS, levels and UPSTREAM_RELEASE. */
export function loadDemoData(): Promise<void> {
  loading ??= Promise.all(DEMO_FILES.map(loadCsv)).then((tables) => {
    const [cal, st, lv, rel] = tables;
    DEMO_TABLES.splice(0, DEMO_TABLES.length, ...tables);
    CALENDARS.splice(0, CALENDARS.length, ...cal.rows.map((r) => ({
      key: r.tinh_key,
      label: r.tinh,
      windowStart: r.bat_dau_ne_ray,
      windowEnd: r.ket_thuc_ne_ray,
      releaseDelayDays: Number(r.tre_do_xa_lu_ngay) || 0,
      station: r.ma_tram as Station['id'],
    })));
    STATIONS.splice(0, STATIONS.length, ...st.rows.map((r) => ({ id: r.ma_tram as Station['id'], name: r.ten_tram, river: r.song, alert1: Number(r.muc_bao_dong_1_m) })));
    LEVELS.clear();
    for (const r of lv.rows) {
      const list = LEVELS.get(r.ma_tram) ?? [];
      list.push({ date: r.ngay, level: Number(r.muc_nuoc_m) });
      LEVELS.set(r.ma_tram, list);
    }
    const first = rel.rows[0];
    if (first) Object.assign(UPSTREAM_RELEASE, { start: first.bat_dau, end: first.ket_thuc, extraFlow: Number(first.luu_luong_tang_m3s), peakRiseCm: Number(first.muc_nuoc_tang_cm) });
  }).catch((err: unknown) => {
    loading = null;
    throw err;
  });
  return loading;
}
