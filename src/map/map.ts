import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { AOI, MAP_CENTER, MAP_ZOOM } from '../config.ts';
import { getChoropleth, getCommunes, getCompositeChoropleth, getScenes, getSummaryLayers } from '../data/dataSource.ts';
import { T } from '../i18n.ts';
import type { CommuneCollection, Scene, SummaryLayer } from '../data/types.ts';
import { latestValues } from '../data/observations.ts';
import { set, state, subscribe, type State } from '../state.ts';
import { addCommunes, type CommunesLayer } from './communesLayer.ts';
import { addGeoLayers, addImageLayers, baseStyle, sceneImageUrls, setSummaryLayer, warmImage, type SceneImages } from './layers.ts';

export interface MapView {
  map: maplibregl.Map;
  resize(): void;
}

export function mountMap(container: HTMLElement): MapView {
  // maplibre-gl v6 locates its worker next to the library file, which breaks once bundled; point it at the bundled worker.
  maplibregl.setWorkerUrl(workerUrl);
  const map = new maplibregl.Map({
    container,
    style: baseStyle(),
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
  let collection: CommuneCollection | null = null;
  let images: SceneImages | null = null;
  let ready = false;
  let requestToken = 0;

  const sceneOf = (s: State) => scenes.find((x) => x.date === s.selectedDate && x.track === s.selectedTrack);

  function vis(id: string, on: boolean) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }

  function applyLook(s: State) {
    const summaryOn = s.mapMode === 'scene' && s.activeSummary !== null;
    const singleImage = s.mapMode === 'scene';
    const simple = s.viewMode === 'simple' && !!sceneOf(s)?.composite;
    vis('basemap', s.layers.basemap);
    images?.radar.setVisible(singleImage && s.layers.radar && !summaryOn && !simple);
    images?.water.setVisible(singleImage && s.layers.water && !summaryOn);
    vis('summary', summaryOn);
    vis('provinces', s.layers.provinces);
    vis('province-labels', s.layers.provinces);
    communes?.setVisible(s.layers.communes);
    images?.radar.setOpacity(s.opacity.radar);
    images?.water.setOpacity(s.opacity.water);
    // The simple view is one colour: commune fills stay clickable but transparent (outlines remain).
    communes?.setOpacity(simple && singleImage ? 0 : s.opacity.communes);
  }

  async function applyScene(s: State) {
    const token = ++requestToken;
    communes?.setMode(s.mapMode);
    if (s.mapMode === 'latest' && collection) {
      communes?.setChoropleth(latestValues(collection));
      return;
    }
    const scene = sceneOf(s);
    if (!scene) return;
    // Keep the previous values on screen until the next ones arrive (no grey flash between frames).
    set({ radarMissing: false });
    const urls = sceneImageUrls(scene, s.viewMode);
    void images?.radar.show(urls.radar, s.cut);
    void images?.water.show(urls.water, s.cut);
    try {
      const mosaic = scene.composite ? await getCompositeChoropleth(scene.date, scene.track) : null;
      if (token !== requestToken) return;
      if (mosaic) {
        communes?.setChoropleth(Object.fromEntries(Object.entries(mosaic).map(([id, v]) => [id, v.pct])), mosaic);
        return;
      }
      const values = await getChoropleth(scene.date, scene.track);
      if (token === requestToken) communes?.setChoropleth(values);
    } catch (err) {
      console.error(err);
    }
  }

  /** [Claude] Warm the HTTP cache so Play does not stall on the network (the simple view needs no radar). */
  function warmAll(mode: State['viewMode']) {
    for (const sc of scenes) {
      const u = sceneImageUrls(sc, mode);
      warmImage(u.water);
      if (mode === 'pro') warmImage(u.radar);
    }
  }

  function applySummary(s: State) {
    const layer = summaries.find((l) => l.id === s.activeSummary) ?? null;
    setSummaryLayer(map, layer);
  }

  function flyToCommune(id: string) {
    const b = communes?.bounds(id);
    if (!b) return;
    map.resize();
    const mobile = window.innerWidth < 768;
    map.fitBounds(b, {
      padding: { top: mobile ? 16 : 60, bottom: mobile ? Math.round(container.clientHeight * 0.62) + 8 : 40, left: mobile ? 16 : 40, right: mobile ? 16 : 480 },
      maxZoom: 11,
      duration: 700,
    });
  }

  map.on('error', (e) => {
    const err = e as unknown as { sourceId?: string };
    if (err.sourceId === 'radar-image') set({ radarMissing: true });
  });

  map.on('load', async () => {
    try {
      [scenes, summaries] = await Promise.all([getScenes(), getSummaryLayers()]);
      const first = sceneOf(state) ?? scenes[0];
      images = addImageLayers(map, first, state.viewMode, () => set({ radarMissing: true }));
      warmAll(state.viewMode);
      const data = await getCommunes();
      collection = data;
      communes = addCommunes(map, data, { onSelect: (osmId) => set({ selectedCommune: osmId }) });
      await addGeoLayers(map);
      ready = true;
      applyLook(state);
      if (state.activeSummary) applySummary(state);
      if (state.selectedCommune) communes.setSelected(state.selectedCommune);
      await applyScene(state);
      if (state.tab === 'map' && state.selectedCommune && state.flyNonce > 0) flyToCommune(state.selectedCommune);
    } catch (err) {
      console.error(err);
    }
  });

  subscribe((s, prev) => {
    if (s.tab === 'map' && prev.tab !== 'map') map.resize();
    if (!ready) return;
    if (s.selectedDate !== prev.selectedDate || s.selectedTrack !== prev.selectedTrack || s.mapMode !== prev.mapMode || s.viewMode !== prev.viewMode) {
      if (s.viewMode !== prev.viewMode) warmAll(s.viewMode);
      void applyScene(s);
    }
    if (s.layers !== prev.layers || s.opacity !== prev.opacity || s.activeSummary !== prev.activeSummary || s.mapMode !== prev.mapMode || s.viewMode !== prev.viewMode) {
      if (s.activeSummary !== prev.activeSummary) applySummary(s);
      applyLook(s);
    }
    if (s.selectedCommune !== prev.selectedCommune) communes?.setSelected(s.selectedCommune);
    if (s.flyNonce !== prev.flyNonce && s.selectedCommune) {
      flyToCommune(s.selectedCommune);
    }
  });

  return { map, resize: () => map.resize() };
}
