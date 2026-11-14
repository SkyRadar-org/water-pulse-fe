import type { Scene } from '../data/types.ts';
import { set, state } from '../state.ts';

/** One entry point shared by the overview, About and first-visit hero. */
export function exploreSeason(scenes: Scene[]): void {
  const ordered = [...scenes].sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track));
  const first = ordered.find(s => s.date >= '2026-08-01') ?? ordered[0];
  if (!first) return;
  set({ playing: false });
  set({
    tab: 'map', mapMode: 'scene', viewMode: first.composite ? 'simple' : 'pro',
    selectedDate: first.date, selectedTrack: first.track, trackFilter: 'all',
    selectedCommune: null, activeSummary: null, cut: true,
    layers: { ...state.layers, basemap: true, water: true, communes: true },
    mapResetNonce: state.mapResetNonce + 1, playing: true,
  });
  location.hash = 'map';
}
