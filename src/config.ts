/** Data source: 'mock' (public/mock), 'static' (public/data, exported by the backend) or 'api'. */
export type DataMode = 'mock' | 'static' | 'api';

export const DATA_MODE: DataMode = 'mock';
export const STATIC_BASE = '/data';
export const API_BASE = 'https://api.example.org';

export const MAP_CENTER: [number, number] = [105.47, 10.62];
export const MAP_ZOOM = 9;
/** AOI: [west, south, east, north] */
export const AOI: [number, number, number, number] = [104.95, 10.25, 106.0, 11.0];

/** Timeline playback speed (ms per frame). */
export const PLAY_INTERVAL_MS = 850;

/**
 * Light raster basemap. CARTO's free tiles now return "API KEY REQUIRED", so the default is
 * Esri World Light Gray (no key). Swap the template here if the team gets a CARTO key.
 */
export const BASEMAP = {
  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
  maxzoom: 16,
  attribution: 'Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors',
};
