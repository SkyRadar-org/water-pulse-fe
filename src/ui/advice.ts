/**
 * [Claude] "Khuyến nghị xuống giống" tab: one actionable decision per commune for extension officers.
 * Real NISAR water + clearly labelled assumed demo data (calendar, river, upstream release).
 */
import Papa from 'papaparse';
import { Chart, chartAdapters } from '../charts/register.ts';
import { getCommunes } from '../data/dataSource.ts';
import { adviceDataSection } from './adviceData.ts';
import { extraChips, renderTopic, TOPICS, type Topic } from './adviceTopics.ts';
import { computeExtras, type Extra } from '../data/extraAdvice.ts';
import { addDays, CALENDARS, loadDemoData, LEVEL_FROM, LEVEL_TO, SEASON_DEADLINE, STATIONS, stationLevels, UPSTREAM_RELEASE } from '../data/demoAgro.ts';
import { adviseAll, DECISIONS, type Advice, type Decision } from '../data/sowingAdvice.ts';
import type { CommuneProps } from '../data/types.ts';
import { downloadText, fmtDate, fmtNum, fmtPct, fmtShort, fold } from '../format.ts';
import { lang } from '../i18n.ts';
import { enAdvice, viAdvice } from '../locales/advice.ts';
import { set, state } from '../state.ts';
import { h } from './dom.ts';
import { icon } from './icons.ts';

const A = lang === 'vi' ? viAdvice : enAdvice;
const INITIAL_ROWS = 8;
const ORDER: Record<Decision, number> = { risk: 0, wait: 1, ready: 2, check: 3 };

const tag = (kind: 'real' | 'demo') =>
  h('span', { class: `ad-tag ad-tag-${kind}`, title: kind === 'real' ? A.tagRealTip : A.tagDemoTip, text: kind === 'real' ? A.tagReal : A.tagDemo });

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mountAdvice(host: HTMLElement): void {
  host.classList.add('page', 'ad-page');
  const inner = h('div', { class: 'page-inner ad-inner' });
  host.replaceChildren(inner);
  const load = () => {
    inner.replaceChildren(h('p', { class: 'ad-loading', role: 'status', text: A.loading }));
    Promise.all([getCommunes(), loadDemoData()])
      .then(([c]) => build(inner, c.features.map((f) => f.properties)))
      .catch((err: unknown) => {
        console.error(err);
        inner.replaceChildren(h('div', { class: 'error-box', role: 'alert' }, h('p', { text: A.loadError }), h('p', { class: 'note', text: err instanceof Error ? err.message : '' })));
      });
  };
  load();
}

function reasons(a: Advice): { text: string; src: 'real' | 'demo' }[] {
  const out: { text: string; src: 'real' | 'demo' }[] = [];
  const p = a.p;
  const pp = (v: number) => fmtNum(Math.round(Math.abs(v) * 10) / 10);
  if (a.detail === 'no_coverage') return [{ text: A.rCoverage, src: 'real' }];
  if (p.last_pct !== null && p.last_date) out.push({ text: A.rWater(fmtPct(p.last_pct), fmtDate(p.last_date), a.dataAge ?? 0), src: 'real' });
  if (a.detail === 'no_data') return [...out, { text: A.rNoTrend, src: 'real' }];
  if (a.ratePerDay !== null && p.last_pct !== null && p.last_pct > 15) {
    if (a.ratePerDay <= -0.05) out.push({ text: A.rRate(pp(a.ratePerDay)), src: 'real' });
    else if (a.ratePerDay >= 0.05) out.push({ text: A.rRise(pp(a.ratePerDay)), src: 'real' });
    else out.push({ text: A.rFlat, src: 'real' });
  }
  if (a.detail === 'stagnant') {
    if (a.neededRate !== null && a.neededRate > 0) out.push({ text: A.rNeeded(pp(a.neededRate)), src: 'demo' });
    out.push({ text: A.rWindow(a.cal.label, fmtShort(a.cal.windowStart), fmtShort(a.cal.windowEnd)), src: 'demo' });
    return out;
  }
  const tooSlow = !!a.dryDate && a.dryDate > SEASON_DEADLINE;
  if (tooSlow) out.push({ text: A.rTooSlow, src: 'real' });
  else if (a.dryDate && p.last_pct !== null) out.push({ text: p.last_pct <= 15 ? A.rAlreadyDry : A.rDry(fmtDate(a.dryDate)), src: 'real' });
  if (a.releaseDelay > 0) out.push({ text: A.rRelease(a.releaseDelay), src: 'demo' });
  if (a.readyDate && !tooSlow) out.push({ text: A.rPrep(fmtDate(a.readyDate)), src: 'demo' });
  out.push({ text: A.rWindow(a.cal.label, fmtShort(a.cal.windowStart), fmtShort(a.cal.windowEnd)), src: 'demo' });
  if (a.detail === 'pump') out.push({ text: a.neededRate !== null && a.neededRate > 0 ? A.rNeeded(pp(a.neededRate)) : A.rNeedNow, src: 'demo' });
  if (a.detail === 'critical') out.push({ text: A.rDeadline(fmtDate(SEASON_DEADLINE)), src: 'demo' });
  if ((a.dataAge ?? 0) > 21) out.push({ text: A.rOld(a.dataAge!), src: 'real' });
  return out;
}

function headline(a: Advice): string {
  const H = A.headline;
  switch (a.detail) {
    case 'ready_now':
      return H.ready_now(fmtShort(a.cal.windowEnd));
    case 'ready_early':
      return H.ready_early(fmtShort(a.cal.windowStart), a.days ?? 0);
    case 'ready_late':
      return H.ready_late(a.days ?? 0);
    case 'wait':
      return H.wait(a.days ?? 0, fmtShort(a.sowDate!));
    case 'pump':
      return H.pump(a.days ?? 0);
    case 'critical':
      return H.critical();
    case 'stagnant':
      return H.stagnant();
    case 'no_coverage':
      return H.no_coverage();
    case 'no_data':
      return H.no_data();
  }
}

function badgeText(a: Advice): string {
  return a.decision === 'wait' ? A.waitDays(a.days ?? 0) : A.decision[a.decision];
}

function build(root: HTMLElement, all: CommuneProps[]): void {
  const provinces = [...new Set(all.map((c) => c.province))].sort((a, b) => a.localeCompare(b, 'vi'));
  // The NISAR record ends early November; default to today but never before the latest image.
  const latestImage = all.map((c) => c.last_date).filter((d): d is string => !!d).sort().at(-1) ?? todayIso();
  let evalDate = todayIso() < latestImage ? latestImage : todayIso();
  let province = '';
  let query = '';
  let only: Decision | null = null;
  let expanded = false;
  let advice: Advice[] = [];
  let chart: Chart | null = null;
  const urlTopic = new URLSearchParams(location.search).get('topic');
  let topic: Topic = TOPICS.some((x) => x.id === urlTopic) ? (urlTopic as Topic) : 'sowing';
  let extras = new Map<string, Extra>();

  // ---------- header + demo banner ----------
  const head = h('header', { class: 'ad-head' }, h('h1', { class: 'ad-title', text: A.title }), h('p', { class: 'ad-lead', text: A.lead }));
  const banner = h(
    'div',
    { class: 'ad-demo', role: 'note' },
    h('span', { class: 'ad-demo-icon', 'aria-hidden': 'true', text: '!' }),
    h('div', {}, h('strong', { text: A.demoTitle }), h('p', { text: A.demoBody }), h('p', { class: 'ad-demo-legend' }, tag('real'), ' ', tag('demo'))),
  );

  // ---------- controls ----------
  const dateIn = h('input', { type: 'date', value: evalDate, min: LEVEL_FROM, max: SEASON_DEADLINE });
  const provSel = h('select', {}, h('option', { value: '', text: A.allProvinces }), ...provinces.map((p) => h('option', { value: p, text: p })));
  const search = h('input', { type: 'search', placeholder: A.search, 'aria-label': A.search });
  const field = (label: string, control: HTMLElement) => h('label', { class: 'ad-field' }, h('span', { text: label }), control);
  const exportBtn = h('button', { type: 'button', class: 'rp-btn' }, icon('download'), h('span', { text: A.export }));
  const status = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const controls = h(
    'form',
    { class: 'ad-controls' },
    h('div', { class: 'ad-control-row' }, field(A.evalDate, dateIn), field(A.province, provSel), field(' ', search), exportBtn),
    h('p', { class: 'ad-hint', text: A.evalHint }),
  );
  controls.addEventListener('submit', (e) => e.preventDefault());

  const topicBar = h('div', { class: 'ad-topics', role: 'tablist', 'aria-label': lang === 'vi' ? 'Chủ đề khuyến nghị' : 'Advice topics' });
  const topicHost = h('div', { class: 'ad-topic-host' });
  const sowingBox = h('div', { class: 'ad-sowing' });
  const kpis = h('div', { class: 'ad-kpis', role: 'group', 'aria-label': A.kpiAria });
  const filterLine = h('p', { class: 'ad-filterline' });
  const list = h('div', { class: 'ad-list' });
  const more = h('button', { type: 'button', class: 'rp-btn ad-more' });
  const count = h('p', { class: 'ad-count' });

  // ---------- context (demo) ----------
  const canvas = h('canvas', { role: 'img', 'aria-label': A.riverAria });
  const riverNow = h('ul', { class: 'ad-river-now' });
  const riverNote = h('p', { class: 'ad-note' });
  const fmtFlow = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-GB').format(UPSTREAM_RELEASE.extraFlow);
  const calBody = h('tbody');
  const context = h(
    'section',
    { class: 'ad-context' },
    h('div', { class: 'ad-block-head' }, h('h2', { text: A.contextTitle }), tag('demo')),
    h('p', { class: 'ad-note', text: A.contextNote }),
    h(
      'div',
      { class: 'ad-context-grid' },
      h('div', { class: 'ad-card ad-river' }, h('h3', {}, A.riverTitle, ' ', tag('demo')), riverNote, h('div', { class: 'ad-chart' }, canvas), riverNow),
      h(
        'div',
        { class: 'ad-side' },
        h(
          'div',
          { class: 'ad-card' },
          h('h3', {}, A.releaseTitle, ' ', tag('demo')),
          h('p', { text: A.release(fmtDate(UPSTREAM_RELEASE.start), fmtDate(UPSTREAM_RELEASE.end), fmtFlow, UPSTREAM_RELEASE.peakRiseCm) }),
          h('p', { class: 'ad-note', text: A.releaseEffect }),
        ),
        h(
          'div',
          { class: 'ad-card' },
          h('h3', {}, A.calTitle, ' ', tag('demo')),
          h('table', { class: 'ad-cal' }, h('thead', {}, h('tr', {}, ...A.calCols.map((c) => h('th', { scope: 'col', text: c })))), calBody),
          h('p', { class: 'ad-note', text: A.calDeadline(fmtDate(SEASON_DEADLINE)) }),
        ),
      ),
    ),
  );
  const method = h('details', { class: 'ad-method' }, h('summary', { text: A.methodTitle }), h('ol', {}, ...A.method.map((m) => h('li', { text: m }))));

  const dataSec = adviceDataSection(all, () => toRows(advice)) as HTMLElement & { refresh?: () => void };
  sowingBox.append(kpis, filterLine, h('section', { class: 'ad-results' }, count, list, more));
  root.replaceChildren(head, banner, controls, topicBar, sowingBox, topicHost, context, dataSec, method, status);
  function renderTopics() {
    topicBar.replaceChildren(
      ...TOPICS.map((tp) => {
        const b = h('button', { type: 'button', role: 'tab', class: 'ad-topic-btn', 'aria-selected': String(tp.id === topic) }, h('b', { text: tp.label }), h('small', { text: tp.sub }));
        b.addEventListener('click', () => {
          topic = tp.id;
          renderTopics();
          renderTopicBody();
        });
        return b;
      }),
    );
  }
  function renderTopicBody() {
    sowingBox.hidden = topic !== 'sowing';
    topicHost.hidden = topic === 'sowing';
    if (topic !== 'sowing') topicHost.replaceChildren(renderTopic(topic, inScope(), extras, evalDate));
  }

  // ---------- events ----------
  dateIn.addEventListener('change', () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateIn.value)) {
      evalDate = dateIn.value;
      render();
    }
  });
  provSel.addEventListener('change', () => {
    province = provSel.value;
    expanded = false;
    render();
  });
  search.addEventListener('input', () => {
    query = search.value;
    expanded = false;
    renderList();
  });
  more.addEventListener('click', () => {
    expanded = !expanded;
    renderList();
  });
  exportBtn.addEventListener('click', () => {
    const rows = toRows(filtered());
    const name = `khuyen-nghi-xuong-giong_${evalDate}${province ? '_' + fold(province).replace(/\s+/g, '-') : ''}.csv`;
    downloadText(name, Papa.unparse(rows));
    status.textContent = A.exported(name);
  });
  function toRows(list: Advice[]) {
    return list.map((a) => ({
      osm_id: a.p.osm_id,
      xa: a.p.name,
      tinh: a.p.province,
      quyet_dinh: A.decision[a.decision],
      khuyen_nghi: headline(a),
      ngay_danh_gia: evalDate,
      nuoc_anh_gan_nhat_pct: a.p.last_pct ?? '',
      ngay_anh_gan_nhat: a.p.last_date ?? '',
      quy_dao: a.p.reference_track ?? '',
      toc_do_rut_pct_ngay: a.ratePerDay === null ? '' : Math.round(-a.ratePerDay * 100) / 100,
      ngay_kho_uoc_tinh: a.dryDate ?? '',
      ngay_san_sang: a.readyDate ?? '',
      ngay_xuong_giong_de_xuat: a.sowDate ?? '',
      khung_ne_ray_demo: `${a.cal.windowStart}..${a.cal.windowEnd}`,
      ghi_chu: 'Lich ne ray, muc nuoc song va xa lu la du lieu demo gia dinh',
    }));
  }

  function openCommune(p: CommuneProps) {
    set({ tab: 'map', mapMode: 'latest', activeSummary: null, playing: false, selectedCommune: p.osm_id, flyNonce: state.flyNonce + 1 });
    location.hash = 'map';
  }

  function inScope(): Advice[] {
    return advice.filter((a) => !province || a.p.province === province);
  }
  function filtered(): Advice[] {
    const q = fold(query.trim());
    return inScope()
      .filter((a) => (!only || a.decision === only) && (!q || fold(a.p.name).includes(q)))
      .sort((x, y) => ORDER[x.decision] - ORDER[y.decision] || (y.days ?? 0) - (x.days ?? 0) || x.p.name.localeCompare(y.p.name, 'vi'));
  }

  function renderKpis() {
    const scope = inScope();
    kpis.replaceChildren(
      ...DECISIONS.map((d) => {
        const n = scope.filter((a) => a.decision === d).length;
        const b = h(
          'button',
          { type: 'button', class: `ad-kpi ad-${d}`, 'aria-pressed': String(only === d) },
          h('span', { class: 'ad-kpi-n', text: fmtNum(n) }),
          h('span', { class: 'ad-kpi-label', text: A.decision[d] }),
          h('span', { class: 'ad-kpi-sub', text: A.decisionSub[d] }),
        );
        b.addEventListener('click', () => {
          only = only === d ? null : d;
          expanded = false;
          renderKpis();
          renderList();
        });
        return b;
      }),
    );
    filterLine.replaceChildren();
    if (only) {
      const clear = h('button', { type: 'button', class: 'ad-linkbtn', text: A.showAllDecisions });
      clear.addEventListener('click', () => {
        only = null;
        renderKpis();
        renderList();
      });
      filterLine.append(h('span', { text: A.filterBy(A.decision[only]) }), ' · ', clear);
    }
  }

  function card(a: Advice): HTMLElement {
    const p = a.p;
    const mapBtn = h('button', { type: 'button', class: 'ad-linkbtn', text: A.openMap });
    mapBtn.addEventListener('click', () => openCommune(p));
    const water = a.estPct ?? p.last_pct;
    return h(
      'article',
      { class: `ad-row ad-${a.decision}` },
      h(
        'div',
        { class: 'ad-row-main' },
        h('div', { class: 'ad-row-title' }, h('h3', { text: p.name }), h('span', { class: 'ad-prov', text: p.province })),
        h('span', { class: `ad-badge ad-${a.decision}`, text: badgeText(a) }),
        h('p', { class: 'ad-action', text: headline(a) }),
        h('ul', { class: 'ad-why' }, ...reasons(a).map((r) => h('li', {}, h('span', { class: `ad-dot ad-dot-${r.src}`, title: r.src === 'real' ? A.tagRealTip : A.tagDemoTip, 'aria-label': r.src === 'real' ? A.tagReal : A.tagDemo }), r.text))),
        extras.get(p.osm_id) ? extraChips(extras.get(p.osm_id)!) : null,
      ),
      h(
        'dl',
        { class: 'ad-row-facts' },
        h('div', {}, h('dt', {}, A.colWater, ' ', tag('real')), h('dd', {}, h('strong', { text: water === null || water === undefined ? '—' : fmtPct(Math.round(water)) }), h('small', { text: A.colWaterSub }))),
        h('div', {}, h('dt', {}, A.colWindow, ' ', tag('demo')), h('dd', { text: `${fmtShort(a.cal.windowStart)} – ${fmtShort(a.cal.windowEnd)}` })),
        h('div', {}, h('dd', {}, mapBtn)),
      ),
    );
  }

  function renderList() {
    const rows = filtered();
    const visible = expanded ? rows : rows.slice(0, INITIAL_ROWS);
    count.textContent = A.count(visible.length, rows.length);
    list.replaceChildren(...visible.map(card));
    if (!rows.length) list.append(h('p', { class: 'ad-empty', text: A.empty }));
    more.hidden = rows.length <= INITIAL_ROWS;
    more.textContent = expanded ? A.showLess : A.showAll(rows.length);
  }

  function renderCalendar() {
    const counts = new Map<string, number>();
    for (const p of all) {
      const label = advice.find((a) => a.p === p)?.cal.label ?? p.province;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    calBody.replaceChildren(
      ...CALENDARS.filter((c) => counts.has(c.label)).map((c) =>
        h('tr', {}, h('th', { scope: 'row', text: c.label }), h('td', { text: `${fmtShort(c.windowStart)} – ${fmtShort(c.windowEnd)}` }), h('td', { class: 'num', text: fmtNum(counts.get(c.label) ?? 0) })),
      ),
    );
  }

  function renderRiver() {
    chart?.destroy();
    riverNote.textContent = A.riverNote(fmtDate(evalDate));
    const colors = { tanchau: '#1d4ed8', chaudoc: '#0f766e' };
    const datasets = STATIONS.flatMap((s) => {
      const lv = stationLevels(s.id);
      const past = lv.filter((d) => d.date <= evalDate).map((d) => ({ x: Date.parse(d.date), y: d.level }));
      const future = lv.filter((d) => d.date >= evalDate).map((d) => ({ x: Date.parse(d.date), y: d.level }));
      return [
        { label: s.name, data: past, borderColor: colors[s.id], backgroundColor: colors[s.id], borderWidth: 2, pointRadius: 0, tension: 0.2 },
        { label: `${s.name} (${lang === 'vi' ? 'dự báo' : 'forecast'})`, data: future, borderColor: colors[s.id], backgroundColor: colors[s.id], borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0.2 },
      ];
    });
    const releaseBand = {
      id: 'releaseBand',
      beforeDatasetsDraw(c: Chart) {
        const x = c.scales.x;
        const area = c.chartArea;
        const x0 = x.getPixelForValue(Date.parse(UPSTREAM_RELEASE.start));
        const x1 = x.getPixelForValue(Date.parse(addDays(UPSTREAM_RELEASE.end, 1)));
        const xe = x.getPixelForValue(Date.parse(evalDate));
        const ctx = c.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(234, 88, 12, 0.12)';
        ctx.fillRect(x0, area.top, x1 - x0, area.bottom - area.top);
        ctx.strokeStyle = '#64748b';
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(xe, area.top);
        ctx.lineTo(xe, area.bottom);
        ctx.stroke();
        ctx.restore();
      },
    };
    chart = new Chart(canvas, {
      type: 'line',
      data: { datasets },
      plugins: [releaseBand],
      options: {
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: { type: 'time', min: Date.parse(LEVEL_FROM), max: Date.parse(LEVEL_TO), adapters: chartAdapters, time: { unit: 'week', tooltipFormat: 'dd/MM/yyyy', displayFormats: { week: 'dd/MM' } }, grid: { display: false } },
          y: { title: { display: true, text: 'm' } },
        },
        plugins: { legend: { labels: { filter: (item) => !String(item.text).includes('('), boxHeight: 2 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.y ?? 0)} m` } } },
      },
    });
    riverNow.replaceChildren(
      ...STATIONS.map((s) => {
        const lv = stationLevels(s.id);
        const now = lv.find((d) => d.date === evalDate) ?? lv.at(-1)!;
        const before = lv.find((d) => d.date === addDays(evalDate, -7)) ?? lv[0];
        const delta = Math.round((now.level - before.level) * 100);
        return h('li', { text: A.riverNow(`${s.name} (${s.river})`, fmtNum(now.level), `${delta > 0 ? '+' : ''}${fmtNum(delta)}`) });
      }),
    );
  }

  function render() {
    advice = adviseAll(all, evalDate);
    extras = computeExtras(advice, evalDate);
    renderTopics();
    renderTopicBody();
    renderKpis();
    renderList();
    renderCalendar();
    renderRiver();
    dataSec.refresh?.();
  }

  window.addEventListener('hashchange', () => requestAnimationFrame(() => chart?.resize()));
  render();
}
