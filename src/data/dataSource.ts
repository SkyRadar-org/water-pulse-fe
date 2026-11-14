import { API_BASE, DATA_MODE, STATIC_BASE } from '../config.ts';
import type {
  AreaPoint,
  Choropleth,
  CommuneCollection,
  CommuneProps,
  CompositeChoropleth,
  Scene,
  SeriesPoint,
  SummaryLayer,
  Track,
  Validation,
} from './types.ts';

const MOCK_BASE = '/mock';
const base = DATA_MODE === 'api' ? API_BASE : DATA_MODE === 'static' ? STATIC_BASE : MOCK_BASE;

/** Relative asset URLs (PNG) are resolved against the active data base; absolute ones are kept. */
export function resolveAsset(url: string): string {
  if (/^([a-z]+:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return DATA_MODE === 'api' ? `${base}${url}` : url;
  return `${base}/${url}`;
}

function endpoint(name: string, params?: Record<string, string>): string {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  if (DATA_MODE === 'api') {
    const paths: Record<string, string> = {
      scenes: '/api/scenes',
      communes: '/api/communes',
      area: '/api/area',
      summary: '/api/summary',
      validation: '/api/validation',
      choropleth: '/api/choropleth',
      'choropleth-composite': '/api/choropleth/composite',
    };
    if (name.startsWith('series:')) return `${base}/api/frontend/communes/${encodeURIComponent(name.slice(7))}/series`;
    return `${base}${paths[name].replace('/api/', '/api/frontend/')}${q}`;
  }
  if (name.startsWith('series:')) return `${base}/series/${encodeURIComponent(name.slice(7))}.json`;
  if (name === 'choropleth') return `${base}/choropleth/${params!.date}_${params!.track}.json`;
  if (name === 'choropleth-composite') return `${base}/choropleth-composite/${params!.date}_${params!.track}.json`;
  const files: Record<string, string> = {
    scenes: 'scenes.json',
    communes: 'communes.geojson',
    area: 'area.json',
    summary: 'summary.json',
    validation: 'validation.json',
  };
  return `${base}/${files[name]}`;
}

const cache = new Map<string, Promise<unknown>>();

function load<T>(fn: string, key: string, url: string): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} for ${url}`);
      return res.json() as Promise<T>;
    })
    .catch((err: unknown) => {
      cache.delete(key); // allow retry
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg.startsWith(fn) ? msg : `${fn}: ${msg}`);
    });
  cache.set(key, p);
  return p;
}

export function getScenes(): Promise<Scene[]> {
  return load<Scene[]>('getScenes', 'scenes', endpoint('scenes')).then((list) =>
    list.map((s) => ({
      ...s,
      waterPng: resolveAsset(s.waterPng),
      radarJpg: s.radarJpg ? resolveAsset(s.radarJpg) : s.radarJpg,
      composite: s.composite ? { ...s.composite, png: resolveAsset(s.composite.png), simplePng: resolveAsset(s.composite.simplePng), radar: resolveAsset(s.composite.radar) } : null,
    })).sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track)),
  );
}

export function getCommunes(): Promise<CommuneCollection> {
  return load<CommuneCollection>('getCommunes', 'communes', endpoint('communes'));
}

export function getCommuneSeries(osmId: string): Promise<SeriesPoint[]> {
  return load<SeriesPoint[]>('getCommuneSeries', `series:${osmId}`, endpoint(`series:${osmId}`));
}

export function getChoropleth(date: string, track: Track): Promise<Choropleth> {
  return load<Choropleth>('getChoropleth', `choropleth:${date}:${track}`, endpoint('choropleth', { date, track }));
}

/** Latest observation per commune up to the scene date (blended playback); null when the data source has none (mock). */
export function getCompositeChoropleth(date: string, track: Track): Promise<CompositeChoropleth | null> {
  return load<CompositeChoropleth>('getCompositeChoropleth', `choropleth-composite:${date}:${track}`, endpoint('choropleth-composite', { date, track })).catch(() => null);
}

export function getArea(): Promise<AreaPoint[]> {
  return load<AreaPoint[]>('getArea', 'area', endpoint('area'));
}

export function getSummaryLayers(): Promise<SummaryLayer[]> {
  return load<SummaryLayer[]>('getSummaryLayers', 'summary', endpoint('summary')).then((list) =>
    list.map((l) => ({ ...l, png: resolveAsset(l.png) })),
  );
}

export function getValidation(): Promise<Validation> {
  return load<Validation>('getValidation', 'validation', endpoint('validation'));
}

export function communePropsList(c: CommuneCollection): CommuneProps[] {
  return c.features.map((f) => f.properties);
}

const GEO_URLS = {
  provinces: '/geo/vn-provinces.v1.geojson',
  boundary: '/geo/vn-boundary.v1.geojson',
  islands: '/geo/vn-islands-labels.v1.geojson',
  pending: '/geo/mekong-pending.v1.geojson',
} as const;

/** Static GeoJSON overlays shipped with the app (province lines, national boundary, archipelago labels). */
export function getGeo(name: keyof typeof GEO_URLS): Promise<GeoJSON.FeatureCollection> {
  return load<GeoJSON.FeatureCollection>('getGeo', `geo:${name}`, GEO_URLS[name]);
}
