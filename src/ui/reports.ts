import Papa from 'papaparse';
import type { Chart } from 'chart.js';
import { createDurationChart, createMonthChart, createProvinceChart, createSceneChart, createTrendChart, monthLabel, monthName, monthShort } from '../charts/reportCharts.ts';
import { getChoropleth, getCommunes, getScenes } from '../data/dataSource.ts';
import { computeReport, DURATION_BINS, sceneKey, type CommuneStat, type Report, type ReportFilter, computeTrend } from '../data/reportStats.ts';
import type { Choropleth, CommuneProps, Scene, Track } from '../data/types.ts';
import { downloadText, fmtDate, fmtNum, fmtPct, fmtShort, fold } from '../format.ts';
import { T } from '../i18n.ts';
import { set, state } from '../state.ts';
import { slug } from './communePanel.ts';
import { h } from './dom.ts';
import { icon } from './icons.ts';

type SortKey = 'name' | 'province' | 'obs' | 'max' | 'mean' | 'highCount' | 'first' | 'days';
const COLS: { key: SortKey; numeric?: boolean }[] = [
  { key: 'name' },
  { key: 'province' },
  { key: 'obs', numeric: true },
  { key: 'max', numeric: true },
  { key: 'mean', numeric: true },
  { key: 'highCount', numeric: true },
  { key: 'first' },
  { key: 'days', numeric: true },
];
const INITIAL_ROWS = 15;
const TRACKS: Track[] = ['047D', '083A', '148D'];

function sortValue(c: CommuneStat, k: SortKey): string | number | null {
  switch (k) {
    case 'name':
      return c.p.name;
    case 'province':
      return c.p.province;
    case 'obs':
      return c.obs;
    case 'max':
      return c.max;
    case 'mean':
      return c.mean;
    case 'highCount':
      return c.highCount;
    case 'first':
      return c.p.first_flood_date;
    case 'days':
      return c.floodDays;
  }
}

function compare(a: CommuneStat, b: CommuneStat, k: SortKey, dir: 1 | -1): number {
  const av = sortValue(a, k);
  const bv = sortValue(b, k);
  // Missing values stay last in both directions.
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
  return String(av).localeCompare(String(bv), 'vi') * dir;
}

function skeleton(): HTMLElement {
  const bar = (cls: string) => h('div', { class: `rp-skel ${cls}`, 'aria-hidden': 'true' });
  return h(
    'div',
    { class: 'rp-skeleton', role: 'status', 'aria-live': 'polite' },
    h('p', { class: 'rp-loading-text', text: T.reports.loading }),
    h('div', { class: 'rp-kpis' }, bar('kpi'), bar('kpi'), bar('kpi'), bar('kpi')),
    bar('chart'),
    h('div', { class: 'rp-grid2' }, bar('chart-sm'), bar('chart-sm')),
  );
}

export function mountReports(host: HTMLElement): void {
  host.classList.add('page', 'rp-page');
  const inner = h('div', { class: 'page-inner rp-inner' });
  host.replaceChildren(inner);

  const load = () => {
    inner.replaceChildren(skeleton());
    Promise.all([getCommunes(), getScenes()])
      .then(async ([collection, scenes]) => {
        const entries = await Promise.all(scenes.map(async (s) => [sceneKey(s.date, s.track), await getChoropleth(s.date, s.track)] as const));
        build(inner, collection.features.map((f) => f.properties), scenes, new Map<string, Choropleth>(entries));
      })
      .catch((err: unknown) => {
        console.error(err);
        const retry = h('button', { type: 'button', class: 'btn', text: T.app.retry });
        retry.addEventListener('click', load);
        inner.replaceChildren(h('div', { class: 'error-box rp-error', role: 'alert' }, h('p', { text: T.reports.loadError }), h('p', { class: 'note', text: err instanceof Error ? err.message : '' }), retry));
      });
  };
  load();
}

function build(root: HTMLElement, all: CommuneProps[], scenes: Scene[], choro: Map<string, Choropleth>): void {
  const R = T.reports;
  const dates = [...new Set(scenes.map((s) => s.date))].sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
  const provinces = [...new Set(all.map((c) => c.province))].sort((a, b) => a.localeCompare(b, 'vi'));

  let filter: ReportFilter = { from: first, to: last, province: '', track: 'all' };
  let sortKey: SortKey = 'max';
  let sortDir: 1 | -1 = -1;
  let query = '';
  let expanded = false;
  let charts: Chart[] = [];
  let report: Report;

  // ---------- header + export ----------
  const status = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const exportMenu = h('details', { class: 'rp-export' });
  const exportSummary = h('summary', { class: 'rp-btn rp-btn-primary', 'aria-label': R.exportAria }, icon('download'), h('span', { text: R.export }), icon('chevronDown', 14));
  const menuItem = (label: string, ic: Parameters<typeof icon>[0], run: () => void) => {
    const b = h('button', { type: 'button', class: 'rp-menu-item', role: 'menuitem' }, icon(ic), h('span', { text: label }));
    b.addEventListener('click', () => {
      exportMenu.open = false;
      run();
    });
    return b;
  };
  exportMenu.append(
    exportSummary,
    h(
      'div',
      { class: 'rp-menu', role: 'menu' },
      menuItem(R.exportProvince, 'file', () => exportProvinces()),
      menuItem(R.exportScenes, 'file', () => exportScenes()),
      menuItem(R.exportCommunes, 'file', () => exportCommunes()),
      h('hr'),
      menuItem(R.exportPrint, 'printer', () => window.print()),
      h('p', { class: 'rp-menu-hint', text: R.exportHint }),
    ),
  );
  document.addEventListener('pointerdown', (ev) => {
    if (exportMenu.open && !exportMenu.contains(ev.target as Node)) exportMenu.open = false;
  });
  exportMenu.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && exportMenu.open) {
      exportMenu.open = false;
      exportSummary.focus();
    }
  });

  const head = h(
    'header',
    { class: 'rp-head' },
    h('div', { class: 'rp-head-text' }, h('h1', { class: 'rp-title', text: R.title }), h('p', { class: 'rp-lead', text: R.lead })),
    exportMenu,
  );
  const printMeta = h('p', { class: 'rp-print-meta' });

  // ---------- filters ----------
  const field = (label: string, control: HTMLElement, cls = '') => h('label', { class: `rp-field ${cls}` }, h('span', { class: 'rp-field-label', text: label }), control);
  const periodSel = h(
    'select',
    {},
    h('option', { value: 'all', text: R.periodAll(fmtDate(first), fmtDate(last)) }),
    h('optgroup', { label: R.periodMonthGroup }, ...months.map((m) => h('option', { value: `m:${m}`, text: R.periodMonth(monthLabel(m)) }))),
    h('option', { value: 'custom', text: R.periodCustom }),
  );
  const dateOptions = () => dates.map((d) => h('option', { value: d, text: fmtDate(d) }));
  const fromSel = h('select', {}, ...dateOptions());
  const toSel = h('select', {}, ...dateOptions());
  fromSel.value = first;
  toSel.value = last;
  const fromField = field(R.from, fromSel, 'rp-custom');
  const toField = field(R.to, toSel, 'rp-custom');
  fromField.hidden = toField.hidden = true;
  const provSel = h('select', {}, h('option', { value: '', text: R.allProvinces }), ...provinces.map((p) => h('option', { value: p, text: p })));
  const trackSel = h('select', {}, h('option', { value: 'all', text: R.allTracks }), ...TRACKS.map((t) => h('option', { value: t, text: R.trackOption(t) })));
  const scopeLine = h('p', { class: 'rp-scope', role: 'status', 'aria-live': 'polite' });
  const resetBtn = h('button', { type: 'button', class: 'rp-btn rp-reset', text: R.resetFilters });
  const filters = h(
    'form',
    { class: 'rp-filters', 'aria-label': R.filtersAria },
    h('div', { class: 'rp-filter-row' }, field(R.period, periodSel, 'rp-field-period'), fromField, toField, field(R.province, provSel), field(R.track, trackSel), resetBtn),
    scopeLine,
    h('p', { class: 'rp-hint', text: R.orbitHint }),
  );
  filters.addEventListener('submit', (ev) => ev.preventDefault());
  resetBtn.addEventListener('click', () => {
    periodSel.value = 'all';
    provSel.value = '';
    trackSel.value = 'all';
    filter = { from: first, to: last, province: '', track: 'all' };
    applyPeriod();
    render();
  });

  const content = h('div', { class: 'rp-content' });
  root.replaceChildren(head, printMeta, filters, content, status);

  function applyPeriod() {
    const v = periodSel.value;
    const custom = v === 'custom';
    fromField.hidden = toField.hidden = !custom;
    if (v === 'all') filter = { ...filter, from: first, to: last };
    else if (v.startsWith('m:')) {
      const m = v.slice(2);
      filter = { ...filter, from: `${m}-01`, to: `${m}-31` };
    } else {
      let from = fromSel.value;
      let to = toSel.value;
      if (from > to) [from, to] = [to, from];
      filter = { ...filter, from, to };
    }
  }
  periodSel.addEventListener('change', () => {
    applyPeriod();
    render();
  });
  fromSel.addEventListener('change', () => {
    applyPeriod();
    render();
  });
  toSel.addEventListener('change', () => {
    applyPeriod();
    render();
  });
  provSel.addEventListener('change', () => {
    filter = { ...filter, province: provSel.value };
    render();
  });
  trackSel.addEventListener('change', () => {
    filter = { ...filter, track: trackSel.value as ReportFilter['track'] };
    render();
  });

  // ---------- helpers ----------
  const periodText = () => {
    const from = report.scenes[0]?.date ?? filter.from;
    const to = report.scenes.at(-1)?.date ?? filter.to;
    return periodSel.value.startsWith('m:') ? monthLabel(periodSel.value.slice(2)) : `${fmtDate(from)} – ${fmtDate(to)}`;
  };
  const fileBase = () =>
    ['water-pulse', slug(R.title), filter.from, filter.to, filter.province ? slug(filter.province) : null, filter.track !== 'all' ? filter.track : null].filter(Boolean).join('_');
  const save = (suffix: string, rows: Record<string, unknown>[]) => {
    const name = `${fileBase()}_${suffix}.csv`;
    downloadText(name, Papa.unparse(rows));
    status.textContent = R.exported(name);
  };

  function exportProvinces() {
    save(
      'tinh',
      report.provinces.map((p) => ({
        province: p.province,
        communes: p.communes,
        observed_in_period: p.observed,
        max_ge30: p.high,
        max_10_30: p.medium,
        max_lt10: p.low,
        no_observation: p.noObs,
        mean_max_pct: p.meanMax === null ? '' : Math.round(p.meanMax * 10) / 10,
        period_from: filter.from,
        period_to: filter.to,
        track: filter.track,
      })),
    );
  }
  function exportScenes() {
    save(
      'lan-chup',
      report.scenes.map((s) => ({ date: s.date, track: s.track, maturity: s.maturity, observed: s.observed, ge30: s.high, from10_to30: s.medium, lt10: s.low, not_in_image: s.missing })),
    );
  }
  function exportCommunes() {
    save(
      'xa',
      sortedRows().map((c) => ({
        commune: c.p.name,
        province: c.p.province,
        osm_id: c.p.osm_id,
        images_in_period: c.obs,
        max_pct: c.max ?? '',
        max_date: c.maxDate ?? '',
        max_track: c.maxTrack ?? '',
        mean_pct: c.mean === null ? '' : Math.round(c.mean * 10) / 10,
        times_ge30: c.highCount,
        first_flood_date: c.p.first_flood_date ?? '',
        peak_pct_season: c.p.peak_pct ?? '',
        peak_date_season: c.p.peak_date ?? '',
        below_half_peak_date: c.p.recession_date ?? '',
        flood_days: c.floodDays ?? '',
        still_wet_at_last_image: c.floodDays === null ? '' : c.floodOngoing,
        last_pct: c.p.last_pct ?? '',
        last_date: c.p.last_date ?? '',
        coverage_sufficient: c.p.coverage_sufficient ?? '',
      })),
    );
  }

  function chartBlock(opts: { title: string; note: string; aria: string; height: number; file: string; cls?: string; table?: HTMLElement }) {
    const canvas = h('canvas', { role: 'img', 'aria-label': opts.aria });
    const png = h('button', { type: 'button', class: 'rp-icon-btn', title: R.downloadChart, 'aria-label': `${R.downloadChart}: ${opts.title}` }, icon('image'));
    const section = h(
      'section',
      { class: `rp-block ${opts.cls ?? ''}` },
      h('div', { class: 'rp-block-head' }, h('h2', { text: opts.title }), png),
      h('p', { class: 'rp-note', text: opts.note }),
      h('div', { class: 'rp-chart', style: `height:${opts.height}px` }, canvas),
      opts.table ? h('details', { class: 'rp-data' }, h('summary', { text: R.viewTable }), opts.table) : null,
    );
    return { section, canvas, png, file: opts.file };
  }
  const bindPng = (btn: HTMLButtonElement, chart: Chart, file: string) =>
    btn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = chart.toBase64Image('image/png', 1);
      a.download = `${fileBase()}_${file}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      status.textContent = R.exported(a.download);
    });

  const simpleTable = (cols: string[], rows: (string | number)[][], numericFrom = 1) =>
    h(
      'div',
      { class: 'rp-table-wrap' },
      h(
        'table',
        { class: 'rp-table' },
        h('thead', {}, h('tr', {}, ...cols.map((c, i) => h('th', { scope: 'col', class: i >= numericFrom ? 'num' : '', text: c })))),
        h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((v, i) => (i === 0 ? h('th', { scope: 'row', text: String(v) }) : h('td', { class: i >= numericFrom ? 'num' : '', text: typeof v === 'number' ? fmtNum(v) : v })))))),
      ),
    );

  function openScene(date: string, track: Track) {
    set({ tab: 'map', mapMode: 'scene', selectedDate: date, selectedTrack: track, trackFilter: 'all', activeSummary: null, playing: false });
    location.hash = 'map';
  }
  function openCommune(p: CommuneProps) {
    set({ tab: 'map', mapMode: 'latest', activeSummary: null, playing: false, selectedCommune: p.osm_id, flyNonce: state.flyNonce + 1 });
    location.hash = 'map';
  }

  // ---------- commune table ----------
  const search = h('input', { type: 'search', class: 'rp-search', placeholder: R.search, 'aria-label': R.searchAria });
  const count = h('span', { class: 'rp-count' });
  const thead = h('thead');
  const tbody = h('tbody');
  const moreBtn = h('button', { type: 'button', class: 'rp-btn' });
  const tableSection = h(
    'section',
    { class: 'rp-block' },
    h('div', { class: 'rp-block-head' }, h('h2', { text: R.tableTitle })),
    h('p', { class: 'rp-note', text: R.tableNote }),
    h('div', { class: 'rp-table-tools' }, search, count),
    h('div', { class: 'rp-table-wrap rp-table-scroll' }, h('table', { class: 'rp-table rp-table-communes' }, thead, tbody)),
    h('div', { class: 'rp-more' }, moreBtn),
  );
  search.addEventListener('input', () => {
    query = search.value;
    expanded = false;
    renderTable();
  });
  moreBtn.addEventListener('click', () => {
    expanded = !expanded;
    renderTable();
  });

  function sortedRows(): CommuneStat[] {
    const q = fold(query.trim());
    return report.communes
      .filter((c) => !q || fold(c.p.name).includes(q))
      .sort((a, b) => compare(a, b, sortKey, sortDir) || a.p.name.localeCompare(b.p.name, 'vi'));
  }

  function renderHead() {
    const tr = h('tr');
    for (const col of COLS) {
      const active = sortKey === col.key;
      const btn = h(
        'button',
        { type: 'button', class: 'rp-sort' },
        h('span', { text: R.cols[col.key] }),
        icon(active ? (sortDir === 1 ? 'arrowUp' : 'arrowDown') : 'sort', 13),
        active ? h('span', { class: 'sr-only', text: sortDir === 1 ? R.sortAsc : R.sortDesc }) : null,
      );
      btn.addEventListener('click', () => {
        if (sortKey === col.key) sortDir = sortDir === 1 ? -1 : 1;
        else {
          sortKey = col.key;
          sortDir = col.numeric ? -1 : 1;
        }
        renderTable();
      });
      tr.append(h('th', { scope: 'col', class: `${col.numeric ? 'num' : ''} ${active ? 'is-sorted' : ''}`, 'aria-sort': active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none' }, btn));
    }
    thead.replaceChildren(tr);
  }

  function levelCell(v: number | null, sub?: string): HTMLElement {
    if (v === null) return h('td', { class: 'num rp-muted', text: '—' });
    const cls = v >= 30 ? 'high' : v >= 10 ? 'medium' : 'low';
    return h('td', { class: 'num' }, h('span', { class: `rp-level rp-level-${cls}`, text: fmtPct(Math.round(v * 10) / 10) }), sub ? h('small', { text: sub }) : null);
  }

  function renderTable() {
    renderHead();
    const rows = sortedRows();
    const visible = expanded ? rows : rows.slice(0, INITIAL_ROWS);
    count.textContent = R.count(visible.length, rows.length);
    tbody.replaceChildren(
      ...visible.map((c) => {
        const tr = h(
          'tr',
          { tabindex: '0', 'aria-label': R.rowAria(c.p.name) },
          h('th', { scope: 'row' }, h('span', { text: c.p.name })),
          h('td', { text: c.p.province }),
          h('td', { class: 'num', text: fmtNum(c.obs) }),
          levelCell(c.max, c.maxDate && c.maxTrack ? `${fmtShort(c.maxDate)} · ${c.maxTrack}` : undefined),
          c.mean === null ? h('td', { class: 'num rp-muted', text: '—' }) : h('td', { class: 'num', text: fmtPct(Math.round(c.mean * 10) / 10) }),
          h('td', { class: 'num', text: c.obs ? fmtNum(c.highCount) : '—' }),
          h('td', { text: c.p.first_flood_date ? fmtDate(c.p.first_flood_date) : '—' }),
          c.floodDays === null
            ? h('td', { class: 'num rp-muted', text: '—' })
            : h('td', { class: 'num', title: c.floodOngoing ? R.ongoingTip : undefined, text: c.floodOngoing ? R.ongoingDays(c.floodDays) : fmtNum(c.floodDays) }),
        );
        tr.addEventListener('click', () => openCommune(c.p));
        tr.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            openCommune(c.p);
          }
        });
        return tr;
      }),
    );
    if (!rows.length) tbody.append(h('tr', {}, h('td', { colspan: String(COLS.length), class: 'rp-empty', text: R.empty })));
    moreBtn.parentElement!.hidden = rows.length <= INITIAL_ROWS;
    moreBtn.textContent = expanded ? R.showLess : R.showAll(rows.length);
  }

  // ---------- render ----------
  function render() {
    charts.forEach((c) => c.destroy());
    charts = [];
    report = computeReport(all, scenes, choro, filter);
    const t = report.totals;
    const fromTxt = fmtDate(report.scenes[0]?.date ?? filter.from);
    const toTxt = fmtDate(report.scenes.at(-1)?.date ?? filter.to);
    scopeLine.textContent = R.scopeLine(t.acquisitions, fromTxt, toTxt, t.communes);
    printMeta.textContent = `${R.printScope(periodText(), filter.province || R.allProvinces, filter.track === 'all' ? R.allTracks : filter.track)} · ${R.printedOn(fmtDate(new Date().toISOString().slice(0, 10)))}`;

    if (!report.scenes.length) {
      content.replaceChildren(h('div', { class: 'rp-empty-state', role: 'status' }, h('p', { text: R.noScenes })));
      return;
    }

    const kpi = (label: string, value: string, sub: string) => h('div', { class: 'rp-kpi' }, h('dt', { text: label }), h('dd', {}, h('strong', { text: value }), h('span', { text: sub })));
    const highShare = t.observed ? `${fmtNum(Math.round((t.everHigh / t.observed) * 100))}%` : '—';
    const kpis = h(
      'dl',
      { class: 'rp-kpis', 'aria-label': R.kpiAria },
      kpi(R.kpiAcq, fmtNum(t.acquisitions), R.kpiAcqSub(t.validated)),
      kpi(R.kpiObserved, fmtNum(t.observed), R.kpiObservedSub(t.communes)),
      kpi(R.kpiHigh, fmtNum(t.everHigh), R.kpiHighSub(highShare)),
      t.busiest ? kpi(R.kpiBusiest, fmtNum(t.busiest.high), R.kpiBusiestSub(fmtDate(t.busiest.date), t.busiest.track)) : kpi(R.kpiBusiest, R.kpiNone, ''),
    );

    const sceneB = chartBlock({
      title: R.scenesTitle,
      note: R.scenesNote,
      aria: R.scenesAria,
      height: 320,
      file: 'lan-chup',
      table: simpleTable(
        [R.acquisition, R.seriesHigh, R.seriesMedium, R.seriesLow, R.seriesMissing],
        report.scenes.map((s) => [R.sceneLabel(fmtDate(s.date), s.track), s.high, s.medium, s.low, s.missing]),
      ),
    });
    const monthB = chartBlock({
      title: R.monthsTitle,
      note: R.monthsNote,
      aria: R.monthsAria,
      height: 260,
      file: 'lich-ngap',
      table: simpleTable(['', R.seriesOnset, R.seriesPeak, R.seriesRecession], report.months.map((m) => [monthLabel(m.month), m.onset, m.peak, m.recession])),
    });
    const durB = chartBlock({
      title: R.durationTitle,
      note: R.durationNote(report.neverFlooded),
      aria: R.durationAria,
      height: 260,
      file: 'thoi-gian-ngap',
      table: simpleTable(['', R.seriesDone, R.seriesOngoing], DURATION_BINS.map((b) => [R.durationBins[b], report.duration[b].done, report.duration[b].ongoing])),
    });
    const P = R.provCols;
    const provB = chartBlock({
      title: R.provinceTitle,
      note: R.provinceNote,
      aria: R.provinceAria,
      height: Math.max(140, report.provinces.length * 46 + 70),
      file: 'tinh',
    });
    provB.section.append(
      simpleTable(
        [P.province, P.communes, P.observed, P.high, P.medium, P.low, P.meanMax],
        report.provinces.map((p) => [p.province, p.communes, p.observed, p.high, p.medium, p.low, p.meanMax === null ? '—' : fmtPct(Math.round(p.meanMax * 10) / 10)]),
      ),
    );

    // ---------- plain-language trend first; per-image detail goes into a collapsed section ----------
    const trend = computeTrend(report);
    const pct = (v: number) => fmtPct(Math.round(v));
    const phase = (cls: string, mark: string, title: string, body: string, extra?: string) =>
      h('div', { class: `rp-phase ${cls}` }, h('span', { class: 'rp-phase-mark', 'aria-hidden': 'true', text: mark }), h('div', {}, h('h3', { text: title }), h('p', { text: body }), extra ? h('p', { class: 'rp-phase-extra', text: extra }) : null));
    const phases = h('div', { class: 'rp-phases' });
    if (trend.peak && trend.latest && trend.latestTrackPeak) {
      phases.append(
        phase('rise', '↑', R.phaseRiseTitle, trend.onsetMonth ? R.phaseRise(monthName(trend.onsetMonth.month), trend.onsetMonth.onset) : R.phaseNone),
        phase('peak', '▲', R.phasePeakTitle, R.phasePeak(fmtDate(trend.peak.date), pct(trend.peak.share), trend.peak.track)),
        phase('fall', '↓', R.phaseFallTitle, trend.recessionMonth ? R.phaseFall(monthName(trend.recessionMonth.month), trend.recessionMonth.recession) : R.phaseNone, R.phaseStill(trend.stillWet)),
        phase(`now ${trend.direction}`, '●', R.phaseNowTitle, R.phaseNow(trend.direction, fmtDate(trend.latest.date), trend.latest.track, pct(trend.latest.share), pct(trend.latestTrackPeak.share))),
      );
    }
    const trendB = chartBlock({ title: R.trendTitle, note: R.trendNote, aria: R.trendAria, height: 300, file: 'xu-huong', cls: 'rp-trend' });
    const trendHead = trendB.section.querySelector('.rp-block-head')!;
    trendHead.after(h('p', { class: `rp-headline ${trend.direction}`, text: R.trendHeadline[trend.direction] }), h('p', { class: 'rp-lead-sm', text: R.trendLead }), phases);

    const takeaway = (text: string) => h('p', { class: 'rp-takeaway' }, h('b', { text: `${R.takeaway}: ` }), text);
    if (trend.onsetMonth) monthB.section.querySelector('.rp-block-head')!.after(takeaway(R.monthsTake(monthName(trend.onsetMonth.month), trend.recessionMonth ? monthName(trend.recessionMonth.month) : null)));
    const topBin = DURATION_BINS.reduce((a, b) => (report.duration[b].done + report.duration[b].ongoing > report.duration[a].done + report.duration[a].ongoing ? b : a));
    const topBinN = report.duration[topBin].done + report.duration[topBin].ongoing;
    if (topBinN) durB.section.querySelector('.rp-block-head')!.after(takeaway(R.durationTake(R.durationBins[topBin], topBinN, trend.stillWet)));
    const topProv = report.provinces.filter((p) => p.observed >= 3).reduce<(typeof report.provinces)[number] | null>((a, p) => (!a || p.high / p.observed > a.high / a.observed ? p : a), null);
    if (topProv && report.provinces.length > 1) provB.section.querySelector('.rp-block-head')!.after(takeaway(R.provinceTake(topProv.province, pct((topProv.high / topProv.observed) * 100))));

    const details = h('details', { class: 'rp-details' }, h('summary', { text: R.detailsTitle }), sceneB.section);
    details.addEventListener('toggle', () => requestAnimationFrame(resizeAll));
    content.replaceChildren(trendB.section, kpis, h('div', { class: 'rp-grid2' }, monthB.section, durB.section), provB.section, details, tableSection);

    const tc = trend.points.length ? createTrendChart(trendB.canvas, trend, (d, tr) => openScene(d, tr)) : null;
    if (!tc) trendB.section.querySelector('.rp-chart')?.remove();
    const sc = createSceneChart(sceneB.canvas, report.scenes, (s) => openScene(s.date, s.track));
    const mc = createMonthChart(monthB.canvas, report.months, monthShort);
    const dc = createDurationChart(durB.canvas, report.duration);
    const pc = createProvinceChart(provB.canvas, report.provinces);
    charts = [sc, mc, dc, pc];
    if (tc) {
      charts.push(tc as unknown as Chart);
      bindPng(trendB.png, tc as unknown as Chart, trendB.file);
    } else trendB.png.remove();
    bindPng(sceneB.png, sc, sceneB.file);
    bindPng(monthB.png, mc, monthB.file);
    bindPng(durB.png, dc, durB.file);
    bindPng(provB.png, pc, provB.file);

    renderTable();
  }

  // Charts sized while the tab was hidden need a resize once the tab is shown or printed.
  const resizeAll = () => charts.forEach((c) => c.resize());
  let printExpanded = false;
  window.addEventListener('hashchange', () => requestAnimationFrame(resizeAll));
  window.addEventListener('beforeprint', () => {
    if (state.tab === 'reports' && !expanded) {
      expanded = printExpanded = true;
      renderTable();
    }
    resizeAll();
  });
  window.addEventListener('afterprint', () => {
    if (printExpanded) {
      expanded = printExpanded = false;
      renderTable();
    }
    resizeAll();
  });

  render();
}
