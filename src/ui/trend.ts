import type { CommuneProps } from '../data/types.ts';
import { fmtDate, fmtPct } from '../format.ts';
import { T } from '../i18n.ts';
import { h } from './dom.ts';

/**
 * [Claude] Measured water trend of a commune: the latest assessed image against the previous image of the same orbit.
 * Arrow + words carry the meaning (not colour). Returns null when the backend has no comparable previous image.
 * There is deliberately no projected drain date.
 */
export function trendBlock(p: CommuneProps): HTMLElement | null {
  if (!p.trend || p.prev_pct == null || !p.prev_date || p.last_pct === null || !p.last_date) return null;
  const t = T.trend[p.trend];
  return h(
    'div',
    { class: `trend trend-${p.trend}` },
    h('p', { class: 'trend-head' }, h('span', { class: 'trend-icon', 'aria-hidden': 'true', text: t.icon }), h('b', { text: t.label })),
    h('p', { class: 'trend-detail', text: T.trend.detail(fmtPct(p.prev_pct), fmtDate(p.prev_date), fmtPct(p.last_pct), fmtDate(p.last_date)) }),
    h('p', { class: 'trend-note note', text: T.trend.note }),
  );
}

/** Compact tag for tables: "↓ falling". */
export function trendTag(p: CommuneProps): HTMLElement | null {
  if (!p.trend) return null;
  return h('span', { class: `trend-tag trend-${p.trend}`, title: T.trend.note, text: T.trend.short[p.trend] });
}
