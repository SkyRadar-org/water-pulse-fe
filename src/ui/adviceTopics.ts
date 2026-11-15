/**
 * [Claude] Extra advice topics (pump dispatch, fertiliser, snails and rats): KPIs + ranked commune table + CSV.
 */
import Papa from 'papaparse';
import type { Extra, Level } from '../data/extraAdvice.ts';
import { MOBILE_PUMP_M3H } from '../data/extraAdvice.ts';
import type { Advice } from '../data/sowingAdvice.ts';
import { downloadText, fmtNum } from '../format.ts';
import { lang } from '../i18n.ts';
import { h } from './dom.ts';
import { icon } from './icons.ts';

export type Topic = 'sowing' | 'pump' | 'fert' | 'pest';
const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);

export const TOPICS: { id: Topic; label: string; sub: string }[] = [
  { id: 'sowing', label: t('Xuống giống', 'Sowing'), sub: t('Khi nào gieo sạ', 'When to sow') },
  { id: 'pump', label: t('Bơm tiêu', 'Pumping'), sub: t('Điều phối máy bơm', 'Pump dispatch') },
  { id: 'fert', label: t('Phân bón', 'Fertiliser'), sub: t('Giảm phân nhờ phù sa', 'Cut thanks to silt') },
  { id: 'pest', label: t('Ốc & chuột', 'Snails & rats'), sub: t('Phòng sinh vật hại sau lũ', 'Post-flood pests') },
];

const tag = (kind: 'real' | 'demo') =>
  h('span', { class: `ad-tag ad-tag-${kind}`, text: kind === 'real' ? t('NISAR đo thật', 'NISAR measured') : t('Demo giả định', 'Assumed demo') });
const money = (vnd: number) => (vnd >= 1e9 ? `${fmtNum(Math.round(vnd / 1e8) / 10)} ${t('tỷ đ', 'bn VND')}` : `${fmtNum(Math.round(vnd / 1e5) / 10)} ${t('triệu đ', 'm VND')}`);
const LEVEL: Record<Level, string> = { high: t('Cao', 'High'), medium: t('Trung bình', 'Medium'), low: t('Thấp', 'Low') };

interface Col<R> {
  head: string;
  src?: 'real' | 'demo';
  cell: (r: R) => string | HTMLElement;
  csv: (r: R) => string | number;
  num?: boolean;
}

function kpi(n: string, label: string, sub: string, cls: string) {
  return h('div', { class: `ad-kpi ad-kpi-static ${cls}` }, h('span', { class: 'ad-kpi-n', text: n }), h('span', { class: 'ad-kpi-label', text: label }), h('span', { class: 'ad-kpi-sub', text: sub }));
}

function table<R>(rows: R[], cols: Col<R>[], file: string, limit = 25): HTMLElement {
  let all = false;
  const tbody = h('tbody');
  const more = h('button', { type: 'button', class: 'rp-btn' });
  const draw = () => {
    tbody.replaceChildren(...(all ? rows : rows.slice(0, limit)).map((r) => h('tr', {}, ...cols.map((c, i) => {
      const v = c.cell(r);
      const cell = h(i === 0 ? 'th' : 'td', { class: c.num ? 'num' : '' });
      if (i === 0) cell.setAttribute('scope', 'row');
      cell.append(v);
      return cell;
    }))));
    more.hidden = rows.length <= limit;
    more.textContent = all ? t('Thu gọn', 'Show less') : t(`Hiện tất cả ${rows.length} xã`, `Show all ${rows.length}`);
  };
  more.addEventListener('click', () => {
    all = !all;
    draw();
  });
  const dl = h('button', { type: 'button', class: 'rp-btn' }, icon('download'), h('span', { text: t('Tải danh sách (.csv)', 'Download (.csv)') }));
  dl.addEventListener('click', () => downloadText(file, Papa.unparse(rows.map((r) => Object.fromEntries(cols.map((c) => [c.head, c.csv(r)]))))));
  draw();
  return h(
    'div',
    { class: 'ad-topic-table' },
    h('div', { class: 'ad-table-scroll' }, h('table', { class: 'rp-table' }, h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', { scope: 'col', class: c.num ? 'num' : '' }, c.head, c.src ? ' ' : '', c.src ? tag(c.src) : '')))), tbody)),
    h('div', { class: 'ad-table-foot' }, more, dl),
  );
}

const nameCell = (a: Advice) => h('span', {}, h('b', { text: a.p.name }), h('small', { class: 'ad-sub', text: a.p.province.replace(/^(Tỉnh|Thành phố) /, '') }));
const levelChip = (l: Level, text?: string) => h('span', { class: `ad-level ad-level-${l}`, text: text ?? LEVEL[l] });

export function renderTopic(topic: Exclude<Topic, 'sowing'>, list: Advice[], extras: Map<string, Extra>, evalDate: string): HTMLElement {
  const X = (a: Advice) => extras.get(a.p.osm_id)!;
  const head = (title: string, lead: string) => h('div', { class: 'ad-topic-head' }, h('h2', { text: title }), h('p', { class: 'ad-note', text: lead }));

  if (topic === 'pump') {
    const rows = list.filter((a) => X(a).pump.needed).sort((a, b) => X(b).pump.extraPumps - X(a).pump.extraPumps || X(b).pump.priority - X(a).pump.priority);
    const totalM3 = rows.reduce((s, a) => s + X(a).pump.excessM3, 0);
    const extra = rows.reduce((s, a) => s + X(a).pump.extraPumps, 0);
    const lent = rows.reduce((s, a) => s + X(a).pump.donors.reduce((x, d) => x + d.pumps, 0), 0);
    const action = (a: Advice) => {
      const p = X(a).pump;
      if (p.extraPumps === 0) return t(`Bơm ngay bằng trạm tại chỗ, xong trong ~${p.daysOwn} ngày`, `Pump now with local stations, ~${p.daysOwn} days`);
      const lentN = p.donors.reduce((x, d) => x + d.pumps, 0);
      const names = p.donors.slice(0, 3).map((d) => d.name).join(', ') + (p.donors.length > 3 ? t(` và ${p.donors.length - 3} xã khác`, ` and ${p.donors.length - 3} more`) : '');
      const from = p.donors.length ? t(`; điều ${lentN} máy từ ${names}`, `; borrow ${lentN} from ${names}`) : '';
      const short = p.extraPumps - lentN;
      return t(`Bơm ngay, cần thêm ${p.extraPumps} máy di động${from}${short > 0 ? `; còn thiếu ${short} máy, đề nghị tỉnh hỗ trợ` : ''}`, `Pump now, ${p.extraPumps} more mobile pumps needed${from}${short > 0 ? `; ${short} still missing, ask the province` : ''}`);
    };
    return h(
      'section',
      { class: 'ad-topic' },
      head(t('Điều phối máy bơm tiêu', 'Pump dispatch'), t(
        `Xã đang "Rủi ro trễ lịch" được xếp ưu tiên theo lượng nước phải bơm mỗi ngày để kịp làm đất trước khi hết khung né rầy. Lượng nước = diện tích còn ngập (NISAR) × độ sâu trung bình (demo). Máy di động ${fmtNum(MOBILE_PUMP_M3H)} m³/giờ, chạy 20 giờ/ngày. Máy được điều từ xã đã khô cùng tỉnh. Ngày đánh giá: ${evalDate}.`,
        `Communes at "late risk" ranked by the water to pump per day to start land prep before the window closes. Volume = flooded area (NISAR) × mean depth (demo). Mobile pumps ${fmtNum(MOBILE_PUMP_M3H)} m³/h, 20 h/day, lent by dry communes in the same province.`,
      )),
      h('div', { class: 'ad-kpis' },
        kpi(fmtNum(rows.length), t('xã cần bơm tiêu', 'communes need pumping'), t('Từ quyết định xuống giống', 'From the sowing decision'), 'ad-risk'),
        kpi(`${fmtNum(Math.round(totalM3 / 1e5) / 10)} ${t('tr m³', 'M m³')}`, t('nước cần bơm', 'water to pump'), t('Trên mức ruộng khô 15%', 'Above the 15% dry level'), 'ad-check'),
        kpi(fmtNum(extra), t('máy di động cần thêm', 'extra mobile pumps'), t('Để kịp khung né rầy', 'To make the window'), 'ad-wait'),
        kpi(`${fmtNum(lent)}/${fmtNum(extra)}`, t('máy điều được từ xã đã khô', 'pumps lent by dry communes'), t('Phần còn thiếu đề nghị tỉnh hỗ trợ', 'The rest from the province'), 'ad-ready'),
      ),
      table(rows, [
        { head: t('Xã', 'Commune'), cell: nameCell, csv: (a) => `${a.p.name} (${a.p.province})` },
        { head: t('Nước cần bơm (nghìn m³)', 'Water to pump (k m³)'), src: 'real', num: true, cell: (a) => fmtNum(Math.round(X(a).pump.excessM3 / 1000)), csv: (a) => Math.round(X(a).pump.excessM3) },
        { head: t('Bơm tại chỗ', 'Local pumps'), src: 'demo', cell: (a) => `${fmtNum(X(a).pump.fixedM3h)} m³/h + ${X(a).pump.ownMobile} ${t('máy', 'mobile')}`, csv: (a) => `${X(a).pump.fixedM3h} m3/h + ${X(a).pump.ownMobile}` },
        { head: t('Tự bơm hết / còn', 'Own pumps need / left'), num: true, cell: (a) => `${X(a).pump.daysOwn ?? '—'} / ${X(a).pump.daysAvailable} ${t('ngày', 'days')}`, csv: (a) => `${X(a).pump.daysOwn}/${X(a).pump.daysAvailable}` },
        { head: t('Khuyến nghị', 'Action'), cell: (a) => h('span', { class: 'ad-act', text: action(a) }), csv: action },
      ], `dieu-phoi-bom_${evalDate}.csv`),
    );
  }

  if (topic === 'fert') {
    const rows = list.filter((a) => X(a).fert && X(a).fert!.cutN + X(a).fert!.cutP > 0).sort((a, b) => X(b).fert!.savingTotal - X(a).fert!.savingTotal);
    const total = rows.reduce((s, a) => s + X(a).fert!.savingTotal, 0);
    const long = rows.filter((a) => X(a).fert!.group === 'dai').length;
    const action = (a: Advice) => {
      const f = X(a).fert!;
      return t(`Giảm ${f.cutN}% đạm, ${f.cutP}% lân (bớt ${fmtNum(Math.round(f.kgN))} kg N, ${fmtNum(Math.round(f.kgP))} kg P₂O₅/ha)`, `First crop after the flood: cut N ${f.cutN}%, P ${f.cutP}%; adjust with the leaf colour chart`);
    };
    return h(
      'section',
      { class: 'ad-topic' },
      head(t('Giảm phân bón nhờ phù sa', 'Fertiliser cut from flood silt'), t(
        'Ruộng ngập càng lâu càng nhận nhiều phù sa, nên vụ Đông Xuân đầu tiên có thể giảm đạm và lân. Số ngày ngập đo bằng NISAR (từ ngày bắt đầu ngập đến ngày nước rút). Lượng phù sa, mức giảm, lượng phân khuyến cáo và giá phân là dữ liệu demo.',
        'The longer a field is flooded, the more silt it receives, so the first winter–spring crop can use less N and P. Flood days come from NISAR; silt, cuts, recommended rates and prices are demo data.',
      )),
      h('div', { class: 'ad-kpis' },
        kpi(fmtNum(rows.length), t('xã nên giảm phân', 'communes can cut fertiliser'), t('Có ngập trong mùa lũ 2026', 'Flooded in the 2026 season'), 'ad-ready'),
        kpi(fmtNum(long), t('xã ngập ≥ 60 ngày', 'communes flooded ≥ 60 days'), t('Giảm lân tới 40%', 'Up to 40% less P'), 'ad-wait'),
        kpi(money(total), t('tiết kiệm ước tính', 'estimated saving'), t('Cả vụ, trên diện tích lúa', 'Whole crop, rice area'), 'ad-check'),
      ),
      table(rows, [
        { head: t('Xã', 'Commune'), cell: nameCell, csv: (a) => `${a.p.name} (${a.p.province})` },
        { head: t('Số ngày ngập', 'Flood days'), src: 'real', num: true, cell: (a) => fmtNum(X(a).fert!.floodDays), csv: (a) => X(a).fert!.floodDays },
        { head: t('Phù sa (tấn/ha)', 'Silt (t/ha)'), src: 'demo', num: true, cell: (a) => fmtNum(X(a).fert!.siltT), csv: (a) => X(a).fert!.siltT },
        { head: t('Tiết kiệm/ha', 'Saving/ha'), src: 'demo', num: true, cell: (a) => money(X(a).fert!.savingPerHa), csv: (a) => Math.round(X(a).fert!.savingPerHa) },
        { head: t('Tiết kiệm cả xã', 'Commune saving'), src: 'demo', num: true, cell: (a) => money(X(a).fert!.savingTotal), csv: (a) => Math.round(X(a).fert!.savingTotal) },
        { head: t('Khuyến nghị', 'Action'), cell: (a) => h('span', { class: 'ad-act', text: action(a) }), csv: action },
      ], `giam-phan-bon_${evalDate}.csv`),
    );
  }

  const rows = list.filter((a) => X(a).pest).sort((a, b) => {
    const r = { high: 2, medium: 1, low: 0 };
    return r[X(b).pest!.level] - r[X(a).pest!.level] || X(b).pest!.snail - X(a).pest!.snail;
  });
  const n = (l: Level) => rows.filter((a) => X(a).pest!.level === l).length;
  const action = (a: Advice) => {
    const p = X(a).pest!;
    const parts: string[] = [];
    if (p.snailLevel !== 'low') parts.push(`${t('Ốc', 'Snails')}: ${p.snailAction}`);
    if (p.ratLevel !== 'low') parts.push(`${t('Chuột', 'Rats')}: ${p.ratAction}`);
    return parts.length ? parts.join(' · ') : t('Theo dõi định kỳ, chưa cần biện pháp riêng', 'Routine monitoring only');
  };
  return h(
    'section',
    { class: 'ad-topic' },
    head(t('Phòng ốc bươu vàng và chuột sau lũ', 'Golden apple snails and rats after the flood'), t(
      'Mật độ ốc và chuột lấy từ đợt điều tra (demo), so với ngưỡng cảnh báo (demo). Xã còn nước lúc xuống giống theo NISAR (đang "Chờ" hoặc "Rủi ro") bị nâng mức nguy cơ ốc, vì ốc phá mạnh lúa sạ trên ruộng còn nước.',
      'Snail and rat densities come from a field survey (demo), compared with alert thresholds (demo). Communes still wet at sowing according to NISAR get a higher snail risk.',
    )),
    h('div', { class: 'ad-kpis' },
      kpi(fmtNum(n('high')), t('xã nguy cơ cao', 'high risk'), t('Vượt ngưỡng nguy hiểm', 'Above the danger level'), 'ad-risk'),
      kpi(fmtNum(n('medium')), t('xã nguy cơ trung bình', 'medium risk'), t('Vượt ngưỡng cảnh báo', 'Above the alert level'), 'ad-wait'),
      kpi(fmtNum(n('low')), t('xã nguy cơ thấp', 'low risk'), t('Theo dõi định kỳ', 'Routine monitoring'), 'ad-ready'),
    ),
    table(rows, [
      { head: t('Xã', 'Commune'), cell: nameCell, csv: (a) => `${a.p.name} (${a.p.province})` },
      { head: t('Ốc (con/m²)', 'Snails (/m²)'), src: 'demo', num: true, cell: (a) => h('span', {}, `${fmtNum(X(a).pest!.snail)} `, levelChip(X(a).pest!.snailLevel)), csv: (a) => X(a).pest!.snail },
      { head: t('Chuột (hang/100m)', 'Rats (burrows/100m)'), src: 'demo', num: true, cell: (a) => h('span', {}, `${fmtNum(X(a).pest!.rat)} `, levelChip(X(a).pest!.ratLevel)), csv: (a) => X(a).pest!.rat },
      { head: t('Còn nước lúc sạ', 'Wet at sowing'), src: 'real', cell: (a) => (X(a).pest!.wetAtSowing ? t('Có', 'Yes') : t('Không', 'No')), csv: (a) => String(X(a).pest!.wetAtSowing) },
      { head: t('Khuyến nghị', 'Action'), cell: (a) => h('span', { class: 'ad-act', text: action(a) }), csv: action },
    ], `oc-chuot_${evalDate}.csv`),
  );
}

/** One-line chips for the commune card: the other topics at a glance. */
export function extraChips(e: Extra): HTMLElement {
  const chips: HTMLElement[] = [];
  if (e.pump.needed) chips.push(levelChip('high', e.pump.extraPumps ? t(`Bơm tiêu: thêm ${e.pump.extraPumps} máy`, `Pumps: +${e.pump.extraPumps}`) : t('Bơm tiêu: dùng trạm tại chỗ', 'Pumps: local stations')));
  if (e.fert && e.fert.cutP > 0) chips.push(levelChip('low', t(`Phân bón: giảm ${e.fert.cutN}% đạm, ${e.fert.cutP}% lân`, `Fertiliser: −${e.fert.cutN}% N, −${e.fert.cutP}% P`)));
  if (e.pest && e.pest.level !== 'low') chips.push(levelChip(e.pest.level, t(`Ốc/chuột: nguy cơ ${LEVEL[e.pest.level].toLowerCase()}`, `Snails/rats: ${LEVEL[e.pest.level].toLowerCase()} risk`)));
  return h('div', { class: 'ad-chips' }, h('span', { class: 'ad-chips-label', text: t('Khuyến nghị khác:', 'Also:') }), ...(chips.length ? chips : [h('span', { class: 'ad-note', text: t('không có', 'none') })]));
}
