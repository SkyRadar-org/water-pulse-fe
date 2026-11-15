/**
 * [Claude] "Dữ liệu dùng để ra quyết định": how the tables behind the sowing advice are organised,
 * with a join diagram and a preview + CSV download for every table (real NISAR and assumed demo).
 */
import Papa from 'papaparse';
import { DEMO_TABLES } from '../data/demoAgro.ts';
import type { CommuneProps } from '../data/types.ts';
import { downloadText, fmtNum } from '../format.ts';
import { lang } from '../i18n.ts';
import { h } from './dom.ts';
import { icon } from './icons.ts';

const vi = lang === 'vi';
const S = {
  title: vi ? 'Dữ liệu dùng để ra quyết định' : 'Data behind the decision',
  lead: vi
    ? 'Mọi dữ liệu được tổ chức thành bảng (CSV), nối với nhau bằng mã xã (osm_id), tỉnh (tinh_key) và mã trạm (ma_tram). Bấm vào từng bảng để xem vài dòng đầu hoặc tải đủ bảng.'
    : 'All data is organised as tables (CSV), joined by commune id (osm_id), province (tinh_key) and gauge id (ma_tram). Open a table to preview it or download it in full.',
  real: vi ? 'NISAR đo thật' : 'NISAR measured',
  demo: vi ? 'Demo giả định' : 'Assumed demo',
  output: vi ? 'Kết quả' : 'Output',
  rule: vi ? 'Quy tắc quyết định' : 'Decision rules',
  ruleBody: vi ? 'Ước tính ngày ruộng khô (≤ 15%), cộng 10 ngày làm đất, so với khung né rầy và hạn chót vụ' : 'Estimate dry date (≤ 15%), add 10 days of land prep, compare with the window and the season deadline',
  rows: (n: number) => (vi ? `${fmtNum(n)} dòng` : `${fmtNum(n)} rows`),
  cols: (n: number) => (vi ? `${n} cột` : `${n} columns`),
  preview: (n: number, total: number) => (vi ? `Xem trước ${n}/${fmtNum(total)} dòng` : `Preview ${n}/${fmtNum(total)} rows`),
  download: vi ? 'Tải bảng (.csv)' : 'Download (.csv)',
  join: vi ? 'Khóa nối' : 'Join key',
};

interface TableDef {
  file: string;
  kind: 'real' | 'demo' | 'output';
  title: string;
  desc: string;
  key: string;
  rows: () => Record<string, unknown>[];
}

/** Per-commune NISAR table the decision reads: latest image + previous image of the same orbit. */
function waterRows(all: CommuneProps[]): Record<string, unknown>[] {
  return all.map((p) => ({
    osm_id: p.osm_id,
    xa: p.name,
    tinh: p.province,
    quy_dao: p.reference_track ?? '',
    ngay_anh: p.last_date ?? '',
    nuoc_pct: p.last_pct ?? '',
    ngay_anh_truoc: p.prev_date ?? '',
    nuoc_truoc_pct: p.prev_pct ?? '',
    xu_huong_pp_12_ngay: p.trend_pp_12d ?? '',
    anh_phu_du: p.coverage_sufficient ?? '',
  }));
}

export function adviceDataSection(all: CommuneProps[], adviceRows: () => Record<string, unknown>[]): HTMLElement {
  const demo = (file: string) => () => DEMO_TABLES.find((t) => t.file === file)?.rows ?? [];
  const defs: TableDef[] = [
    {
      file: 'nuoc_theo_xa.csv',
      kind: 'real',
      title: vi ? 'Nước theo xã (ảnh gần nhất và ảnh trước cùng quỹ đạo)' : 'Water per commune (latest and previous image, same orbit)',
      desc: vi
        ? 'Trích từ bảng gốc commune_water_by_date.csv của pipeline (mỗi dòng: xã × ngày chụp × quỹ đạo, 2.959 dòng) và sowing_check.csv. Ba quỹ đạo 047D, 148D, 083A không gộp.'
        : 'Extracted from the pipeline tables commune_water_by_date.csv (one row per commune × date × orbit, 2,959 rows) and sowing_check.csv. Orbits 047D, 148D and 083A are never merged.',
      key: 'osm_id, tinh',
      rows: () => waterRows(all),
    },
    {
      file: 'lich_ne_ray.csv',
      kind: 'demo',
      title: vi ? 'Lịch xuống giống né rầy theo tỉnh' : 'Planthopper-avoidance sowing calendar per province',
      desc: vi ? 'Mỗi tỉnh một khung né rầy (tâm ± 7 ngày), hạn chót vụ, trạm thủy văn tham chiếu và độ trễ khi thượng nguồn xả lũ.' : 'One avoidance window per province (centre ± 7 days), season deadline, reference gauge and delay during upstream releases.',
      key: 'tinh_key → tinh; ma_tram',
      rows: demo('lich_ne_ray.csv'),
    },
    {
      file: 'tram_thuy_van.csv',
      kind: 'demo',
      title: vi ? 'Trạm thủy văn' : 'River gauges',
      desc: vi ? 'Danh mục trạm và mức báo động I.' : 'Gauge list and alert level I.',
      key: 'ma_tram',
      rows: demo('tram_thuy_van.csv'),
    },
    {
      file: 'muc_nuoc_tram.csv',
      kind: 'demo',
      title: vi ? 'Mực nước ngày tại trạm' : 'Daily gauge water level',
      desc: vi ? 'Mỗi dòng: ngày × trạm × mực nước (m), gồm cả phần dự báo sau ngày đánh giá.' : 'One row per day × gauge × level (m), including the forecast after the assessment date.',
      key: 'ma_tram, ngay',
      rows: demo('muc_nuoc_tram.csv'),
    },
    {
      file: 'lich_xa_lu.csv',
      kind: 'demo',
      title: vi ? 'Lịch xả lũ thượng nguồn' : 'Upstream release schedule',
      desc: vi ? 'Mỗi đợt xả: thời gian, lưu lượng tăng, mức nước tăng dự kiến.' : 'One row per release: period, added flow, expected rise.',
      key: vi ? 'bat_dau – ket_thuc (theo ngày)' : 'bat_dau – ket_thuc (by date)',
      rows: demo('lich_xa_lu.csv'),
    },
    {
      file: 'khuyen_nghi_xa.csv',
      kind: 'output',
      title: vi ? 'Khuyến nghị theo xã (kết quả)' : 'Advice per commune (output)',
      desc: vi ? 'Mỗi xã một quyết định tại ngày đánh giá, kèm các mốc ngày dùng để ra quyết định. Bảng thay đổi khi đổi ngày đánh giá.' : 'One decision per commune on the assessment date, with the dates behind it. Changes with the assessment date.',
      key: 'osm_id',
      rows: adviceRows,
    },
  ];

  const tagFor = (kind: TableDef['kind']) => h('span', { class: `ad-tag ad-tag-${kind === 'output' ? 'out' : kind}`, text: kind === 'real' ? S.real : kind === 'demo' ? S.demo : S.output });

  // ---------- join diagram ----------
  const box = (d: TableDef) =>
    h('div', { class: `ad-erd-box ad-erd-${d.kind}` }, h('code', { text: d.file }), tagFor(d.kind), h('small', { text: `${S.join}: ${d.key}` }));
  const inputs = defs.filter((d) => d.kind !== 'output');
  const diagram = h(
    'div',
    { class: 'ad-erd', role: 'img', 'aria-label': `${inputs.map((d) => d.file).join(', ')} → ${S.rule} → khuyen_nghi_xa.csv` },
    h('div', { class: 'ad-erd-col' }, ...inputs.map(box)),
    h('div', { class: 'ad-erd-arrow', 'aria-hidden': 'true', text: '→' }),
    h('div', { class: 'ad-erd-rule' }, h('strong', { text: S.rule }), h('small', { text: S.ruleBody })),
    h('div', { class: 'ad-erd-arrow', 'aria-hidden': 'true', text: '→' }),
    box(defs.at(-1)!),
  );

  // ---------- table viewers ----------
  const viewer = (d: TableDef) => {
    const det = h('details', { class: 'ad-table' });
    const meta = h('span', { class: 'ad-table-meta' });
    det.append(h('summary', {}, h('code', { text: d.file }), ' ', tagFor(d.kind), ' ', h('span', { class: 'ad-table-title', text: d.title }), meta));
    const body = h('div', { class: 'ad-table-body' });
    det.append(body);
    const refreshMeta = () => {
      const rows = d.rows();
      const cols = rows[0] ? Object.keys(rows[0]).length : 0;
      meta.textContent = ` · ${S.rows(rows.length)} · ${S.cols(cols)}`;
    };
    const fill = () => {
      const rows = d.rows();
      const cols = rows[0] ? Object.keys(rows[0]) : [];
      const shown = rows.slice(0, 8);
      const dl = h('button', { type: 'button', class: 'rp-btn' }, icon('download'), h('span', { text: S.download }));
      dl.addEventListener('click', () => downloadText(d.file, Papa.unparse(d.rows())));
      body.replaceChildren(
        h('p', { class: 'ad-note', text: d.desc }),
        h(
          'div',
          { class: 'ad-table-scroll' },
          h(
            'table',
            { class: 'ad-grid' },
            h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', { scope: 'col', text: c })))),
            h('tbody', {}, ...shown.map((r) => h('tr', {}, ...cols.map((c) => h('td', { text: String(r[c] ?? '') }))))),
          ),
        ),
        h('div', { class: 'ad-table-foot' }, h('span', { class: 'ad-note', text: S.preview(shown.length, rows.length) }), dl),
      );
    };
    det.addEventListener('toggle', () => det.open && fill());
    refreshMeta();
    return { det, refresh: () => (refreshMeta(), det.open && fill()) };
  };
  const viewers = defs.map(viewer);

  const section = h(
    'section',
    { class: 'ad-data', id: 'ad-data' },
    h('div', { class: 'ad-block-head' }, h('h2', { text: S.title })),
    h('p', { class: 'ad-note', text: S.lead }),
    diagram,
    h('div', { class: 'ad-tables' }, ...viewers.map((v) => v.det)),
  );
  (section as HTMLElement & { refresh?: () => void }).refresh = () => viewers.forEach((v) => v.refresh());
  return section;
}
