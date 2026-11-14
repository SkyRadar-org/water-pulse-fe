import type { CommuneStatus, Maturity, Track } from './data/types.ts';
import { T } from './i18n.ts';

export const CHORO_COLORS = ['#f1f5f9', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'] as const;
export const CHORO_LABELS = ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'] as const;
export const NO_DATA_COLOR = '#e5e7eb';

export const TRACK_COLORS: Record<Track, string> = {
  '047D': '#2563eb',
  '083A': '#ea580c',
  '148D': '#7c3aed',
};

export const STATUS_LABEL = (s: CommuneStatus): string => T.status[s].long;
export const STATUS_SHORT = (s: CommuneStatus): string => T.status[s].short;
export const STATUS_ICON = (s: CommuneStatus): string => T.status[s].icon;
export const MATURITY_LABEL = (m: Maturity): string => T.maturity[m];
