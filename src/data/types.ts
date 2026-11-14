export type Track = '047D' | '083A' | '148D';
export type Maturity = 'provisional' | 'validated';
export type Bounds = [number, number, number, number];

export interface Scene {
  date: string; // '2026-09-21'
  track: Track;
  maturity: Maturity;
  bounds: Bounds;
  waterPng: string; // 0 dry = transparent, 1 open water = blue, 3 permanent water = grey
  radarJpg?: string; // processed radar image on the same grid as waterPng
  /** Blended playback frame: latest valid observation per pixel from any track (see backend composite.py). Absent in mock data. */
  composite?: { png: string; simplePng: string; radar: string; maxAgeDays: number; observedPct: number; sources: { date: string; track: Track; share_pct: number }[] } | null;
  gibsDate?: string; // GIBS tile date, defaults to date
}

export type CommuneStatus = 'receded' | 'not_receded' | 'uncertain' | 'no_flood';

export interface CommuneProps {
  osm_id: string;
  name: string;
  province: string;
  area_km2?: number | null;
  observed_pct?: number | null; // percent of the full OSM commune, 0–100
  valid_km2: number | null;
  first_flood_date: string | null;
  peak_pct: number | null;
  peak_date: string | null;
  half_date: string | null;
  recession_date: string | null; // null = not drained at the last image
  last_pct: number | null;
  last_date: string | null;
  max_flooded_km2: number | null;
  status: CommuneStatus;
  reference_track?: Track;
  coverage_sufficient?: boolean;
}

export interface SeriesPoint {
  date: string;
  track: Track;
  water_pct: number;
  water_km2: number;
  valid_km2: number;
}

export type Choropleth = Record<string, number>; // osm_id -> water_pct
/** Latest observation per commune on or before the scene date; age in days. */
export type CompositeChoropleth = Record<string, { pct: number; age: number; date: string; track: Track }>;

export interface AreaPoint {
  date: string;
  track: Track;
  nisar_km2: number;
  dswx_km2: number | null;
}

export interface SummaryLayer {
  id: 'flood_count' | 'first_flood_date' | 'recession_date';
  title: string;
  png: string;
  bounds: Bounds;
  legend: { color: string; label: string }[];
}

export interface ValidationRow {
  date: string;
  track?: Track;
  f1_nisar: number;
  f1_s1: number;
  recall_nisar: number;
  recall_s1: number;
  precision_nisar: number | null;
  precision_s1: number | null;
  nisar_only_true_pct: number;
}

export interface Validation {
  vsHls: ValidationRow[];
  vsDswxS1: { date: string; track: Track; f1: number }[];
  vsSwot?: SwotValidationRow[];
  notes: string[];
}

export interface CommuneFeature {
  type: 'Feature';
  id?: number | string;
  properties: CommuneProps;
  geometry: GeoJSON.Geometry;
}

export interface CommuneCollection {
  type: 'FeatureCollection';
  features: CommuneFeature[];
}


/** [Claude] NISAR and Sentinel-1 DSWx scored against SWOT on the same pixels (nearest NISAR acquisition, <= 2 days). */
export interface SwotValidationRow {
  swotDate: string;
  nisar: string;
  daysApart: number;
  overlapKm2: number;
  swotWaterPct: number;
  nisarWaterPct: number;
  f1_nisar: number;
  f1_s1: number | null;
  f1_nisar_same_px: number | null;
  f1_swot_vs_optical: number | null;
  f1_nisar_vs_optical: number | null;
}
