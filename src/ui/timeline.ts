import { PLAY_INTERVAL_MS } from '../config.ts';
import type { Scene, Track } from '../data/types.ts';
import { daysBetween, fmtDate, fmtShort, toMs } from '../format.ts';
import { T } from '../i18n.ts';
import { MATURITY_LABEL, TRACK_COLORS } from '../palette.ts';
import { set, state, subscribe, type State, type TrackFilter } from '../state.ts';
import { h } from './dom.ts';

const TRACKS: Track[] = ['047D', '083A', '148D'];
const SOWING = '2026-11-01';
const GAP_DAYS = 15;

export function mountTimeline(host: HTMLElement, scenes: Scene[]): void {
  const all = [...scenes].sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track));
  const minMs = toMs(all[0].date);
  const maxMs = Math.max(toMs(all[all.length - 1].date), toMs(SOWING)) + 4 * 86400000;
  const xPct = (date: string) => ((toMs(date) - minMs) / (maxMs - minMs)) * 100;

  const visible = (f: TrackFilter) => (f === 'all' ? all : all.filter((s) => s.track === f));
  const same = (a: Scene, b: { date: string; track: Track }) => a.date === b.date && a.track === b.track;
  const current = (s: State) => all.find((x) => same(x, { date: s.selectedDate, track: s.selectedTrack }));

  function select(scene: Scene) {
    set({ selectedDate: scene.date, selectedTrack: scene.track });
  }

  function setFilter(f: TrackFilter) {
    if (f === state.trackFilter) return;
    set({ trackFilter: f });
    if (f !== 'all' && state.selectedTrack !== f) {
      const pool = visible(f);
      const target = toMs(state.selectedDate);
      const nearest = pool.reduce((best, s) => (Math.abs(toMs(s.date) - target) < Math.abs(toMs(best.date) - target) ? s : best), pool[0]);
      select(nearest);
    }
  }

  function step(delta: number): boolean {
    const list = visible(state.trackFilter);
    const idx = list.findIndex((s) => same(s, { date: state.selectedDate, track: state.selectedTrack }));
    const next = list[idx + delta];
    if (!next) return false;
    select(next);
    return true;
  }

  // ---- play ----
  let timer: number | undefined;
  function stop() {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    if (state.playing) set({ playing: false });
  }
  function play() {
    const list = visible(state.trackFilter);
    const idx = list.findIndex((s) => same(s, { date: state.selectedDate, track: state.selectedTrack }));
    if (idx >= list.length - 1) select(list[0]);
    set({ playing: true });
    timer = window.setInterval(() => {
      if (!step(1)) stop();
    }, PLAY_INTERVAL_MS);
  }

  // ---- DOM ----
  const playBtn = h('button', { class: 'tl-play', type: 'button', 'aria-label': T.timeline.play });
  const dateEl = h('div', { class: 'tl-date' });
  const trackEl = h('span', { class: 'tl-track' });
  const maturityEl = h('span', { class: 'maturity' });
  const infoEl = h('div', { class: 'tl-info' });
  const summaryNote = h('div', { class: 'tl-summary-note', text: T.timeline.summaryNote });

  const seg = h('div', { class: 'tl-seg', role: 'group', 'aria-label': T.timeline.trackGroup, title: T.timeline.trackHelp });
  const segBtns = new Map<TrackFilter, HTMLButtonElement>();
  for (const f of ['all', ...TRACKS] as TrackFilter[]) {
    const b = h('button', { type: 'button', text: f === 'all' ? T.timeline.all : f });
    if (f !== 'all') b.style.setProperty('--dot', TRACK_COLORS[f]);
    b.addEventListener('click', () => setFilter(f));
    segBtns.set(f, b);
    seg.append(b);
  }
  const collapseBtn = h('button', { class: 'tl-collapse', type: 'button', 'aria-label': T.timeline.collapse, title: T.timeline.collapse }, '▾');

  const head = h(
    'div',
    { class: 'tl-head' },
    playBtn,
    h('div', { class: 'tl-now' }, dateEl, h('div', { class: 'tl-meta' }, trackEl, maturityEl)),
    infoEl,
    h('div', { class: 'tl-spacer' }),
    seg,
    collapseBtn,
  );

  const plot = h('div', { class: 'tl-plot' });
  const axis = h('div', { class: 'tl-axis' }, plot);
  const legend = h(
    'div',
    { class: 'tl-legend' },
    h('span', {}, h('i', { class: 'tl-key filled' }), T.timeline.validated),
    h('span', {}, h('i', { class: 'tl-key hollow' }), T.timeline.provisional),
    h('span', { class: 'tl-legend-note', text: T.timeline.note }),
  );
  const body = h('div', { class: 'tl-body' }, axis, legend);
  host.classList.add('timeline');
  host.append(head, summaryNote, body);

  const dots = new Map<string, HTMLButtonElement>();
  const key = (s: { date: string; track: Track }) => `${s.date}|${s.track}`;
  const playhead = h('div', { class: 'tl-playhead' });

  function buildPlot(filter: TrackFilter) {
    plot.replaceChildren();
    dots.clear();
    const grid = h('div', { class: 'tl-grid' });
    const sow = h('div', { class: 'tl-sow', style: `left:${xPct(SOWING)}%` });
    sow.append(h('span', { text: T.timeline.sowing }));
    grid.append(sow);
    for (let m = 6; m <= 10; m++) {
      const d = `2026-${String(m + 1).padStart(2, '0')}-01`;
      if (toMs(d) > minMs && toMs(d) < maxMs && d !== SOWING) grid.append(h('div', { class: 'tl-month', style: `left:${xPct(d)}%` }));
    }
    plot.append(grid);

    const lanes = filter === 'all' ? TRACKS : [filter as Track];
    for (const t of lanes) {
      const lane = h('div', { class: 'tl-lane' }, h('span', { class: 'tl-lane-label', text: t, style: `color:${TRACK_COLORS[t]}` }));
      const list = all.filter((s) => s.track === t);
      list.forEach((s, i) => {
        const prev = list[i - 1];
        if (prev && daysBetween(prev.date, s.date) > GAP_DAYS) {
          const gap = h('div', { class: 'tl-gap', style: `left:${xPct(prev.date)}%;width:${xPct(s.date) - xPct(prev.date)}%` }, h('span', { text: T.timeline.gap(daysBetween(prev.date, s.date)) }));
          lane.append(gap);
        }
      });
      for (const s of list) {
        const dot = h('button', {
          class: `tl-dot ${s.maturity}`,
          type: 'button',
          style: `left:${xPct(s.date)}%;--c:${TRACK_COLORS[s.track]}`,
          'aria-label': T.timeline.dotLabel(fmtDate(s.date), s.track, MATURITY_LABEL(s.maturity)),
          title: `${fmtDate(s.date)} · ${s.track} · ${MATURITY_LABEL(s.maturity)}`,
        });
        dot.addEventListener('click', () => {
          stop();
          select(s);
        });
        dots.set(key(s), dot);
        lane.append(dot);
      }
      plot.append(lane);
    }
    plot.append(playhead);

    const ticks = h('div', { class: 'tl-ticks' });
    for (const m of [6, 7, 8, 9, 10] as const) {
      const label = T.months[m];
      const d = `2026-${String(m + 1).padStart(2, '0')}-01`;
      if (toMs(d) < maxMs) ticks.append(h('span', { style: `left:${xPct(d)}%`, text: label }));
    }
    ticks.append(h('span', { class: 'tl-tick-start', style: `left:0%`, text: fmtShort(all[0].date) }));
    plot.append(ticks);
  }

  // scrubbing: pointer position -> nearest real acquisition date (never an interpolated one)
  let scrubbing = false;
  function scrub(ev: PointerEvent) {
    const rect = plot.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
    const ms = minMs + frac * (maxMs - minMs);
    const list = visible(state.trackFilter);
    const nearest = list.reduce((best, s) => (Math.abs(toMs(s.date) - ms) < Math.abs(toMs(best.date) - ms) ? s : best), list[0]);
    if (!same(nearest, { date: state.selectedDate, track: state.selectedTrack })) select(nearest);
  }
  plot.addEventListener('pointerdown', (ev) => {
    if (state.activeSummary) return;
    scrubbing = true;
    stop();
    plot.setPointerCapture(ev.pointerId);
    scrub(ev);
  });
  plot.addEventListener('pointermove', (ev) => {
    if (scrubbing) scrub(ev);
  });
  const endScrub = () => (scrubbing = false);
  plot.addEventListener('pointerup', endScrub);
  plot.addEventListener('pointercancel', endScrub);

  playBtn.addEventListener('click', () => (state.playing ? stop() : play()));
  collapseBtn.addEventListener('click', () => {
    const c = host.classList.toggle('collapsed');
    collapseBtn.textContent = c ? '▴' : '▾';
    window.dispatchEvent(new Event('resize'));
  });
  document.addEventListener('keydown', (ev) => {
    if (state.tab !== 'map' || state.activeSummary) return;
    const t = ev.target as HTMLElement;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && (t as HTMLInputElement).type !== 'checkbox' && (t as HTMLInputElement).type !== 'radio') return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      stop();
      step(ev.key === 'ArrowRight' ? 1 : -1);
    }
  });

  // ---- render ----
  let builtFor: TrackFilter | null = null;
  function render(s: State) {
    if (builtFor !== s.trackFilter) {
      buildPlot(s.trackFilter);
      builtFor = s.trackFilter;
    }
    const scene = current(s);
    for (const [f, b] of segBtns) b.setAttribute('aria-pressed', String(f === s.trackFilter));
    host.classList.toggle('summary-mode', s.activeSummary !== null);
    playBtn.textContent = s.playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', s.playing ? T.timeline.pause : T.timeline.play);
    if (!scene) return;
    dateEl.textContent = fmtDate(scene.date);
    trackEl.textContent = T.timeline.trackLabel(scene.track);
    trackEl.style.setProperty('--c', TRACK_COLORS[scene.track]);
    maturityEl.textContent = MATURITY_LABEL(scene.maturity);
    maturityEl.className = `maturity ${scene.maturity}`;
    const prev = [...all].reverse().find((x) => x.track === scene.track && x.date < scene.date);
    infoEl.textContent = prev
      ? T.timeline.daysAfter(daysBetween(prev.date, scene.date))
      : T.timeline.firstImage;
    const idx = visible(s.trackFilter).findIndex((x) => same(x, scene));
    infoEl.title = T.timeline.imageOf(idx + 1, visible(s.trackFilter).length);
    for (const [k, d] of dots) d.classList.toggle('selected', k === key(scene));
    playhead.style.left = `${xPct(scene.date)}%`;
  }

  subscribe((s) => render(s));
  render(state);
}
