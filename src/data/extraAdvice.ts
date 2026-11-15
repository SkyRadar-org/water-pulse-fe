/**
 * [Claude] Further advice per commune, each combining real NISAR flood figures with one assumed demo table:
 * pump dispatch (tram_bom_xa.csv), fertiliser cut from flood silt (phu_sa_phan_bon.csv + phan_bon_khuyen_cao.csv),
 * golden apple snail and rat control (dieu_tra_sinh_vat_hai.csv + nguong_sinh_vat_hai.csv).
 */
import { addDays, demoRows, diffDays, DRY_PCT, PREP_DAYS } from './demoAgro.ts';
import { fold } from '../format.ts';
import type { Advice } from './sowingAdvice.ts';

const PUMP_HOURS_PER_DAY = 20;
/** One mobile pump (demo): m³/h. */
export const MOBILE_PUMP_M3H = 1500;

export interface PumpPlan {
  needed: boolean;
  riceHa: number;
  excessM3: number;
  fixedM3h: number;
  ownMobile: number;
  /** Days of pumping with the commune's own fixed stations and mobile pumps. */
  daysOwn: number | null;
  daysAvailable: number;
  /** Extra mobile pumps to bring in to finish before land preparation must start. */
  extraPumps: number;
  /** Communes in the same province that are already dry and can lend pumps. */
  donors: { name: string; pumps: number }[];
  priority: number;
}

export type Level = 'high' | 'medium' | 'low';

export interface FertPlan {
  floodDays: number;
  group: string;
  siltT: number;
  cutN: number; // %
  cutP: number; // %
  kgN: number; // kg/ha saved
  kgP: number;
  savingPerHa: number; // VND
  savingTotal: number; // VND for the commune's rice area
}

export interface PestPlan {
  snail: number;
  rat: number;
  snailLevel: Level;
  ratLevel: Level;
  level: Level;
  wetAtSowing: boolean;
  surveyDate: string;
  snailAction: string;
  ratAction: string;
}

export interface Extra {
  pump: PumpPlan;
  fert: FertPlan | null;
  pest: PestPlan | null;
}

const num = (v: string | undefined) => (v === undefined || v === '' ? 0 : Number(v));

export function floodDays(a: Advice): number {
  const p = a.p;
  if (!p.first_flood_date) return 0;
  const end = p.recession_date ?? a.dryDate ?? p.last_date ?? p.first_flood_date;
  return Math.max(0, diffDays(p.first_flood_date, end));
}

export function computeExtras(list: Advice[], evalDate: string): Map<string, Extra> {
  const pumps = new Map(demoRows('tram_bom_xa.csv').map((r) => [r.osm_id, r]));
  const pests = new Map(demoRows('dieu_tra_sinh_vat_hai.csv').map((r) => [r.osm_id, r]));
  const silt = demoRows('phu_sa_phan_bon.csv');
  const fertRates = demoRows('phan_bon_khuyen_cao.csv');
  const thresholds = new Map(demoRows('nguong_sinh_vat_hai.csv').map((r) => [r.loai, r]));
  const out = new Map<string, Extra>();

  // ---------- pumps ----------
  const plans = new Map<string, PumpPlan>();
  for (const a of list) {
    const r = pumps.get(a.p.osm_id);
    const area = a.p.area_km2 ?? a.p.valid_km2 ?? 0;
    const pct = a.estPct ?? a.p.last_pct ?? 0;
    const depth = num(r?.do_sau_nuoc_tb_m);
    const riceM2 = num(r?.dien_tich_lua_ha) * 1e4;
    // Only flooded rice land is pumped (not rivers or the whole commune).
    const excessM3 = Math.max(0, Math.min(((pct - DRY_PCT) / 100) * area * 1e6, riceM2) * depth);
    const fixedM3h = num(r?.cong_suat_m3_gio);
    const ownMobile = num(r?.may_bom_di_dong);
    const perDay = (fixedM3h + ownMobile * MOBILE_PUMP_M3H) * PUMP_HOURS_PER_DAY;
    const needed = a.decision === 'risk' && a.detail !== 'ready_late' && excessM3 > 0;
    const neededBy = addDays(a.cal.windowEnd, -PREP_DAYS);
    const daysAvailable = Math.max(1, diffDays(evalDate, neededBy));
    const daysOwn = perDay > 0 ? Math.ceil(excessM3 / perDay) : null;
    const extraPumps = needed ? Math.max(0, Math.ceil((excessM3 / daysAvailable - perDay) / (MOBILE_PUMP_M3H * PUMP_HOURS_PER_DAY))) : 0;
    plans.set(a.p.osm_id, { needed, riceHa: num(r?.dien_tich_lua_ha), excessM3, fixedM3h, ownMobile, daysOwn, daysAvailable, extraPumps, donors: [], priority: needed ? excessM3 / daysAvailable : 0 });
  }
  // Lend mobile pumps from dry communes in the same province, biggest shortfall first.
  const spare = new Map(list.filter((a) => a.decision === 'ready').map((a) => [a.p.osm_id, plans.get(a.p.osm_id)!.ownMobile]));
  for (const a of [...list].sort((x, y) => plans.get(y.p.osm_id)!.priority - plans.get(x.p.osm_id)!.priority)) {
    const plan = plans.get(a.p.osm_id)!;
    let need = plan.extraPumps;
    for (const d of list) {
      if (need <= 0) break;
      if (d.p.province !== a.p.province) continue;
      const left = spare.get(d.p.osm_id) ?? 0;
      if (left <= 0) continue;
      const take = Math.min(left, need);
      spare.set(d.p.osm_id, left - take);
      plan.donors.push({ name: d.p.name, pumps: take });
      need -= take;
    }
  }

  for (const a of list) {
    const p = a.p;
    // ---------- fertiliser ----------
    let fert: FertPlan | null = null;
    const days = floodDays(a);
    const g = silt.find((r) => days >= num(r.so_ngay_ngap_tu) && days <= num(r.so_ngay_ngap_den));
    const rate = fertRates.find((r) => fold(p.province).includes(r.tinh_key));
    if (g && rate) {
      const cutN = num(g.giam_dam_pct);
      const cutP = num(g.giam_lan_pct);
      const kgN = (num(rate.dam_N_kg_ha) * cutN) / 100;
      const kgP = (num(rate.lan_P2O5_kg_ha) * cutP) / 100;
      const savingPerHa = kgN * num(rate.gia_N_d_kg) + kgP * num(rate.gia_P2O5_d_kg);
      fert = { floodDays: days, group: g.nhom, siltT: num(g.phu_sa_tan_ha), cutN, cutP, kgN, kgP, savingPerHa, savingTotal: savingPerHa * plans.get(p.osm_id)!.riceHa };
    }
    // ---------- pests ----------
    let pest: PestPlan | null = null;
    const s = pests.get(p.osm_id);
    const ts = thresholds.get('oc_buou_vang');
    const tr = thresholds.get('chuot');
    if (s && ts && tr) {
      const snail = num(s.oc_buou_vang_con_m2);
      const rat = num(s.chuot_hang_100m_bo);
      const lvl = (v: number, t: Record<string, string>): Level => (v >= num(t.nguong_nguy_hiem) ? 'high' : v >= num(t.nguong_canh_bao) ? 'medium' : 'low');
      // Fields that are still wet at sowing favour snails: raise one level.
      const wetAtSowing = a.decision === 'risk' || a.decision === 'wait';
      let snailLevel = lvl(snail, ts);
      if (wetAtSowing && snailLevel === 'medium') snailLevel = 'high';
      if (wetAtSowing && snailLevel === 'low' && snail >= num(ts.nguong_canh_bao) * 0.6) snailLevel = 'medium';
      const ratLevel = lvl(rat, tr);
      const rank = { high: 2, medium: 1, low: 0 } as const;
      const level = rank[snailLevel] >= rank[ratLevel] ? snailLevel : ratLevel;
      pest = { snail, rat, snailLevel, ratLevel, level, wetAtSowing, surveyDate: s.ngay_dieu_tra, snailAction: ts.bien_phap, ratAction: tr.bien_phap };
    }
    out.set(p.osm_id, { pump: plans.get(p.osm_id)!, fert, pest });
  }
  return out;
}
