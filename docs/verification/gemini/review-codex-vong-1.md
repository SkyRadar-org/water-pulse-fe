Vòng 2 Codex phản biện Gemini. Không dùng tool, không thay file. Bản vá và kết quả thực thi dưới đây. Hãy duyệt lại cụ thể, verdict PASS/REQUEST_CHANGES/INCONCLUSIVE, chỉ nêu blocker có chứng cứ. Sửa 3 cách diễn đạt ở vòng 1: (1) Object.hasOwn là bảo vệ lookup manifest, không đủ chứng minh chống toàn bộ prototype pollution; (2) bạn không có mã gibs.ts ở vòng 1, không được nói VERIFIED maxzoom hoặc đoán mapView.ts, chính xác nằm src/map/gibs.ts và source trong layers.ts; (3) bạn không trực tiếp đọc toàn bộ dist nên chỉ PASS tĩnh template, runtime do Codex chứng minh. Backend 11 test pass; build:cloudflare thành công xuất179 API,33 scenes,140 communes,333 files largest2692266B; Worker4/4pass sau rebuild. Chưa deploy. Cần xác nhận giới hạn audit.

FILE src/ui/communeTable.ts
import Papa from 'papaparse';
import { getCommunes } from '../data/dataSource.ts';
import type { CommuneProps, CommuneStatus } from '../data/types.ts';
import { downloadText, fmtDate, fmtPct, fold } from '../format.ts';
import { T } from '../i18n.ts';
import { STATUS_ICON, STATUS_LABEL, STATUS_SHORT } from '../palette.ts';
import { set, state } from '../state.ts';
import { h } from './dom.ts';

type SortKey = 'name' | 'province' | 'peak_pct' | 'peak_date' | 'first_flood_date' | 'recession_date' | 'last_pct' | 'status';

const COLUMNS: { key: SortKey; numeric?: boolean }[] = [
  { key: 'name' },
  { key: 'province' },
  { key: 'peak_pct', numeric: true },
  { key: 'peak_date' },
  { key: 'first_flood_date' },
  { key: 'recession_date' },
  { key: 'last_pct', numeric: true },
  { key: 'status' },
];

const STATUS_ORDER: Record<CommuneStatus, number> = { not_receded: 0, uncertain: 1, receded: 2, no_flood: 3 };

function cmp(a: CommuneProps, b: CommuneProps, key: SortKey, direction: 1 | -1): number {
  if (key === 'status') return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * direction;
  const av = a[key];
  const bv = b[key];
  // [Codex] Missing observations stay last in both sort directions.
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
  return String(av).localeCompare(String(bv), 'vi') * direction;
}

export function mountCommuneTable(host: HTMLElement): void {
  host.classList.add('page');
  const inner = h('div', { class: 'page-inner' });
  host.append(inner);
  inner.append(h('div', { class: 'loading', text: T.table.loading }));

  getCommunes()
    .then((c) => build(inner, c.features.map((f) => f.properties)))
    .catch((err: unknown) => {
      console.error(err);
      inner.replaceChildren(h('div', { class: 'error-box', text: err instanceof Error ? err.message : T.app.loadError }));
    });
}

function build(root: HTMLElement, all: CommuneProps[]): void {
  let sortKey: SortKey = 'last_pct';
  let sortDir: 1 | -1 = -1;
  let query = '';
  let province = '';
  let status = '';

  const search = h('input', { type: 'search', placeholder: T.table.search, 'aria-label': T.table.searchAria });
  const provSel = h('select', { 'aria-label': T.table.provinceAria }, h('option', { value: '', text: T.table.allProvinces }), ...[...new Set(all.map((c) => c.province))].sort().map((p) => h('option', { value: p, text: p })));
  const statSel = h(
    'select',
    { 'aria-label': T.table.statusAria },
    h('option', { value: '', text: T.table.allStatuses }),
    ...(Object.keys(STATUS_ORDER) as CommuneStatus[]).sort((a, b) => STATUS_ORDER[a] - STATUS_ORDER[b]).map((s) => h('option', { value: s, text: STATUS_LABEL(s) })),
  );
  const exportBtn = h('button', { class: 'btn', type: 'button', text: T.table.export });
  const count = h('span', { class: 'note ct-count' });
  const thead = h('thead');
  const tbody = h('tbody');
  const table = h('table', { class: 'ct' }, thead, tbody);

  root.replaceChildren(
    h('h2', { text: T.table.title }),
    h('p', { class: 'lead', text: T.table.lead }),
    h('div', { class: 'ct-tools' }, search, provSel, statSel, count, h('div', { class: 'tl-spacer' }), exportBtn),
    h('div', { class: 'ct-wrap' }, table),
  );

  const rows = () => {
    const q = fold(query.trim());
    return all
      .filter((c) => (!province || c.province === province) && (!status || c.status === status) && (!q || fold(c.name).includes(q)))
      .sort((a, b) => cmp(a, b, sortKey, sortDir) || a.name.localeCompare(b.name, 'vi'));
  };

  function renderHead() {
    const tr = h('tr');
    for (const col of COLUMNS) {
      const active = sortKey === col.key;
      const btn = h('button', { type: 'button', text: T.table.cols[col.key] + (active ? (sortDir === 1 ? ' ▲' : ' ▼') : '') });
      btn.addEventListener('click', () => {
        if (sortKey === col.key) sortDir = sortDir === 1 ? -1 : 1;
        else {
          sortKey = col.key;
          sortDir = col.numeric ? -1 : 1;
        }
        render();
      });
      tr.append(h('th', { scope: 'col', class: col.numeric ? 'num' : '', 'aria-sort': active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none' }, btn));
    }
    thead.replaceChildren(tr);
  }

  function open(c: CommuneProps) {
    set({ tab: 'map', selectedCommune: c.osm_id, flyNonce: state.flyNonce + 1 });
    location.hash = 'map';
  }

  function render() {
    renderHead();
    const list = rows();
    count.textContent = T.table.count(list.length, all.length);
    tbody.replaceChildren(
      ...list.map((c) => {
        const tr = h(
          'tr',
          { tabindex: '0', 'aria-label': T.table.row(c.name, STATUS_LABEL(c.status)) },
          h('td', {}, h('b', { text: c.name })),
          h('td', { text: c.province }),
          h('td', { class: 'num', text: fmtPct(c.peak_pct) }),
          h('td', { text: fmtDate(c.peak_date) }),
          h('td', { text: c.first_flood_date ? fmtDate(c.first_flood_date) : '—' }),
          h('td', { text: c.recession_date ? fmtDate(c.recession_date) : c.last_pct === null || c.status === 'no_flood' ? '—' : T.table.notYet }),
          h('td', { class: 'num', text: fmtPct(c.last_pct) }),
          h('td', {}, h('span', { class: `chip ${c.status}`, text: `${STATUS_ICON(c.status)} ${STATUS_SHORT(c.status)}`, title: STATUS_LABEL(c.status) })),
        );
        tr.addEventListener('click', () => open(c));
        tr.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            open(c);
          }
        });
        return tr;
      }),
    );
    if (!list.length) tbody.append(h('tr', {}, h('td', { colspan: String(COLUMNS.length), class: 'ct-empty', text: T.table.empty })));
  }

  search.addEventListener('input', () => {
    query = search.value;
    render();
  });
  provSel.addEventListener('change', () => {
    province = provSel.value;
    render();
  });
  statSel.addEventListener('change', () => {
    status = statSel.value;
    render();
  });
  exportBtn.addEventListener('click', () => {
    const data = rows().map((c) => ({
      commune: c.name,
      province: c.province,
      reference_track: c.reference_track ?? '',
      coverage_sufficient: c.coverage_sufficient ?? '',
      status: STATUS_LABEL(c.status),
      peak_pct: c.peak_pct,
      peak_date: c.peak_date,
      first_flood_date: c.first_flood_date ?? '',
      half_date: c.half_date ?? '',
      drained_date: c.recession_date ?? '',
      last_pct: c.last_pct,
      last_date: c.last_date,
      valid_km2: c.valid_km2,
      max_flooded_km2: c.max_flooded_km2,
      osm_id: c.osm_id,
    }));
    downloadText('water-pulse_communes.csv', Papa.unparse(data));
  });

  render();
}

FILE src/map/gibs.ts
export const GIBS_LAYER = 'NISAR_L2_Geocoded_Polarimetric_Covariance';
// [Codex] Higher native zooms return broken NISAR tiles; MapLibre can overscale zoom 10.
export const GIBS_MAX_ZOOM = 10;

/** GIBS WMTS (EPSG:3857) tile template for one acquisition date. Note the {z}/{y}/{x} order. */
export function gibsTiles(date: string): string[] {
  return [
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${GIBS_LAYER}/default/${date}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`,
  ];
}

FILE src/map/layers.ts
import * as maplibregl from 'maplibre-gl';
import { AOI, BASEMAP } from '../config.ts';
import { getGeo } from '../data/dataSource.ts';
import { T } from '../i18n.ts';
import type { Bounds, Scene, SummaryLayer } from '../data/types.ts';
import { GIBS_MAX_ZOOM, gibsTiles } from './gibs.ts';
import { PROVINCE_LABELS } from './provinceLabels.ts';

const FONT = ['Noto Sans Regular'];

export function baseStyle(initialDate: string): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      basemap: {
        type: 'raster',
        tiles: BASEMAP.tiles,
        tileSize: 256,
        maxzoom: BASEMAP.maxzoom,
        attribution: BASEMAP.attribution,
      },
      gibs: {
        type: 'raster',
        tiles: gibsTiles(initialDate),
        tileSize: 256,
        maxzoom: GIBS_MAX_ZOOM,
        attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS</a> · NISAR (NASA/JPL/ISRO)',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#cfdde8' } },
      { id: 'basemap', type: 'raster', source: 'basemap' },
      { id: 'radar', type: 'raster', source: 'gibs', paint: { 'raster-opacity': 0.85 } },
    ],
  };
}

export function coordsOf(b: Bounds): [[number, number], [number, number], [number, number], [number, number]] {
  const [w, s, e, n] = b;
  return [
    [w, n],
    [e, n],
    [e, s],
    [w, s],
  ];
}

/** Adds the team's water layer (per scene) and the season summary layer. */
export function addImageLayers(map: maplibregl.Map, scene: Scene): void {
  map.addSource('water', { type: 'image', url: scene.waterPng, coordinates: coordsOf(scene.bounds) });
  map.addLayer({ id: 'water', type: 'raster', source: 'water', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } });
}

export function setWaterScene(map: maplibregl.Map, scene: Scene): void {
  const src = map.getSource('water') as maplibregl.ImageSource | undefined;
  src?.updateImage({ url: scene.waterPng, coordinates: coordsOf(scene.bounds) });
}

export function setSummaryLayer(map: maplibregl.Map, layer: SummaryLayer | null): void {
  if (!layer) return;
  const coordinates = coordsOf(layer.bounds);
  const existing = map.getSource('summary') as maplibregl.ImageSource | undefined;
  if (existing) {
    existing.updateImage({ url: layer.png, coordinates });
    return;
  }
  map.addSource('summary', { type: 'image', url: layer.png, coordinates });
  map.addLayer({ id: 'summary', type: 'raster', source: 'summary', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, 'communes-fill');
}

function labelCollection(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: PROVINCE_LABELS.map((p) => ({
      type: 'Feature',
      properties: { name: p.country ? T.country : p.name, country: !!p.country },
      geometry: { type: 'Point', coordinates: p.lngLat },
    })),
  };
}

/** Province lines, national boundary, province labels, AOI frame and Hoàng Sa / Trường Sa labels. */
export async function addGeoLayers(map: maplibregl.Map): Promise<void> {
  const [provinces, boundary, islands] = await Promise.all([getGeo('provinces'), getGeo('boundary'), getGeo('islands')]);

  map.addSource('provinces', { type: 'geojson', data: provinces });
  map.addSource('boundary', { type: 'geojson', data: boundary });
  map.addSource('islands', { type: 'geojson', data: islands });
  map.addSource('province-labels', { type: 'geojson', data: labelCollection() });
  map.addSource('aoi', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[AOI[0], AOI[1]], [AOI[2], AOI[1]], [AOI[2], AOI[3]], [AOI[0], AOI[3]], [AOI[0], AOI[1]]]] },
    },
  });

  map.addLayer({
    id: 'provinces',
    type: 'line',
    source: 'provinces',
    paint: { 'line-color': '#475569', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.4], 'line-dasharray': [3, 2], 'line-opacity': 0.85 },
  });
  map.addLayer({
    id: 'province-labels',
    type: 'symbol',
    source: 'province-labels',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': ['case', ['get', 'country'], 11, 13],
      'text-letter-spacing': ['case', ['get', 'country'], 0.2, 0.04],
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#334155', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 },
  });
  map.addLayer({
    id: 'boundary',
    type: 'line',
    source: 'boundary',
    paint: { 'line-color': '#1e293b', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 10, 1.8] },
  });
  map.addLayer({
    id: 'aoi',
    type: 'line',
    source: 'aoi',
    paint: { 'line-color': '#0f2a4a', 'line-width': 1.5, 'line-dasharray': [6, 3] },
  });
  map.addLayer({
    id: 'islands-frame',
    type: 'line',
    source: 'islands',
    filter: ['==', ['get', 'kind'], 'archipelago-frame'],
    maxzoom: 9,
    paint: { 'line-color': '#64748b', 'line-width': 1, 'line-dasharray': [2, 2] },
  });
  map.addLayer({
    id: 'islands-label',
    type: 'symbol',
    source: 'islands',
    filter: ['==', ['get', 'kind'], 'archipelago-label'],
    layout: {
      'text-field': ['concat', ['get', 'label'], '\n', ['coalesce', ['get', 'subtitle'], '']],
      'text-font': FONT,
      'text-size': 11,
      'text-letter-spacing': 0.08,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#0f2a4a', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.8 },
  });
  map.addLayer({
    id: 'islands',
    type: 'symbol',
    source: 'islands',
    filter: ['==', ['get', 'kind'], 'island'],
    minzoom: 7,
    layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 10.5, 'text-anchor': 'top', 'text-offset': [0, 0.5] },
    paint: { 'text-color': '#334155', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.5 },
  });
}
