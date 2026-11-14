import * as maplibregl from 'maplibre-gl';
import type { Choropleth, CommuneCollection } from '../data/types.ts';
import { T } from '../i18n.ts';
import { fmtDate } from '../format.ts';
import { CHORO_COLORS, NO_DATA_COLOR } from '../palette.ts';

const SRC = 'communes';

export interface CommunesLayer {
  setChoropleth(values: Choropleth): void;
  setMode(mode: 'latest' | 'scene'): void;
  setSelected(osmId: string | null): void;
  setOpacity(v: number): void;
  setVisible(v: boolean): void;
  bounds(osmId: string): maplibregl.LngLatBounds | null;
}

function featureBounds(geom: GeoJSON.Geometry): maplibregl.LngLatBounds {
  const b = new maplibregl.LngLatBounds();
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') b.extend(c as [number, number]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  if ('coordinates' in geom) walk(geom.coordinates);
  return b;
}

export function addCommunes(
  map: maplibregl.Map,
  data: CommuneCollection,
  handlers: { onSelect: (osmId: string) => void },
): CommunesLayer {
  map.addSource(SRC, { type: 'geojson', data: data as unknown as GeoJSON.FeatureCollection, promoteId: 'osm_id' });

  const pct: maplibregl.ExpressionSpecification = ['coalesce', ['feature-state', 'pct'], -1];
  map.addLayer({
    id: 'communes-fill',
    type: 'fill',
    source: SRC,
    paint: {
      'fill-color': ['step', pct, NO_DATA_COLOR, 0, CHORO_COLORS[0], 20, CHORO_COLORS[1], 40, CHORO_COLORS[2], 60, CHORO_COLORS[3], 80, CHORO_COLORS[4]],
      'fill-opacity': 0.6,
    },
  });
  map.addLayer({
    id: 'communes-line',
    type: 'line',
    source: SRC,
    paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#0f172a', '#1e293b'],
      'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3.5, ['boolean', ['feature-state', 'hover'], false], 2.5, 0.8],
    },
  });

  const geoms = new Map(data.features.map((f) => [f.properties.osm_id, f]));
  const values: Choropleth = {};
  let hovered: string | null = null;
  let selected: string | null = null;
  let mode: 'latest' | 'scene' = 'latest';

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'commune-tip' });

  const clearHover = () => {
    if (hovered !== null) map.setFeatureState({ source: SRC, id: hovered }, { hover: false });
    hovered = null;
    popup.remove();
    map.getCanvas().style.cursor = '';
  };

  map.on('mousemove', 'communes-fill', (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const id = String(f.properties?.osm_id ?? f.id);
    if (id !== hovered) {
      if (hovered !== null) map.setFeatureState({ source: SRC, id: hovered }, { hover: false });
      hovered = id;
      map.setFeatureState({ source: SRC, id }, { hover: true });
    }
    const v = values[id];
    const props = geoms.get(id)?.properties;
    const el = document.createElement('div');
    el.textContent = mode === 'latest'
      ? T.map.latestTip(props?.name ?? id, v, fmtDate(props?.last_date ?? null))
      : T.map.tip(props?.name ?? id, v);
    popup.setLngLat(e.lngLat).setDOMContent(el).addTo(map);
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'communes-fill', clearHover);
  map.on('click', 'communes-fill', (e) => {
    const f = e.features?.[0];
    if (f) handlers.onSelect(String(f.properties?.osm_id ?? f.id));
  });

  return {
    setMode(next) {
      mode = next;
      clearHover();
      map.setPaintProperty('communes-fill', 'fill-color', next === 'latest'
        ? ['step', pct, NO_DATA_COLOR, 0, '#15803d', 10, '#d97706', 30, '#dc2626']
        : ['step', pct, NO_DATA_COLOR, 0, CHORO_COLORS[0], 20, CHORO_COLORS[1], 40, CHORO_COLORS[2], 60, CHORO_COLORS[3], 80, CHORO_COLORS[4]]);
    },
    setChoropleth(next) {
      for (const id of geoms.keys()) {
        const v = next[id];
        if (v === undefined) {
          delete values[id];
          // Real acquisitions only cover some communes. Use the no-data sentinel;
          // removing a never-created state crashes MapLibre 6's state reconciler.
          map.setFeatureState({ source: SRC, id }, { pct: -1 });
        } else {
          values[id] = v;
          map.setFeatureState({ source: SRC, id }, { pct: v });
        }
      }
    },
    setSelected(id) {
      if (selected !== null) map.setFeatureState({ source: SRC, id: selected }, { selected: false });
      selected = id;
      if (id !== null) map.setFeatureState({ source: SRC, id }, { selected: true });
    },
    setOpacity(v) {
      map.setPaintProperty('communes-fill', 'fill-opacity', v);
    },
    setVisible(v) {
      for (const l of ['communes-fill', 'communes-line']) map.setLayoutProperty(l, 'visibility', v ? 'visible' : 'none');
      if (!v) clearHover();
    },
    bounds(id) {
      const f = geoms.get(id);
      return f ? featureBounds(f.geometry) : null;
    },
  };
}
