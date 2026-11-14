export const GIBS_LAYER = 'NISAR_L2_Geocoded_Polarimetric_Covariance';
// [Codex] Higher native zooms return broken NISAR tiles; MapLibre can overscale zoom 10.
export const GIBS_MAX_ZOOM = 10;

/** GIBS WMTS (EPSG:3857) tile template for one acquisition date. Note the {z}/{y}/{x} order. */
export function gibsTiles(date: string): string[] {
  return [
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${GIBS_LAYER}/default/${date}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`,
  ];
}
