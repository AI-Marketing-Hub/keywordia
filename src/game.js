import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { MAPS, MAP_IDS, DEFAULT_MAP } from './maps.js';

export const CATEGORY_IDS = ['seo', 'ads', 'content', 'local', 'ai', 'clients'];
const COLORS = ['#c8443b', '#e3a43a', '#6f9e5f', '#8a63b0', '#3f8f9a', '#e07a3a'];
export const RULES = Object.freeze({ maxPlayers: 6, towers: 3, capitalValue: 1000, earlyValue: 200, lateValue: 300, earlyRounds: 2,
  conquestValue: 400, defenseBonus: 100, capitalMs: 15_000, claimMs: 10_000, attackMs: 10_000, marchMs: 1_800, rankingMs: 2_500,
  resultMs: 4_500, estimateExtraMs: 5_000, estimateReserve: 2, maxExpansionRounds: 12 });
const QUESTION_PHASES = ['expand', 'duel', 'tiebreak'];
const ACTIVE_PHASES = ['capital', 'expand', 'claim', 'attack', 'march', 'duel', 'tiebreak', 'result'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const id = () => randomBytes(12).toString('hex');
const fail = (message) => { throw new Error(message); };
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const indexOf = (territoryId) => Number(territoryId.slice(1));
const shuffled = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
};
// Look-alike prompts (the YouTube title and description limits, say) share most of their meaningful words.
const GENERIC_WORDS = new Set(['what', 'which', 'when', 'where', 'does', 'have', 'many', 'much', 'your', 'with', 'that', 'this', 'from', 'they', 'them', 'their', 'there', 'about', 'most', 'into', 'than', 'then', 'will', 'should', 'would', 'could', 'google']);
const wordCache = new WeakMap();
const promptWords = (question) => {
  if (!wordCache.has(question)) wordCache.set(question, new Set(question.prompt.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !GENERIC_WORDS.has(word))));
  return wordCache.get(question);
};
const lookAlike = (first, second) => {
  const [a, b] = [promptWords(first), promptWords(second)];
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / (a.size + b.size - shared || 1) >= 0.4;
};
/** How much a deck echoes itself: look-alike prompts within `gap` turns cost more the closer they sit, and back to back costs most. */
const echoes = (deck, recent = [], gap = 3) => {
  const line = [...recent, ...deck]; let cost = 0;
  for (let index = recent.length; index < line.length; index++) {
    for (let back = 1; back <= gap && index - back >= 0; back++) if (lookAlike(line[index], line[index - back])) cost += (gap + 1 - back) ** 2;
  }
  return cost;
};
const cleanName = (value) => {
  if (typeof value !== 'string') fail('Enter a player name.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 24 || /[\x00-\x1f\x7f<>]/.test(name)) fail('Use a name of 1 to 24 characters, without markup.');
  return name;
};
const safeTokenEquals = (actual, candidate) => {
  if (typeof candidate !== 'string' || !/^[a-f0-9]{64}$/.test(candidate)) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(candidate));
};
const newStats = () => ({ answered: 0, correct: 0, wrong: 0, closest: 0, timeMs: 0, streak: 0, maxStreak: 0 });

/** All decisions and scores live here. Socket IDs and resume tokens never enter public state. */
export class GameEngine {
  constructor({ questions, estimates = [], tracks = [], emitState = () => {}, revokeSocket = () => {}, timeScale = 1,
    now = Date.now, maxRooms = 200, roomTtlMs = 6 * 60 * 60 * 1000,
    emptyRoomTtlMs = 30 * 60 * 1000, hostGraceMs = 10_000 } = {}) {
    if (!Array.isArray(questions) || questions.length < 6) throw new Error('At least six questions are required.');
    if (!Array.isArray(estimates) || new Set([...questions, ...estimates].map((question) => question.id)).size !== questions.length + estimates.length) throw new Error('Question IDs must be unique.');
    for (const question of estimates) {
      if (!CATEGORY_IDS.includes(question.category) || typeof question.id !== 'string' || !question.id ||
        typeof question.prompt !== 'string' || !question.prompt || typeof question.unit !== 'string' || !question.unit ||
        !Number.isFinite(question.value) || !Number.isFinite(question.min) || !Number.isFinite(question.max) ||
        question.min >= question.max || question.value < question.min || question.value > question.max ||
        Math.abs(question.min) > 1_000_000_000 || Math.abs(question.max) > 1_000_000_000 ||
        typeof question.explanation !== 'string' || !question.explanation || !question.source?.title || !/^https:\/\//.test(question.source?.url)) throw new Error('Invalid numeric question bank.');
    }
    if (!Number.isFinite(timeScale) || timeScale <= 0) throw new Error('Invalid timer scale.');
    this.questions = questions;
    this.estimates = estimates;
    this.tracks = tracks;
    this.emitState = emitState;
    this.revokeSocket = revokeSocket;
    this.timeScale = timeScale;
    this.now = now;
    this.maxRooms = maxRooms;
    this.roomTtlMs = roomTtlMs;
    this.emptyRoomTtlMs = emptyRoomTtlMs;
    this.hostGraceMs = hostGraceMs;
    this.rooms = new Map();
    this.sockets = new Map();
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    this.cleanupTimer.unref?.();
  }

  catalog() {
    return {
      tracks: this.tracks.map((track) => ({ ...track, count: this.questions.filter((question) => question.category === track.id).length })),
      maps: MAP_IDS.map((mapId) => ({ id: mapId, name: MAPS[mapId].name, blurb: MAPS[mapId].blurb, regions: MAPS[mapId].labels.length })),
      totalQuestions: this.questions.length,
      questions: this.questions.map(({ id: questionId, category, difficulty, prompt, source }) => ({ id: questionId, category, difficulty, prompt, source })),
      totalEstimates: this.estimates.length,
      estimates: this.estimates.map(({ id: questionId, category, prompt, unit, min, max, source }) => ({ id: questionId, category, prompt, unit, min, max, source })),
    };
  }

  handle(socketId, event, payload = {}) {
    if (!plain(payload) || JSON.stringify(payload).length > 4096) fail('Invalid request.');
    const allowed = {
      'room:create': ['name', 'categories', 'rounds', 'duration', 'practice', 'map', 'maxPlayers'],
      'room:join': ['code', 'name'], 'session:resume': ['code', 'playerId', 'token'],
      'room:leave': [], 'room:start': [], 'room:bot': [], 'room:kick': ['playerId'],
      'round:answer': ['questionId', 'choice', 'estimate'], 'round:away': ['questionId'], 'round:claim': ['territoryId'],
      'room:rematch': [], 'room:end': [],
    };
    if (!allowed[event] || Object.keys(payload).some((key) => !allowed[event].includes(key))) fail('Invalid request fields.');
    this.cleanup();
    if (event === 'room:create') return this.create(socketId, payload);
    if (event === 'room:join') return this.join(socketId, payload);
    if (event === 'session:resume') return this.resume(socketId, payload);
    const { room, player } = this.identity(socketId);
    room.touchedAt = this.now();
    if (event === 'room:leave') { this.leave(room, player); return { ok: true }; }
    if (event === 'round:answer') { this.answer(room, player, payload); return { ok: true }; }
    if (event === 'round:away') { this.away(room, player, payload); return { ok: true }; }
    if (event === 'round:claim') { this.claim(room, player, payload); return { ok: true }; }
    if (room.hostId !== player.id) fail('Only the host can do that.');
    if (event === 'room:start') this.start(room);
    if (event === 'room:bot') {
      if (room.phase !== 'lobby') fail('Bots can only join in the lobby.');
      this.addBot(room);
      this.broadcast(room);
    }
    if (event === 'room:kick') this.kick(room, player, payload.playerId);
    if (event === 'room:rematch') {
      if (room.phase !== 'finished') fail('Finish this match before starting a rematch.');
      this.start(room, true);
    }
    if (event === 'room:end') {
      if (!ACTIVE_PHASES.includes(room.phase)) fail('There is no active match to end.');
      this.finish(room);
    }
    return { ok: true };
  }

  identity(socketId) {
    const identity = this.sockets.get(socketId);
    const room = identity && this.rooms.get(identity.code);
    const player = room?.players.find((entry) => entry.id === identity.playerId);
    if (!room || !player || player.socketId !== socketId || !player.connected) fail('Join or resume a room first.');
    return { room, player };
  }

  newPlayer(room, name, socketId = null, bot = false) {
    const limit = room.settings.maxPlayers ?? RULES.maxPlayers;
    if (room.players.length >= limit) fail(`This room already has ${limit} players.`);
    if (room.players.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) fail('That name is already in use in this room.');
    const color = COLORS.find((entry) => !room.players.some((other) => other.color === entry)) ?? COLORS[0];
    const player = { id: id(), name, color, bot, connected: true, socketId, token: randomBytes(32).toString('hex'),
      bonus: 0, alive: true, stats: newStats(), disconnectedAt: null };
    room.players.push(player);
    if (socketId) this.sockets.set(socketId, { code: room.code, playerId: player.id });
    return player;
  }

  create(socketId, payload) {
    if (this.sockets.has(socketId)) fail('Leave your current room first.');
    if (this.rooms.size >= this.maxRooms) fail('All rooms are busy. Try again later.');
    const name = cleanName(payload.name);
    const rounds = payload.rounds === undefined ? 6 : payload.rounds;
    const duration = payload.duration === undefined ? 15 : payload.duration;
    if (![4, 6, 8].includes(rounds) || ![10, 15, 20].includes(duration)) fail('Invalid match settings.');
    if (payload.practice !== undefined && typeof payload.practice !== 'boolean') fail('Invalid practice setting.');
    const maxPlayers = payload.maxPlayers === undefined ? RULES.maxPlayers : payload.maxPlayers;
    if (!Number.isInteger(maxPlayers) || maxPlayers < (payload.practice ? 3 : 2) || maxPlayers > RULES.maxPlayers) fail(`Choose between 2 and ${RULES.maxPlayers} players.`);
    const map = payload.map === undefined ? DEFAULT_MAP : payload.map;
    if (!MAP_IDS.includes(map)) fail('Choose one of the available maps.');
    const categories = payload.categories === undefined ? [] : payload.categories;
    if (!Array.isArray(categories) || categories.length > CATEGORY_IDS.length || categories.some((category) => typeof category !== 'string' || !CATEGORY_IDS.includes(category)) || new Set(categories).size !== categories.length) fail('Choose valid, unique tracks.');
    const selected = categories.length ? categories : [...CATEGORY_IDS];
    const available = this.questions.filter((question) => selected.includes(question.category)).length;
    if (available < 6 || selected.some((category) => !this.questions.some((question) => question.category === category))) fail('Choose tracks with at least six questions available.');
    let code;
    do { code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''); } while (this.rooms.has(code));
    const room = { code, practice: payload.practice ?? false, settings: { categories: selected, rounds, duration, map, maxPlayers },
      phase: 'lobby', players: [], hostId: null, territories: this.newTerritories(map), order: [], question: null,
      questionStartedAt: null, deadline: null, deadlineMs: 0, answers: new Map(), eligible: new Set(), away: new Set(), answerSequence: 0,
      turn: null, claimQueue: [], expansionRound: 0, war: null, battle: null, result: null, summary: null,
      deck: [], estimateDeck: [], asked: new Set(), recent: [], choiceCursor: 0, estimateCursor: 0, questionsAsked: 0, fastest: null, startedAt: null,
      feed: [], timers: new Map(), createdAt: this.now(), touchedAt: this.now() };
    const player = this.newPlayer(room, name, socketId);
    room.hostId = player.id;
    this.rooms.set(code, room);
    this.feed(room, `${name} opened the room.`);
    if (room.practice) { this.addBot(room); this.addBot(room); }
    this.broadcast(room);
    return this.session(room, player);
  }

  join(socketId, { code, name }) {
    if (this.sockets.has(socketId)) fail('Leave your current room first.');
    const room = this.getRoom(code);
    if (room.phase !== 'lobby') fail('This match has started. Join the next lobby.');
    const player = this.newPlayer(room, cleanName(name), socketId);
    room.touchedAt = this.now();
    this.feed(room, `${player.name} joined the room.`);
    this.ensureHost(room);
    this.broadcast(room);
    return this.session(room, player);
  }

  getRoom(code) {
    if (typeof code !== 'string' || !/^[A-Z2-9]{6}$/.test(code)) fail('Enter a valid six-character room code.');
    const room = this.rooms.get(code);
    if (!room) fail('That room was not found or has expired.');
    return room;
  }

  session(room, player) { return { ok: true, session: { code: room.code, playerId: player.id, token: player.token } }; }

  resume(socketId, { code, playerId, token }) {
    const room = this.getRoom(code);
    const player = typeof playerId === 'string' && room.players.find((entry) => entry.id === playerId && !entry.bot);
    if (!player || !safeTokenEquals(player.token, token)) fail('That player session could not be resumed.');
    const current = this.sockets.get(socketId);
    if (current && (current.code !== code || current.playerId !== playerId)) fail('Leave your current room first.');
    if (player.socketId && player.socketId !== socketId) {
      this.sockets.delete(player.socketId);
      this.revokeSocket(player.socketId);
    }
    player.socketId = socketId;
    player.connected = true;
    player.disconnectedAt = null;
    this.cancel(room, `host:${player.id}`);
    this.sockets.set(socketId, { code, playerId });
    room.touchedAt = this.now();
    this.feed(room, `${player.name} reconnected.`);
    this.ensureHost(room);
    this.broadcast(room);
    return this.session(room, player);
  }

  disconnect(socketId) {
    const identity = this.sockets.get(socketId);
    this.sockets.delete(socketId);
    const room = identity && this.rooms.get(identity.code);
    const player = room?.players.find((entry) => entry.id === identity.playerId);
    if (!player || player.socketId !== socketId) return;
    player.socketId = null;
    player.connected = false;
    player.disconnectedAt = this.now();
    this.feed(room, `${player.name} disconnected. Their seat is saved.`);
    if (room.hostId === player.id) this.schedule(room, `host:${player.id}`, this.hostGraceMs, () => {
      if (!player.connected) { this.transferHost(room); this.broadcast(room); }
    });
    this.hurryAbsent(room, player);
    this.broadcast(room);
  }

  leave(room, player) {
    if (player.socketId) this.sockets.delete(player.socketId);
    player.socketId = null;
    player.connected = false;
    player.disconnectedAt = this.now();
    // An explicit departure ends this session. Network disconnects retain it for resume.
    player.token = randomBytes(32).toString('hex');
    if (room.phase === 'lobby') room.players = room.players.filter((entry) => entry !== player);
    this.feed(room, `${player.name} left the room.`);
    if (room.hostId === player.id) this.transferHost(room);
    if (!room.players.some((entry) => !entry.bot)) { this.deleteRoom(room); return; }
    this.hurryAbsent(room, player);
    this.broadcast(room);
  }

  /** An absent player never stalls the table: their pick is made for them and their answer slot closes. */
  hurryAbsent(room, player) {
    if (room.turn?.playerId === player.id) this.schedule(room, 'turn', 1_500, () => this.autoPick(room));
    this.checkAllAnswered(room);
  }

  transferHost(room) {
    const next = room.players.find((entry) => !entry.bot && entry.connected);
    if (next && next.id !== room.hostId) {
      room.hostId = next.id;
      this.feed(room, `${next.name} is now the host.`);
    }
  }

  ensureHost(room) {
    const host = room.players.find((player) => player.id === room.hostId);
    if (!host || (!host.connected && !room.timers.has(`host:${host.id}`))) this.transferHost(room);
  }

  kick(room, host, playerId) {
    if (room.phase !== 'lobby') fail('Players can only be removed in the lobby.');
    if (typeof playerId !== 'string' || playerId === host.id) fail('Choose another player to remove.');
    const player = room.players.find((entry) => entry.id === playerId);
    if (!player) fail('That player is no longer in the room.');
    if (player.socketId) { this.sockets.delete(player.socketId); this.revokeSocket(player.socketId); }
    room.players = room.players.filter((entry) => entry !== player);
    this.feed(room, `${player.name} was removed from the lobby.`);
    this.broadcast(room);
  }

  addBot(room) {
    const names = ['Atlas Bot', 'Pixel Bot', 'Query Bot', 'Orbit Bot', 'Metric Bot', 'Spark Bot'];
    const base = names.find((name) => !room.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) ?? `Practice Bot ${room.players.length}`;
    const player = this.newPlayer(room, base, null, true);
    player.accuracy = [0.48, 0.65, 0.8][randomInt(3)];
    this.feed(room, `${player.name} joined the room.`);
  }

  newTerritories(mapId) { return MAPS[mapId].labels.map((label, index) => ({ id: `t${index}`, label, category: CATEGORY_IDS[index % 6], ownerId: null, value: 0, capital: false, towers: 0 })); }
  player(room, playerId) { return room.players.find((entry) => entry.id === playerId); }
  territory(room, territoryId) { return room.territories.find((entry) => entry.id === territoryId); }
  alive(room) { return room.order.map((playerId) => this.player(room, playerId)).filter((player) => player?.alive); }
  owned(room, playerId) { return room.territories.filter((territory) => territory.ownerId === playerId); }
  bordering(room, playerId, candidates) {
    const borders = MAPS[room.settings.map].adjacency;
    const own = this.owned(room, playerId).map((territory) => indexOf(territory.id));
    return candidates.filter((territory) => own.some((index) => borders[index].includes(indexOf(territory.id))));
  }

  // A shuffled deck of the questions this match has not asked yet, rotating through the topics.
  shuffleDeck(room, pool) {
    const buckets = new Map(room.settings.categories.map((category) => [category, shuffled(pool.filter((question) => question.category === category && !room.asked.has(question.id)))]));
    const deck = [];
    while ([...buckets.values()].some((bucket) => bucket.length)) {
      for (const category of shuffled([...buckets.keys()])) {
        const question = buckets.get(category).pop();
        if (question) deck.push(question);
      }
    }
    return deck;
  }

  // Of a few random shuffles, keep the one that seats look-alike prompts furthest apart.
  makeDeck(room, pool = this.questions) {
    let best = []; let bestCost = Infinity;
    for (let attempt = 0; attempt < 40 && bestCost > 0; attempt++) {
      const deck = this.shuffleDeck(room, pool); const cost = echoes(deck, room.recent);
      if (cost < bestCost) [best, bestCost] = [deck, cost];
    }
    return best;
  }

  remember(room, question) {
    room.asked.add(question.id);
    room.recent = [...room.recent.slice(-5), question];
  }

  drawChoice(room) {
    if (room.choiceCursor >= room.deck.length) {
      room.deck = this.makeDeck(room);
      // Only a very long war on a narrow topic can ask every question, and only then may questions come back.
      if (!room.deck.length) { for (const question of this.questions) room.asked.delete(question.id); room.deck = this.makeDeck(room); }
      room.choiceCursor = 0;
    }
    const raw = room.deck[room.choiceCursor++];
    this.remember(room, raw);
    const order = shuffled([0, 1, 2, 3]);
    return { ...raw, kind: 'choice', options: order.map((index) => raw.options[index]), correctIndex: order.indexOf(raw.correctIndex) };
  }

  // Number questions never repeat in a match. Once they run out, a tie goes to the faster correct duelist.
  drawEstimate(room) {
    if (room.estimateCursor >= room.estimateDeck.length) return null;
    const raw = room.estimateDeck[room.estimateCursor++];
    this.remember(room, raw);
    return { ...raw, kind: 'estimate' };
  }

  start(room, rematch = false) {
    if ((!rematch && room.phase !== 'lobby') || (rematch && room.phase !== 'finished')) fail('This match has already started.');
    if (room.players.filter((player) => player.connected).length < 2) fail('Add a bot or invite another player before starting.');
    this.cancelAll(room, true);
    room.asked = new Set();
    room.recent = [];
    room.deck = this.makeDeck(room);
    room.estimateDeck = this.makeDeck(room, this.estimates);
    room.choiceCursor = 0;
    room.estimateCursor = 0;
    room.territories = this.newTerritories(room.settings.map);
    room.players.forEach((player) => { player.bonus = 0; player.alive = true; player.stats = newStats(); });
    room.order = shuffled(room.players.map((player) => player.id));
    Object.assign(room, { question: null, turn: null, claimQueue: [], expansionRound: 0, war: null, battle: null, result: null,
      summary: null, questionsAsked: 0, fastest: null, startedAt: this.now() });
    this.feed(room, rematch ? 'A new match has begun. The map is reset.' : 'The match has begun. Choose your capitals!');
    this.capitalTurn(room, 0);
  }

  // Phase 1: each player in turn founds a fortified capital, away from the other capitals when possible.
  capitalTurn(room, index) {
    if (index >= room.order.length) { this.nextExpansion(room); return; }
    const capitals = room.territories.filter((territory) => territory.capital).map((territory) => indexOf(territory.id));
    const free = room.territories.filter((territory) => !territory.ownerId);
    const borders = MAPS[room.settings.map].adjacency;
    const apart = free.filter((territory) => !capitals.some((capital) => borders[capital].includes(indexOf(territory.id))));
    room.phase = 'capital';
    this.openTurn(room, { kind: 'capital', playerId: room.order[index], index }, (apart.length ? apart : free).map((territory) => territory.id), RULES.capitalMs);
  }

  // Phase 2: everyone answers; the best answer claims two free regions and the runner up claims one.
  nextExpansion(room) {
    room.turn = null;
    const free = room.territories.filter((territory) => !territory.ownerId);
    if (free.length && room.expansionRound >= RULES.maxExpansionRounds) {
      // A table that keeps missing never stalls: leftover regions go to a bordering player.
      for (const territory of free) {
        const neighbours = this.alive(room).filter((player) => this.bordering(room, player.id, [territory]).length);
        const owner = neighbours.length ? neighbours[randomInt(neighbours.length)] : this.alive(room)[0];
        Object.assign(territory, { ownerId: owner.id, value: RULES.lateValue });
      }
      this.feed(room, 'The last free regions joined their neighbours.');
    }
    if (!room.territories.some((territory) => !territory.ownerId)) { this.startWar(room); return; }
    room.expansionRound++;
    const estimate = room.estimateDeck.length - room.estimateCursor > RULES.estimateReserve ? this.drawEstimate(room) : null;
    const question = estimate ?? this.drawChoice(room);
    room.result = null;
    this.ask(room, 'expand', question, this.alive(room).map((player) => player.id));
  }

  nextClaim(room) {
    const free = room.territories.filter((territory) => !territory.ownerId);
    if (!free.length || !room.claimQueue.length) {
      room.claimQueue = [];
      room.turn = null;
      room.phase = 'claim';
      // The answer card was already shown; keeping the result here would flash it again before the next question.
      room.result = null;
      this.interstitial(room, 900, () => this.nextExpansion(room));
      return;
    }
    const playerId = room.claimQueue.shift();
    const near = this.bordering(room, playerId, free);
    room.phase = 'claim';
    this.openTurn(room, { kind: 'claim', playerId }, (near.length ? near : free).map((territory) => territory.id), RULES.claimMs);
  }

  // Phase 3: rounds of turns. Each attacker picks a rival region on their border and duels its owner.
  startWar(room) {
    room.result = null;
    room.war = { round: 0, totalRounds: room.settings.rounds, turn: 0, order: [], attackerId: null };
    this.feed(room, 'The map is full. War begins!');
    this.nextWarRound(room);
  }

  nextWarRound(room) {
    const alive = this.alive(room).map((player) => player.id);
    if (alive.length < 2 || room.war.round >= room.war.totalRounds) { this.finish(room); return; }
    room.war.round++;
    const shift = (room.war.round - 1) % alive.length;
    room.war.order = [...alive.slice(shift), ...alive.slice(0, shift)];
    room.war.turn = 0;
    this.nextAttack(room);
  }

  nextAttack(room) {
    const war = room.war;
    room.battle = null;
    room.question = null;
    if (this.alive(room).length < 2) { this.finish(room); return; }
    war.turn++;
    if (war.turn > war.order.length) { this.nextWarRound(room); return; }
    const attacker = this.player(room, war.order[war.turn - 1]);
    if (!attacker?.alive) { this.nextAttack(room); return; }
    war.attackerId = attacker.id;
    const options = this.attackable(room, attacker.id);
    if (!options.length) {
      this.feed(room, `${attacker.name} has no rival border to attack.`);
      room.phase = 'attack';
      room.turn = null;
      this.interstitial(room, 1_500, () => this.nextAttack(room));
      return;
    }
    room.phase = 'attack';
    this.openTurn(room, { kind: 'attack', playerId: attacker.id }, options, RULES.attackMs);
  }

  attackable(room, playerId) {
    const rivals = room.territories.filter((territory) => territory.ownerId && territory.ownerId !== playerId && this.player(room, territory.ownerId)?.alive);
    return this.bordering(room, playerId, rivals).map((territory) => territory.id);
  }

  openTurn(room, turn, options, ms) {
    const player = this.player(room, turn.playerId);
    room.turn = { ...turn, options, deadline: this.now() + ms * this.timeScale };
    room.deadline = room.turn.deadline;
    room.deadlineMs = ms * this.timeScale;
    const delay = player.bot ? 900 + randomInt(900) : player.connected ? ms : 1_500;
    this.schedule(room, 'turn', delay, () => this.autoPick(room));
    this.broadcast(room);
  }

  claim(room, player, { territoryId }) {
    if (!room.turn) fail('There is nothing to pick right now.');
    if (room.turn.playerId !== player.id) fail('Wait for your turn.');
    if (this.now() >= room.turn.deadline) { this.autoPick(room); fail('Time is up for this pick.'); }
    if (typeof territoryId !== 'string' || !room.turn.options.includes(territoryId)) fail('Choose one of the highlighted regions.');
    this.pick(room, territoryId);
  }

  autoPick(room) {
    const turn = room.turn;
    if (!turn) return;
    const player = this.player(room, turn.playerId);
    let choice = turn.options[randomInt(turn.options.length)];
    if (player?.bot && turn.kind === 'attack') {
      // Bots press a nearly fallen fortress, otherwise prefer the richest border region.
      const targets = turn.options.map((territoryId) => this.territory(room, territoryId));
      const fortress = targets.find((territory) => territory.capital && territory.towers === 1);
      const plainTargets = targets.filter((territory) => !territory.capital).sort((a, b) => b.value - a.value);
      if (fortress) choice = fortress.id;
      else if (plainTargets.length && randomInt(10) < 7) choice = plainTargets[0].id;
    }
    this.pick(room, choice);
  }

  pick(room, territoryId) {
    const turn = room.turn;
    const territory = this.territory(room, territoryId);
    const player = this.player(room, turn.playerId);
    room.turn = null;
    this.cancel(room, 'turn');
    if (turn.kind === 'capital') {
      Object.assign(territory, { ownerId: player.id, capital: true, towers: RULES.towers, value: RULES.capitalValue });
      this.feed(room, `${player.name} founded a capital in ${territory.label}.`);
      this.capitalTurn(room, turn.index + 1);
    } else if (turn.kind === 'claim') {
      Object.assign(territory, { ownerId: player.id, value: room.expansionRound <= RULES.earlyRounds ? RULES.earlyValue : RULES.lateValue });
      this.feed(room, `${player.name} claimed ${territory.label}.`);
      this.nextClaim(room);
    } else {
      const defender = this.player(room, territory.ownerId);
      room.battle = { attackerId: player.id, defenderId: defender.id, targetId: territory.id, isBase: territory.capital,
        siege: 0, towersBefore: territory.towers, towersAfter: territory.towers, duel: null, tiebreak: null, outcome: null,
        wasTiebreaker: false, pointsDelta: null, captured: false, eliminated: false };
      this.feed(room, `${player.name} attacks ${territory.label}, held by ${defender.name}.`);
      room.phase = 'march';
      this.interstitial(room, RULES.marchMs, () => this.nextDuel(room));
    }
  }

  nextDuel(room) {
    const battle = room.battle;
    battle.siege++;
    Object.assign(battle, { duel: null, tiebreak: null, outcome: null, wasTiebreaker: false, pointsDelta: null });
    this.ask(room, 'duel', this.drawChoice(room), [battle.attackerId, battle.defenderId]);
  }

  ask(room, phase, question, eligible) {
    const ms = room.settings.duration * 1000 + (question.kind === 'estimate' ? RULES.estimateExtraMs : 0);
    room.phase = phase;
    room.question = question;
    room.questionStartedAt = this.now();
    room.deadline = this.now() + ms * this.timeScale;
    room.deadlineMs = ms * this.timeScale;
    room.answers = new Map();
    room.eligible = new Set(eligible);
    room.away = new Set();
    room.answerSequence = 0;
    room.questionsAsked++;
    this.schedule(room, 'question', ms, () => this.closeQuestion(room));
    for (const bot of room.players.filter((player) => player.bot && room.eligible.has(player.id))) {
      this.schedule(room, `bot:${bot.id}`, ms * (0.2 + randomInt(550) / 1000), () => {
        if (room.phase !== phase || room.question !== question) return;
        const acceptedAt = this.now();
        if (acceptedAt >= room.deadline) { this.closeQuestion(room); return; }
        if (question.kind === 'estimate') {
          const exact = randomInt(1000) < bot.accuracy * 450;
          const direction = randomInt(2) ? 1 : -1;
          const error = (0.04 + randomInt(500) / 1000) * (1.2 - bot.accuracy);
          const estimate = exact ? question.value : Math.min(question.max, Math.max(question.min,
            Number((question.value + direction * Math.max(Math.abs(question.value), 1) * error).toFixed(2))));
          this.answer(room, bot, { questionId: question.id, estimate }, acceptedAt);
          return;
        }
        const correct = randomInt(1000) < bot.accuracy * 1000;
        const choices = [0, 1, 2, 3].filter((choice) => choice !== question.correctIndex);
        this.answer(room, bot, { questionId: question.id, choice: correct ? question.correctIndex : choices[randomInt(choices.length)] }, acceptedAt);
      });
    }
    this.broadcast(room);
  }

  answer(room, player, payload, acceptedAt = this.now()) {
    const { questionId, choice, estimate } = payload;
    if (!QUESTION_PHASES.includes(room.phase)) fail('This question is closed.');
    if (typeof questionId !== 'string' || questionId !== room.question.id) fail('That question is no longer active.');
    const numeric = room.question.kind === 'estimate';
    if (numeric) {
      if ('choice' in payload || typeof estimate !== 'number' || !Number.isFinite(estimate) || estimate < room.question.min || estimate > room.question.max) fail(`Enter a number from ${room.question.min} to ${room.question.max}.`);
    } else if ('estimate' in payload || !Number.isInteger(choice) || choice < 0 || choice > 3) fail('Choose one of the four answers.');
    if (!room.eligible.has(player.id)) fail(room.phase === 'expand' ? 'You are not in this round.' : 'Spectating. Only the two duelists answer this question.');
    if (room.answers.has(player.id)) fail('Your answer is already locked.');
    if (room.away.has(player.id)) fail('You left the game window, so this question is locked.');
    if (acceptedAt >= room.deadline) { this.closeQuestion(room); fail('Time is up for this question.'); }
    const elapsed = Math.max(0, acceptedAt - room.questionStartedAt);
    const sequence = room.answerSequence++;
    if (numeric) {
      const distance = Math.abs(estimate - room.question.value);
      room.answers.set(player.id, { playerId: player.id, estimate, distance, exact: distance === 0, elapsed, sequence });
    } else {
      room.answers.set(player.id, { playerId: player.id, choice, correct: choice === room.question.correctIndex, elapsed, sequence });
    }
    this.checkAllAnswered(room);
    this.broadcast(room);
  }

  /** Leaving the game window during an open question locks that player out of it, so nobody can look answers up elsewhere. */
  away(room, player, { questionId } = {}) {
    if (!QUESTION_PHASES.includes(room.phase) || typeof questionId !== 'string' || questionId !== room.question.id) return;
    if (!room.eligible.has(player.id) || room.answers.has(player.id) || room.away.has(player.id)) return;
    room.away.add(player.id);
    this.checkAllAnswered(room);
    this.broadcast(room);
  }

  checkAllAnswered(room) {
    if (!QUESTION_PHASES.includes(room.phase)) return;
    const expected = room.players.filter((player) => player.connected && room.eligible.has(player.id));
    if (expected.every((player) => room.answers.has(player.id) || room.away.has(player.id))) this.closeQuestion(room);
  }

  /** Estimates rank by distance, then time, then server arrival. Choice answers rank correct ones by time. */
  rank(question, answers) {
    if (question.kind === 'estimate') return [...answers].sort((a, b) => a.distance - b.distance || a.elapsed - b.elapsed || a.sequence - b.sequence);
    return answers.filter((answer) => answer.correct).sort((a, b) => a.elapsed - b.elapsed || a.sequence - b.sequence);
  }

  reveal(question, answers, away = []) {
    return { kind: question.kind, prompt: question.prompt, category: question.category,
      ...(question.kind === 'estimate' ? { correctValue: question.value, unit: question.unit } : { options: [...question.options], correctIndex: question.correctIndex }),
      explanation: question.explanation, source: question.source,
      answers: answers.map(({ sequence, ...answer }) => answer), away: [...away] };
  }

  closeQuestion(room) {
    if (!QUESTION_PHASES.includes(room.phase)) return;
    this.cancel(room, 'question');
    for (const key of [...room.timers.keys()].filter((key) => key.startsWith('bot:'))) this.cancel(room, key);
    const question = room.question;
    const answers = [...room.answers.values()].sort((a, b) => a.sequence - b.sequence);
    const ranked = this.rank(question, answers);
    for (const playerId of room.eligible) {
      const player = this.player(room, playerId);
      const answer = room.answers.get(playerId);
      if (!player) continue;
      if (answer) { player.stats.answered++; player.stats.timeMs += answer.elapsed; }
      if (question.kind === 'estimate') { if (ranked[0]?.playerId === playerId) player.stats.closest++; continue; }
      if (answer?.correct) {
        player.stats.correct++;
        player.stats.maxStreak = Math.max(player.stats.maxStreak, ++player.stats.streak);
        if (!room.fastest || answer.elapsed < room.fastest.elapsed) room.fastest = { playerId, elapsed: answer.elapsed };
      } else { player.stats.wrong++; player.stats.streak = 0; }
    }
    const phase = room.phase;
    room.question = null;
    if (phase === 'expand') this.resolveExpansion(room, question, answers, ranked);
    else if (phase === 'duel') this.resolveDuel(room, question, answers);
    else this.resolveTiebreak(room, question, answers, ranked);
  }

  resolveExpansion(room, question, answers, ranked) {
    const order = [...ranked, ...answers.filter((answer) => !ranked.includes(answer))];
    room.result = { ...this.reveal(question, order, room.away), ranking: ranked.map((answer) => answer.playerId), expansionRound: room.expansionRound };
    room.claimQueue = [ranked[0], ranked[0], ranked[1]].filter(Boolean).map((answer) => answer.playerId);
    room.phase = 'claim';
    room.turn = null;
    const [first, second] = ranked.map((answer) => this.player(room, answer.playerId));
    this.feed(room, first ? `${first.name} answered best and claims two regions${second ? `, then ${second.name} claims one` : ''}.` : question.kind === 'estimate' ? 'Nobody answered. No regions this round.' : 'Nobody answered correctly. No regions this round.');
    this.interstitial(room, RULES.rankingMs, () => this.nextClaim(room));
  }

  resolveDuel(room, question, answers) {
    const battle = room.battle;
    battle.duel = this.reveal(question, answers, room.away);
    const attack = answers.find((answer) => answer.playerId === battle.attackerId);
    const defend = answers.find((answer) => answer.playerId === battle.defenderId);
    if (attack?.correct && defend?.correct) {
      const estimate = this.drawEstimate(room);
      if (estimate) { this.feed(room, 'Both duelists were right. Tie-break: the closest number wins.'); this.ask(room, 'tiebreak', estimate, [battle.attackerId, battle.defenderId]); return; }
      this.settle(room, attack.elapsed < defend.elapsed ? 'ATTACKER_WIN' : 'DEFENDER_WIN', true);
      return;
    }
    this.settle(room, attack?.correct ? 'ATTACKER_WIN' : defend?.correct ? 'DEFENDER_WIN' : 'BOTH_INCORRECT');
  }

  resolveTiebreak(room, question, answers, ranked) {
    const battle = room.battle;
    battle.tiebreak = { ...this.reveal(question, ranked, room.away), winnerId: ranked[0]?.playerId ?? battle.defenderId };
    // If nobody answers the tie-break, the defender holds the region.
    this.settle(room, battle.tiebreak.winnerId === battle.attackerId ? 'ATTACKER_WIN' : 'DEFENDER_WIN', true);
  }

  settle(room, outcome, wasTiebreaker = false) {
    const battle = room.battle;
    const territory = this.territory(room, battle.targetId);
    const attacker = this.player(room, battle.attackerId);
    const defender = this.player(room, battle.defenderId);
    Object.assign(battle, { outcome, wasTiebreaker, pointsDelta: { attacker: 0, defender: 0 }, towersBefore: territory.towers });
    if (outcome === 'ATTACKER_WIN' && territory.capital) {
      territory.towers--;
      if (territory.towers <= 0) {
        // The fortress falls: every region of the defender changes hands and they leave the war.
        const taken = this.owned(room, defender.id);
        const value = taken.reduce((total, region) => total + region.value, 0);
        for (const region of taken) region.ownerId = attacker.id;
        Object.assign(territory, { capital: false, towers: 0 });
        defender.alive = false;
        Object.assign(battle, { captured: true, eliminated: true, takenIds: taken.map((region) => region.id), pointsDelta: { attacker: value, defender: -value } });
        this.feed(room, `${attacker.name} toppled ${defender.name}'s capital and took all ${taken.length} of their regions!`);
      } else this.feed(room, `${attacker.name} destroyed a tower of ${territory.label}. ${territory.towers} left.`);
    } else if (outcome === 'ATTACKER_WIN') {
      const previous = territory.value;
      Object.assign(territory, { ownerId: attacker.id, value: RULES.conquestValue });
      Object.assign(battle, { captured: true, pointsDelta: { attacker: RULES.conquestValue, defender: -previous } });
      this.feed(room, `${attacker.name} conquered ${territory.label} from ${defender.name}.`);
    } else if (outcome === 'DEFENDER_WIN') {
      defender.bonus += RULES.defenseBonus;
      battle.pointsDelta = { attacker: 0, defender: RULES.defenseBonus };
      this.feed(room, `${defender.name} defended ${territory.label}.`);
    } else this.feed(room, 'Both duelists missed. Nothing changes.');
    battle.towersAfter = territory.towers;
    room.phase = 'result';
    room.turn = null;
    // A siege continues while the attacker keeps winning and towers still stand.
    const siege = outcome === 'ATTACKER_WIN' && territory.capital && territory.towers > 0;
    this.interstitial(room, RULES.resultMs, () => siege ? this.nextDuel(room) : this.nextAttack(room));
  }

  interstitial(room, ms, callback) {
    room.deadline = this.now() + ms * this.timeScale;
    room.deadlineMs = ms * this.timeScale;
    this.schedule(room, 'next', ms, callback);
    this.broadcast(room);
  }

  score(room, player) { return player.bonus + this.owned(room, player.id).reduce((total, territory) => total + territory.value, 0); }

  finish(room) {
    this.cancelAll(room, true);
    room.phase = 'finished';
    room.turn = null;
    room.question = null;
    room.claimQueue = [];
    room.deadline = null;
    room.summary = { durationMs: Math.max(0, this.now() - (room.startedAt ?? this.now())), totalQuestions: room.questionsAsked,
      warRounds: room.war?.round ?? 0, fastest: room.fastest ? { ...room.fastest } : null };
    this.feed(room, 'Match finished. The host can start a rematch.');
    this.broadcast(room);
  }

  view(room, playerId) {
    const me = room.players.find((player) => player.id === playerId);
    const asking = QUESTION_PHASES.includes(room.phase);
    const question = asking ? (room.question.kind === 'estimate'
      ? (({ id: questionId, kind, category, prompt, unit, min, max }) => ({ id: questionId, kind, category, prompt, unit, min, max }))(room.question)
      : (({ id: questionId, kind, category, difficulty, prompt, options }) => ({ id: questionId, kind, category, difficulty, prompt, options: [...options] }))(room.question)) : null;
    const players = room.players.map((player) => {
      const capital = room.territories.find((territory) => territory.capital && territory.ownerId === player.id);
      const { answered, correct, wrong, closest, timeMs, maxStreak } = player.stats;
      return { id: player.id, name: player.name, color: player.color, bot: player.bot, connected: player.connected,
        alive: player.alive, score: this.score(room, player), territories: this.owned(room, player.id).length,
        capitalId: capital?.id ?? null, towers: capital?.towers ?? 0,
        stats: { answered, correct, wrong, closest, maxStreak, accuracy: correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0, avgTimeMs: answered ? Math.round(timeMs / answered) : 0 } };
    });
    const mine = room.answers.get(playerId);
    return { code: room.code, practice: room.practice, settings: { ...room.settings, categories: [...room.settings.categories] },
      phase: room.phase, stage: room.phase === 'capital' ? 'capitals' : ['expand', 'claim'].includes(room.phase) ? 'expansion' : ['attack', 'march', 'duel', 'tiebreak', 'result'].includes(room.phase) ? 'war' : room.phase,
      hostId: room.hostId, order: [...room.order], players, territories: room.territories.map((territory) => ({ ...territory })),
      question, deadline: room.deadline, deadlineMs: room.deadlineMs,
      eligible: asking ? [...room.eligible] : [], answered: asking ? [...room.answers.keys()] : [], away: asking ? [...room.away] : [],
      turn: room.turn ? { ...room.turn, options: [...room.turn.options] } : null, claimQueue: [...room.claimQueue],
      expansionRound: room.expansionRound, war: room.war ? { ...room.war, order: [...room.war.order] } : null,
      battle: room.battle ? structuredClone(room.battle) : null, result: room.result ? structuredClone(room.result) : null,
      summary: room.summary ? structuredClone(room.summary) : null,
      me: { id: me?.id ?? null, host: room.hostId === playerId, eligible: asking && room.eligible.has(playerId), answered: Boolean(asking && mine), away: Boolean(asking && room.away.has(playerId)),
        choice: asking ? mine?.choice ?? null : null, estimate: asking ? mine?.estimate ?? null : null },
      feed: room.feed.map((entry) => ({ ...entry })) };
  }

  broadcast(room) {
    if (!this.rooms.has(room.code)) return;
    for (const player of room.players) if (!player.bot && player.connected && player.socketId) this.emitState(player.socketId, this.view(room, player.id));
  }

  feed(room, text) { room.feed.push({ id: id(), text }); room.feed = room.feed.slice(-12); }
  schedule(room, key, delay, callback) {
    this.cancel(room, key);
    const timer = setTimeout(() => { room.timers.delete(key); if (this.rooms.has(room.code)) callback(); }, Math.max(1, delay * this.timeScale));
    timer.unref?.();
    room.timers.set(key, timer);
  }
  cancel(room, key) { clearTimeout(room.timers.get(key)); room.timers.delete(key); }
  cancelAll(room, keepHostTimers = false) { for (const key of [...room.timers.keys()]) if (!keepHostTimers || !key.startsWith('host:')) this.cancel(room, key); }
  deleteRoom(room) {
    this.cancelAll(room);
    this.rooms.delete(room.code);
    for (const player of room.players) if (player.socketId) { this.sockets.delete(player.socketId); this.revokeSocket(player.socketId); }
  }
  cleanup() {
    const now = this.now();
    for (const room of this.rooms.values()) {
      const online = room.players.some((player) => !player.bot && player.connected);
      const humans = room.players.filter((player) => !player.bot);
      const lastDisconnected = Math.max(room.touchedAt, ...humans.map((player) => player.disconnectedAt ?? room.touchedAt));
      if (now - room.createdAt > this.roomTtlMs || (!online && now - lastDisconnected > this.emptyRoomTtlMs)) this.deleteRoom(room);
    }
  }
  close() { clearInterval(this.cleanupTimer); for (const room of this.rooms.values()) this.deleteRoom(room); }
}
