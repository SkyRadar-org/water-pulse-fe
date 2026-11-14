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
  gibsDate?: string; // GIBS tile date, defaults to date
}

export type CommuneStatus = 'receded' | 'not_receded' | 'uncertain' | 'no_flood';

export interface CommuneProps {
  osm_id: string;
  name: string;
  province: string;
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
