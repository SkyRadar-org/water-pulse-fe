import Papa from 'papaparse';
import { createCommuneChart, type CommuneChartHandle } from '../charts/communeChart.ts';
import { getCommuneSeries, getCommunes } from '../data/dataSource.ts';
import type { CommuneProps, Scene, SeriesPoint, Track } from '../data/types.ts';
import { downloadText, fmtDate, fmtPct } from '../format.ts';
import { T } from '../i18n.ts';
import { STATUS_ICON, STATUS_LABEL } from '../palette.ts';
import { set, state, subscribe } from '../state.ts';
import { h } from './dom.ts';

export const slug = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function mountCommunePanel(host: HTMLElement, scenes: Scene[]): void {
  host.classList.add('commune-panel');
  host.setAttribute('role', 'complementary');
  host.setAttribute('aria-label', T.panel.region);

  const maturityOf = (date: string, track: Track) => scenes.find((s) => s.date === date && s.track === track)?.maturity;
  let chart: CommuneChartHandle | null = null;
  let token = 0;

  const close = () => set({ selectedCommune: null });

  function stat(label: string, value: string, sub?: string) {
    return h('div', { class: 'cp-stat' }, h('span', { class: 'cp-stat-label', text: label }), h('b', { text: value }), sub ? h('small', { text: sub }) : null);
  }

  function csvOf(props: CommuneProps, series: SeriesPoint[]) {
    const rows = [...series].sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track)).map((p) => ({
      commune: props.name,
      province: props.province,
      date: p.date,
      track: p.track,
      maturity: maturityOf(p.date, p.track) ?? '',
      water_pct: p.water_pct,
      water_km2: p.water_km2,
      valid_km2: p.valid_km2,
    }));
    downloadText(`water-pulse_${slug(props.name)}_series.csv`, Papa.unparse(rows));
  }

  function plainSummary(p: CommuneProps): string {
    return T.panel.summary(p, {
      first: p.first_flood_date ? fmtDate(p.first_flood_date) : '—',
      peak: fmtDate(p.peak_date),
      last: fmtDate(p.last_date),
      rec: p.recession_date ? fmtDate(p.recession_date) : '—',
      recBeforeSowing: !!p.recession_date && p.recession_date < '2026-11-01',
    });
  }

  async function show(osmId: string) {
    const my = ++token;
    chart?.destroy();
    chart = null;
    host.classList.add('open');
    host.replaceChildren(h('div', { class: 'loading', text: T.panel.loading }));
    try {
      const [collection, series] = await Promise.all([getCommunes(), getCommuneSeries(osmId)]);
      if (my !== token) return;
      const p = collection.features.find((f) => f.properties.osm_id === osmId)?.properties;
      if (!p) throw new Error(`Commune ${osmId} not found`);

      const closeBtn = h('button', { class: 'cp-close', type: 'button', 'aria-label': T.panel.close, title: T.panel.close }, '✕');
      closeBtn.addEventListener('click', close);
      const csvBtn = h('button', { class: 'btn', type: 'button', text: T.panel.download });
      csvBtn.addEventListener('click', () => csvOf(p, series));
      const canvas = h('canvas', { 'aria-label': T.panel.chartAria(p.name), role: 'img' });

      host.replaceChildren(
        h('div', { class: 'cp-head' }, h('div', {}, h('h2', { text: p.name }), h('div', { class: 'cp-prov', text: p.province })), closeBtn),
        h('div', { class: 'cp-status' }, h('span', { class: `chip ${p.status}`, text: `${STATUS_ICON(p.status)} ${STATUS_LABEL(p.status)}` })),
        h('p', { class: 'cp-plain', text: plainSummary(p) }),
        h(
          'div',
          { class: 'cp-stats' },
          stat(T.panel.first, p.first_flood_date ? fmtDate(p.first_flood_date) : '—', T.panel.firstHint),
          stat(T.panel.peak, fmtPct(p.peak_pct), fmtDate(p.peak_date)),
          stat(T.panel.drained, p.recession_date ? fmtDate(p.recession_date) : T.panel.notYet, p.recession_date ? T.panel.belowHalf : T.panel.asOfLast),
          stat(T.panel.last, fmtPct(p.last_pct), fmtDate(p.last_date)),
        ),
        h('div', { class: 'cp-chart' }, canvas),
        h('p', { class: 'note', text: T.panel.note(p.max_flooded_km2, p.valid_km2) }),
        h('div', { class: 'cp-actions' }, csvBtn),
      );
      chart = createCommuneChart(canvas, series, maturityOf, state.selectedDate, (date, track) => {
        set({ selectedDate: date, selectedTrack: track, trackFilter: state.trackFilter === 'all' ? 'all' : track });
      });
    } catch (err) {
      console.error(err);
      if (my === token) host.replaceChildren(h('div', { class: 'error-box', text: err instanceof Error ? err.message : T.app.loadError }));
    }
  }

  subscribe((s, prev) => {
    if (s.selectedCommune !== prev.selectedCommune) {
      if (s.selectedCommune) void show(s.selectedCommune);
      else {
        token++;
        chart?.destroy();
        chart = null;
        host.classList.remove('open');
      }
    } else if (s.selectedDate !== prev.selectedDate) {
      chart?.setSelectedDate(s.selectedDate);
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && state.selectedCommune && state.tab === 'map') close();
  });

  if (state.selectedCommune) void show(state.selectedCommune);
}
