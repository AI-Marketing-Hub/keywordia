/* Keywordia board. Borders come from Natural Earth (public domain) via scripts/build-maps.mjs; the artwork is local SVG. */
(function installRealmMap(global) {
  'use strict';

  const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  const PALETTE = ['#c8443b', '#e3a43a', '#6f9e5f', '#8a63b0', '#3f8f9a', '#e07a3a'];
  const LAND = ['#efe2ae', '#e9dfa6', '#f2e6b8', '#e4dca0', '#ece0aa'];
  const DEFAULT_MAP = 'usa';
  // Paper style (Lamplight palette): cream paper tiles, plum ink line work, hard offset shadows.
  const PAPER_INK = '#3a2c5c';
  const PAPER_LAND = ['#f4e9d0', '#efe0be', '#f2e4c6', '#ebdcb8', '#f6ecd8'];
  const PAPER_DEMO = ['#c23d3d', '#e08244', '#7a9d6d'];
  // Dark paper: muted sand tiles and near-black line work, so the board does not glare on a dark page.
  const DARK_INK = '#15110d';
  const DARK_LAND = ['#c9b78e', '#c1ae86', '#cdbc93', '#baa780', '#d0c099'];
  const cache = new Map();
  const pending = new Map();
  let renderNumber = 0;

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const color = (value, fallback) => /^#[a-f\d]{6}$/i.test(String(value)) ? String(value) : fallback;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  function load(mapId = DEFAULT_MAP) {
    if (cache.has(mapId)) return Promise.resolve(cache.get(mapId));
    if (!pending.has(mapId)) {
      pending.set(mapId, fetch(`/maps/${encodeURIComponent(mapId)}.json`).then((response) => {
        if (!response.ok) throw new Error(`Map ${mapId} could not be loaded.`);
        return response.json();
      }).then((map) => {
        cache.set(mapId, map);
        global.dispatchEvent(new CustomEvent('realm-map-ready', { detail: { mapId } }));
        return map;
      }).finally(() => pending.delete(mapId)));
    }
    return pending.get(mapId);
  }
  const loaded = (mapId) => cache.get(mapId) || null;

  function towersRow(x, y, towers, scale, INK = '') {
    const [on, off, line] = INK ? ['#e08244', '#f4e9d0', INK] : ['#fff3b8', '#3b230f', '#3b230f'];
    return `<g class="realm-towers" transform="translate(${x} ${y}) scale(${scale})">${[0,1,2].map((slot) => `<path d="M${slot * 15 - 21} 0h12v-9h-3v3h-2v-3h-2v3h-2v-3h-3Z" fill="${slot < towers ? on : off}" stroke="${line}" stroke-width="${INK ? 1.8 : 1.6}" stroke-linejoin="round" opacity="${slot < towers || INK ? 1 : .55}"/>`).join('')}</g>`;
  }
  function emblem(x, y, prefix, capital, scale) {
    const size = scale * (capital ? 1.15 : 1);
    return `<g class="realm-emblem" transform="translate(${x} ${y}) scale(${size})"><ellipse cy="19" rx="17" ry="5" fill="#2a1a0c" opacity=".3"/><circle r="19" fill="#7a4d16"/><circle r="17.5" cy="-1" fill="url(#${prefix}-gold)" stroke="#6f4512" stroke-width="1.4"/><circle r="13" cy="-1" fill="none" stroke="#fff3b8" stroke-width="1" opacity=".55"/><path d="M-9 8V-3h3.2v-5h3v3h5.6v-3h3v5H9V8Z" fill="#fffaf0" stroke="#6f4512" stroke-width="1.3" stroke-linejoin="round"/><path d="M-2.4 8V3.5a2.4 2.4 0 0 1 4.8 0V8" fill="#8a5a1c"/>${capital ? '<path d="M-7-12-4-17-1-13 0-19 1-13 4-17 7-12Z" fill="#ffd65a" stroke="#6f4512" stroke-width="1.2" stroke-linejoin="round"/>' : ''}</g>`;
  }
  function paperEmblem(x, y, scale, INK) {
    return `<g class="realm-emblem" transform="translate(${x} ${y}) scale(${scale})"><circle cx="3" cy="4" r="18" fill="${INK}"/><circle r="18" fill="#f4e9d0" stroke="${INK}" stroke-width="2.6"/><path d="M-8.5 8V-3h3v-5h3v3h5v-3h3v5h3V8Z" fill="${INK}"/><path d="M-2.2 8V3.6a2.2 2.2 0 0 1 4.4 0V8" fill="#f4e9d0"/><path d="m0-30 2.6 5.3 5.8.8-4.2 4.1 1 5.8L0-16.8-5.2-14l1-5.8-4.2-4.1 5.8-.8Z" fill="#e08244" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>`;
  }
  function paperTag(x, y, text, size, INK) {
    const width = Math.max(2.4, text.length * .62 + 1.3) * size; const height = size * 1.55;
    return `<g class="realm-tag"><rect x="${(x - width / 2 + 2.5).toFixed(1)}" y="${(y - height / 2 + 3).toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" rx="${(height / 2).toFixed(1)}" fill="${INK}"/><rect x="${(x - width / 2).toFixed(1)}" y="${(y - height / 2).toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" rx="${(height / 2).toFixed(1)}" fill="#f4e9d0" stroke="${INK}" stroke-width="2.2"/><text x="${x}" y="${(y + size * .36).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="${size.toFixed(1)}" font-weight="800" fill="${INK}">${esc(text)}</text></g>`;
  }
  function defs(prefix) {
    return `<defs><radialGradient id="${prefix}-gold" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff2a6"/><stop offset=".45" stop-color="#f2c043"/><stop offset="1" stop-color="#b9771d"/></radialGradient><radialGradient id="${prefix}-gloss" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a3510" stop-opacity=".18"/></radialGradient><pattern id="${prefix}-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#2a1a0c" opacity=".34"/><rect width="4" height="10" fill="#2a1a0c" opacity=".26"/></pattern><filter id="${prefix}-puff" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="5.5" result="blur"/><feComposite in="SourceAlpha" in2="blur" operator="out" result="rim"/><feFlood flood-color="#6e4314" flood-opacity=".75"/><feComposite in2="rim" operator="in" result="shade"/><feOffset in="blur" dy="4" result="low"/><feComposite in="SourceAlpha" in2="low" operator="out" result="lowrim"/><feFlood flood-color="#3e230a" flood-opacity=".45"/><feComposite in2="lowrim" operator="in" result="deep"/><feOffset in="blur" dy="-4" result="high"/><feComposite in="SourceAlpha" in2="high" operator="out" result="toprim"/><feFlood flood-color="#fffbea" flood-opacity=".75"/><feComposite in2="toprim" operator="in" result="shine"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/><feMergeNode in="deep"/><feMergeNode in="shine"/></feMerge></filter><filter id="${prefix}-shadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="12"/></filter></defs>`;
  }
  function placeholder(mapId) {
    load(mapId).catch(() => {});
    return `<div class="realm-loading" data-map="${esc(mapId)}">Unfurling the map…</div>`;
  }

  // Demo owners for the home page preview, by region index on the default map.
  const DEMO = { red: { capital: 2, land: [0, 1, 3] }, gold: { capital: 14, land: [12, 13, 17] }, green: { capital: 19, land: [15, 18, 20] } };

  function render(territories = [], players = [], options = {}) {
    const { selectable = [], target = null, preview = false, action = 'claim', map: mapId = DEFAULT_MAP, theme = '' } = options || {};
    const paper = theme === 'paper' || theme === 'paper-dark';
    const dark = theme === 'paper-dark';
    const INK = dark ? DARK_INK : PAPER_INK;
    // A preview is drawn small, so its capital marks and names are enlarged to stay readable.
    const boost = preview && paper ? 1.9 : 1;
    const map = loaded(mapId);
    if (!map) return placeholder(mapId);
    const prefix = `realm-board-${++renderNumber}`;
    const supplied = Array.isArray(territories) ? territories : [];
    let people = Array.isArray(players) ? players : [];
    const demo = Boolean(preview && options.demo && supplied.length === 0);
    const demoOwners = {};
    if (demo) {
      const demoColors = paper ? PAPER_DEMO : PALETTE;
      people = [{id:'demo-red',name:'Atlas',color:demoColors[0]},{id:'demo-gold',name:'You',color:demoColors[1]},{id:'demo-green',name:'Pixel',color:demoColors[2]}];
      for (const [key, spec] of Object.entries(DEMO)) for (const index of [spec.capital, ...spec.land]) demoOwners[index] = { ownerId: `demo-${key}`, capital: index === spec.capital, towers: index === spec.capital ? 3 : 0, value: index === spec.capital ? 1000 : 300 };
    }
    const choosing = new Set(Array.isArray(selectable) ? selectable : []);
    const byId = new Map(supplied.filter((item) => item && typeof item.id === 'string').map((item) => [item.id, item]));
    const tiles = map.regions.map((region, index) => {
      const fallback = { id: region.id, label: region.label, ownerId: null, capital: false, towers: 0, value: 0, ...(demoOwners[index] || {}) };
      const territory = { ...fallback, ...(byId.get(region.id) || {}) };
      const owner = people.find((person) => person && person.id === territory.ownerId);
      const owned = Boolean(territory.ownerId);
      const fill = owned ? color(owner?.color, PALETTE[Math.max(0, people.indexOf(owner)) % PALETTE.length]) : (dark ? DARK_LAND : paper ? PAPER_LAND : LAND)[index % LAND.length];
      return { region, territory, owner, owned, fill, index };
    });
    const verb = {capital:'select to found your capital here',claim:'select to claim',attack:'select to attack'}[action] || 'select';
    const outline = map.regions.map((region) => region.path).join('');
    const links = (map.links || []).map(([a, b]) => {
      const [x1, y1] = map.regions[a].center; const [x2, y2] = map.regions[b].center;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join('');
    const land = tiles.map(({ region, territory, owner, owned, fill, index }) => {
      const interactive = choosing.has(territory.id);
      const dimmed = choosing.size > 0 && !interactive;
      const targeted = target === territory.id;
      const description = `${territory.label}, ${owned ? `held by ${owner?.name || 'another player'}${territory.capital ? `, capital with ${territory.towers} towers` : territory.value ? `, worth ${territory.value}` : ''}` : 'free'}${interactive ? `, ${verb}` : ''}`;
      return `<g class="realm-province${owned ? ' is-owned' : ''}${interactive ? ` is-claimable is-${esc(action)}` : ''}${dimmed ? ' is-dimmed' : ''}${targeted ? ' is-target' : ''}" data-region="${esc(territory.id)}" style="--i:${index}" ${interactive ? `data-territory="${esc(territory.id)}" role="button" tabindex="0"` : 'role="img"'} aria-label="${esc(description)}"><title>${esc(description)}</title><path class="realm-land" d="${region.path}" fill="${fill}"${paper ? '' : ` filter="url(#${prefix}-puff)"`}/>${paper ? '' : `<path d="${region.path}" fill="url(#${prefix}-gloss)" pointer-events="none"/>`}${dimmed ? `<path class="realm-hatch" d="${region.path}" fill="url(#${prefix}-hatch)" pointer-events="none"/>` : ''}<path class="realm-border" d="${region.path}" fill="none" stroke="${paper ? INK : '#4e3017'}" stroke-width="${paper ? 2.2 : 2.6}" stroke-linejoin="round" pointer-events="none"/><path class="realm-flash" d="${region.path}" fill="#fffbea" opacity="0" pointer-events="none"/><path class="realm-focus" d="${region.path}" fill="none" stroke="#fff3b0" stroke-width="4.5" stroke-linejoin="round" pointer-events="none"/></g>`;
    }).join('');
    const details = tiles.map(({ region, territory, owner, owned }) => {
      const [x, y] = region.center;
      const scale = clamp(region.room / 46, .5, 1) * boost;
      if (!owned) {
        if (!choosing.has(territory.id)) return '';
        return `<g class="realm-free-mark" data-region="${esc(territory.id)}" aria-hidden="true" pointer-events="none"><circle cx="${x}" cy="${y}" r="${8 * scale + 2}" fill="${paper ? '#f4e9d0' : '#fffaf0'}" stroke="${paper ? INK : '#7a4d16'}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="${3.5 * scale}" fill="${paper ? INK : '#7a4d16'}"/></g>`;
      }
      if (!territory.capital) {
        return territory.value ? `<g class="realm-owner" data-region="${esc(territory.id)}" aria-hidden="true" pointer-events="none"><text class="realm-value" x="${x}" y="${y + 6}" text-anchor="middle" font-family="${FONT}" font-size="${(17 * Math.max(scale, .72)).toFixed(1)}" font-weight="800" fill="#fffdf6" stroke="${paper ? INK : '#3b230f'}" stroke-width="${paper ? 4.2 : 3.6}" stroke-linejoin="round" paint-order="stroke">${esc(territory.value)}</text></g>` : '';
      }
      const name = owner?.name || 'Claimed';
      const displayName = name.length > 13 ? `${name.slice(0, 12)}…` : name;
      if (paper) return `<g class="realm-owner is-capital" data-region="${esc(territory.id)}" aria-hidden="true" pointer-events="none">${preview ? '' : towersRow(x, y - 34 * scale, Number(territory.towers) || 0, scale, INK)}${paperEmblem(x, y + 2, scale, INK)}${paperTag(x, y + 38 * scale, displayName, 18 * Math.max(scale, .8), INK)}</g>`;
      return `<g class="realm-owner is-capital" data-region="${esc(territory.id)}" aria-hidden="true" pointer-events="none">${emblem(x, y + 2, prefix, true, scale)}${towersRow(x, y + 36 * scale, Number(territory.towers) || 0, scale)}<text x="${x}" y="${y - 28 * scale}" text-anchor="middle" font-family="${FONT}" font-size="${(16 * Math.max(scale, .75)).toFixed(1)}" font-weight="800" fill="#fffdf6" stroke="#3b230f" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke">${esc(displayName)}</text></g>`;
    }).join('');
    const targetRegion = target ? map.regions.find((region) => region.id === target) : null;
    const marker = targetRegion ? (() => { const [x, y] = targetRegion.center; const s = clamp(targetRegion.room / 46, .6, 1); return `<g class="realm-target" aria-hidden="true" pointer-events="none" transform="translate(${x} ${y + 2}) scale(${s})"><circle r="30" fill="none" stroke="#fff3b0" stroke-width="4" stroke-dasharray="10 7"/><path d="M-40 0h14M26 0h14M0-40v14M0 26v14" stroke="#fff3b0" stroke-width="4" stroke-linecap="round"/></g>`; })() : '';
    const instructions = choosing.size ? `Highlighted regions can be chosen: ${verb}.` : 'Colored regions belong to players and show their value. Gold coins mark capitals with their remaining towers.';
    const { width, height } = map;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="realm-map${preview ? ' realm-map-preview' : ''}${paper ? ' is-paper' : ''}${dark ? ' is-paper-dark' : ''}${choosing.size ? ' is-choosing' : ''}" data-map="${esc(map.id)}" viewBox="-12 -12 ${width + 24} ${height + 36}" preserveAspectRatio="xMidYMid meet" role="group" aria-labelledby="${prefix}-title ${prefix}-description"><title id="${prefix}-title">${esc(map.name)} board</title><desc id="${prefix}-description">${esc(map.name)}, ${map.regions.length} regions drawn from Natural Earth. Cream regions are free. Colored regions belong to players. Dashed lines are sea routes. ${instructions}</desc>${defs(prefix)}${paper ? `<g class="realm-plinth" aria-hidden="true" pointer-events="none"><path d="${outline}" transform="translate(9 11)" fill="${INK}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="${outline}" fill="${INK}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/></g><g class="realm-links" aria-hidden="true" pointer-events="none" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="2 7" stroke-linecap="round" opacity=".6">${links}</g>` : `<g class="realm-plinth" aria-hidden="true" pointer-events="none"><path d="${outline}" transform="translate(0 16)" fill="#120b05" opacity=".55" filter="url(#${prefix}-shadow)"/><path d="${outline}" transform="translate(0 9)" fill="#3a220d" stroke="#3a220d" stroke-width="9" stroke-linejoin="round"/><path d="${outline}" fill="#5a3818" stroke="#5a3818" stroke-width="9" stroke-linejoin="round"/></g><g class="realm-links" aria-hidden="true" pointer-events="none" fill="none" stroke="#f3dc98" stroke-width="3" stroke-dasharray="7 7" stroke-linecap="round" opacity=".75">${links}</g>`}<g class="realm-tiles">${land}</g><g class="realm-hover" aria-hidden="true" pointer-events="none"></g><g class="realm-details">${details}${marker}</g><g class="realm-fx" aria-hidden="true" pointer-events="none"></g></svg>`;
  }

  function center(mapId, territoryId) {
    const region = loaded(mapId)?.regions.find((entry) => entry.id === territoryId);
    return region ? { x: region.center[0], y: region.center[1], room: region.room } : null;
  }

  // The attacker's own region closest to the target, along a border or sea route.
  function attackOrigin(mapId, territories, attackerId, targetId) {
    const map = loaded(mapId); if (!map) return null;
    const index = map.regions.findIndex((region) => region.id === targetId); if (index < 0) return null;
    const owners = new Map((territories || []).map((territory) => [territory.id, territory.ownerId]));
    const [tx, ty] = map.regions[index].center;
    const near = (map.adjacency[index] || []).map((next) => map.regions[next]).filter((region) => region && owners.get(region.id) === attackerId);
    near.sort((a, b) => Math.hypot(a.center[0] - tx, a.center[1] - ty) - Math.hypot(b.center[0] - tx, b.center[1] - ty));
    return near[0]?.id || null;
  }

  // A curved war arrow between two region centers, bowed upward. The body tapers from the origin and flows into a barbed head, all in one ink-outlined shape that a mask draws in. `size` scales it for small boards.
  let arrowSeq = 0;
  function arrow(mapId, fromId, toId, size = 1) {
    const a = center(mapId, fromId); const b = center(mapId, toId);
    if (!a || !b) return '';
    const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.hypot(dx, dy) || 1;
    let nx = -dy / length; let ny = dx / length; if (ny > 0) { nx = -nx; ny = -ny; }
    const bend = Math.min(70, length * .32);
    const cx = (a.x + b.x) / 2 + nx * bend; const cy = (a.y + b.y) / 2 + ny * bend;
    const k = size; const f = (value) => value.toFixed(1);
    const tl = Math.hypot(b.x - cx, b.y - cy) || 1; const ux = (b.x - cx) / tl; const uy = (b.y - cy) / tl;
    const h = k * Math.min(1, Math.max(.6, length / (90 * k))); // a smaller head on short hops, so the body still shows
    const tip = { x: b.x + ux * 6 * h, y: b.y + uy * 6 * h }; const neck = { x: b.x - ux * 18 * h, y: b.y - uy * 18 * h };
    const at = (t) => { const s = 1 - t; return { x: s * s * a.x + 2 * s * t * cx + t * t * neck.x, y: s * s * a.y + 2 * s * t * cy + t * t * neck.y, tx: 2 * s * (cx - a.x) + 2 * t * (neck.x - cx), ty: 2 * s * (cy - a.y) + 2 * t * (neck.y - cy) }; };
    const left = []; const right = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20; const p = at(t); const n = Math.hypot(p.tx, p.ty) || 1; const w = (3 + 4 * t) * h;
      left.push(`${f(p.x - p.ty / n * w)} ${f(p.y + p.tx / n * w)}`); right.push(`${f(p.x + p.ty / n * w)} ${f(p.y - p.tx / n * w)}`);
    }
    const barb = (side) => ({ x: neck.x - ux * 6 * h + side * -uy * 17 * h, y: neck.y - uy * 6 * h + side * ux * 17 * h });
    const bl = barb(1); const br = barb(-1);
    const shape = `M${left.join('L')}L${f(bl.x)} ${f(bl.y)}L${f(tip.x)} ${f(tip.y)}L${f(br.x)} ${f(br.y)}L${right.reverse().join('L')}Z`;
    const spine = `M${f(a.x)} ${f(a.y)}Q${f(cx)} ${f(cy)} ${f(neck.x)} ${f(neck.y)}`;
    const reveal = `M${f(a.x)} ${f(a.y)}Q${f(cx)} ${f(cy)} ${f(neck.x)} ${f(neck.y)}L${f(tip.x + ux * 8 * k)} ${f(tip.y + uy * 8 * k)}`;
    const id = `realm-arrow-${++arrowSeq}`;
    return `<g class="realm-arrow" style="--k:${k};--ux:${ux.toFixed(3)};--uy:${uy.toFixed(3)}"><mask id="${id}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="5000" height="5000"><path class="realm-arrow-reveal" d="${reveal}" pathLength="100" stroke-width="${f(60 * k)}"/></mask>`
      + `<g class="realm-arrow-target"><circle class="realm-arrow-pulse" cx="${f(b.x)}" cy="${f(b.y)}" r="${f(20 * k)}"/><circle class="realm-arrow-ring" cx="${f(b.x)}" cy="${f(b.y)}" r="${f(24 * k)}"/></g>`
      + `<g class="realm-arrow-launch"><circle class="realm-arrow-puff" cx="${f(a.x)}" cy="${f(a.y)}" r="${f(14 * k)}"/></g>`
      + `<g class="realm-arrow-strike"><g mask="url(#${id})"><path class="realm-arrow-shadow" d="${shape}" transform="translate(0 ${f(6 * k)})"/><path class="realm-arrow-halo" d="${shape}"/><path class="realm-arrow-body" d="${shape}"/><path class="realm-arrow-flow" d="${spine}"/></g></g>`
      + `<circle class="realm-arrow-base" cx="${f(a.x)}" cy="${f(a.y)}" r="${f(8 * k)}"/></g>`;
  }

  // A light outline for the map picker.
  function thumbnail(mapId) {
    const map = loaded(mapId);
    if (!map) { load(mapId).catch(() => {}); return '<span class="map-thumb-loading" aria-hidden="true"></span>'; }
    return `<svg class="map-thumb" viewBox="0 0 ${map.width} ${map.height}" aria-hidden="true" focusable="false"><path d="${map.regions.map((region) => region.path).join('')}" fill="#e9dca6" stroke="#5a3818" stroke-width="5" stroke-linejoin="round"/></svg>`;
  }

  // Hover and keyboard focus draw a copy of the region on its own layer above every tile, so neighbours never cut its
  // outline and nothing is left behind when the pointer moves on. The tiles themselves never move or change order.
  const claimable = (node) => node?.closest?.('.realm-province.is-claimable');
  function showHover(province) {
    const layer = province.ownerSVGElement?.querySelector('.realm-hover'); const d = province.querySelector('.realm-land')?.getAttribute('d');
    if (!layer || !d) return;
    layer.dataset.region = province.dataset.region;
    layer.setAttribute('class', `realm-hover is-on${province.classList.contains('is-attack') ? ' is-attack' : ''}`);
    layer.innerHTML = `<path class="realm-hover-glow" d="${d}"/><path class="realm-hover-fill" d="${d}"/><path class="realm-hover-line" d="${d}"/>`;
  }
  function clearHover(province) {
    const layer = province.ownerSVGElement?.querySelector('.realm-hover');
    if (!layer || layer.dataset.region !== province.dataset.region) return;
    layer.innerHTML = ''; layer.setAttribute('class', 'realm-hover'); delete layer.dataset.region;
  }
  document.addEventListener('pointerover', (event) => { const province = claimable(event.target); if (province) showHover(province); });
  document.addEventListener('pointerout', (event) => { const province = claimable(event.target); if (province && !province.contains(event.relatedTarget)) clearHover(province); });
  document.addEventListener('focusin', (event) => { const province = claimable(event.target); if (province?.matches(':focus-visible')) showHover(province); });
  document.addEventListener('focusout', (event) => { const province = claimable(event.target); if (province && !province.matches(':hover')) clearHover(province); });

  global.RealmMap = Object.freeze({ render, load, loaded, thumbnail, center, attackOrigin, arrow, DEFAULT_MAP });
})(window);
