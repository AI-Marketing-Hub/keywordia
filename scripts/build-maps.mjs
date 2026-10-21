// Builds public/maps/*.json from Natural Earth (public domain) GeoJSON.
// Usage: node scripts/build-maps.mjs <folder with the Natural Earth geojson files>
// Needs ne_10m_admin_1_states_provinces, ne_50m_admin_0_countries and ne_110m_admin_0_countries
// from https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topology } from 'topojson-server';
import { merge, neighbors } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoPath, geoMercator, geoConicEqualArea, geoAzimuthalEqualArea, geoNaturalEarth1 } from 'd3-geo';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.argv[2] || fail('Pass the folder that holds the Natural Earth geojson files.');
const WIDTH = 1000;
const PAD = 26;
function fail(message) { console.error(message); process.exit(1); }
const load = (name) => JSON.parse(readFileSync(resolve(SOURCE, `${name}.geojson`), 'utf8')).features;

const MAPS = [
  {
    id: 'romania', name: 'Romania', blurb: '22 regions built from the 42 counties.', file: 'ne_10m_admin_1_states_provinces',
    key: (p) => p.adm0_a3 === 'ROU' ? p.iso_3166_2.slice(3) : null, keep: 0.15, minArea: 4,
    projection: () => geoMercator(),
    groups: [
      ['Maramureș & Satu Mare', 'MM', 'SM'], ['Bihor & Sălaj', 'BH', 'SJ'], ['Cluj', 'CJ'], ['Bistrița & Mureș', 'BN', 'MS'],
      ['Suceava & Botoșani', 'SV', 'BT'], ['Iași & Neamț', 'IS', 'NT'], ['Bacău & Vaslui', 'BC', 'VS'], ['Harghita & Covasna', 'HR', 'CV'],
      ['Arad & Timiș', 'AR', 'TM'], ['Caraș & Mehedinți', 'CS', 'MH'], ['Hunedoara & Alba', 'HD', 'AB'], ['Sibiu & Brașov', 'SB', 'BV'],
      ['Gorj & Vâlcea', 'GJ', 'VL'], ['Dolj & Olt', 'DJ', 'OT'], ['Argeș & Dâmbovița', 'AG', 'DB'], ['Prahova & Buzău', 'PH', 'BZ'],
      ['Vrancea & Galați', 'VN', 'GL'], ['Teleorman & Giurgiu', 'TR', 'GR'], ['București & Ilfov', 'B', 'IF'],
      ['Ialomița & Călărași', 'IL', 'CL'], ['Brăila & Tulcea', 'BR', 'TL'], ['Constanța', 'CT'],
    ],
    links: [],
  },
  {
    id: 'europe', name: 'Europe', blurb: '23 regions from Lisbon to Kyiv, with sea crossings.', file: 'ne_50m_admin_0_countries',
    key: (p) => p.ADM0_A3, keep: 0.18, minArea: 9,
    projection: () => geoAzimuthalEqualArea().rotate([-12, -52]),
    groups: [
      ['Iberia', 'ESP', 'PRT', 'AND'], ['France', 'FRA', 'MCO'], ['Benelux', 'BEL', 'NLD', 'LUX'], ['British Isles', 'GBR', 'IMN', 'JEY', 'GGY'],
      ['Ireland', 'IRL'], ['Germany', 'DEU'], ['Alps', 'CHE', 'AUT', 'LIE'], ['Italy', 'ITA', 'SMR', 'VAT', 'MLT'], ['Denmark', 'DNK'],
      ['Norway', 'NOR'], ['Sweden', 'SWE'], ['Finland', 'FIN', 'ALD'], ['Baltics', 'EST', 'LVA', 'LTU'], ['Poland', 'POL'],
      ['Czechia & Slovakia', 'CZE', 'SVK'], ['Hungary', 'HUN'], ['Western Balkans', 'SVN', 'HRV', 'BIH'], ['Serbia & Montenegro', 'SRB', 'MNE', 'KOS'],
      ['Greece & Albania', 'GRC', 'ALB', 'MKD'], ['Bulgaria', 'BGR'], ['Romania & Moldova', 'ROU', 'MDA'], ['Ukraine', 'UKR'], ['Belarus', 'BLR'],
    ],
    // Mainland only: Svalbard, the Atlantic islands and overseas France would stretch the board.
    trim: { NOR: ([lon, lat]) => lat < 72 && lon > 0, DNK: ([lon]) => lon > 0, FRA: ([lon, lat]) => lon > -10 && lat > 40, ESP: ([, lat]) => lat > 35, PRT: ([lon]) => lon > -10 },
    links: [['British Isles', 'France'], ['British Isles', 'Benelux'], ['Denmark', 'Norway'], ['Denmark', 'Sweden'], ['Baltics', 'Sweden'], ['Baltics', 'Finland']],
  },
  {
    id: 'usa', name: 'United States', blurb: '22 regions across the lower 48 states.', file: 'ne_10m_admin_1_states_provinces',
    key: (p) => p.adm0_a3 === 'USA' ? p.iso_3166_2.slice(3) : null, keep: 0.05, minArea: 6,
    projection: () => geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]),
    groups: [
      ['Pacific Northwest', 'WA', 'OR', 'ID'], ['California & Nevada', 'CA', 'NV'], ['Montana & Wyoming', 'MT', 'WY'], ['Utah & Colorado', 'UT', 'CO'],
      ['Arizona & New Mexico', 'AZ', 'NM'], ['Dakotas', 'ND', 'SD'], ['Nebraska & Kansas', 'NE', 'KS'], ['Texas', 'TX'],
      ['Oklahoma & Arkansas', 'OK', 'AR'], ['Minnesota & Iowa', 'MN', 'IA'], ['Wisconsin & Michigan', 'WI', 'MI'], ['Illinois & Missouri', 'IL', 'MO'],
      ['Indiana & Ohio', 'IN', 'OH'], ['Kentucky & Tennessee', 'KY', 'TN'], ['Louisiana & Mississippi', 'LA', 'MS'], ['Alabama & Georgia', 'AL', 'GA'],
      ['Florida', 'FL'], ['Carolinas', 'NC', 'SC'], ['Virginias & Maryland', 'VA', 'WV', 'MD', 'DE', 'DC'], ['Pennsylvania & New Jersey', 'PA', 'NJ'],
      ['New York', 'NY'], ['New England', 'VT', 'NH', 'ME', 'MA', 'CT', 'RI'],
    ],
    links: [],
  },
  {
    id: 'africa', name: 'Africa', blurb: '25 regions from Cairo to the Cape, with Madagascar.', file: 'ne_50m_admin_0_countries',
    key: (p) => p.ADM0_A3, keep: 0.2, minArea: 9,
    projection: () => geoAzimuthalEqualArea().rotate([-18, -2]),
    groups: [
      ['Morocco & Western Sahara', 'MAR', 'SAH'], ['Algeria', 'DZA'], ['Tunisia & Libya', 'TUN', 'LBY'], ['Egypt', 'EGY'],
      ['Mauritania & Mali', 'MRT', 'MLI'], ['Senegal & Guinea', 'SEN', 'GMB', 'GNB', 'GIN'], ['Upper Guinea Coast', 'SLE', 'LBR', 'CIV'],
      ['Ghana, Togo & Burkina Faso', 'GHA', 'TGO', 'BFA'], ['Niger', 'NER'], ['Nigeria & Benin', 'NGA', 'BEN'], ['Chad', 'TCD'],
      ['Sudan & South Sudan', 'SDN', 'SDS'], ['Horn of Africa', 'ETH', 'ERI', 'DJI', 'SOM', 'SOL'], ['Cameroon & Central African Republic', 'CMR', 'CAF'],
      ['Gabon & Congo', 'GAB', 'COG', 'GNQ', 'STP'], ['DR Congo', 'COD'], ['Great Lakes', 'UGA', 'RWA', 'BDI'], ['Kenya', 'KEN'], ['Tanzania', 'TZA'],
      ['Angola', 'AGO'], ['Zambia & Malawi', 'ZMB', 'MWI'], ['Mozambique & Zimbabwe', 'MOZ', 'ZWE'], ['Namibia & Botswana', 'NAM', 'BWA'],
      ['South Africa', 'ZAF', 'LSO', 'SWZ'], ['Madagascar', 'MDG'],
    ],
    links: [['Madagascar', 'Mozambique & Zimbabwe']],
  },
  {
    id: 'asia', name: 'Asia', blurb: '22 regions from Istanbul to Tokyo and Jakarta.', file: 'ne_50m_admin_0_countries',
    key: (p) => p.ADM0_A3, keep: 0.1, minArea: 9,
    projection: () => geoAzimuthalEqualArea().rotate([-88, -24]),
    groups: [
      ['Turkey & Cyprus', 'TUR', 'CYP', 'CYN'], ['Caucasus', 'GEO', 'ARM', 'AZE'], ['Levant', 'SYR', 'LBN', 'ISR', 'PSX', 'JOR'], ['Iraq & Kuwait', 'IRQ', 'KWT'],
      ['Arabia', 'SAU', 'BHR', 'QAT', 'ARE'], ['Yemen & Oman', 'YEM', 'OMN'], ['Iran', 'IRN'], ['Kazakhstan', 'KAZ'], ['Central Asia', 'UZB', 'TKM', 'KGZ', 'TJK'],
      ['Afghanistan & Pakistan', 'AFG', 'PAK'], ['India & Sri Lanka', 'IND', 'LKA', 'KAS'], ['Nepal, Bhutan & Bangladesh', 'NPL', 'BTN', 'BGD'], ['Mongolia', 'MNG'],
      ['China & Taiwan', 'CHN', 'TWN', 'HKG', 'MAC'], ['Korea', 'KOR', 'PRK'], ['Japan', 'JPN'], ['Myanmar', 'MMR'], ['Thailand & Cambodia', 'THA', 'KHM'],
      ['Vietnam & Laos', 'VNM', 'LAO'], ['Malaysia & Singapore', 'MYS', 'SGP', 'BRN'], ['Indonesia & Timor-Leste', 'IDN', 'TLS'], ['Philippines', 'PHL'],
    ],
    // Russia is left out: Siberia would stretch the board far to the north.
    links: [['Japan', 'Korea'], ['Philippines', 'Malaysia & Singapore'], ['Philippines', 'China & Taiwan']],
  },
  {
    id: 'world', name: 'World', blurb: '24 regions on every inhabited continent.', file: 'ne_110m_admin_0_countries',
    key: (p) => p.ADM0_A3, keep: 0.6, minArea: 10,
    projection: () => geoNaturalEarth1().rotate([-11, 0]),
    groups: [
      ['Canada', 'CAN'], ['United States', 'USA'], ['Central America', 'MEX', 'GTM', 'BLZ', 'SLV', 'HND', 'NIC', 'CRI', 'PAN', 'CUB', 'HTI', 'DOM', 'JAM', 'BHS', 'PRI', 'TTO'],
      ['Northern South America', 'COL', 'VEN', 'GUY', 'SUR'], ['Andes', 'PER', 'BOL', 'ECU'], ['Brazil', 'BRA'], ['Southern Cone', 'ARG', 'CHL', 'URY', 'PRY', 'FLK'],
      ['Greenland & Iceland', 'GRL', 'ISL'], ['Western Europe', 'FRA', 'ESP', 'PRT', 'GBR', 'IRL', 'BEL', 'NLD', 'LUX', 'CHE', 'ITA', 'DEU', 'AUT', 'DNK'],
      ['Nordics', 'NOR', 'SWE', 'FIN'],
      ['Eastern Europe', 'POL', 'CZE', 'SVK', 'HUN', 'ROU', 'BGR', 'SRB', 'HRV', 'SVN', 'BIH', 'MNE', 'ALB', 'MKD', 'GRC', 'KOS', 'MDA', 'UKR', 'BLR', 'LTU', 'LVA', 'EST'],
      ['Russia', 'RUS'], ['Middle East', 'TUR', 'SYR', 'IRQ', 'IRN', 'SAU', 'YEM', 'OMN', 'ARE', 'QAT', 'KWT', 'JOR', 'ISR', 'PSX', 'LBN', 'CYP', 'CYN', 'GEO', 'ARM', 'AZE'],
      ['Central Asia', 'KAZ', 'UZB', 'TKM', 'KGZ', 'TJK', 'AFG'], ['South Asia', 'IND', 'PAK', 'NPL', 'BTN', 'BGD', 'LKA'], ['China & Mongolia', 'CHN', 'TWN', 'MNG'],
      ['East Asia', 'JPN', 'KOR', 'PRK'], ['Southeast Asia', 'MMR', 'THA', 'LAO', 'KHM', 'VNM', 'MYS', 'IDN', 'PHL', 'BRN', 'TLS'],
      ['Oceania', 'AUS', 'NZL', 'PNG', 'SLB', 'FJI', 'VUT', 'NCL'], ['North Africa', 'MAR', 'SAH', 'DZA', 'TUN', 'LBY', 'EGY'],
      ['West Africa', 'MRT', 'MLI', 'SEN', 'GMB', 'GNB', 'GIN', 'SLE', 'LBR', 'CIV', 'BFA', 'GHA', 'TGO', 'BEN', 'NER', 'NGA'],
      ['Central Africa', 'TCD', 'SDN', 'SDS', 'CAF', 'CMR', 'GNQ', 'GAB', 'COG', 'COD'], ['East Africa', 'ETH', 'ERI', 'DJI', 'SOM', 'SOL', 'KEN', 'UGA', 'RWA', 'BDI', 'TZA'],
      ['Southern Africa', 'AGO', 'ZMB', 'MWI', 'MOZ', 'ZWE', 'BWA', 'NAM', 'ZAF', 'LSO', 'SWZ', 'MDG'],
    ],
    // French Guiana belongs to France in this layer; keep France to Europe.
    trim: { FRA: ([lon]) => lon > -20 },
    skip: ['ATA', 'ATF'],
    links: [['Greenland & Iceland', 'Canada'], ['Greenland & Iceland', 'Nordics'], ['Western Europe', 'North Africa'], ['Western Europe', 'Nordics'],
      ['Brazil', 'West Africa'], ['Middle East', 'East Africa'], ['East Asia', 'Southeast Asia']],
  },
];

// Keeps the polygons of a feature whose first point passes the filter.
function trimGeometry(geometry, test) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const kept = polygons.filter((polygon) => test(polygon[0][0]));
  return { type: 'MultiPolygon', coordinates: kept };
}

function ringArea(ring) { let area = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]); return area / 2; }
function insideRings(x, y, rings) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function edgeDistance(x, y, rings) {
  let best = Infinity;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]; const [bx, by] = ring[i];
    const dx = bx - ax; const dy = by - ay; const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}
// The point deepest inside the polygon, so emblems sit clear of the borders.
function poleOfInaccessibility(rings) {
  const xs = rings[0].map((p) => p[0]); const ys = rings[0].map((p) => p[1]);
  let [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best = null;
  for (let pass = 0; pass < 4; pass++) {
    const steps = 28; const sx = (maxX - minX) / steps; const sy = (maxY - minY) / steps;
    for (let a = 0; a <= steps; a++) for (let b = 0; b <= steps; b++) {
      const x = minX + a * sx; const y = minY + b * sy;
      if (!insideRings(x, y, rings)) continue;
      const distance = edgeDistance(x, y, rings);
      if (!best || distance > best.distance) best = { x, y, distance };
    }
    if (!best) break;
    [minX, maxX, minY, maxY] = [best.x - sx * 2, best.x + sx * 2, best.y - sy * 2, best.y + sy * 2];
  }
  return best;
}

function build(spec, features) {
  const groupOf = new Map();
  spec.groups.forEach(([, ...codes], index) => codes.forEach((code) => groupOf.set(code, index)));
  const units = [];
  const unused = new Set();
  for (const feature of features) {
    const code = spec.key(feature.properties);
    if (!code) continue;
    if (!groupOf.has(code)) { if (!spec.skip?.includes(code)) unused.add(code); continue; }
    const geometry = spec.trim?.[code] ? trimGeometry(feature.geometry, spec.trim[code]) : feature.geometry;
    units.push({ type: 'Feature', properties: { code, group: groupOf.get(code) }, geometry });
  }
  const missing = [...groupOf.keys()].filter((code) => !units.some((unit) => unit.properties.code === code));
  if (missing.length) console.warn(`${spec.id}: not in source: ${missing.join(' ')}`);
  if (unused.size && spec.id === 'world') console.warn(`${spec.id}: left out: ${[...unused].join(' ')}`);

  let topo = topology({ units: { type: 'FeatureCollection', features: units } }, 1e5);
  topo = presimplify(topo);
  topo = simplify(topo, quantile(topo, spec.keep));
  const geometries = topo.objects.units.geometries;
  const merged = spec.groups.map((_, index) => merge(topo, geometries.filter((g) => g.properties.group === index)));

  const projection = spec.projection().fitWidth(WIDTH - PAD * 2, { type: 'FeatureCollection', features: merged.map((geometry) => ({ type: 'Feature', geometry })) });
  const project = (ring) => ring.map((point) => projection(point));
  const pathOf = geoPath(projection).digits(1);
  // Drop specks: islands too small to see or tap.
  const shapes = merged.map((geometry) => {
    const polygons = geometry.coordinates.map((polygon) => ({ polygon, area: Math.abs(ringArea(project(polygon[0]))) }));
    const largest = Math.max(...polygons.map((entry) => entry.area));
    return { type: 'MultiPolygon', coordinates: polygons.filter((entry) => entry.area >= spec.minArea || entry.area === largest).map((entry) => entry.polygon), largest };
  });
  const kept = { type: 'FeatureCollection', features: shapes.map((geometry) => ({ type: 'Feature', geometry })) };
  projection.fitWidth(WIDTH - PAD * 2, kept);
  const bounds = geoPath(projection).bounds(kept);
  projection.translate([projection.translate()[0] - bounds[0][0] + PAD, projection.translate()[1] - bounds[0][1] + PAD]);
  const height = Math.ceil(bounds[1][1] - bounds[0][1] + PAD * 2);

  const regions = shapes.map((shape, index) => {
    const main = shape.coordinates.map((polygon) => polygon.map(project)).sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0];
    const pole = poleOfInaccessibility(main);
    return { id: `t${index}`, label: spec.groups[index][0], path: pathOf(shape), center: [Math.round(pole.x * 10) / 10, Math.round(pole.y * 10) / 10], room: Math.round(pole.distance) };
  });

  const adjacency = spec.groups.map(() => new Set());
  neighbors(geometries).forEach((list, unitIndex) => list.forEach((otherIndex) => {
    const a = geometries[unitIndex].properties.group; const b = geometries[otherIndex].properties.group;
    if (a !== b) { adjacency[a].add(b); adjacency[b].add(a); }
  }));
  const named = (label) => { const index = spec.groups.findIndex(([name]) => name === label); if (index < 0) fail(`${spec.id}: unknown link ${label}`); return index; };
  const links = spec.links.map(([a, b]) => [named(a), named(b)]);
  for (const [a, b] of links) { adjacency[a].add(b); adjacency[b].add(a); }

  const seen = new Set([0]); const queue = [0];
  while (queue.length) for (const next of adjacency[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  if (seen.size !== spec.groups.length) fail(`${spec.id}: board is not connected; unreachable ${spec.groups.filter((_, i) => !seen.has(i)).map(([n]) => n).join(', ')}`);
  const lonely = adjacency.findIndex((set) => set.size === 0);
  if (lonely >= 0) fail(`${spec.id}: ${spec.groups[lonely][0]} has no neighbours`);

  return { id: spec.id, name: spec.name, blurb: spec.blurb, source: 'Natural Earth, public domain', width: WIDTH, height,
    regions, links, adjacency: adjacency.map((set) => [...set].sort((a, b) => a - b)) };
}

mkdirSync(resolve(ROOT, 'public/maps'), { recursive: true });
const cache = new Map();
for (const spec of MAPS) {
  if (!cache.has(spec.file)) cache.set(spec.file, load(spec.file));
  const map = build(spec, cache.get(spec.file));
  const text = JSON.stringify(map);
  writeFileSync(resolve(ROOT, `public/maps/${spec.id}.json`), `${text}\n`);
  console.log(`${spec.id}: ${map.regions.length} regions, ${map.width}x${map.height}, ${(text.length / 1024).toFixed(0)} KB, tight labels: ${map.regions.filter((r) => r.room < 14).map((r) => `${r.label} ${r.room}px`).join(', ') || 'none'}`);
}
