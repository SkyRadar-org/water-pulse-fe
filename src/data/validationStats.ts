import type { Validation, ValidationRow, SwotValidationRow } from './types.ts';

const score = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
export function hlsPairs(v: Validation): ValidationRow[] {
  return v.vsHls.filter(r => r.date >= '2026-08-01' && r.date < '2026-12-01' && score(r.f1_nisar) && score(r.f1_s1));
}
export function swotPairs(v: Validation): SwotValidationRow[] {
  return (v.vsSwot ?? []).filter(r => score(r.f1_nisar_same_px) && score(r.f1_s1));
}
export function validationStats(v: Validation) {
  const hls = hlsPairs(v);
  const swot = swotPairs(v);
  return {
    hls: { total: hls.length, wins: hls.filter(r => r.f1_nisar > r.f1_s1).length },
    swot: { total: swot.length, wins: swot.filter(r => r.f1_nisar_same_px! > r.f1_s1!).length },
  };
}
