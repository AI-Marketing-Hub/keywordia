/* Keywordia. Rendering is local; room state, timers and scores belong to the server. */
'use strict';
const paths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  reset: '<path d="M4 4v6h6"/><path d="M20 12a8 8 0 0 0-14.6-4.5L4 10m16 4-1.4 2.5A8 8 0 0 1 4 12"/>',
  game: '<path d="M6 8h12l3 10a2 2 0 0 1-3 2l-3-3H9l-3 3a2 2 0 0 1-3-2L6 8Z"/><path d="M7 11v5m-2-2.5h4m6-1.5h.01m3 3h.01M9 8V5h6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
  spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8"/><circle cx="9" cy="7" r="4"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  pen: '<path d="m16 3 5 5L8 21H3v-5L16 3Zm-2 2 5 5M3 21l5-1"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  workflow: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4H5v4m7-4h7v4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  castle: '<path d="M3 21V10h4V5h3v5h4V5h3v5h4v11H3Zm6 0v-5a3 3 0 0 1 6 0v5M3 10V5m18 5V5"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4m-4 2v5m-4 2h8m-6-2h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  link: '<path d="m10 13 4-4m-6 6-2 2a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m-6-2a3.5 3.5 0 0 1 0-5l4-4a3.5 3.5 0 0 1 5 5l-2 2"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  book: '<path d="M12 5C9 3 5 3 2 4v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v16"/>',
  flag: '<path d="M5 22V3m0 0c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
  download: '<path d="M12 2v14m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  leave: '<path d="M9 3H3v18h6m5-15 6 6-6 6m-6-6h12"/>',
  robot: '<rect x="4" y="6" width="16" height="14" rx="4"/><path d="M12 2v4M8 12h.01M16 12h.01M9 16h6M1 11v4m22-4v4"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="m17 9 5 6m0-6-5 6"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6m-3 3 4 4m-1 1 2-2M9.5 6.5 14 2h3v3l-4.5 4.5M5 14l-2 2 2 2 2-2m-2-2 2 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6m-3 3 4 4m-1 1 2-2"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  crown: '<path d="m3 7 4.5 4.5L12 5l4.5 6.5L21 7l-2 12H5L3 7Z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
document.querySelectorAll('[data-icon]').forEach((element) => { element.outerHTML = icon(element.dataset.icon); });
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? escapeHtml(url.href) : '#'; } catch { return '#'; } };
const $ = (selector) => document.querySelector(selector);
const main = $('#main');
let revealExpanded = false;
let estimateDraft = '';
const modal = $('#modal');
const socket = io({ reconnection: true, reconnectionDelay: 600, reconnectionDelayMax: 4000 });
let catalog = null;
let room = null;
let view = 'play';
let session = readStorage(sessionStorage, 'keywordia-session', true);
let playerName = readStorage(localStorage, 'keywordia-name') || 'Marketer';
let selectedCategories = [];
let selectedMap = 'usa';
// Color mode: dark by default, light when the viewer picks it.
let mode = readStorage(localStorage, 'keywordia-mode') === 'light' ? 'light' : 'dark';
document.body.classList.toggle('mode-light', mode === 'light');
let toastTimer;
let filter = 'all';
let searchTerm = '';
let submitting = false;
let pendingAnswer = false;
let claiming = false;
let exportSnapshot = null;
const MAX_PLAYERS = 6;
const ACTIVE_PHASES = ['capital', 'expand', 'claim', 'attack', 'march', 'duel', 'tiebreak', 'result'];

function readStorage(storage, key, json = false) { try { const value = storage.getItem(key); return json && value ? JSON.parse(value) : value; } catch { return null; } }
function setStorage(storage, key, value) { try { value === null ? storage.removeItem(key) : storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); } catch { /* Play still works without browser storage. */ } }
function saveName(name) { playerName = name; setStorage(localStorage, 'keywordia-name', name); updateProfile(); }
function updateProfile() { $('#profile-button').textContent = playerName.slice(0, 1).toUpperCase(); $('#profile-button').title = playerName; }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function mapName(id) { return catalog?.maps?.find((entry) => entry.id === id)?.name || id || 'United States'; }
function track(id) { return catalog?.tracks.find((entry) => entry.id === id) || { id, name: id, short: id, color: '#7ed957', icon: 'spark' }; }
function categoryLabel(id) { const item = track(id); return `<span class="category-label" style="--track-color:${escapeHtml(item.color)}">${icon(item.icon)}${escapeHtml(item.name)}</span>`; }
function formatScore(value) { return Number(value || 0).toLocaleString('en-US'); }
function sortedPlayers() { return [...(room?.players || [])].sort((a, b) => b.score - a.score || b.territories - a.territories || a.name.localeCompare(b.name)); }
function request(event, payload = {}) { return new Promise((resolve, reject) => { if (!socket.connected) { reject(new Error('The server is disconnected. Reconnecting…')); return; } socket.timeout(8000).emit(event, payload, (error, result) => { if (error) reject(new Error('The server did not respond. Check the connection and try again.')); else if (!result?.ok) reject(new Error(result?.error || 'That action could not be completed.')); else resolve(result); }); }); }
function navigate(next) { view = room && next === 'play' ? 'room' : next; if (location.hash !== `#${view}`) history.replaceState(null, '', `${location.pathname}${location.search}#${view}`); render(); window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
function render() {
  document.body.classList.toggle('in-match', view === 'room' && room && ACTIVE_PHASES.includes(room.phase));
  document.querySelectorAll('[data-nav]').forEach((element) => { const active = element.dataset.nav === (view === 'room' ? 'play' : view); element.classList.toggle('active', active); active ? element.setAttribute('aria-current', 'page') : element.removeAttribute('aria-current'); });
  $('#page-crumb').textContent = ({ play: 'Game lobby', room: room?.phase === 'lobby' ? 'Private room' : 'The arena', library: 'Questions', guide: 'How to play' })[view] || 'Game lobby';
  if (!catalog) { main.innerHTML = '<div class="loading">Loading the community question pack…</div>'; return; }
  document.body.classList.toggle('mode-light', mode === 'light');
  const themeButton = $('#theme-button'); const next = mode === 'light' ? 'dark' : 'light';
  themeButton.innerHTML = icon(mode === 'light' ? 'moon' : 'sun'); themeButton.setAttribute('aria-label', `Switch to ${next} mode`); themeButton.title = `Switch to ${next} mode`;
  if (view === 'room' && room) { if (room.phase === 'lobby') renderLobby(); else if (room.phase === 'finished') renderFinished(); else renderGame(); }
  else if (view === 'library') renderLibrary();
  else if (view === 'guide') renderGuide();
  else renderHome();
  updateTimer();
}

function worldMap(territories = null, options = {}) {
  return window.RealmMap?.render(territories || [], room?.players || [], { map: room?.settings?.map || 'usa', theme: mapTheme(), ...options }) || '<div class="loading">Unfurling the map…</div>';
}
function mapTheme() { return mode === 'light' ? 'paper' : 'paper-dark'; }
// Playable lobby board: claim a free region next to your land, then the two bots answer back. Local only, nothing reaches the server.
const DEMO_START = { atlas: [3, 0, 1, 4], you: [11, 9, 6, 8], pixel: [19, 20, 21, 18] };
const DEMO_PEOPLE = [['you', 'You', '#e08244'], ['atlas', 'Atlas', '#c23d3d'], ['pixel', 'Pixel', '#7a9d6d']];
const DEMO_MAP = 'usa';
let demoBoard = null;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function demoReset() { demoBoard = { owners: {}, capitals: {}, busy: false, turn: '' }; Object.entries(DEMO_START).forEach(([who, list]) => list.forEach((index, n) => { demoBoard.owners[index] = who; if (!n) demoBoard.capitals[index] = true; })); }
function demoOptions(map, who) { const out = new Set(); Object.keys(demoBoard.owners).filter((index) => demoBoard.owners[index] === who).forEach((index) => (map.adjacency[index] || []).forEach((next) => { if (!demoBoard.owners[next]) out.add(next); })); return [...out]; }
function demoScore(who) { return Object.entries(demoBoard.owners).filter(([, owner]) => owner === who).reduce((sum, [index]) => sum + (demoBoard.capitals[index] ? 1000 : 200), 0); }
function demoFreeCount(map) { return map.regions.filter((region, index) => !demoBoard.owners[index]).length; }
function demoMap() {
  const map = window.RealmMap?.loaded(DEMO_MAP);
  if (!map) return worldMap(null, { preview: true, demo: true, map: DEMO_MAP, theme: mapTheme() });
  if (!demoBoard) demoReset();
  const territories = map.regions.map((region, index) => { const owner = demoBoard.owners[index]; const capital = Boolean(demoBoard.capitals[index]); return { id: region.id, label: region.label, ownerId: owner ? `demo-${owner}` : null, capital, towers: capital ? 3 : 0, value: owner ? (capital ? 1000 : 200) : 0 }; });
  const players = DEMO_PEOPLE.map(([id, name, color]) => ({ id: `demo-${id}`, name, color }));
  const selectable = demoBoard.busy ? [] : demoOptions(map, 'you').map((index) => map.regions[index].id);
  return window.RealmMap.render(territories, players, { preview: true, map: DEMO_MAP, theme: mapTheme(), selectable });
}
function demoPanel() {
  const map = window.RealmMap?.loaded(DEMO_MAP);
  if (!map || !demoBoard) return '<div class="lp-demo"><p class="lp-demo-status">Loading the board…</p></div>';
  const scores = DEMO_PEOPLE.map(([id, name, color]) => ({ id, name, color, score: demoScore(id) })).sort((a, b) => b.score - a.score);
  const done = demoFreeCount(map) === 0;
  const status = done ? (scores[0].score === scores[1].score ? '<strong>A tie at the top!</strong> Settle it with real questions.' : scores[0].id === 'you' ? '<strong>You win the board!</strong> Now try it with real questions.' : `<strong>${scores[0].name} wins this one.</strong> Real matches are won with answers.`) : demoBoard.busy ? (demoBoard.turn === 'You' ? '<strong>Marching in…</strong>' : `${demoBoard.turn || 'The bots'} ${demoBoard.turn ? 'is' : 'are'} claiming…`) : '<strong>Your turn.</strong> Tap a glowing region next to your land.';
  return `<div class="lp-demo" aria-live="polite"><div class="lp-scores">${scores.map((entry) => `<span class="lp-score${entry.id === 'you' ? ' is-you' : ''}" style="--who:${entry.color}"><i></i>${entry.name}<b>${formatScore(entry.score)}</b></span>`).join('')}</div><p class="lp-demo-status">${status}</p><div class="lp-demo-actions">${done ? `<button class="lp-btn lp-primary lp-small" data-action="practice">${icon('robot')} Play a real match</button>` : ''}<button class="lp-link" data-action="demo-reset">${icon('reset')} Reset board</button><button class="lp-link" data-nav="guide">How to play ${icon('arrow')}</button></div></div>`;
}
function updateDemo(index = null, gain = '', color = '') {
  const plate = main.querySelector('.lp-plate'); if (!plate) return;
  plate.innerHTML = demoMap();
  main.querySelector('.lp-demo')?.replaceWith(Object.assign(document.createElement('div'), { innerHTML: demoPanel() }).firstElementChild);
  const map = window.RealmMap?.loaded(DEMO_MAP); if (index === null || !map) return;
  const province = plate.querySelector(`.realm-province[data-region="${CSS.escape(map.regions[index].id)}"]`); if (!province) return;
  province.classList.add('is-fresh');
  if (gain) { const box = province.getBoundingClientRect(); const frame = plate.getBoundingClientRect(); const float = document.createElement('span'); float.className = 'lp-float'; float.textContent = gain; if (color) float.style.background = color; float.style.left = `${box.left - frame.left + box.width / 2}px`; float.style.top = `${box.top - frame.top + box.height / 2}px`; plate.appendChild(float); setTimeout(() => float.remove(), 1200); }
}
// Draws a war arrow from the claimer's nearest region, then hands the target over once it lands.
async function demoStrike(map, who, index) {
  const board = demoBoard;
  const [tx, ty] = map.regions[index].center;
  const from = (map.adjacency[index] || []).filter((next) => board.owners[next] === who)
    .sort((a, b) => Math.hypot(map.regions[a].center[0] - tx, map.regions[a].center[1] - ty) - Math.hypot(map.regions[b].center[0] - tx, map.regions[b].center[1] - ty))[0];
  const color = DEMO_PEOPLE.find(([id]) => id === who)[2];
  const draw = (done) => { const layer = main.querySelector('.lp-plate .realm-fx'); if (layer && from !== undefined) layer.innerHTML = `<g class="lp-strike${done ? ' is-done' : ''}" style="--who:${color};--fx-t:${done ? '-900ms' : '0ms'}">${window.RealmMap.arrow(DEMO_MAP, map.regions[from].id, map.regions[index].id, 1.7)}</g>`; };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still) { draw(false); await wait(860); if (board !== demoBoard || !board.busy) return false; }
  board.owners[index] = who; updateDemo(index, '+200', color);
  if (!still) draw(true);
  return true;
}
async function demoClaim(regionId) {
  const map = window.RealmMap?.loaded(DEMO_MAP); if (!map || !demoBoard || demoBoard.busy) return;
  const index = map.regions.findIndex((region) => region.id === regionId);
  if (!demoOptions(map, 'you').includes(index)) return;
  const board = demoBoard; board.busy = true; board.turn = 'You'; play('select'); updateDemo();
  if (!await demoStrike(map, 'you', index)) return;
  do {
    for (const [bot, name] of [['atlas', 'Atlas'], ['pixel', 'Pixel']]) {
      const options = demoOptions(map, bot); if (!options.length) continue;
      board.turn = name; updateDemo(); await wait(320);
      if (board !== demoBoard || !board.busy) return;
      const pick = options[Math.floor(Math.random() * options.length)];
      if (!await demoStrike(map, bot, pick)) return;
      await wait(260);
    }
  } while (board.busy && demoFreeCount(map) && !demoOptions(map, 'you').length && (demoOptions(map, 'atlas').length || demoOptions(map, 'pixel').length));
  board.busy = false; board.turn = ''; updateDemo();
}
function countUp() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  main.querySelectorAll('[data-count]').forEach((element) => { const target = Number(element.dataset.count); const start = performance.now(); const step = (now) => { const progress = Math.min(1, (now - start) / 900); element.textContent = Math.round(target * (1 - (1 - progress) ** 3)); if (progress < 1 && element.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step); });
}
function renderPaperHome() {
  const total = catalog.totalQuestions + (catalog.totalEstimates || 0);
  const headline = 'Answer <em>fast.</em> Claim the <span class="lp-accent">map.</span>';
  const sample = (id) => { const pool = (catalog.questions || []).filter((question) => question.category === id); return pool.length ? pool[Math.floor(Math.random() * pool.length)].prompt : ''; };
  if (demoBoard?.busy) demoBoard.busy = false;
  main.innerHTML = `<div class="lp-home">
  <section class="lp-book" aria-label="Play">
    <div class="lp-page lp-left"><span class="lp-chip">The AI Marketing Hub community game</span><h1 class="lp-display">${headline}</h1><p class="lp-lede">A friendly quiz about Google, search and client work. Answer well, grow your land, then take your neighbours' regions.</p>
      <div class="lp-actions"><button class="lp-btn lp-primary" data-action="practice"><span>${icon('robot')} Practice with bots</span><small>A quick game against two friendly bots</small></button><button class="lp-btn lp-secondary" data-action="host"><span>${icon('users')} Create a room</span><small>Play live and share the code</small></button><button class="lp-btn lp-plain" data-action="join">${icon('code')} Join with a code</button></div>
      <div class="lp-folio"><small>Page</small>001</div></div>
    <div class="lp-spine" aria-hidden="true"></div>
    <div class="lp-page lp-right"><div class="lp-plate-head"><em>Try the board</em><span>Tap to claim, +200 a region</span></div><div class="lp-plate">${demoMap()}</div>${demoPanel()}<div class="lp-folio"><small>Page</small>002</div></div>
  </section>
  <div class="lp-stats"><div><strong data-count="${total}">${total}</strong><small>Questions</small></div><div><strong data-count="${catalog.tracks.length}">${catalog.tracks.length}</strong><small>Topics</small></div><div><strong>2 to 6</strong><small>Players</small></div><div><strong data-count="0">0</strong><small>Accounts needed</small></div></div>
  <div class="lp-rule"><em>Pick a topic</em><span aria-hidden="true"></span><button class="lp-link" data-action="library">All questions ${icon('diagonal')}</button></div>
  <div class="lp-cards">${catalog.tracks.map((item, index) => { const count = item.count + (catalog.estimates || []).filter((question) => question.category === item.id).length; return `<button class="lp-card lp-tone-${index % 6}" data-action="track" data-category="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}, ${count} questions"><span class="lp-card-inner"><span class="lp-face lp-front"><small>Topic ${String(index + 1).padStart(2, '0')}</small>${icon(item.icon)}<strong>${escapeHtml(item.name)}</strong><span class="lp-pill">${count} questions</span></span><span class="lp-face lp-back" aria-hidden="true"><small>Sample question</small><span class="lp-sample">${escapeHtml(sample(item.id))}</span><span class="lp-pill">Open topic ${icon('arrow')}</span></span></span></button>`; }).join('')}</div>
  <p class="lp-note">Every answer shows where it comes from.</p></div>`;
  countUp();
}
function renderHome() { renderPaperHome(); }

function modalHeader(eyebrow, title, description) { return `<div class="modal-head"><div><div class="section-eyebrow">${eyebrow}</div><h2 id="modal-title">${title}</h2><p>${description}</p></div><button class="close-button" data-action="close-modal" aria-label="Close dialog">×</button></div>`; }
function showModal(html) { $('#modal-content').innerHTML = html; modal.showModal(); }
function mapPicker() {
  return `<div class="field"><label id="map-label">Map</label><div class="map-picker" id="map-picker" role="radiogroup" aria-labelledby="map-label">${(catalog.maps || []).map((item) => `<button type="button" class="map-option${item.id === selectedMap ? ' selected' : ''}" role="radio" aria-checked="${item.id === selectedMap}" data-map="${escapeHtml(item.id)}"><span class="map-thumb-slot">${window.RealmMap?.thumbnail(item.id) || ''}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.blurb)}</small></button>`).join('')}</div></div>`;
}
function openHost(practice = false) {
  selectedCategories = [];
  let seats = MAX_PLAYERS;
  showModal(`${modalHeader(practice ? 'Practice' : 'Play together', practice ? 'Practice with bots' : 'Create a room', practice ? 'A quick game against Atlas and Pixel, two practice bots.' : 'Create a room, then share the code with your community.')}<form id="host-form"><div class="field"><label for="host-name">Your player name</label><input id="host-name" name="name" value="${escapeHtml(playerName)}" maxlength="24" required autocomplete="nickname"></div>${mapPicker()}<div class="field"><label>Topics</label><div class="pill-row" id="category-picker"><button type="button" class="pill selected" data-category="all" aria-pressed="true">All topics</button>${catalog.tracks.map((item) => `<button type="button" class="pill topic-pill" data-category="${item.id}" style="--track-color:${escapeHtml(item.color)}" aria-pressed="false">${icon(item.icon)}${escapeHtml(item.short || item.name)}</button>`).join('')}</div><p class="field-help" id="pool-size">${catalog.totalQuestions + (catalog.totalEstimates || 0)} questions to play.</p></div>${practice ? '' : `<div class="field"><label id="seats-label">Max players</label><div class="pill-row seat-picker" id="seat-picker" role="radiogroup" aria-labelledby="seats-label">${[2, 3, 4, 5, 6].map((count) => `<button type="button" class="pill seat-pill${count === MAX_PLAYERS ? ' selected' : ''}" data-seats="${count}" role="radio" aria-checked="${count === MAX_PLAYERS}">${count}</button>`).join('')}</div><p class="field-help" id="seats-help">Up to ${MAX_PLAYERS} players, you included.</p></div>`}<div class="form-row"><div class="field"><label for="rounds">War rounds</label><select id="rounds" name="rounds"><option value="4" ${practice ? 'selected' : ''}>4 rounds · short</option><option value="6" ${practice ? '' : 'selected'}>6 rounds · standard</option><option value="8">8 rounds · long</option></select></div><div class="field"><label for="duration">Time to answer</label><select id="duration" name="duration"><option value="10">10 seconds</option><option value="15" selected>15 seconds</option><option value="20">20 seconds</option></select></div></div><div class="error-message" id="form-error" role="alert"></div><button class="button primary full-width" type="submit" id="create-button">${icon(practice ? 'compass' : 'castle')}${practice ? 'Start practice' : 'Create room'} ${icon('arrow')}</button><p class="modal-footnote">${practice ? 'The bots are pretend players. Nothing is saved.' : 'No accounts needed. You get a code to share.'}</p></form>`);
  $('#host-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (submitting) return; submitting = true; $('#create-button').disabled = true; $('#form-error').textContent = '';
    try {
      const form = new FormData(event.currentTarget); const name = String(form.get('name')).trim();
      const result = await request('room:create', { name, categories: selectedCategories, rounds: Number(form.get('rounds')), duration: Number(form.get('duration')), practice, map: selectedMap, ...(practice ? {} : { maxPlayers: seats }) });
      saveSession(result.session); saveName(name); modal.close(); view = 'room'; render();
      if (practice) await request('room:start');
    } catch (error) { if (modal.open) $('#form-error').textContent = error.message; else toast(error.message); }
    finally { submitting = false; if ($('#create-button')) $('#create-button').disabled = false; }
  });
  $('#seat-picker')?.addEventListener('click', (event) => { const button = event.target.closest('[data-seats]'); if (!button) return; seats = Number(button.dataset.seats); $('#seat-picker').querySelectorAll('[data-seats]').forEach((item) => { const active = Number(item.dataset.seats) === seats; item.classList.toggle('selected', active); item.setAttribute('aria-checked', String(active)); }); $('#seats-help').textContent = `Up to ${seats} players, you included.`; });
  $('#map-picker').addEventListener('click', (event) => { const button = event.target.closest('[data-map]'); if (!button) return; selectedMap = button.dataset.map; $('#map-picker').querySelectorAll('[data-map]').forEach((item) => { const active = item.dataset.map === selectedMap; item.classList.toggle('selected', active); item.setAttribute('aria-checked', String(active)); }); });
  $('#category-picker').addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (!button) return; const id = button.dataset.category; if (id === 'all') selectedCategories = []; else selectedCategories = selectedCategories.includes(id) ? selectedCategories.filter((entry) => entry !== id) : [...selectedCategories, id]; $('#category-picker').querySelectorAll('button').forEach((item) => { const active = item.dataset.category === 'all' ? selectedCategories.length === 0 : selectedCategories.includes(item.dataset.category); item.classList.toggle('selected', active); item.setAttribute('aria-pressed', String(active)); }); const available = catalog.questions.filter((question) => !selectedCategories.length || selectedCategories.includes(question.category)).length; $('#pool-size').textContent = `${available + (catalog.estimates || []).filter((question) => !selectedCategories.length || selectedCategories.includes(question.category)).length} questions to play.`; });
}
function openJoin(code = '') {
  showModal(`${modalHeader('Join your community', 'Got a room code?', 'Grab your name, enter the code, and meet your rivals.')}<form id="join-form"><div class="field"><label for="join-code">Room code</label><input class="room-code-input" id="join-code" name="code" placeholder="ABC234" value="${escapeHtml(code)}" maxlength="6" minlength="6" pattern="[A-Za-z2-9]{6}" autocomplete="off" spellcheck="false" required></div><div class="field"><label for="join-name">Your player name</label><input id="join-name" name="name" value="${escapeHtml(playerName)}" maxlength="24" required autocomplete="nickname"></div><div class="error-message" id="form-error" role="alert"></div><button class="button primary full-width" id="join-button" type="submit">Join the room ${icon('arrow')}</button><p class="modal-footnote">Ask the host for the 6-letter room code.</p></form>`);
  $('#join-form').addEventListener('submit', async (event) => { event.preventDefault(); if (submitting) return; submitting = true; $('#join-button').disabled = true; $('#form-error').textContent = ''; try { const form = new FormData(event.currentTarget); const name = String(form.get('name')).trim(); const result = await request('room:join', { code: String(form.get('code')).trim().toUpperCase(), name }); saveSession(result.session); saveName(name); modal.close(); view = 'room'; render(); } catch (error) { $('#form-error').textContent = error.message; } finally { submitting = false; if ($('#join-button')) $('#join-button').disabled = false; } });
}
function saveSession(value) { session = value; setStorage(sessionStorage, 'keywordia-session', value); if (value) history.replaceState(null, '', `${location.pathname}?room=${encodeURIComponent(value.code)}#room`); }
async function leaveRoom() {
  if (room && socket.connected) {
    try { await request('room:leave'); }
    catch (error) { toast(`Could not leave yet: ${error.message}`); return; }
  } else if (room) {
    // Abandon the old transport too, so a reconnect cannot keep its room identity.
    socket.disconnect();
  }
  saveSession(null); room = null; history.replaceState(null, '', `${location.pathname}#play`); view = 'play'; render(); window.scrollTo(0, 0);
  if (!socket.connected) socket.connect();
}
function playerAvatar(person) { return `<span class="player-avatar" style="--player-color:${escapeHtml(person.color)}">${person.bot ? icon('robot') : escapeHtml(person.name.slice(0, 2).toUpperCase())}</span>`; }
function renderLobby() {
  const host = room.players.find((person) => person.id === room.hostId);
  const realms = room.settings.categories?.length ? room.settings.categories.map((id) => track(id).short || track(id).name).join(', ') : 'All topics';
  main.innerHTML = `<div class="intro-row"><div><div class="section-eyebrow">${room.practice ? 'Practice room' : 'Private room'}</div><h1>The rivals are <em>gathering.</em></h1></div><button class="button ghost small" data-action="leave">${icon('leave')} Leave room</button></div><div class="room-layout"><section class="panel"><div class="room-code-label">Room code</div><div class="room-code-display">${escapeHtml(room.code)}</div><div class="hero-actions"><button class="button small" data-action="copy-code">${icon('copy')} Copy code</button><button class="button small ghost" data-action="copy-link">${icon('link')} Copy invite link</button></div><p class="room-name">Hosted by ${escapeHtml(host?.name || 'your community')} · ${room.players.length}/${room.settings.maxPlayers || MAX_PLAYERS} players</p><div class="room-players">${room.players.map((person) => `<div class="player-card">${playerAvatar(person)}<div><strong>${escapeHtml(person.name)}${person.id === room.me.id ? ' (you)' : ''}</strong><small>${person.id === room.hostId ? 'Host' : person.bot ? 'Practice bot' : person.connected ? 'Ready to play' : 'Reconnecting…'}</small></div>${room.me.host && person.id !== room.me.id ? `<button class="kick" data-action="kick" data-player="${person.id}" aria-label="Remove ${escapeHtml(person.name)}">×</button>` : ''}</div>`).join('')}</div><div class="room-actions">${room.me.host ? `<button class="button primary" data-action="start" ${room.players.filter((person) => person.connected).length < 2 ? 'disabled' : ''}>Let the games begin ${icon('arrow')}</button><button class="button ghost" data-action="add-bot" ${room.players.length >= (room.settings.maxPlayers || MAX_PLAYERS) ? 'disabled' : ''}>${icon('robot')} Add bot</button>` : '<p class="small-text muted">Get comfortable. The host will start the match.</p>'}</div><p class="field-help">${room.players.length < 2 ? 'Invite at least one friend, or add a practice bot.' : 'Everyone plays on their own screen. The match runs on its own timer.'}</p></section><aside><div class="lobby-art">${worldMap(null, { preview: true })}</div><section class="panel"><div class="section-eyebrow">Settings</div><div class="settings-list"><div><span>Map</span><strong>${escapeHtml(mapName(room.settings.map))}</strong></div><div><span>Players</span><strong>Up to ${room.settings.maxPlayers || MAX_PLAYERS}</strong></div><div><span>War rounds</span><strong>${room.settings.rounds}</strong></div><div><span>Time to answer</span><strong>${room.settings.duration} seconds</strong></div><div><span>Topics</span><strong>${escapeHtml(realms)}</strong></div></div><p class="field-help">Found a capital, answer well to expand, then attack your neighbours. The most points after the war wins.</p></section></aside></div><div class="callout">${icon('users')}<div><strong>Made for your next community call.</strong><p>Share the code. Everyone plays on their own phone or laptop.</p></div></div>`;
}
function playerShield(person) {
  const monogram = person.bot ? icon('robot') : escapeHtml(person.name.slice(0, 2).toUpperCase());
  return `<span class="commander-medallion" style="--player-color:${escapeHtml(person.color)}"><span>${monogram}</span></span>`;
}
function playerById(playerId) { return room?.players.find((person) => person.id === playerId) || null; }
function nameOf(playerId) { return escapeHtml(playerById(playerId)?.name || 'A player'); }
function regionById(territoryId) { return room.territories.find((territory) => territory.id === territoryId) || null; }
function regionName(territoryId) { return escapeHtml(regionById(territoryId)?.label || 'a region'); }
function seconds(ms) { return `${(Number(ms || 0) / 1000).toFixed(1)}s`; }
function plural(count, one, many) { return `${count} ${count === 1 ? one : many}`; }
function inDuel(playerId) { return Boolean(room.battle && ['march', 'duel', 'tiebreak', 'result'].includes(room.phase) && [room.battle.attackerId, room.battle.defenderId].includes(playerId)); }
function initials(person) { return person?.bot ? icon('robot') : escapeHtml((person?.name || '?').slice(0, 2).toUpperCase()); }
function avatar(person) { return `<span class="wr-avatar" style="--pc:${escapeHtml(person?.color || '#8a7a60')}">${initials(person)}</span>`; }
function mapOptions() {
  const turn = room.turn;
  const mine = Boolean(turn && turn.playerId === room.me.id);
  return { selectable: mine ? turn.options : [], action: turn?.kind || 'claim', target: room.battle && ['march', 'duel', 'tiebreak', 'result'].includes(room.phase) ? room.battle.targetId : null };
}
function claimValue() { return room.expansionRound <= 2 ? 200 : 300; }
function formatNumber(value) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
// Years read as 2009, not "2,009 year".
function amount(value, unit) { return unit === 'year' ? String(value) : `${formatNumber(value)}${unit ? ` ${escapeHtml(unit)}` : ''}`; }
function sourceBlock(result) { return `<details class="why-block"><summary>${icon('book')} Why this is the answer</summary><p>${escapeHtml(result.explanation)}</p><a class="source-link" href="${safeUrl(result.source?.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.source?.title || 'Read the source')} ${icon('diagonal')}</a>${result.source?.url?.includes('/seo-flow/') ? '<p class="attribution">FLOW framework by Daniel Agrici · CC BY 4.0</p>' : ''}</details>`; }

/* Sounds: synthesized with Web Audio (plucks, drums, metal and noise through a small room), so no audio files are needed. */
const sound = { on: readStorage(localStorage, 'keywordia-sound') !== 'off', context: null, bus: null, room: null, noise: null };
function audio() {
  if (!sound.on) return null;
  try {
    if (!sound.context) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const master = context.createGain(); master.gain.value = 0.85;
      const squeeze = context.createDynamicsCompressor(); squeeze.threshold.value = -16; squeeze.knee.value = 10; squeeze.ratio.value = 5; squeeze.attack.value = 0.003; squeeze.release.value = 0.18;
      master.connect(squeeze).connect(context.destination);
      // A short generated room tail gives every cue a little space.
      const length = Math.floor(context.sampleRate * 1.1); const impulse = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < 2; channel += 1) { const data = impulse.getChannelData(channel); for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2); }
      const verb = context.createConvolver(); verb.buffer = impulse; const wet = context.createGain(); wet.gain.value = 0.22; verb.connect(wet).connect(master);
      const noise = context.createBuffer(1, context.sampleRate, context.sampleRate); const samples = noise.getChannelData(0); for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      Object.assign(sound, { context, bus: master, room: verb, noise });
    }
    if (sound.context.state === 'suspended') sound.context.resume();
    return sound.context;
  } catch { return null; }
}
// One shaped note: oscillator, optional filter, then a quick attack and an exponential fall.
function tone(at, { f, to, type = 'triangle', dur = 0.2, vol = 0.1, attack = 0.006, cut, q = 0.7, wet = 0.3, vibrato = 0 }) {
  const { context, bus, room: verb } = sound; const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(f, at); if (to) oscillator.frequency.exponentialRampToValueAtTime(to, at + dur);
  if (vibrato) { const lfo = context.createOscillator(); const depth = context.createGain(); lfo.frequency.value = 5.5; depth.gain.value = vibrato; lfo.connect(depth).connect(oscillator.frequency); lfo.start(at); lfo.stop(at + dur + 0.1); }
  let node = oscillator; if (cut) { const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cut; filter.Q.value = q; node = node.connect(filter); }
  gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(vol, at + attack); gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  node.connect(gain); gain.connect(bus); if (wet) { const send = context.createGain(); send.gain.value = wet; gain.connect(send).connect(verb); }
  oscillator.start(at); oscillator.stop(at + dur + 0.05);
}
// A burst of filtered noise: hits, swooshes, clashes and crumbles.
function hiss(at, { dur = 0.12, vol = 0.1, type = 'bandpass', f = 1200, to, q = 1, attack = 0.002, wet = 0.2 }) {
  const { context, bus, room: verb, noise } = sound; const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const gain = context.createGain();
  source.buffer = noise; filter.type = type; filter.Q.value = q; filter.frequency.setValueAtTime(f, at); if (to) filter.frequency.exponentialRampToValueAtTime(to, at + dur);
  gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(vol, at + attack); gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  source.connect(filter).connect(gain); gain.connect(bus); if (wet) { const send = context.createGain(); send.gain.value = wet; gain.connect(send).connect(verb); }
  source.start(at, Math.random() * 0.5); source.stop(at + dur + 0.05);
}
const drum = (at, vol = 0.5, f = 150) => { tone(at, { f, to: 45, type: 'sine', dur: 0.32, vol, attack: 0.003, wet: 0.15 }); hiss(at, { dur: 0.06, vol: vol * 0.35, type: 'lowpass', f: 900, wet: 0 }); };
const pluck = (at, f, vol = 0.12, dur = 0.5) => { tone(at, { f, type: 'triangle', dur, vol, attack: 0.004 }); tone(at, { f: f * 2, type: 'sine', dur: dur * 0.5, vol: vol * 0.3, attack: 0.003 }); };
const bell = (at, f, vol = 0.08, dur = 0.9) => { tone(at, { f, type: 'sine', dur, vol, wet: 0.45 }); tone(at, { f: f * 2.76, type: 'sine', dur: dur * 0.4, vol: vol * 0.35, wet: 0.45 }); tone(at, { f: f * 5.4, type: 'sine', dur: dur * 0.2, vol: vol * 0.15, wet: 0.45 }); };
const brass = (at, f, dur = 0.4, vol = 0.07) => { tone(at, { f, type: 'sawtooth', dur, vol, attack: 0.03, cut: 1400, q: 1.2, vibrato: 3 }); tone(at, { f: f * 1.005, type: 'sawtooth', dur, vol: vol * 0.6, attack: 0.03, cut: 1100 }); };
const CUES = {
  tick: (t) => { tone(t, { f: 1650, to: 1200, type: 'sine', dur: 0.07, vol: 0.12, attack: 0.002, wet: 0.05 }); hiss(t, { dur: 0.03, vol: 0.05, f: 3800, q: 2, wet: 0 }); },
  select: (t) => { tone(t, { f: 620, to: 980, type: 'sine', dur: 0.1, vol: 0.12, attack: 0.003, wet: 0.15 }); hiss(t, { dur: 0.025, vol: 0.04, f: 2600, q: 1.5, wet: 0 }); },
  lock: (t) => { hiss(t, { dur: 0.03, vol: 0.12, f: 3200, q: 3, wet: 0 }); tone(t, { f: 420, to: 300, type: 'square', dur: 0.06, vol: 0.05, cut: 1800, wet: 0.05 }); hiss(t + 0.07, { dur: 0.04, vol: 0.14, f: 2200, q: 3, wet: 0.1 }); tone(t + 0.07, { f: 260, to: 190, type: 'square', dur: 0.09, vol: 0.06, cut: 1400, wet: 0.1 }); },
  turn: (t) => { pluck(t, 587.33, 0.12); pluck(t + 0.1, 880, 0.12, 0.7); bell(t + 0.1, 1760, 0.03, 0.6); },
  question: (t) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(t + i * 0.065, f, 0.1, 0.55)); bell(t + 0.27, 2093, 0.025, 0.7); },
  claim: (t) => { tone(t, { f: 330, to: 660, type: 'sine', dur: 0.14, vol: 0.14, attack: 0.004, wet: 0.2 }); drum(t, 0.18, 220); bell(t + 0.09, 1318.5, 0.06, 0.6); },
  attack: (t) => { drum(t, 0.55, 130); drum(t + 0.16, 0.4, 120); drum(t + 0.32, 0.6, 110); brass(t + 0.04, 146.83, 0.3); brass(t + 0.34, 196, 0.5, 0.08); hiss(t + 0.3, { dur: 0.35, vol: 0.06, f: 500, to: 3500, q: 0.8 }); },
  capture: (t) => { hiss(t, { dur: 0.22, vol: 0.18, type: 'highpass', f: 2600, wet: 0.35 }); [1870, 2950, 4100].forEach((f, i) => tone(t, { f, type: 'sine', dur: 0.7 - i * 0.15, vol: 0.05 - i * 0.012, attack: 0.001, wet: 0.5 })); drum(t, 0.45, 110); [392, 493.88, 587.33].forEach((f, i) => brass(t + 0.12 + i * 0.09, f, i === 2 ? 0.55 : 0.18, 0.06)); },
  defend: (t) => { drum(t, 0.6, 95); hiss(t, { dur: 0.16, vol: 0.16, type: 'lowpass', f: 1300, wet: 0.2 }); tone(t, { f: 220, type: 'triangle', dur: 0.5, vol: 0.08, wet: 0.35 }); bell(t + 0.12, 659.25, 0.07, 0.9); bell(t + 0.2, 987.77, 0.05, 0.9); },
  tower: (t) => { drum(t, 0.7, 90); hiss(t, { dur: 0.9, vol: 0.2, type: 'lowpass', f: 1400, to: 110, q: 0.6, attack: 0.01, wet: 0.35 }); tone(t, { f: 90, to: 38, type: 'sine', dur: 0.8, vol: 0.3, wet: 0.1 }); [0.14, 0.27, 0.41].forEach((d) => hiss(t + d, { dur: 0.07, vol: 0.08, f: 700 + d * 900, q: 2, wet: 0.2 })); },
  correct: (t) => { pluck(t, 783.99, 0.11, 0.4); pluck(t + 0.09, 1174.66, 0.12, 0.7); bell(t + 0.09, 2349.3, 0.03, 0.6); },
  wrong: (t) => { tone(t, { f: 233, to: 175, type: 'square', dur: 0.32, vol: 0.06, cut: 900, wet: 0.15 }); tone(t, { f: 220, to: 165, type: 'square', dur: 0.32, vol: 0.05, cut: 800, wet: 0.15 }); },
  win: (t) => { drum(t, 0.4, 140); [523.25, 659.25, 783.99].forEach((f, i) => brass(t + i * 0.11, f, 0.16, 0.07)); [523.25, 659.25, 783.99, 1046.5].forEach((f) => brass(t + 0.34, f, 0.9, 0.045)); bell(t + 0.34, 2093, 0.04, 1.2); },
  lose: (t) => { [392, 311.13, 261.63].forEach((f, i) => tone(t + i * 0.2, { f, to: i === 2 ? 220 : 0, type: 'triangle', dur: i === 2 ? 0.8 : 0.24, vol: 0.1, cut: 1500, wet: 0.35 })); drum(t + 0.4, 0.3, 90); },
};
function play(name) {
  const context = audio(); if (!context || context.state !== 'running' || !CUES[name]) return;
  try { CUES[name](context.currentTime + 0.02); } catch { /* Sound is decoration; never block the game. */ }
}
document.addEventListener('pointerdown', () => { if (sound.on) audio(); }, { passive: true });

/* Effects: worked out from state changes, then replayed on every render at their elapsed time so re-renders never restart them. */
const fx = { tiles: new Map(), floats: [], pops: new Map(), shown: new Map(), seen: new Map(), answered: new Map(), enterAt: 0, banner: null, hold: 0, arrow: null };
// A card that opens while a stage banner is up waits for the banner, so the two never cover each other.
function since(key) { const now = performance.now(); if (!fx.seen.has(key)) { if (fx.seen.size > 120) fx.seen.clear(); fx.seen.set(key, /^(card|reveal|result):/.test(key) ? Math.max(now, fx.hold) : now); } return `${Math.round(fx.seen.get(key) - now)}ms`; }
function showBanner(text, at) { fx.banner = text && { text, at }; if (text) fx.hold = at + 1700; }
function answeredAt(playerId) { const at = fx.answered.get(`${room.question?.id}:${playerId}`); return `--fx-d:${at ? Math.round(at - performance.now()) : -1000}ms`; }
function stageBannerFor(stage) { return { capitals: ['Stage 1', 'Capitals', 'Everyone founds a capital'], expansion: ['Stage 2', 'Expansion', 'Answer well to claim free regions'], war: ['Stage 3', 'Conquest', 'Attack your neighbours'] }[stage] || null; }
function detectFx(previous, next) {
  const now = performance.now();
  if (!ACTIVE_PHASES.includes(next.phase)) {
    if (next.phase === 'finished' && previous && ACTIVE_PHASES.includes(previous.phase)) { const top = Math.max(...next.players.map((person) => person.score)); play(next.players.find((person) => person.id === next.me.id)?.score === top ? 'win' : 'lose'); }
    next.players.forEach((person) => fx.shown.set(person.id, person.score)); return;
  }
  if (!previous || previous.code !== next.code || !ACTIVE_PHASES.includes(previous.phase)) {
    fx.tiles.clear(); fx.floats = []; fx.pops.clear(); fx.arrow = null; fx.enterAt = now;
    fx.answered.clear(); showBanner(stageBannerFor(next.stage), now + 500);
    next.players.forEach((person) => fx.shown.set(person.id, person.score)); return;
  }
  const mapId = next.settings.map; const cues = new Set();
  const before = new Map(previous.territories.map((territory) => [territory.id, territory]));
  const changes = [];
  for (const territory of next.territories) {
    const old = before.get(territory.id); if (!old) continue;
    if (territory.ownerId && old.ownerId !== territory.ownerId) changes.push({ territory, kind: territory.capital && !old.capital ? 'found' : old.ownerId ? 'capture' : 'claim' });
    else if (old.capital && territory.capital && territory.towers < old.towers) changes.push({ territory, kind: 'tower' });
  }
  const origin = window.RealmMap.center(mapId, next.battle?.targetId || changes[0]?.territory.id);
  changes.map((change) => ({ ...change, point: window.RealmMap.center(mapId, change.territory.id) }))
    .sort((a, b) => origin && a.point && b.point ? Math.hypot(a.point.x - origin.x, a.point.y - origin.y) - Math.hypot(b.point.x - origin.x, b.point.y - origin.y) : 0)
    .forEach(({ territory, kind, point }, index) => {
      const at = now + Math.min(index, 12) * 110;
      fx.tiles.set(territory.id, { kind, at });
      if (!point) return;
      const color = next.players.find((person) => person.id === territory.ownerId)?.color;
      if (kind === 'tower') fx.floats.push({ ...point, at, text: '-1 tower', tone: 'down' });
      else fx.floats.push({ ...point, at, text: `+${formatScore(territory.value)}`, tone: 'up', color, burst: kind === 'capture' && index === 0 });
      cues.add(kind === 'found' ? 'claim' : kind);
    });
  for (const person of next.players) {
    const old = previous.players.find((entry) => entry.id === person.id);
    if (old && old.score !== person.score) fx.pops.set(person.id, { delta: person.score - old.score, at: now + 250 });
  }
  if (next.stage !== previous.stage) showBanner(stageBannerFor(next.stage), now + 200);
  if (next.question) for (const playerId of next.answered) { const key = `${next.question.id}:${playerId}`; if (!fx.answered.has(key)) { if (fx.answered.size > 60) fx.answered.clear(); fx.answered.set(key, next.question.id === previous.question?.id && !previous.answered.includes(playerId) ? now : now - 1000); } }
  const battle = next.battle;
  if (next.phase === 'march' && previous.phase !== 'march' && battle) {
    const from = window.RealmMap.attackOrigin(mapId, next.territories, battle.attackerId, battle.targetId);
    fx.arrow = from ? { from, to: battle.targetId, at: now } : null; cues.add('attack');
  }
  if (next.phase === 'result' && previous.phase !== 'result' && battle) {
    const point = window.RealmMap.center(mapId, battle.targetId);
    if (battle.outcome === 'DEFENDER_WIN') { fx.tiles.set(battle.targetId, { kind: 'defend', at: now }); if (point) fx.floats.push({ ...point, at: now, text: 'Defended', tone: 'defend' }); cues.add('defend'); }
    if (battle.eliminated) showBanner(['Capital toppled', `${escapeHtml(next.players.find((person) => person.id === battle.defenderId)?.name || 'A player')} is out`, `${escapeHtml(next.players.find((person) => person.id === battle.attackerId)?.name || 'The attacker')} takes every region`], now);
    if ([battle.attackerId, battle.defenderId].includes(next.me.id) && battle.outcome !== 'BOTH_INCORRECT') { const won = battle.outcome === (battle.attackerId === next.me.id ? 'ATTACKER_WIN' : 'DEFENDER_WIN'); cues.clear(); cues.add(won ? 'win' : 'lose'); }
  }
  if (next.question && next.question.id !== previous.question?.id) cues.add('question');
  if (next.turn?.playerId === next.me.id && (previous.turn?.playerId !== next.me.id || previous.phase !== next.phase)) cues.add('turn');
  if (next.phase === 'claim' && previous.phase !== 'claim' && next.result) {
    const result = next.result; const rank = result.ranking.indexOf(next.me.id); const mine = result.answers.find((answer) => answer.playerId === next.me.id);
    if (rank === 0) cues.add('win'); else if (rank > 0 || (mine && result.kind !== 'estimate' && mine.correct)) cues.add('correct'); else if (mine || result.away?.includes(next.me.id)) cues.add('wrong');
  }
  const priority = ['win', 'lose', 'tower', 'capture', 'defend', 'attack', 'correct', 'wrong', 'question', 'turn', 'claim'];
  const cue = priority.find((name) => cues.has(name)); if (cue) play(cue);
}
function applyFx() {
  const svg = main.querySelector('.wr-board .realm-map'); if (!svg) return;
  const now = performance.now();
  if (now - fx.enterAt < 1800) { svg.classList.add('fx-enter'); svg.style.setProperty('--fx-t', `${Math.round(fx.enterAt - now)}ms`); }
  for (const [id, item] of fx.tiles) {
    if (now - item.at > 2600) { fx.tiles.delete(id); continue; }
    svg.querySelectorAll(`[data-region="${CSS.escape(id)}"]`).forEach((element) => { element.classList.add(`fx-${item.kind}`); element.style.setProperty('--fx-t', `${Math.round(item.at - now)}ms`); });
  }
  fx.floats = fx.floats.filter((item) => now - item.at < 2000);
  let layer = '';
  if (fx.arrow && ['march', 'duel', 'tiebreak'].includes(room.phase) && room.battle?.targetId === fx.arrow.to) layer += `<g style="--fx-t:${Math.round(fx.arrow.at - now)}ms;--who:${escapeHtml(room.players.find((person) => person.id === room.battle.attackerId)?.color || '#ff5a3c')}">${window.RealmMap.arrow(room.settings.map, fx.arrow.from, fx.arrow.to, 1.5)}</g>`;
  for (const item of fx.floats) {
    const delay = `--fx-t:${Math.round(item.at - now)}ms`;
    if (item.burst) layer += `<g transform="translate(${item.x} ${item.y})" style="${delay}${item.color ? `;--who:${escapeHtml(item.color)}` : ''}">${Array.from({ length: 10 }, (_, spoke) => `<g transform="rotate(${spoke * 36 + 18})"><path class="fx-spark${spoke % 2 ? ' is-light' : ''}" d="M${spoke % 2 ? 26 : 30} 0H${spoke % 2 ? 40 : 50}" style="${delay}"/></g>`).join('')}</g>`;
    layer += `<circle class="fx-ring ${item.tone}" cx="${item.x}" cy="${item.y}" r="${Math.max(18, item.room * 0.6)}" style="${delay}"/><g class="fx-float ${item.tone}" style="${delay}"><text x="${item.x}" y="${item.y - 10}" text-anchor="middle"${item.color ? ` style="fill:${escapeHtml(item.color)}"` : ''}>${escapeHtml(item.text)}</text></g>`;
  }
  svg.querySelector('.realm-fx').innerHTML = layer;
}
let scoreFrame = 0;
function paintScores() { if (!scoreFrame) scoreFrame = requestAnimationFrame(stepScores); }
function stepScores() {
  scoreFrame = 0; let moving = false;
  for (const person of room?.players || []) {
    const shown = fx.shown.get(person.id) ?? person.score;
    const pop = fx.pops.get(person.id);
    if (pop && performance.now() < pop.at) { moving = true; continue; }
    let next = person.score;
    if (shown !== person.score) { const gap = person.score - shown; next = shown + Math.sign(gap) * Math.max(1, Math.round(Math.abs(gap) * 0.16)); if (Math.abs(person.score - next) < 3) next = person.score; else moving = true; }
    fx.shown.set(person.id, next);
    const element = main.querySelector(`.js-score[data-player="${CSS.escape(person.id)}"]`);
    if (element) element.textContent = formatScore(next);
  }
  if (moving) paintScores();
}

/* The war room HUD */
function timerRing() { return `<span class="wr-ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="wr-ring-track" cx="18" cy="18" r="15.5"/><circle class="wr-ring-fill js-timer-ring" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b class="js-timer-text"></b></span>`; }
function cardBanner(iconName, text, tone = '') { return `<div class="wr-banner ${tone}">${icon(iconName)}<span>${text}</span>${room.deadline ? timerRing() : ''}</div>`; }
function tools() {
  const [action, label] = room.me.host ? ['end', 'End the match'] : ['leave-match', 'Leave the match'];
  return `<div class="wr-tools"><button class="wr-tool" data-action="${action}" aria-label="${label}" title="${label}">${icon('leave')}</button><button class="wr-tool" data-action="sound" aria-pressed="${sound.on}" aria-label="Sound effects" title="${sound.on ? 'Mute sounds' : 'Turn sounds on'}">${icon(sound.on ? 'sound' : 'mute')}</button><button class="wr-tool" data-action="help" aria-label="How to play" title="How to play">${icon('help')}</button></div>`;
}
function statusInfo() {
  const turn = room.turn; const battle = room.battle;
  const free = room.territories.filter((territory) => !territory.ownerId).length;
  switch (room.phase) {
    case 'capital': return ['Capital selection', turn ? `Capital ${turn.index + 1} of ${room.order.length}. 3 towers, 1,000 points.` : 'Placing capitals.'];
    case 'expand': return [`Expansion question`, room.question?.kind === 'estimate' ? 'Closest guess claims 2 regions, runner-up 1.' : 'Fastest correct answer claims 2 regions, runner-up 1.'];
    case 'claim': return [turn ? 'Claiming regions' : 'Ranking the answers', `${formatScore(claimValue())} points a region · ${plural(free, 'free region', 'free regions')}`];
    case 'attack': return ['War', turn ? 'Win a duel to take a region for 400 points. A capital needs 3 wins.' : `${nameOf(room.war?.attackerId)} has no rival border. Next turn.`];
    case 'march': case 'duel': return ['Duel', battle ? `${nameOf(battle.attackerId)} vs ${nameOf(battle.defenderId)}` : 'Two players face off.'];
    case 'tiebreak': return ['Tie-break', 'Both were right. Closest number wins.'];
    case 'result': return ['Battle over', battle?.outcome === 'ATTACKER_WIN' ? `${nameOf(battle.attackerId)} wins the duel.` : battle?.outcome === 'DEFENDER_WIN' ? `${nameOf(battle.defenderId)} holds the line.` : 'Nobody won the duel.'];
    default: return ['Get ready', ''];
  }
}
function statusCard() {
  const [title, detail] = statusInfo();
  const review = room.phase === 'claim' && room.result && room.turn && !revealExpanded ? `<button class="wr-review" data-action="review-answer" title="Review the last answer">${icon('book')}<span>Last answer</span></button>` : '';
  return `<div class="wr-status" role="status" style="--fx-t:${since(`status:${title}`)}"><span class="wr-status-icon">${icon('hourglass')}</span><div><strong>${title}</strong><small>${detail}</small></div>${review}</div>`;
}
function promptPill() {
  const turn = room.turn; const battle = room.battle;
  if (room.phase === 'march' && battle) return `<div class="wr-prompt is-march" role="status" style="--fx-t:${since(`march:${battle.attackerId}:${battle.targetId}:${room.war?.round}:${room.war?.turn}`)}">${icon('swords')}<span><b>${nameOf(battle.attackerId)}</b> attacks <b>${regionName(battle.targetId)}</b>${battle.isBase ? ` · ${plural(regionById(battle.targetId)?.towers ?? 0, 'tower', 'towers')} left` : ''}</span></div>`;
  if (!turn || !['capital', 'claim', 'attack'].includes(room.phase)) return '';
  const mine = turn.playerId === room.me.id; const who = nameOf(turn.playerId);
  const again = room.phase === 'claim' && mine && room.claimQueue.includes(room.me.id) ? ' · 1 more after this' : '';
  const text = { capital: mine ? 'Found your capital' : `<b>${who}</b> is founding a capital`, claim: mine ? `Claim a region${again}` : `<b>${who}</b> is claiming a region`, attack: mine ? 'Attack a rival region' : `<b>${who}</b> is choosing a target` }[turn.kind] || '';
  return `<div class="wr-prompt ${mine ? 'is-mine' : ''} ${turn.kind === 'attack' ? 'is-attack' : ''}" role="status" style="--fx-t:${since(`prompt:${room.phase}:${turn.playerId}:${turn.deadline}`)}">${timerRing()}<span>${text}</span></div>`;
}
function phaseBar() {
  let label; let segments;
  if (room.stage === 'war' && room.war) {
    const { round, totalRounds } = room.war; label = `Conquest · Round ${Math.max(round, 1)} of ${totalRounds}`;
    segments = Array.from({ length: totalRounds }, (_, index) => index + 1 < round ? 'done' : index + 1 === round ? 'current' : '');
  } else if (room.stage === 'capitals') {
    const placed = room.players.filter((person) => person.capitalId).length; label = 'Capital selection';
    segments = room.order.map((_, index) => index < placed ? 'done' : index === placed ? 'current' : '');
  } else {
    const share = room.territories.filter((territory) => territory.ownerId).length / room.territories.length; const filled = Math.min(6, Math.floor(share * 6));
    label = `Expansion · Round ${room.expansionRound}`; segments = Array.from({ length: 6 }, (_, index) => index < filled ? 'done' : index === filled ? 'current' : '');
  }
  return `<div class="wr-phase"><span class="wr-phase-label"><i class="wr-orn"></i>${label}<i class="wr-orn"></i></span><span class="wr-segs" aria-hidden="true">${segments.map((state) => `<i class="${state}"></i>`).join('')}</span></div>`;
}
function isAway(playerId) { return (room.away || []).includes(playerId); }
function youTag(playerId) { return playerId === room.me.id ? '<em class="wr-you">You</em>' : ''; }
function towerPips(count) { return `<span class="wr-pips" role="img" aria-label="${plural(count, 'tower', 'towers')} left">${[0, 1, 2].map((index) => `<i class="${index < count ? 'on' : ''}"></i>`).join('')}</span>`; }
function playerBars() {
  const asking = ['expand', 'duel', 'tiebreak'].includes(room.phase) && room.question;
  const now = performance.now();
  const top = Math.max(...room.players.map((person) => person.score)); const leaders = room.players.filter((person) => top > 0 && person.score === top);
  return `<div class="wr-players ${room.players.length > 4 ? 'is-crowd' : ''}" aria-label="Players" style="--fx-t:${Math.round(fx.enterAt - now)}ms">${room.players.map((person, index) => {
    const active = room.turn?.playerId === person.id || inDuel(person.id) || (room.phase === 'attack' && !room.turn && room.war?.attackerId === person.id);
    const away = asking && isAway(person.id);
    const answered = asking && room.answered.includes(person.id);
    const thinking = asking && room.eligible.includes(person.id) && !answered && !away;
    const pop = fx.pops.get(person.id); const popping = pop && now - pop.at < 1800;
    if (pop && !popping) fx.pops.delete(person.id);
    const classes = ['wr-player', active && 'is-active', person.id === room.me.id && 'is-me', person.alive === false && 'is-out', thinking && 'is-thinking', away && 'is-away'].filter(Boolean).join(' ');
    const badge = away ? `<i class="wr-badge away" title="Left the window">${icon('lock')}</i>` : answered ? `<i class="wr-badge" style="${answeredAt(person.id)}" title="Answered">${icon('check')}</i>` : !person.connected && !person.bot ? '<i class="wr-badge off" title="Offline">!</i>' : '';
    const lead = leaders.length === 1 && leaders[0].id === person.id ? `<i class="wr-lead" title="In the lead">${icon('crown')}</i>` : '';
    return `<div class="${classes}" style="--pc:${escapeHtml(person.color)};--n:${index}"><span class="wr-avatar">${initials(person)}${badge}</span><span class="wr-pbody"><span class="wr-name">${lead}<span>${escapeHtml(person.name)}</span>${youTag(person.id)}</span><span class="wr-meta">${person.capitalId ? `<span title="Capital towers">${icon('castle')}${person.towers}</span>` : ''}<span title="Regions">${icon('flag')}${person.territories}</span></span></span><b class="wr-score js-score" data-player="${escapeHtml(person.id)}">${formatScore(fx.shown.get(person.id) ?? person.score)}</b>${popping ? `<span class="wr-pop ${pop.delta > 0 ? 'up' : 'down'}" style="--fx-t:${Math.round(pop.at - now)}ms">${pop.delta > 0 ? '+' : '-'}${formatScore(Math.abs(pop.delta))}</span>` : ''}</div>`;
  }).join('')}</div>`;
}
function stageBanner() {
  if (!fx.banner || performance.now() - fx.banner.at > 2300) return '';
  const [small, title, line] = fx.banner.text;
  return `<div class="wr-stage-banner" aria-hidden="true" style="--fx-t:${Math.round(fx.banner.at - performance.now())}ms"><small>${small}</small><strong>${title}</strong><span>${line}</span></div>`;
}
function answeredDots() {
  return `<div class="wr-dots" aria-label="Who has answered">${room.eligible.map((playerId) => {
    const person = playerById(playerId); const done = room.answered.includes(playerId); const away = isAway(playerId);
    return `<span class="wr-dot ${done ? 'is-done' : ''} ${away ? 'is-away' : ''}" style="--pc:${escapeHtml(person?.color || '#8a7a60')};${answeredAt(playerId)}" title="${nameOf(playerId)}${away ? ' left the window' : done ? ' answered' : ' is thinking'}">${initials(person)}${away ? `<i>${icon('lock')}</i>` : done ? `<i>${icon('check')}</i>` : ''}</span>`;
  }).join('')}</div>`;
}
// A duelist: avatar with an animated sword (attacker) or shield (defender), and a check or lock once they are done.
function duelFace(playerId, role, extra = '') {
  return `<span class="wr-face">${avatar(playerById(playerId))}<i class="wr-role ${role}" title="${role === 'attacker' ? 'Attacker' : 'Defender'}">${icon(role === 'attacker' ? 'sword' : 'shield')}</i>${extra}</span>`;
}
function duelist(playerId, role) {
  const done = room.answered.includes(playerId); const away = isAway(playerId);
  const state = away ? `<i class="wr-state away">${icon('lock')}</i>` : done ? `<i class="wr-state">${icon('check')}</i>` : '';
  return `<div class="wr-duelist ${role} ${away ? 'is-away' : done ? 'is-done' : 'is-thinking'}" style="--pc:${escapeHtml(playerById(playerId)?.color || '#8a7a60')}">${duelFace(playerId, role, state)}<span class="wr-duel-name"><strong>${nameOf(playerId)}</strong>${youTag(playerId)}</span><span class="sr-only">${role === 'attacker' ? 'Attacker' : 'Defender'}, ${away ? 'left the window' : done ? 'answered' : 'thinking'}</span></div>`;
}
function targetChip(battle) {
  const region = regionById(battle.targetId);
  return `<span class="wr-target ${battle.isBase ? 'is-base' : ''}">${icon(battle.isBase ? 'castle' : 'flag')}<span>${regionName(battle.targetId)}</span>${battle.isBase ? towerPips(region?.towers ?? 0) : ''}</span>`;
}
function duelStrip() {
  const battle = room.battle;
  return `<div class="wr-duel">${duelist(battle.attackerId, 'attacker')}<div class="wr-duel-mid"><span class="wr-vs">VS</span>${targetChip(battle)}</div>${duelist(battle.defenderId, 'defender')}</div>`;
}
function questionCard() {
  const question = room.question; const numeric = question.kind === 'estimate'; const phase = room.phase;
  const { eligible, answered, choice, away } = room.me;
  const sealed = eligible && (answered || pendingAnswer);
  const locked = !eligible || answered || away || pendingAnswer || !socket.connected;
  const kind = phase === 'tiebreak' ? 'Tie-break' : phase === 'duel' ? 'Duel' : numeric ? 'Estimate' : 'Question';
  const unit = question.unit ? `<span class="wr-unit">${escapeHtml(question.unit)}</span>` : '';
  const range = `<p class="wr-range" id="estimate-range">${icon('target')}<span>Between ${amount(question.min, question.unit)} and ${amount(question.max, question.unit)}</span></p>`;
  const body = numeric
    ? (eligible
      ? `<form id="estimate-form" class="wr-estimate ${sealed || away ? 'is-locked' : ''}" novalidate><label class="sr-only" for="estimate-input">Your guess${question.unit ? ` in ${escapeHtml(question.unit)}` : ''}</label><span class="wr-estimate-field">${sealed || away ? `<span class="wr-lock">${icon('lock')}</span>` : `<span class="wr-pen">${icon('pencil')}</span>`}<input id="estimate-input" type="text" inputmode="decimal" maxlength="18" value="${escapeHtml(room.me.estimate ?? (away ? '' : estimateDraft))}" placeholder="${away ? 'Locked' : 'Type your number'}" ${locked ? 'disabled' : ''} autocomplete="off">${unit}</span><button class="wr-submit" type="submit" ${locked ? 'disabled' : ''}>${sealed || away ? `${icon('lock')} Locked` : `Lock in ${icon('check')}`}</button></form>${range}`
      : `<div class="wr-estimate"><span class="wr-watching">${icon('eye')} Spectating</span></div>${range}`)
    : `<div class="wr-answers">${question.options.map((option, index) => `<button class="wr-answer ${choice === index ? 'is-chosen' : ''}" data-action="answer" data-choice="${index}" style="--n:${index}${choice === index ? `;--fx-c:${since(`chosen:${question.id}`)}` : ''}" ${locked ? 'disabled' : ''}><span class="wr-key">${'ABCD'[index]}</span><span>${escapeHtml(option)}</span>${choice === index ? `<span class="wr-locked">${icon('lock')}</span>` : ''}</button>`).join('')}</div>`;
  // Number questions already show a Spectating pill in the body, so the hint states the rule instead.
  const [hintIcon, hintText, hintTone] = !eligible && !numeric ? ['eye', 'Spectating', 'watch']
    : !eligible ? (phase === 'tiebreak' ? ['target', 'Closest number wins', ''] : ['target', 'Closest guess wins', ''])
    : away ? ['lock', 'Locked: you left the window', 'away']
    : sealed ? ['lock', 'Locked in', 'done']
    : phase === 'tiebreak' ? ['target', 'Closest number wins', '']
    : phase === 'duel' ? ['swords', 'Right answer wins', '']
    : numeric ? ['target', 'Closest guess wins', ''] : ['bolt', 'Fastest right answer wins', ''];
  const stamp = away && !numeric ? `<span class="wr-stamp">${icon('lock')} Locked</span>` : '';
  const classes = ['wr-card', 'wr-question', `is-${phase}`, !eligible && 'is-watch', away && 'is-away'].filter(Boolean).join(' ');
  return `<section class="${classes}" style="--fx-t:${since(`card:${question.id}`)}" aria-label="Quiz question">${cardBanner(phase === 'expand' ? (numeric ? 'target' : 'help') : 'swords', kind, phase === 'expand' ? '' : 'duel')}${phase === 'expand' ? '' : duelStrip()}<div class="wr-card-head">${categoryLabel(question.category)}<h2>${escapeHtml(question.prompt)}</h2></div><div class="wr-body">${body}${stamp}</div><div class="wr-card-foot"><p class="wr-hint ${hintTone ? `is-${hintTone}` : ''}">${icon(hintIcon)}<span>${hintText}</span></p>${phase === 'expand' ? answeredDots() : ''}</div></section>`;
}
function answerText(result, answer) {
  const has = answer?.elapsed !== undefined;
  if (!has) return result.away?.includes(answer?.playerId) ? 'Left the window' : 'No answer';
  return result.kind === 'estimate' ? amount(answer.estimate, result.unit) : `<b class="wr-letter">${'ABCD'[answer.choice]}</b>${escapeHtml(result.options[answer.choice])}`;
}
// The correct answer, big and green, so nobody has to hunt for it.
function truthBar(result, label = 'Correct answer') {
  const value = result.kind === 'estimate' ? amount(result.correctValue, result.unit) : `<b class="wr-letter">${'ABCD'[result.correctIndex]}</b>${escapeHtml(result.options[result.correctIndex])}`;
  return `<div class="wr-truth"><span class="wr-truth-mark">${icon('check')}</span><span class="wr-truth-text"><small>${label}</small><strong>${value}</strong></span></div>`;
}
function pickRow(result, answer, { good, rank = -1, award = '', index = 0 }) {
  const person = playerById(answer.playerId); const numeric = result.kind === 'estimate'; const has = answer.elapsed !== undefined; const away = !has && result.away?.includes(answer.playerId);
  const state = has ? (good ? 'is-good' : 'is-miss') : away ? 'is-away' : 'is-none';
  const mark = has && numeric && rank >= 0 ? `<b>${rank + 1}</b>` : icon(has ? (good ? 'check' : 'x') : away ? 'lock' : 'x');
  const meta = has ? `${numeric ? `<span>${formatNumber(answer.distance)} off</span>` : ''}<span>${icon('clock')}${seconds(answer.elapsed)}</span>` : '';
  return `<li class="wr-row ${state} ${answer.playerId === room.me.id ? 'is-me' : ''}" style="--pc:${escapeHtml(person?.color || '#8a7a60')};--n:${index}"><span class="wr-row-mark">${mark}</span><span class="wr-row-who">${avatar(person)}<span class="wr-row-name">${nameOf(answer.playerId)}</span>${youTag(answer.playerId)}</span><span class="wr-row-answer">${answerText(result, answer)}</span><span class="wr-row-meta">${meta}${award ? `<span class="wr-award">${award}</span>` : ''}</span></li>`;
}
function revealCard() {
  const result = room.result; const numeric = result.kind === 'estimate';
  const answeredIds = result.answers.map((answer) => answer.playerId);
  const missing = room.players.filter((person) => person.alive !== false && !answeredIds.includes(person.id));
  const rows = [...result.answers, ...missing.map((person) => ({ playerId: person.id }))].map((answer, index) => {
    const rank = result.ranking.indexOf(answer.playerId);
    return pickRow(result, answer, { good: answer.elapsed !== undefined && (numeric ? rank >= 0 && rank < 2 : answer.correct), rank, award: rank === 0 ? `${icon('flag')} +2` : rank === 1 ? `${icon('flag')} +1` : '', index });
  }).join('');
  return `<section class="wr-card wr-reveal" style="--fx-t:${since(`reveal:${result.expansionRound}:${result.prompt}`)}" aria-label="Answer reveal">${cardBanner('check', `Round ${result.expansionRound}`)}<div class="wr-card-head">${categoryLabel(result.category)}<h2 class="is-small">${escapeHtml(result.prompt)}</h2></div>${truthBar(result, numeric ? 'Correct number' : 'Correct answer')}<ol class="wr-rows ${numeric ? '' : 'is-choice'}">${rows}</ol>${result.ranking.length ? '' : `<p class="wr-hint center">${icon('x')}<span>No regions this round</span></p>`}${sourceBlock(result)}${room.turn ? `<button class="wr-submit wide" data-action="show-map">Back to the map ${icon('map')}</button>` : ''}</section>`;
}
function fighter(battle, playerId, role, winnerId, index) {
  const delta = battle.pointsDelta?.[role] || 0; const won = playerId === winnerId;
  // One small pill per answer: right or wrong, the letter (or number) and the time. The green bar below spells out the correct answer.
  const line = (result, tie) => { if (!result) return ''; const answer = result.answers.find((entry) => entry.playerId === playerId) || { playerId }; const has = answer.elapsed !== undefined; const good = has && (result.kind === 'estimate' ? playerId === result.winnerId : answer.correct); const away = !has && result.away?.includes(playerId); const what = !has ? (away ? 'Left' : 'No answer') : result.kind === 'estimate' ? amount(answer.estimate, result.unit === 'year' ? 'year' : '') : `<b class="wr-letter">${'ABCD'[answer.choice]}</b>`; return `<span class="wr-said ${has ? (good ? 'is-good' : 'is-miss') : away ? 'is-away' : 'is-none'}">${tie ? `<b class="wr-said-tag" title="Tie-break">${icon('target')}<span class="sr-only">Tie-break:</span></b>` : ''}<i>${icon(has ? (good ? 'check' : 'x') : away ? 'lock' : 'x')}</i><span>${what}</span>${has ? `<em>${seconds(answer.elapsed)}</em>` : ''}</span>`; };
  const award = won && battle.wasTiebreaker ? `<span class="wr-award">${icon(battle.tiebreak ? 'target' : 'clock')} ${battle.tiebreak ? 'Closest' : 'Faster'}</span>` : '';
  return `<div class="wr-fighter ${role} ${won ? 'is-winner' : winnerId ? 'is-loser' : ''}" style="--pc:${escapeHtml(playerById(playerId)?.color || '#8a7a60')};--n:${index}">${duelFace(playerId, role, won ? `<i class="wr-crown">${icon('crown')}</i>` : '')}<span class="wr-duel-name"><strong>${nameOf(playerId)}</strong>${youTag(playerId)}</span><span class="wr-saids">${line(battle.duel, false)}${line(battle.tiebreak, true)}</span><span class="wr-fighter-foot">${delta ? `<span class="wr-chip ${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '+' : '-'}${formatScore(Math.abs(delta))}</span>` : ''}${award}</span></div>`;
}
function resultCard() {
  const battle = room.battle; const region = regionById(battle.targetId);
  const attackerWon = battle.outcome === 'ATTACKER_WIN'; const defenderWon = battle.outcome === 'DEFENDER_WIN';
  const winnerId = attackerWon ? battle.attackerId : defenderWon ? battle.defenderId : null;
  const [tone, label, emblem] = attackerWon && battle.eliminated ? ['tone-conquest', 'Capital toppled', 'crown']
    : attackerWon && battle.isBase ? ['tone-conquest', 'Tower down', 'castle']
    : attackerWon ? ['tone-conquest', 'Conquered', 'sword']
    : defenderWon ? ['tone-defense', 'Defended', 'shield'] : ['tone-missed', 'Both missed', 'x'];
  const involved = [battle.attackerId, battle.defenderId].includes(room.me.id); const won = involved && room.me.id === winnerId;
  const personal = involved ? `<span class="wr-personal ${won ? 'won' : winnerId ? 'lost' : ''}">${won ? 'You won' : winnerId ? 'You lost' : 'Nobody won'}</span>` : '';
  const sub = attackerWon && battle.eliminated ? `<p class="wr-sub">${icon('flag')}<span>${nameOf(battle.defenderId)} is out · ${plural(battle.takenIds?.length || 0, 'region', 'regions')} taken</span></p>`
    : battle.isBase ? `<p class="wr-sub">${towerPips(battle.towersAfter ?? region?.towers ?? 0)}<span>${plural(battle.towersAfter ?? 0, 'tower', 'towers')} left</span></p>` : '';
  const tieTruth = battle.tiebreak ? truthBar(battle.tiebreak, 'Tie-break number') : '';
  return `<section class="wr-card wr-result ${tone} ${won ? 'is-won' : ''}" style="--fx-t:${since(`result:${battle.attackerId}:${battle.targetId}:${battle.towersBefore}:${room.war?.round}:${room.war?.turn}`)}" aria-label="Battle result">${cardBanner(emblem === 'crown' ? 'castle' : emblem === 'x' ? 'clock' : emblem, label, won ? 'tone-won' : tone)}<div class="wr-outcome"><h2>${regionName(battle.targetId)}</h2>${personal}${sub}</div><div class="wr-versus">${fighter(battle, battle.attackerId, 'attacker', winnerId, 0)}<span class="wr-vs">VS</span>${fighter(battle, battle.defenderId, 'defender', winnerId, 1)}</div>${battle.duel ? `<div class="wr-truths">${truthBar(battle.duel)}${tieTruth}</div>${sourceBlock(battle.duel)}` : ''}</section>`;
}
function renderGame() {
  const phase = room.phase;
  let card = '';
  if (['expand', 'duel', 'tiebreak'].includes(phase) && room.question) card = questionCard();
  else if (phase === 'claim' && room.result && (!room.turn || revealExpanded)) card = revealCard();
  else if (phase === 'result' && room.battle) card = resultCard();
  const cardKey = card.match(/--fx-t:(-?\d+ms)/)?.[1] || '0ms';
  const classes = ['wr', `phase-${phase}`, `stage-${room.stage}`, card && 'has-card', room.players.length > 3 && 'many', room.turn?.playerId === room.me.id && 'my-turn'].filter(Boolean).join(' ');
  main.innerHTML = `<div class="${escapeHtml(classes)}"><section class="wr-board" aria-label="Game board">${worldMap(room.territories, mapOptions())}</section>${tools()}${statusCard()}${promptPill()}${card ? `<div class="wr-shade" style="--fx-t:${cardKey}"></div><div class="wr-overlay">${card}</div>` : ''}<div class="wr-bottom">${phaseBar()}${playerBars()}</div>${stageBanner()}${socket.connected ? '' : '<div class="wr-offline" role="alert">Connection lost. Reconnecting to your match…</div>'}</div>`;
  const question = room.question;
  $('#estimate-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); if (pendingAnswer || room.me.answered || !room.me.eligible) return;
    const value = $('#estimate-input').value.trim().replace(/,/g, '');
    const range = $('#estimate-range');
    if (!value || !/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(value) || !Number.isFinite(Number(value)) || Number(value) < question.min || Number(value) > question.max) { range.classList.remove('is-error'); void range.offsetWidth; range.classList.add('is-error'); $('#estimate-input').focus(); return; }
    // Lock the guess on screen straight away, before the server confirms it.
    pendingAnswer = true; estimateDraft = value; play('lock'); render();
    try { await request('round:answer', { questionId: question.id, estimate: Number(value) }); } catch (error) { pendingAnswer = false; toast(error.message); render(); }
  });
  $('#estimate-input')?.addEventListener('input', (event) => { estimateDraft = event.target.value; });
  applyFx(); paintScores(); fitDock();
}
// Keep cards clear of the player chips, which can wrap onto a second row on narrow screens.
function fitDock() {
  const root = main.querySelector('.wr'); const dock = root?.querySelector('.wr-bottom');
  if (dock) root.style.setProperty('--wr-dock', `${dock.offsetHeight}px`);
}
window.addEventListener('resize', fitDock);
let lastTick = '';
function updateTimer() {
  if (!room || view !== 'room' || !room.deadline) return;
  const left = Math.max(0, room.deadline - Date.now()); const whole = Math.ceil(left / 1000);
  const share = room.deadlineMs ? Math.min(100, left / room.deadlineMs * 100) : 0;
  main.querySelectorAll('.js-timer-text').forEach((element) => { element.textContent = String(whole); });
  main.querySelectorAll('.js-timer-ring').forEach((element) => { element.style.strokeDashoffset = String(100 - share); });
  const urgent = left > 0 && whole <= 5;
  main.querySelector('.wr')?.classList.toggle('is-urgent', urgent);
  const waiting = room.turn?.playerId === room.me.id || Boolean(room.question && room.me.eligible && !room.me.answered);
  const tick = `${room.deadline}:${whole}`;
  if (waiting && left > 0 && whole <= 3 && tick !== lastTick) { lastTick = tick; play('tick'); }
}
function helpModal() {
  showModal(`${modalHeader('Quick rules', 'How the match works', 'Three stages. The most points at the end wins.')}<div class="prose"><ul><li><strong>Capitals.</strong> In turn, everyone picks a region for their capital: 3 towers, 1,000 points.</li><li><strong>Expansion.</strong> Everyone answers the same question. The best answer claims 2 free regions next to their land, the runner-up claims 1. Regions are worth 200 points, then 300 from round 3.</li><li><strong>Conquest.</strong> Take turns attacking a rival region on your border. Attacker and defender duel on one question. Win to take it for 400 points. Hold it and the defender earns 100.</li><li><strong>No peeking.</strong> Leave the game window while a question is open and that question locks for you.</li><li>If both duelists are right, a number question decides: the closest guess wins.</li><li>A capital falls after 3 lost duels. Topple it and you take every region of that player.</li><li>Choose before the timer runs out or the game picks for you. Your first answer is final.</li></ul></div><div class="modal-actions"><button class="button primary" data-action="close-modal">Back to the map</button></div>`);
}
function confirmLeave() { showModal(`${modalHeader('Leave match', 'Leave this match?', 'You leave the room and the others keep playing without you.')}<div class="modal-actions"><button class="button ghost" data-action="close-modal">Keep playing</button><button class="button primary" data-action="confirm-leave">Leave the match</button></div>`); }
function renderFinished() {
  const players = sortedPlayers(); const winner = players[0]; const tied = players.filter((person) => person.score === winner?.score);
  const podium = [players[1], players[0], players[2]].filter(Boolean);
  const summary = room.summary || {};
  const minutes = Math.max(1, Math.round((summary.durationMs || 0) / 60000));
  const fastest = summary.fastest ? `${nameOf(summary.fastest.playerId)} in ${seconds(summary.fastest.elapsed)}` : 'No correct answers';
  main.innerHTML = `<section class="finished-hero"><div class="section-eyebrow" style="justify-content:center">Match complete</div><h1>${tied.length > 1 ? 'A rivalry worth sharing.' : `${escapeHtml(winner?.name || 'Your community')} rules the map.`}</h1><p>${tied.length > 1 ? `${tied.map((person) => escapeHtml(person.name)).join(' and ')} finished tied at the top.` : `${formatScore(winner?.score)} points and ${plural(winner?.territories || 0, 'region', 'regions')}.`} ${room.practice ? 'Practice complete. Ready for the real people?' : 'Good answers. Great company.'}</p>
  <div class="podium">${podium.map((person) => { const place = players.indexOf(person) + 1; return `<div class="podium-step place-${place} ${person.id === room.me.id ? 'me' : ''}" style="--player-color:${escapeHtml(person.color)}">${place === 1 ? `<span class="podium-crown">${icon('trophy')}</span>` : ''}${playerShield(person)}<strong>${escapeHtml(person.name)}</strong><span class="podium-score">${formatScore(person.score)}</span><small>${plural(person.territories, 'region', 'regions')}</small><div class="podium-block">${place}</div></div>`; }).join('')}</div>
  <div class="hero-actions">${room.me.host ? `<button class="button primary" data-action="rematch">${icon('game')} Play again ${icon('arrow')}</button>` : '<span class="pill-note">Waiting for the host to start a rematch</span>'}<button class="button ghost" data-action="export">${icon('download')} Export results</button><button class="button ghost" data-action="leave">Back to the lobby</button></div></section>
  <div class="summary-row"><div><span>War rounds</span><strong>${summary.warRounds ?? 0}</strong></div><div><span>Questions</span><strong>${summary.totalQuestions ?? 0}</strong></div><div><span>Duration</span><strong>${minutes} min</strong></div><div><span>Fastest correct answer</span><strong>${fastest}</strong></div></div>
  <div class="section-header"><h2>Player stats</h2></div><div class="panel table-scroll"><table class="results-table"><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Regions</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Avg time</th><th>Best streak</th></tr></thead><tbody>${players.map((person, index) => `<tr class="${person.alive === false ? 'out' : ''}"><td>${String(index + 1).padStart(2, '0')}</td><td><span class="player-cell">${playerAvatar(person)}${escapeHtml(person.name)}${person.bot ? ' (bot)' : ''}${person.id === room.me.id ? ' · you' : ''}${person.alive === false ? ' · eliminated' : ''}</span></td><td>${formatScore(person.score)}</td><td>${person.territories}</td><td>${person.stats.correct}</td><td>${person.stats.wrong}</td><td>${person.stats.accuracy}%</td><td>${seconds(person.stats.avgTimeMs)}</td><td>${person.stats.maxStreak}</td></tr>`).join('')}</tbody></table></div><div class="callout">${icon('book')}<div><strong>The best prize is the thing you learned.</strong><p>Browse the questions to read the sources behind this match.</p><button class="button link-button" data-action="library">Keep exploring ${icon('arrow')}</button></div></div>`;
}

function renderLibrary() {
  main.innerHTML = `<div class="intro-row"><div><div class="section-eyebrow">Question bank</div><h1>A little knowledge, <em>well sourced.</em></h1></div>${room ? '<button class="button small" data-action="return-room">Return to match</button>' : '<button class="button small" data-action="practice">Try a practice round</button>'}</div><p class="small-text muted">Questions about Google, search, ads, content, AI tools and client work. Each one links to its source.</p><div class="library-tools"><div class="search-field">${icon('search')}<label class="sr-only" for="library-search">Search questions</label><input id="library-search" type="search" placeholder="Search a topic, tool, or question…" value="${escapeHtml(searchTerm)}"></div><div><label class="sr-only" for="library-track">Filter by topic</label><select id="library-track"><option value="all">All topics</option>${catalog.tracks.map((item) => `<option value="${item.id}" ${filter === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></div></div><div class="pill-row" id="library-filters"><button class="pill ${filter === 'all' ? 'selected' : ''}" data-filter="all">All topics</button>${catalog.tracks.map((item) => `<button class="pill ${filter === item.id ? 'selected' : ''}" data-filter="${item.id}">${icon(item.icon)}${escapeHtml(item.short || item.name)}</button>`).join('')}</div><p class="library-count" id="library-count"></p><div class="question-list" id="question-list"></div><div class="callout">${icon('book')}<div><strong>Learn the idea. Follow the source.</strong><p>Questions and explanations are written for this game from public Google help pages and community tools.</p></div></div>`;
  $('#library-search').addEventListener('input', (event) => { searchTerm = event.target.value; renderQuestions(); });
  $('#library-track').addEventListener('change', (event) => { filter = event.target.value; syncLibraryFilters(); renderQuestions(); });
  $('#library-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-filter]'); if (button) { filter = button.dataset.filter; $('#library-track').value = filter; syncLibraryFilters(); renderQuestions(); } });
  renderQuestions();
}
function syncLibraryFilters() { $('#library-filters').querySelectorAll('button').forEach((button) => button.classList.toggle('selected', button.dataset.filter === filter)); }
function renderQuestions() {
  const bank = [...catalog.questions, ...(catalog.estimates || []).map((question) => ({...question, difficulty: 'Closest guess'}))];
  const questions = bank.filter((question) => (filter === 'all' || question.category === filter) && `${question.prompt} ${question.source.title} ${track(question.category).name}`.toLowerCase().includes(searchTerm.toLowerCase()));
  $('#library-count').textContent = `${questions.length} of ${bank.length} questions${filter === 'all' ? '' : ` in ${track(filter).name}`}`;
  $('#question-list').innerHTML = questions.length ? questions.map((question) => `<article class="question-preview"><div>${categoryLabel(question.category)}<span class="difficulty">${escapeHtml(question.difficulty)}</span></div><h3>${escapeHtml(question.prompt)}</h3><a class="source-link" href="${safeUrl(question.source.url)}" target="_blank" rel="noopener noreferrer">${icon('book')}${escapeHtml(question.source.title)}${icon('diagonal')}</a></article>`).join('') : '<div class="empty-state"><h3>No questions found.</h3><p>Try another word or a different topic.</p></div>';
}
function renderGuide() {
  main.innerHTML = `<div class="section-eyebrow">How to play</div><h1>Found. Expand. <em>Conquer.</em></h1><p class="small-text muted">A friendly quiz strategy game for the AI Marketing Hub community. 2 to 6 players.</p><div class="guide-grid"><article class="guide-card"><span class="step-number">Step 1</span><h3>Found your capital</h3><p>In turn, every player picks a region for their capital. It has 3 towers and is worth 1,000 points. Capitals cannot border each other.</p></article><article class="guide-card"><span class="step-number">Step 2</span><h3>Expand</h3><p>Everyone answers the same question. The best answer claims two free regions next to their land, and the runner up claims one. On number questions the closest guess wins. Regions are worth 200 points in the first two rounds, then 300.</p></article><article class="guide-card"><span class="step-number">Step 3</span><h3>Go to war</h3><p>When the map is full, players take turns attacking a rival region on their border. The attacker and the defender duel on one question. Win and the region is yours, worth 400 points. Hold it and the defender earns 100.</p></article></div><div class="prose"><h2>Good to know</h2><ul><li>If both duelists are right, a number question decides: the closest guess wins.</li><li>A capital falls after 3 won duels. Each win destroys one tower, and the attacker keeps dueling while they win. Towers never grow back.</li><li>Topple a capital and you take every region of that player. They are out of the war.</li><li>The war lasts the number of rounds the host chose. The most points at the end wins.</li><li>Pick before the timer runs out or the game picks a region for you. Your first answer is final.</li><li>Stay in the game window while a question is open. If you switch tabs or windows, that question locks for you.</li><li>After every question you can open why the answer is right and read its source.</li><li>Lost connection? Reload the page to get back into your game.</li></ul><p class="small-text muted">Inspired by <a href="https://quizadero.com/en/" target="_blank" rel="noopener noreferrer">Quizadero</a>. Built from scratch for the AI Marketing Hub, with the open source Socket.IO library.</p><div class="callout">${icon('compass')}<div><strong>New here?</strong><p>A practice game against two bots takes about ten minutes.</p><button class="button primary small" data-action="practice">Practice with bots ${icon('arrow')}</button></div></div></div>`;
}

async function copyText(text, success) { try { await navigator.clipboard.writeText(text); toast(success); } catch { showModal(`${modalHeader('Ready to share', 'Copy your invite.', 'Select and copy the text below.')}<label for="copy-value">Text to copy</label><textarea id="copy-value" readonly rows="${text.includes('\n') ? 7 : 2}">${escapeHtml(text)}</textarea><div class="modal-actions"><button class="button primary" data-action="close-modal">Done</button></div>`); $('#copy-value').select(); } }
function confirmEnd() { showModal(`${modalHeader('Finish match', 'Call it a good game?', 'The match ends now and the final standings are shown to everyone.')}<div class="modal-actions"><button class="button ghost" data-action="close-modal">Keep playing</button><button class="button primary" data-action="confirm-end">Show final results</button></div>`); }
function resultsCsv() {
  const csv = (value) => `"${String(value).replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const data = [['Rank', 'Name', 'Practice bot', 'Score', 'Regions', 'Correct', 'Wrong', 'Accuracy %', 'Avg answer seconds', 'Best streak', 'Eliminated'], ...sortedPlayers().map((person, index) => [index + 1, person.name, person.bot ? 'Yes' : 'No', person.score, person.territories, person.stats.correct, person.stats.wrong, person.stats.accuracy, (person.stats.avgTimeMs / 1000).toFixed(1), person.stats.maxStreak, person.alive === false ? 'Yes' : 'No'])].map((row) => row.map(csv).join(',')).join('\r\n');
  return data;
}
function exportResults() {
  if (!room) return;
  exportSnapshot = { csv: resultsCsv(), filename: `keywordia-${room.code}-results.csv` };
  showModal(`${modalHeader('Match results', 'Your results, ready to keep.', 'Copy the CSV below or save it as a spreadsheet file.')}<label for="results-csv">Match results in CSV format</label><textarea id="results-csv" readonly rows="7">${escapeHtml(exportSnapshot.csv)}</textarea><div class="modal-actions"><button class="button ghost" data-action="copy-results">${icon('copy')} Copy CSV</button><button class="button primary" data-action="download-results">${icon('download')} Download CSV</button></div><p class="modal-footnote">If your browser blocks downloads, Copy CSV keeps your results available.</p>`);
}
function downloadResults() {
  if (!exportSnapshot) return;
  const url = URL.createObjectURL(new Blob(['\ufeff' + exportSnapshot.csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = exportSnapshot.filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast('CSV download requested. You can also copy the results.');
}
document.addEventListener('click', async (event) => {
  const navigation = event.target.closest('[data-nav]'); if (navigation) { event.preventDefault(); navigate(navigation.dataset.nav); return; }
  const demoTile = event.target.closest('.lp-plate [data-territory]'); if (demoTile) { demoClaim(demoTile.dataset.territory); return; }
  const territory = event.target.closest('[data-territory]'); if (territory) { if (claiming) return; claiming = true; play('select'); try { await request('round:claim', { territoryId: territory.dataset.territory }); } catch (error) { toast(error.message); } finally { claiming = false; } return; }
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'show-map' || action === 'review-answer') { revealExpanded = action === 'review-answer'; render(); return; }
  if (action === 'sound') { sound.on = !sound.on; setStorage(localStorage, 'keywordia-sound', sound.on ? 'on' : 'off'); render(); play('select'); return; }
  if (action === 'help') { helpModal(); return; }
  if (action === 'theme') { mode = mode === 'light' ? 'dark' : 'light'; setStorage(localStorage, 'keywordia-mode', mode); render(); return; }
  if (action === 'demo-reset') { demoReset(); updateDemo(); return; }
  if (action === 'leave-match') { confirmLeave(); return; }
  if (action === 'confirm-leave') { modal.close(); await leaveRoom(); return; }
  if (action === 'close-modal') { modal.close(); return; }
  if (action === 'host') { if (room) { navigate('room'); toast('Leave your current room before creating another.'); } else openHost(false); return; }
  if (action === 'join') { if (room) { navigate('room'); toast('Leave your current room before joining another.'); } else openJoin(); return; }
  if (action === 'practice') { if (room) { navigate('room'); toast('Leave your current room before starting practice.'); } else openHost(true); return; }
  if (action === 'library') { navigate('library'); return; }
  if (action === 'track') { filter = button.dataset.category; searchTerm = ''; navigate('library'); return; }
  if (action === 'return-room') { navigate('room'); return; }
  if (action === 'copy-code') { await copyText(room.code, 'Room code copied.'); return; }
  if (action === 'copy-link') { await copyText(`${location.origin}/?room=${encodeURIComponent(room.code)}`, 'Invite link copied.'); return; }
  if (action === 'leave') { await leaveRoom(); return; }
  if (action === 'end') { confirmEnd(); return; }
  if (action === 'export') { exportResults(); return; }
  if (action === 'copy-results' && exportSnapshot) { await copyText(exportSnapshot.csv, 'CSV results copied.'); return; }
  if (action === 'download-results') { downloadResults(); return; }
  button.disabled = true;
  try {
    if (action === 'start') await request('room:start');
    if (action === 'add-bot') await request('room:bot');
    if (action === 'kick') await request('room:kick', { playerId: button.dataset.player });
    if (action === 'answer') { pendingAnswer = true; play('lock'); main.querySelectorAll('.wr-answer').forEach((item) => { item.disabled = true; item.classList.toggle('is-chosen', item === button); }); await request('round:answer', { questionId: room.question.id, choice: Number(button.dataset.choice) }); }
    if (action === 'rematch') await request('room:rematch');
    if (action === 'confirm-end') { await request('room:end'); modal.close(); }
  } catch (error) { toast(error.message); if (action === 'answer') { pendingAnswer = false; render(); } }
  finally { if (action !== 'answer') pendingAnswer = false; if (button.isConnected) button.disabled = false; }
});
// The lobby book leans a little toward the pointer.
main.addEventListener('pointermove', (event) => { const book = event.target.closest?.('.lp-book'); if (!book || event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const box = book.getBoundingClientRect(); book.style.setProperty('--tilt-x', `${(((event.clientX - box.left) / box.width) - .5) * 4}deg`); book.style.setProperty('--tilt-y', `${(.5 - ((event.clientY - box.top) / box.height)) * 3}deg`); });
main.addEventListener('pointerout', (event) => { const book = event.target.closest?.('.lp-book'); if (book && !book.contains(event.relatedTarget)) { book.style.removeProperty('--tilt-x'); book.style.removeProperty('--tilt-y'); } });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.open && view === 'room' && revealExpanded) { revealExpanded = false; render(); return; } if (modal.open || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return; const territory = event.target.closest('[data-territory]'); if (territory && ['Enter', ' '].includes(event.key)) { event.preventDefault(); territory.dispatchEvent(new MouseEvent('click', { bubbles: true })); } else if (view === 'room' && ['expand', 'duel'].includes(room?.phase) && room.me.eligible && /^[1-4]$/.test(event.key)) { const button = $(`[data-choice="${Number(event.key) - 1}"]`); if (button && !button.disabled) { event.preventDefault(); button.click(); } } });
$('#profile-button').addEventListener('click', () => { showModal(`${modalHeader('Player profile', 'Make a name for yourself.', 'This is the name used when you next host or join a game.')}<form id="profile-form"><label for="profile-name">Player name</label><input id="profile-name" value="${escapeHtml(playerName)}" maxlength="24" required autocomplete="nickname"><div class="modal-actions"><button type="submit" class="button primary">Save name ${icon('check')}</button></div></form>`); $('#profile-form').addEventListener('submit', (event) => { event.preventDefault(); const name = $('#profile-name').value.trim(); if (!name || /[<>\x00-\x1f\x7f]/.test(name)) { toast('Use a name without markup or control characters.'); return; } saveName(name); modal.close(); toast('Name saved for your next game.'); }); });
socket.on('state', (state) => { const estimateFocused = document.activeElement?.id === 'estimate-input'; const previous = room; const newQuestion = state.question?.id !== previous?.question?.id; const newScreen = !previous || previous.phase === 'lobby' && state.phase !== 'lobby' || state.phase === 'finished' && previous.phase !== 'finished' || state.phase === 'lobby' && previous.phase !== 'lobby'; try { detectFx(previous, state); } catch { /* Effects are decoration; never block the game state. */ } room = state; if (newQuestion) { pendingAnswer = false; estimateDraft = ''; watchFocus(); } if (newQuestion || previous?.phase !== state.phase) revealExpanded = false; if (view === 'play' || view === 'room') { view = 'room'; render(); if (estimateFocused && !newQuestion && !state.me.answered) $('#estimate-input')?.focus({preventScroll:true}); if (newQuestion && state.question?.kind === 'estimate' && state.me.eligible && matchMedia('(pointer:fine)').matches) $('#estimate-input')?.focus({preventScroll:true}); if (newQuestion || newScreen) window.scrollTo(0, 0); } });
// Leaving the game window during a question locks that question, so nobody can look the answer up elsewhere.
let awaySent = ''; let focusTimer;
function canLeave() { return view === 'room' && room && ['expand', 'duel', 'tiebreak'].includes(room.phase) && room.question && room.me.eligible && !room.me.answered && !room.me.away && !pendingAnswer && awaySent !== room.question.id; }
function leftWindow() {
  if (!canLeave()) return;
  const questionId = room.question.id; awaySent = questionId; play('lock');
  request('round:away', { questionId }).then(() => toast('You left the game window, so this question is locked.')).catch(() => { if (awaySent === questionId) awaySent = ''; });
}
// A question that opens while the window is already unfocused gets a short grace period first.
function watchFocus() { clearTimeout(focusTimer); if (!document.hasFocus()) focusTimer = setTimeout(() => { if (!document.hasFocus()) leftWindow(); }, 2500); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leftWindow(); });
window.addEventListener('blur', () => { setTimeout(() => { if (!document.hasFocus()) leftWindow(); }, 150); });
window.addEventListener('focus', () => clearTimeout(focusTimer));
socket.on('connect', async () => { $('#connection-dot').classList.add('online'); $('#connection-label').textContent = 'Online'; if (session) { try { await request('session:resume', session); } catch (error) { saveSession(null); room = null; if (view === 'room') view = 'play'; render(); toast(`${error.message} You can create or join a fresh room.`); } } else if (view === 'room') { view = 'play'; render(); } });
socket.on('disconnect', (reason) => { $('#connection-dot').classList.remove('online'); $('#connection-label').textContent = 'Reconnecting…'; if (room && view === 'room') render(); if (reason === 'io server disconnect') socket.connect(); });
socket.on('session:ended', ({ reason }) => { saveSession(null); room = null; view = 'play'; render(); toast(reason || 'Your room session has ended.'); });
socket.on('connect_error', () => { $('#connection-label').textContent = 'Server unavailable'; });
window.addEventListener('hashchange', () => { const next = location.hash.slice(1); if (['play', 'room', 'library', 'guide'].includes(next)) navigate(next); else if (next === 'research') navigate('guide'); });
updateProfile();
setInterval(updateTimer, 200);
window.addEventListener('realm-map-ready', (event) => {
  const id = event.detail?.mapId;
  document.querySelectorAll(`.map-option[data-map="${id}"] .map-thumb-slot`).forEach((slot) => { slot.innerHTML = window.RealmMap.thumbnail(id); });
  if (main.querySelector(`.realm-loading[data-map="${id}"]`)) render();
});
(async () => { try { const response = await fetch('/api/catalog'); if (!response.ok) throw new Error('Question pack could not be loaded.'); catalog = await response.json(); (catalog.maps || []).forEach((item) => window.RealmMap?.load(item.id).catch(() => {})); view = location.hash.slice(1) || 'play'; if (view === 'research') view = 'guide'; if (!['play', 'room', 'library', 'guide'].includes(view)) view = 'play'; render(); const invite = new URLSearchParams(location.search).get('room'); if (invite && !session) openJoin(invite); } catch (error) { main.innerHTML = `<div class="empty-state">${icon('compass')}<h1>The playground is taking a moment.</h1><p>${escapeHtml(error.message)} Refresh when the server is ready.</p></div>`; } })();
