import { createAreaChart, createF1Chart } from '../charts/areaChart.ts';
import { lang, T } from '../i18n.ts';
import { getArea, getScenes, getValidation } from '../data/dataSource.ts';
import type { AreaPoint, Scene, Validation, ValidationRow } from '../data/types.ts';
import { fmt2, fmtShort } from '../format.ts';
import { h } from './dom.ts';

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const range = (v: number[]) => `${fmt2(Math.min(...v))}–${fmt2(Math.max(...v))}`;

function hlsTable(rows: ValidationRow[]): HTMLElement {
  type Pair = { label: string; a: keyof ValidationRow; b: keyof ValidationRow };
  const c = T.validation.hlsCols;
  const pairs: Pair[] = [
    { label: c.f1, a: 'f1_nisar', b: 'f1_s1' },
    { label: c.recall, a: 'recall_nisar', b: 'recall_s1' },
    { label: c.precision, a: 'precision_nisar', b: 'precision_s1' },
  ];
  const head1 = h('tr', {}, h('th', { rowspan: '2', text: c.date }), ...pairs.map((p) => h('th', { colspan: '2', class: 'grp', text: p.label })), h('th', { rowspan: '2', text: c.only }));
  const head2 = h('tr', {}, ...pairs.flatMap(() => [h('th', { class: 'sub', text: 'NISAR' }), h('th', { class: 'sub', text: 'S-1' })]));
  const body = rows.map((r) =>
    h(
      'tr',
      {},
      h('td', { text: fmtShort(r.date) }),
      ...pairs.flatMap((p) => {
        const a = r[p.a] as number | null;
        const b = r[p.b] as number | null;
        return [h('td', { class: `num ${a !== null && b !== null && a > b ? 'best' : ''}`, text: a === null ? '—' : fmt2(a) }), h('td', { class: `num ${a !== null && b !== null && b > a ? 'best' : ''}`, text: b === null ? '—' : fmt2(b) })];
      }),
      h('td', { class: 'num', text: `${r.nisar_only_true_pct}%` }),
    ),
  );
  return h('div', { class: 'ct-wrap' }, h('table', { class: 'ct vt' }, h('thead', {}, head1, head2), h('tbody', {}, ...body)));
}

function sourcesList(): HTMLElement {
  return h(
    'ul',
    { class: 'v-list' },
    ...T.content.sources.map((s) => h('li', {}, h('b', { text: `${s.name}: ` }), s.href ? h('a', { href: s.href, target: '_blank', rel: 'noopener', text: s.text }) : s.text)),
  );
}

export function mountValidation(host: HTMLElement): void {
  host.classList.add('page');
  const inner = h('div', { class: 'page-inner' }, h('div', { class: 'loading', text: T.validation.loading }));
  host.append(inner);

  const charts: { destroy(): void }[] = [];

  Promise.all([getArea(), getValidation(), getScenes()])
    .then(([area, v, scenes]) => build(area, v, scenes))
    .catch((err: unknown) => {
      console.error(err);
      inner.replaceChildren(h('div', { class: 'error-box', text: err instanceof Error ? err.message : T.app.loadError }));
    });

  function build(area: AreaPoint[], v: Validation, scenes: Scene[]) {
    const V = T.validation;
    const f1 = v.vsDswxS1.map((r) => r.f1);
    const flood = v.vsDswxS1.filter((r) => r.date >= '2026-09-01').map((r) => r.f1);
    const early = v.vsDswxS1.filter((r) => r.date < '2026-08-01').map((r) => r.f1);

    const areaCanvas = h('canvas', { role: 'img', 'aria-label': V.areaAria });
    const f1Canvas = h('canvas', { role: 'img', 'aria-label': V.f1Aria });

    const details = h(
      'details',
      { class: 'card vcard v-details' },
      h('summary', { text: V.detailsTitle }),
      h('h3', { text: V.areaTitle }),
      h('div', { class: 'v-chart' }, areaCanvas),
      h('p', { class: 'note', text: V.areaNote(T.areaNote) }),
      h('h3', { class: 'v-sub', text: V.hlsTitle }),
      h('p', { class: 'note', text: V.hlsNote }),
      hlsTable(v.vsHls),
      h('h3', { class: 'v-sub', text: V.agreeTitle }),
      h(
        'div',
        { class: 'v-kpis' },
        h('div', { class: 'cp-stat' }, h('span', { class: 'cp-stat-label', text: V.kpiMedian }), h('b', { text: fmt2(median(f1)) })),
        h('div', { class: 'cp-stat' }, h('span', { class: 'cp-stat-label', text: V.kpiFlood }), h('b', { text: range(flood) })),
        h('div', { class: 'cp-stat' }, h('span', { class: 'cp-stat-label', text: V.kpiEarly }), h('b', { text: range(early) })),
      ),
      h('div', { class: 'v-chart short' }, f1Canvas),
      h('p', { class: 'note', text: V.f1Foot }),
      h('h3', { class: 'v-sub', text: V.methodTitle }),
      h('p', { text: T.content.method }),
      ...(lang === 'en' ? v.notes.map((n) => h('p', { class: 'note', text: n })) : []), // backend notes are English-only
      h('h3', { class: 'v-sub', text: V.droppedTitle }),
      h('ul', { class: 'v-list' }, ...V.dropped.map((d) => h('li', { text: d }))),
    );

    inner.replaceChildren(
      h('h2', { text: V.title }),
      h('p', { class: 'lead', text: V.lead }),
      h('section', { class: 'card vcard v-plain' }, h('h3', { text: V.plainTitle }), h('ul', { class: 'v-list' }, ...V.plain.map((p) => h('li', { text: p })))),
      h('section', { class: 'card vcard' }, h('h3', { text: V.limitsTitle }), h('ul', { class: 'v-list' }, ...T.content.limits.map((l) => h('li', { text: l })))),
      details,
      h('section', { class: 'card vcard' }, h('h3', { text: V.sourcesTitle }), sourcesList()),
    );

    charts.push(createAreaChart(areaCanvas, area, scenes), createF1Chart(f1Canvas, v));
  }
}
