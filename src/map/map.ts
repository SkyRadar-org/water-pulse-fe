import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { AOI, MAP_CENTER, MAP_ZOOM } from '../config.ts';
import { getChoropleth, getCommunes, getScenes, getSummaryLayers } from '../data/dataSource.ts';
import { T } from '../i18n.ts';
import type { Scene, SummaryLayer } from '../data/types.ts';
import { set, state, subscribe, type State } from '../state.ts';
import { addCommunes, type CommunesLayer } from './communesLayer.ts';
import { gibsTiles } from './gibs.ts';
import { addGeoLayers, addImageLayers, baseStyle, setSummaryLayer, setWaterScene } from './layers.ts';

export interface MapView {
  map: maplibregl.Map;
  resize(): void;
}

export function mountMap(container: HTMLElement): MapView {
  // maplibre-gl v6 locates its worker next to the library file, which breaks once bundled; point it at the bundled worker.
  maplibregl.setWorkerUrl(workerUrl);
  const map = new maplibregl.Map({
    container,
    style: baseStyle(state.selectedDate),
    center: MAP_CENTER,
    zoom: MAP_ZOOM,
    minZoom: 3,
    maxBounds: [
      [90, -2],
      [125, 30],
    ],
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  map.addControl({
    onAdd() {
      const box = document.createElement('div');
      box.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ctrl-fit';
      btn.title = T.map.fitTip;
      btn.setAttribute('aria-label', T.map.fitTip);
      btn.textContent = '⌖';
      btn.addEventListener('click', () => map.fitBounds([[AOI[0], AOI[1]], [AOI[2], AOI[3]]], { padding: 30 }));
      box.append(btn);
      return box;
    },
    onRemove() {},
  }, 'top-right');

  new ResizeObserver(() => map.resize()).observe(container);
  if (import.meta.env.DEV) (window as unknown as { __map: maplibregl.Map }).__map = map;

  let scenes: Scene[] = [];
  let summaries: SummaryLayer[] = [];
  let communes: CommunesLayer | null = null;
  let ready = false;
  let requestToken = 0;

  const sceneOf = (s: State) => scenes.find((x) => x.date === s.selectedDate && x.track === s.selectedTrack);

  function vis(id: string, on: boolean) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }

  function applyLook(s: State) {
    const summaryOn = s.activeSummary !== null;
    vis('basemap', s.layers.basemap);
    vis('radar', s.layers.radar && !summaryOn);
    vis('water', s.layers.water && !summaryOn);
    vis('summary', summaryOn);
    vis('provinces', s.layers.provinces);
    vis('province-labels', s.layers.provinces);
    communes?.setVisible(s.layers.communes);
    map.setPaintProperty('radar', 'raster-opacity', s.opacity.radar);
    if (map.getLayer('water')) map.setPaintProperty('water', 'raster-opacity', s.opacity.water);
    communes?.setOpacity(s.opacity.communes);
  }

  async function applyScene(s: State) {
    const scene = sceneOf(s);
    if (!scene) return;
    const token = ++requestToken;
    gibsLoaded = 0;
    gibsErrors = 0;
    (map.getSource('gibs') as maplibregl.RasterTileSource).setTiles(gibsTiles(scene.gibsDate ?? scene.date));
    set({ radarMissing: false });
    setWaterScene(map, scene);
    try {
      const values = await getChoropleth(scene.date, scene.track);
      if (token === requestToken) communes?.setChoropleth(values);
    } catch (err) {
      console.error(err);
    }
  }

  function applySummary(s: State) {
    const layer = summaries.find((l) => l.id === s.activeSummary) ?? null;
    setSummaryLayer(map, layer);
  }

  // GIBS answers with an error for dates it does not serve; only warn when no tile at all could be loaded.
  let gibsLoaded = 0;
  let gibsErrors = 0;
  map.on('sourcedata', (e) => {
    const ev = e as unknown as { sourceId?: string; tile?: { state?: string } };
    if (ev.sourceId === 'gibs' && ev.tile?.state === 'loaded') gibsLoaded++;
  });
  map.on('error', (e) => {
    const err = e as unknown as { sourceId?: string };
    if (err.sourceId === 'gibs') gibsErrors++;
  });
  map.on('idle', () => {
    const missing = gibsErrors > 0 && gibsLoaded === 0;
    if (missing !== state.radarMissing) set({ radarMissing: missing });
  });

  map.on('load', async () => {
    try {
      [scenes, summaries] = await Promise.all([getScenes(), getSummaryLayers()]);
      const first = sceneOf(state) ?? scenes[0];
      addImageLayers(map, first);
      const data = await getCommunes();
      communes = addCommunes(map, data, { onSelect: (osmId) => set({ selectedCommune: osmId }) });
      await addGeoLayers(map);
      ready = true;
      applyLook(state);
      if (state.activeSummary) applySummary(state);
      if (state.selectedCommune) communes.setSelected(state.selectedCommune);
      await applyScene(state);
      scenes.forEach((sc) => {
        const img = new Image();
        img.src = sc.waterPng; // warm the cache so Play does not flicker
      });
    } catch (err) {
      console.error(err);
    }
  });

  subscribe((s, prev) => {
    if (s.tab === 'map' && prev.tab !== 'map') map.resize();
    if (!ready) return;
    if (s.selectedDate !== prev.selectedDate || s.selectedTrack !== prev.selectedTrack) void applyScene(s);
    if (s.layers !== prev.layers || s.opacity !== prev.opacity || s.activeSummary !== prev.activeSummary) {
      if (s.activeSummary !== prev.activeSummary) applySummary(s);
      applyLook(s);
    }
    if (s.selectedCommune !== prev.selectedCommune) communes?.setSelected(s.selectedCommune);
    if (s.flyNonce !== prev.flyNonce && s.selectedCommune) {
      const b = communes?.bounds(s.selectedCommune);
      if (b) {
        const mobile = window.innerWidth < 768;
        map.fitBounds(b, {
          padding: { top: 60, bottom: mobile ? Math.round(window.innerHeight * 0.55) : 40, left: 40, right: mobile ? 40 : 480 },
          maxZoom: 11,
          duration: 1200,
        });
      }
    }
  });

  return { map, resize: () => map.resize() };
}
