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

function cmp(a: CommuneProps, b: CommuneProps, key: SortKey): number {
  if (key === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  const av = a[key];
  const bv = b[key];
  // missing dates (never flooded / not drained yet) always sort as "latest"
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv), 'vi');
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
      .sort((a, b) => cmp(a, b, sortKey) * sortDir || a.name.localeCompare(b.name, 'vi'));
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
          h('td', { text: c.recession_date ? fmtDate(c.recession_date) : c.status === 'no_flood' ? '—' : T.table.notYet }),
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
