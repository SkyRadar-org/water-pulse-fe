import type { CommuneCollection, CommuneProps, Scene } from './types.ts';

/** [Codex] An assessment needs sufficient coverage; missing is never zero water. */
export function hasAssessment(p: CommuneProps): boolean {
  return p.coverage_sufficient === true && p.last_pct !== null && p.last_date !== null;
}

export function latestValues(collection: CommuneCollection): Record<string, number> {
  return Object.fromEntries(collection.features.filter(f => hasAssessment(f.properties)).map(f => [f.properties.osm_id, f.properties.last_pct!]));
}

export function referenceScene(p: CommuneProps, scenes: Scene[]): Scene | undefined {
  return scenes.find(s => s.date === p.last_date && s.track === p.reference_track);
}
