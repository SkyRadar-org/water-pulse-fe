import * as maplibregl from 'maplibre-gl';
import { AOI, BASEMAP } from '../config.ts';
import { getGeo } from '../data/dataSource.ts';
import { T } from '../i18n.ts';
import type { Bounds, Scene, SummaryLayer } from '../data/types.ts';
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

/** Adds the team's water layer (per scene) and the season summary layer. */
export function addImageLayers(map: maplibregl.Map, scene: Scene): void {
  // [Codex] Use the team's aligned local image instead of inconsistent GIBS tiles.
  map.addSource('radar-image', { type: 'image', url: scene.radarJpg ?? scene.waterPng.replace('/water/', '/radar/').replace(/\.png$/, '.jpg'), coordinates: coordsOf(scene.bounds) });
  map.addLayer({ id: 'radar', type: 'raster', source: 'radar-image', paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 } });
  map.addSource('water', { type: 'image', url: scene.waterPng, coordinates: coordsOf(scene.bounds) });
  map.addLayer({ id: 'water', type: 'raster', source: 'water', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } });
}

export function setWaterScene(map: maplibregl.Map, scene: Scene): void {
  const radar = map.getSource('radar-image') as maplibregl.ImageSource | undefined;
  radar?.updateImage({ url: scene.radarJpg ?? scene.waterPng.replace('/water/', '/radar/').replace(/\.png$/, '.jpg'), coordinates: coordsOf(scene.bounds) });
  const src = map.getSource('water') as maplibregl.ImageSource | undefined;
  src?.updateImage({ url: scene.waterPng, coordinates: coordsOf(scene.bounds) });
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
