import * as maplibregl from 'maplibre-gl';
import { AOI, BASEMAP } from '../config.ts';
import { getGeo } from '../data/dataSource.ts';
import { T } from '../i18n.ts';
import type { Bounds, Scene, SummaryLayer } from '../data/types.ts';
import type { ViewMode } from '../state.ts';
import { PROVINCE_LABELS } from './provinceLabels.ts';

const FONT = ['Noto Sans Regular'];

export function baseStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: `${location.origin}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      basemap: {
        type: 'raster',
        tiles: BASEMAP.tiles,
        tileSize: 256,
        maxzoom: BASEMAP.maxzoom,
        attribution: BASEMAP.attribution,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#cfdde8' } },
      { id: 'basemap', type: 'raster', source: 'basemap' },
    ],
  };
}

export function coordsOf(b: Bounds): [[number, number], [number, number], [number, number], [number, number]] {
  const [w, s, e, n] = b;
  return [
    [w, n],
    [e, n],
    [e, s],
    [w, s],
  ];
}

const FADE_MS = 450;
const radarUrlOf = (scene: Scene) => scene.radarJpg ?? scene.waterPng.replace('/water/', '/radar/').replace(/\.png$/, '.jpg');

/** Image URLs for a scene: blended frames when the data has them (simple view: one-colour water only), else the single acquisition. */
export function sceneImageUrls(scene: Scene, mode: ViewMode): { radar: string; water: string } {
  const c = scene.composite;
  if (c) return { radar: c.radar, water: mode === 'simple' ? c.simplePng : c.png };
  return { radar: radarUrlOf(scene), water: scene.waterPng };
}

/** Fire-and-forget request that puts an image in the HTTP cache so a later swap does not wait on the network. */
export function warmImage(url: string): void {
  void fetch(url).catch(() => undefined);
}

/**
 * Two stacked image layers; a new image is decoded off-screen, put on the hidden layer and cross-faded in,
 * so playback never shows an empty frame or a hard cut.
 */
export class CrossfadeImage {
  private front = 0;
  private token = 0;
  private current: string;
  private opacity: number;
  private map: maplibregl.Map;
  private id: string;
  private sourceId: string;
  private coordinates: ReturnType<typeof coordsOf>;
  private onError?: () => void;

  constructor(
    map: maplibregl.Map,
    id: string,
    sourceId: string,
    url: string,
    coordinates: ReturnType<typeof coordsOf>,
    opacity: number,
    onError?: () => void,
  ) {
    this.map = map;
    this.id = id;
    this.sourceId = sourceId;
    this.coordinates = coordinates;
    this.onError = onError;
    this.current = url;
    this.opacity = opacity;
    for (const k of [0, 1]) {
      map.addSource(this.src(k), { type: 'image', url, coordinates });
      map.addLayer({
        id: this.layer(k),
        type: 'raster',
        source: this.src(k),
        paint: { 'raster-opacity': k === 0 ? opacity : 0, 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: FADE_MS, delay: 0 } },
      });
    }
  }

  private src = (k: number) => (k === 0 ? this.sourceId : `${this.sourceId}-b`);
  private layer = (k: number) => (k === 0 ? this.id : `${this.id}-b`);
  private fade(k: number, to: number, ms: number) {
    this.map.setPaintProperty(this.layer(k), 'raster-opacity-transition', { duration: ms, delay: 0 });
    this.map.setPaintProperty(this.layer(k), 'raster-opacity', to);
  }

  setVisible(on: boolean) {
    for (const k of [0, 1]) if (this.map.getLayer(this.layer(k))) this.map.setLayoutProperty(this.layer(k), 'visibility', on ? 'visible' : 'none');
  }

  setOpacity(v: number) {
    this.opacity = v;
    this.fade(this.front, v, 0);
  }

  async show(url: string, instant = false): Promise<void> {
    if (url === this.current) return;
    const token = ++this.token;
    let bitmap: ImageBitmap;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bitmap = await createImageBitmap(await res.blob());
    } catch {
      if (token === this.token) this.onError?.();
      return;
    }
    if (token !== this.token) return; // a newer frame was requested while this one loaded
    this.current = url;
    const back = 1 - this.front;
    (this.map.getSource(this.src(back)) as maplibregl.ImageSource).updateImage({ image: bitmap, coordinates: this.coordinates });
    const ms = instant ? 0 : FADE_MS;
    this.fade(this.front, 0, ms);
    this.fade(back, this.opacity, ms);
    this.front = back;
  }
}

export interface SceneImages {
  radar: CrossfadeImage;
  water: CrossfadeImage;
}

/** Adds the team's radar + water layers (cross-fading) and the SWOT comparison layer. */
export function addImageLayers(map: maplibregl.Map, scene: Scene, mode: ViewMode, onRadarError: () => void): SceneImages {
  // [Codex] Use the team's aligned local image instead of inconsistent GIBS tiles.
  const urls = sceneImageUrls(scene, mode);
  const coords = coordsOf(scene.bounds);
  const radar = new CrossfadeImage(map, 'radar', 'radar-image', urls.radar, coords, 0.85, onRadarError);
  const water = new CrossfadeImage(map, 'water', 'water', urls.water, coords, 0.9);
  // [Claude] SWOT comparison map (orange), drawn above our water layer; hidden when the scene has no SWOT pass nearby.
  map.addSource('swot', { type: 'image', url: scene.swot?.png ?? scene.waterPng, coordinates: coords });
  map.addLayer({ id: 'swot', type: 'raster', source: 'swot', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 } });
  return { radar, water };
}

export function setSwotScene(map: maplibregl.Map, scene: Scene): void {
  if (scene.swot) (map.getSource('swot') as maplibregl.ImageSource | undefined)?.updateImage({ url: scene.swot.png, coordinates: coordsOf(scene.bounds) });
}

export function setSummaryLayer(map: maplibregl.Map, layer: SummaryLayer | null): void {
  if (!layer) return;
  const coordinates = coordsOf(layer.bounds);
  const existing = map.getSource('summary') as maplibregl.ImageSource | undefined;
  if (existing) {
    existing.updateImage({ url: layer.png, coordinates });
    return;
  }
  map.addSource('summary', { type: 'image', url: layer.png, coordinates });
  map.addLayer({ id: 'summary', type: 'raster', source: 'summary', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, 'communes-fill');
}

function labelCollection(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: PROVINCE_LABELS.map((p) => ({
      type: 'Feature',
      properties: { name: p.country ? T.country : p.name, country: !!p.country },
      geometry: { type: 'Point', coordinates: p.lngLat },
    })),
  };
}

/** Province lines, national boundary, province labels, AOI frame and Hoàng Sa / Trường Sa labels. */
export async function addGeoLayers(map: maplibregl.Map): Promise<void> {
  const [provinces, boundary, islands] = await Promise.all([getGeo('provinces'), getGeo('boundary'), getGeo('islands')]);

  map.addSource('provinces', { type: 'geojson', data: provinces });
  map.addSource('boundary', { type: 'geojson', data: boundary });
  map.addSource('islands', { type: 'geojson', data: islands });
  map.addSource('province-labels', { type: 'geojson', data: labelCollection() });
  map.addSource('aoi', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[AOI[0], AOI[1]], [AOI[2], AOI[1]], [AOI[2], AOI[3]], [AOI[0], AOI[3]], [AOI[0], AOI[1]]]] },
    },
  });

  map.addLayer({
    id: 'provinces',
    type: 'line',
    source: 'provinces',
    paint: { 'line-color': '#475569', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.4], 'line-dasharray': [3, 2], 'line-opacity': 0.85 },
  });
  map.addLayer({
    id: 'province-labels',
    type: 'symbol',
    source: 'province-labels',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': ['case', ['get', 'country'], 11, 13],
      'text-letter-spacing': ['case', ['get', 'country'], 0.2, 0.04],
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#334155', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 },
  });
  map.addLayer({
    id: 'boundary',
    type: 'line',
    source: 'boundary',
    paint: { 'line-color': '#1e293b', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 10, 1.8] },
  });
  map.addLayer({
    id: 'aoi',
    type: 'line',
    source: 'aoi',
    paint: { 'line-color': '#0f2a4a', 'line-width': 1.5, 'line-dasharray': [6, 3] },
  });
  map.addLayer({
    id: 'islands-frame',
    type: 'line',
    source: 'islands',
    filter: ['==', ['get', 'kind'], 'archipelago-frame'],
    maxzoom: 9,
    paint: { 'line-color': '#64748b', 'line-width': 1, 'line-dasharray': [2, 2] },
  });
  map.addLayer({
    id: 'islands-label',
    type: 'symbol',
    source: 'islands',
    filter: ['==', ['get', 'kind'], 'archipelago-label'],
    layout: {
      'text-field': ['concat', ['get', 'label'], '\n', ['coalesce', ['get', 'subtitle'], '']],
      'text-font': FONT,
      'text-size': 11,
      'text-letter-spacing': 0.08,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#0f2a4a', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.8 },
  });
  map.addLayer({
    id: 'islands',
    type: 'symbol',
    source: 'islands',
    filter: ['==', ['get', 'kind'], 'island'],
    minzoom: 7,
    layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 10.5, 'text-anchor': 'top', 'text-offset': [0, 0.5] },
    paint: { 'text-color': '#334155', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.5 },
  });
}
