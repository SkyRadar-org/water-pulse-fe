import { getCommunes } from '../data/dataSource.ts';
import type { CommuneProps, SummaryLayer } from '../data/types.ts';
import { fold } from '../format.ts';
import { T } from '../i18n.ts';
import { CHORO_COLORS, CHORO_LABELS, NO_DATA_COLOR } from '../palette.ts';
import { set, state, subscribe, type LayerToggles, type Opacities, type State } from '../state.ts';
import { h } from './dom.ts';

type RowKey = keyof LayerToggles;

const ROWS: { key: RowKey; opacity?: keyof Opacities }[] = [
  { key: 'radar', opacity: 'radar' },
  { key: 'water', opacity: 'water' },
  { key: 'communes', opacity: 'communes' },
  { key: 'provinces' },
  { key: 'basemap' },
];

const swatch = (color: string, label: string) => h('li', {}, h('i', { class: 'sw', style: `background:${color}` }), h('span', { text: label }));

function summaryText(l: SummaryLayer): { title: string; legend: { color: string; label: string }[] } {
  const loc = T.sidebar.summary.layers[l.id];
  const legendOk = loc && loc.legend.length === l.legend.length;
  return {
    title: loc?.title ?? l.title,
    legend: l.legend.map((e, i) => ({ color: e.color, label: legendOk ? loc.legend[i] : e.label })),
  };
}

export function mountSidebar(host: HTMLElement, summaries: SummaryLayer[]): void {
  host.classList.add('sidebar');

  // ---- find a commune ----
  const listId = 'commune-names';
  const finder = h('input', { type: 'search', class: 'sb-find', placeholder: T.sidebar.findPlaceholder, list: listId, 'aria-label': T.sidebar.find, autocomplete: 'off' });
  const datalist = h('datalist', { id: listId });
  const findMsg = h('p', { class: 'note sb-find-msg', role: 'status' });
  let communes: CommuneProps[] = [];
  getCommunes()
    .then((c) => {
      communes = c.features.map((f) => f.properties);
      datalist.replaceChildren(...communes.map((p) => h('option', { value: p.name, label: p.province })));
    })
    .catch(console.error);

  function go() {
    const q = fold(finder.value.trim());
    if (!q) {
      findMsg.textContent = '';
      return;
    }
    const matches = communes.filter(c => fold(c.name).includes(q));
    const hit = communes.find((c) => fold(c.name) === q || fold(c.name).replace(/^(xa|phuong|thi tran)\s+/, '') === q) ?? (matches.length === 1 ? matches[0] : undefined);
    if (!hit) {
      findMsg.textContent = T.sidebar.findNone;
      return;
    }
    findMsg.textContent = '';
    finder.value = hit.name;
    set({ selectedCommune: hit.osm_id, flyNonce: state.flyNonce + 1 });
  }
  finder.addEventListener('change', go);
  finder.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') go();
  });
  const findSection = h('section', { class: 'sb-sec' }, h('h3', { text: T.sidebar.find }), finder, datalist, findMsg);

  // ---- layers ----
  const layerSection = h('section', { class: 'sb-sec' }, h('h3', { text: T.sidebar.layers }));
  const toggles = new Map<RowKey, HTMLInputElement>();
  const sceneControls: HTMLElement[] = [];
  const proOnly: HTMLElement[] = []; // hidden in the simple view (radar and commune fills)
  for (const row of ROWS) {
    const id = `layer-${row.key}`;
    const text = T.sidebar.rows[row.key];
    const input = h('input', { type: 'checkbox', id });
    input.addEventListener('change', () => set({ layers: { ...state.layers, [row.key]: input.checked } }));
    toggles.set(row.key, input);
    const rowEl = h('div', { class: 'sb-row' }, input, h('label', { for: id }, h('b', { text: text.label }), h('small', { text: text.hint })));
    layerSection.append(rowEl);
    if (row.key === 'radar' || row.key === 'water') sceneControls.push(rowEl);
    if (row.key === 'radar' || row.key === 'communes') proOnly.push(rowEl);
    if (row.opacity) {
      const slider = h('input', { type: 'range', min: '0', max: '100', step: '5', class: 'sb-range', 'aria-label': `${text.label}: ${T.sidebar.opacity}` });
      slider.addEventListener('input', () => set({ opacity: { ...state.opacity, [row.opacity!]: Number(slider.value) / 100 } }));
      slider.dataset.opacity = row.opacity;
      slider.value = String(Math.round(state.opacity[row.opacity] * 100));
      const sliderEl = h('div', { class: 'sb-slider' }, h('span', { text: T.sidebar.opacity }), slider);
      layerSection.append(sliderEl);
      if (row.key === 'radar' || row.key === 'water') sceneControls.push(sliderEl);
      if (row.key === 'radar' || row.key === 'communes') proOnly.push(sliderEl);
    }
  }

  // ---- season summary ----
  const summarySection = h('section', { class: 'sb-sec' }, h('h3', { text: T.sidebar.summary.title }), h('p', { class: 'note', text: T.sidebar.summary.hint }));
  summarySection.hidden = summaries.length === 0;
  const radios: { id: string | null; el: HTMLInputElement }[] = [];
  const options: { id: SummaryLayer['id'] | null; title: string }[] = [
    { id: null, title: T.sidebar.summary.off },
    ...summaries.map((l) => ({ id: l.id, title: summaryText(l).title })),
  ];
  for (const o of options) {
    const rid = `sum-${o.id ?? 'off'}`;
    const input = h('input', { type: 'radio', name: 'summary', id: rid });
    input.addEventListener('change', () => {
      if (input.checked) set({ activeSummary: o.id, playing: false });
    });
    radios.push({ id: o.id, el: input });
    summarySection.append(h('div', { class: 'sb-row' }, input, h('label', { for: rid }, h('b', { text: o.title }))));
  }

  const legend = h('section', { class: 'sb-sec sb-legend' });
  const note = h('p', { class: 'note sb-note', text: T.areaNote });
  host.append(findSection, layerSection, summarySection, legend, note);

  function renderLegend(s: State) {
    legend.replaceChildren(h('h3', { text: T.sidebar.legend.title }));
    const active = summaries.find((l) => l.id === s.activeSummary);
    if (active) {
      const t = summaryText(active);
      legend.append(h('h4', { text: t.title }), h('ul', { class: 'sb-leg' }, ...t.legend.map((l) => swatch(l.color, l.label))));
      return;
    }
    if (s.mapMode === 'latest') {
      legend.append(h('h4', { text: T.map.latestMode }),
        h('ul', { class: 'sb-leg' },
          swatch('#dc2626', T.overview.cards.highTitle + ' · ≥30%'),
          swatch('#d97706', T.overview.cards.mediumTitle + ' · 10–<30%'),
          swatch('#15803d', T.overview.cards.lowTitle + ' · <10%'),
          swatch(NO_DATA_COLOR, T.overview.cards.insufficientTitle)),
        h('p', { class: 'note', text: T.panel.observationNote }));
      return;
    }
    const water = [h('h4', { text: T.sidebar.legend.waterMap }), h('ul', { class: 'sb-leg' }, swatch('#1d4ed8', T.sidebar.legend.open))];
    if (s.viewMode === 'simple') {
      legend.append(...water);
      return;
    }
    legend.append(
      h('h4', { text: T.sidebar.legend.share }),
      h('ul', { class: 'sb-leg' }, ...CHORO_COLORS.map((c, i) => swatch(c, CHORO_LABELS[i])), swatch(NO_DATA_COLOR, T.sidebar.legend.noData)),
      ...water,
      h('p', { class: 'note', text: T.sidebar.legend.statusNote }),
    );
  }

  let lastSummary: string | null | undefined;
  let lastMode: string | undefined;
  function sync(s: State) {
    sceneControls.forEach(el => el.hidden = s.mapMode !== 'scene');
    proOnly.forEach(el => el.hidden = (s.viewMode === 'simple' && s.mapMode === 'scene') || (sceneControls.includes(el) && s.mapMode !== 'scene'));
    for (const [k, el] of toggles) el.checked = s.layers[k];
    for (const r of radios) r.el.checked = r.id === s.activeSummary;
    if (lastSummary !== s.activeSummary || lastMode !== `${s.mapMode}|${s.viewMode}`) {
      lastSummary = s.activeSummary;
      lastMode = `${s.mapMode}|${s.viewMode}`;
      renderLegend(s);
    }
  }
  subscribe(sync);
  lastSummary = undefined;
  sync(state);
}
