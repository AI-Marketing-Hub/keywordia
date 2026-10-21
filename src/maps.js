import { readFileSync } from 'node:fs';

// Boards drawn from Natural Earth (public domain) by scripts/build-maps.mjs. The client draws the same files.
// Romania and World are still built but no longer offered.
export const MAP_IDS = ['usa', 'europe', 'africa', 'asia'];
export const DEFAULT_MAP = 'usa';

const load = (mapId) => {
  const map = JSON.parse(readFileSync(new URL(`../public/maps/${mapId}.json`, import.meta.url), 'utf8'));
  return Object.freeze({ id: map.id, name: map.name, blurb: map.blurb, labels: map.regions.map((region) => region.label), adjacency: map.adjacency });
};

export const MAPS = Object.freeze(Object.fromEntries(MAP_IDS.map((mapId) => [mapId, load(mapId)])));
