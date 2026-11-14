import { lang, T } from './i18n.ts';

const MS_DAY = 86400000;

export const toMs = (d: string): number => Date.parse(d + 'T00:00:00Z');

export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / MS_DAY);
}

function parts(d: string): [number, number, number] {
  const dt = new Date(toMs(d));
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

export const fmtDate = (d: string): string => T.date(...parts(d));
export const fmtShort = (d: string): string => {
  const [, m, day] = parts(d);
  return T.dateShort(m, day);
};

const NUM = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 });
export const fmtNum = (v: number): string => NUM.format(v);
export const fmtPct = (v: number): string => `${NUM.format(v)}%`;
/** Two decimals, with the decimal comma in Vietnamese (scores like 0,78). */
export const fmt2 = (v: number): string => v.toFixed(2).replace('.', lang === 'vi' ? ',' : '.');

/** Lower-case, accent-free text for forgiving name search ("Son Kien" finds "Sơn Kiên"). */
export const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob(['\ufeff' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
