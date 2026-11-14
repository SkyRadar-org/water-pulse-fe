import { getChoropleth, getCommunes, getCompositeChoropleth } from '../data/dataSource.ts';
import { hasAssessment } from '../data/observations.ts';
import type { Scene } from '../data/types.ts';
import { fmtDate } from '../format.ts';
import { T } from '../i18n.ts';
import { set, state, subscribe } from '../state.ts';
import { h } from './dom.ts';

/** [Codex] Explain the time and coverage of the visible map before users interpret it. */
export async function mountMapContext(host: HTMLElement, scenes: Scene[]): Promise<void> {
  const collection = await getCommunes();
  const assessed = collection.features.filter(f => hasAssessment(f.properties));
  const dates = assessed.map(f => f.properties.last_date!).sort();
  const title = h('h1');
  const note = h('p', { role: 'status', 'aria-live': 'polite' });
  const latest = h('button', { type: 'button', text: T.map.latestMode });
  const scene = h('button', { type: 'button', text: T.map.sceneMode });
  latest.addEventListener('click', () => set({ mapMode: 'latest', activeSummary: null, playing: false }));
  scene.addEventListener('click', () => set({ mapMode: 'scene', activeSummary: null, playing: false }));
  host.className = 'map-context';
  host.append(h('div', { class: 'map-context-heading' }, title,
    h('div', { class: 'map-mode', role: 'group', 'aria-label': T.map.modeLabel }, latest, scene)), note);
  let token = 0;
  async function render() {
    const my = ++token;
    const isLatest = state.mapMode === 'latest';
    latest.setAttribute('aria-pressed', String(isLatest));
    scene.setAttribute('aria-pressed', String(!isLatest));
    if (isLatest) {
      title.textContent = T.map.latestTitle;
      note.textContent = T.map.latestCoverage(assessed.length, collection.features.length, fmtDate(dates[0] ?? null), fmtDate(dates.at(-1) ?? null));
      return;
    }
    const current = scenes.find(s => s.date === state.selectedDate && s.track === state.selectedTrack);
    if (!current) return;
    title.textContent = T.map.sceneTitle(fmtDate(current.date), current.track);
    note.textContent = T.map.coverageLoading;
    try {
      if (current.composite) {
        const mosaic = await getCompositeChoropleth(current.date, current.track);
        if (mosaic) {
          if (my === token) note.textContent = T.map.blendCoverage(Object.keys(mosaic).length, collection.features.length);
          return;
        }
      }
      const values = await getChoropleth(current.date, current.track);
      if (my === token) note.textContent = T.map.sceneCoverage(Object.keys(values).length, collection.features.length);
    } catch {
      if (my === token) note.textContent = T.app.loadError;
    }
  }
  subscribe((s, prev) => {
    if (s.mapMode !== prev.mapMode || s.selectedDate !== prev.selectedDate || s.selectedTrack !== prev.selectedTrack) void render();
  });
  await render();
}
