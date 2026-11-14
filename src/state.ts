import type { SummaryLayer, Track } from './data/types.ts';

export type Tab = 'overview' | 'map' | 'reports' | 'validation' | 'about';
export type TrackFilter = 'all' | Track;
export type SummaryId = SummaryLayer['id'] | null;

export interface LayerToggles {
  basemap: boolean;
  radar: boolean;
  water: boolean;
  communes: boolean;
  provinces: boolean;
}

export interface Opacities {
  radar: number;
  water: number;
  communes: number;
}

export interface State {
  tab: Tab;
  mapMode: 'latest' | 'scene';
  trackFilter: TrackFilter;
  selectedDate: string;
  selectedTrack: Track;
  selectedCommune: string | null;
  /** Incremented to ask the map to fly to the selected commune. */
  flyNonce: number;
  activeSummary: SummaryId;
  layers: LayerToggles;
  opacity: Opacities;
  playing: boolean;
  radarMissing: boolean;
}

function restoredSnapshot(): Partial<State> {
  try {
    const raw = sessionStorage.getItem('waterpulse.snapshot');
    if (!raw) return {};
    sessionStorage.removeItem('waterpulse.snapshot');
    return JSON.parse(raw) as Partial<State>;
  } catch {
    return {};
  }
}

export const state: State = {
  tab: 'overview',
  mapMode: 'latest',
  trackFilter: 'all',
  selectedDate: '',
  selectedTrack: '148D',
  selectedCommune: null,
  flyNonce: 0,
  activeSummary: null,
  layers: { basemap: true, radar: true, water: true, communes: true, provinces: true },
  opacity: { radar: 0.85, water: 0.9, communes: 0.6 },
  playing: false,
  radarMissing: false,
  ...restoredSnapshot(),
};

type Listener = (s: State, prev: State) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function set(patch: Partial<State>): void {
  const prev = { ...state };
  let changed = false;
  for (const key of Object.keys(patch) as (keyof State)[]) {
    if (state[key] !== patch[key]) changed = true;
  }
  if (!changed) return;
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state, prev));
}
