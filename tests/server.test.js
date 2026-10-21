import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';
import { CATEGORY_IDS } from '../src/game.js';

const questions = CATEGORY_IDS.flatMap((category) => Array.from({ length: 6 }, (_, index) => ({
  id: `${category}-${index}`, category, difficulty: 'Starter', prompt: `${category} question ${index}`,
  options: [`Correct ${category}-${index}`, 'Wrong one', 'Wrong two', 'Wrong three'], correctIndex: 0,
  explanation: `Explanation for ${category}-${index}`, source: { title: 'Official source', url: 'https://example.org/docs' },
})));
const tracks = CATEGORY_IDS.map((id) => ({ id, name: id }));
const estimates = [1, 2, 3, 4].map((index) => ({ id: `numeric-seo-${index}`, category: 'seo', prompt: `A teaching scenario has 10 groups of 10 URLs (${index}). How many URLs?`,
  value: 100, unit: 'URLs', min: 0, max: 1000, explanation: '10 times 10 is 100.', source: { title: 'Official source', url: 'https://example.org/docs' } }));
const send = (socket, event, payload = {}) => new Promise((resolve, reject) => socket.timeout(3000).emit(event, payload, (error, result) => error ? reject(error) : resolve(result)));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitState = (socket, predicate) => {
  if (socket.latest && predicate(socket.latest)) return Promise.resolve(socket.latest);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('state', listener); reject(new Error('Timed out waiting for state.')); }, 3000);
    const listener = (state) => { if (predicate(state)) { clearTimeout(timer); socket.off('state', listener); resolve(state); } };
    socket.on('state', listener);
  });
};
const correct = (state) => state.question.options.findIndex((option) => option === `Correct ${state.question.id}`);
async function setup(options = {}) {
  const app = await createApp({ questions, tracks, timeScale: 0.08, ...options });
  const address = await app.listen(0);
  const url = `http://127.0.0.1:${address.port}`;
  const sockets = [];
  return { app, url, async client(extra = {}) {
    const socket = connect(url, { transports: ['websocket'], reconnection: false, ...extra });
    sockets.push(socket);
    socket.on('state', (state) => { socket.latest = state; });
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  }, async close() { sockets.forEach((socket) => socket.disconnect()); await app.close(); } };
}

const seats = (created, joined, host, guest) => (playerId) => playerId === created.session.playerId ? host : guest;
async function foundCapitals(watcher, socketOf, count = 2) {
  for (let index = 0; index < count; index++) {
    const state = await waitState(watcher, (next) => next.phase === 'capital' && next.turn?.index === index);
    assert.equal((await send(socketOf(state.turn.playerId), 'round:claim', { territoryId: state.turn.options[0] })).ok, true);
  }
}
async function pair(fixture, extra = {}) {
  const host = await fixture.client();
  const guest = await fixture.client();
  const created = await send(host, 'room:create', { name: 'Host', rounds: 6, duration: 15, ...extra });
  const joined = await send(guest, 'room:join', { name: 'Guest', code: created.session.code });
  assert.equal(created.ok, true);
  assert.equal(joined.ok, true);
  return { host, guest, created, joined, socketOf: seats(created, joined, host, guest) };
}

test('two real clients found capitals, race an expansion question and claim bordering regions', async () => {
  const fixture = await setup();
  try {
    const { host, guest, created, joined, socketOf } = await pair(fixture);
    assert.equal((await send(guest, 'room:start')).ok, false);
    assert.equal((await send(guest, 'room:bot')).ok, false);
    assert.equal((await send(host, 'room:kick', { playerId: created.session.playerId })).ok, false);
    assert.equal((await send(host, 'room:start')).ok, true);
    const capital = await waitState(host, (state) => state.phase === 'capital' && state.turn?.index === 0);
    assert.equal(capital.stage, 'capitals');
    const waiting = capital.turn.playerId === created.session.playerId ? guest : host;
    assert.match((await send(waiting, 'round:claim', { territoryId: capital.turn.options[0] })).error, /Wait for your turn/);
    assert.equal((await send(guest, 'room:join', { name: 'Late', code: created.session.code })).ok, false);
    await foundCapitals(host, socketOf);
    const expand = await waitState(host, (state) => state.phase === 'expand');
    assert.equal(expand.players.every((player) => player.towers === 3 && player.score === 1000 && player.capitalId), true);
    for (const key of ['correctIndex', 'source', 'explanation']) assert.equal(key in expand.question, false);
    assert.equal(expand.result, null);
    assert.equal((await send(host, 'round:answer', { questionId: 'stale', choice: 0 })).ok, false);
    assert.equal((await send(host, 'round:answer', { questionId: expand.question.id, choice: correct(expand) })).ok, true);
    const locked = await waitState(guest, (state) => state.answered.includes(created.session.playerId));
    assert.equal(locked.me.answered, false);
    assert.equal(locked.me.choice, null);
    assert.match((await send(host, 'round:answer', { questionId: expand.question.id, choice: correct(expand) })).error, /locked/);
    assert.equal((await send(guest, 'round:answer', { questionId: expand.question.id, choice: (correct(expand) + 1) % 4 })).ok, true);
    const ranked = await waitState(guest, (state) => state.phase === 'claim' && state.result);
    assert.equal(ranked.result.options[ranked.result.correctIndex], `Correct ${expand.question.id}`);
    assert.deepEqual(ranked.result.ranking, [created.session.playerId]);
    assert.deepEqual(ranked.claimQueue, [created.session.playerId, created.session.playerId]);
    const claim = await waitState(host, (state) => state.turn?.kind === 'claim');
    assert.equal(claim.turn.playerId, created.session.playerId);
    assert.match((await send(guest, 'round:claim', { territoryId: claim.turn.options[0] })).error, /Wait for your turn/);
    assert.match((await send(host, 'round:claim', { territoryId: claim.me.id })).error, /highlighted/);
    assert.equal((await send(host, 'round:claim', { territoryId: claim.turn.options[0] })).ok, true);
    const second = await waitState(host, (state) => state.turn?.kind === 'claim' && state.territories.filter((territory) => territory.ownerId === created.session.playerId).length === 2);
    assert.equal((await send(host, 'round:claim', { territoryId: second.turn.options[0] })).ok, true);
    const next = await waitState(guest, (state) => state.phase === 'expand' && state.expansionRound === 2);
    assert.equal(next.players.find((player) => player.id === created.session.playerId).score, 1400);
    assert.equal(next.players.find((player) => player.id === joined.session.playerId).score, 1000);
    await send(host, 'room:end');
  } finally { await fixture.close(); }
});

test('real sockets run a war duel with spectator-safe redaction and a scored conquest', async () => {
  const fixture = await setup();
  try {
    const { host, guest, created, joined } = await pair(fixture);
    assert.equal((await send(host, 'room:start')).ok, true);
    await waitState(host, (state) => state.phase === 'capital');
    const engine = fixture.app.engine;
    const room = engine.rooms.get(created.session.code);
    engine.cancelAll(room);
    room.order = [created.session.playerId, joined.session.playerId];
    room.territories.forEach((territory, index) => Object.assign(territory, { ownerId: [0, 1, 2].includes(index) ? created.session.playerId : joined.session.playerId,
      value: index === 0 || index === 18 ? 1000 : 300, capital: index === 0 || index === 18, towers: index === 0 || index === 18 ? 3 : 0 }));
    engine.startWar(room);
    const attack = await waitState(host, (state) => state.phase === 'attack');
    assert.equal(attack.stage, 'war');
    assert.deepEqual(attack.turn.options, ['t3', 't4', 't5', 't6']);
    assert.match((await send(guest, 'round:claim', { territoryId: 't1' })).error, /Wait for your turn/);
    assert.equal((await send(host, 'round:claim', { territoryId: 't5' })).ok, true);
    const march = await waitState(guest, (state) => state.phase === 'march');
    assert.deepEqual([march.battle.attackerId, march.battle.defenderId, march.battle.targetId], [created.session.playerId, joined.session.playerId, 't5']);
    const duel = await waitState(guest, (state) => state.phase === 'duel');
    assert.equal(duel.me.eligible, true);
    for (const key of ['correctIndex', 'source', 'explanation']) assert.equal(key in duel.question, false);
    assert.equal(duel.battle.duel ?? null, null);
    assert.equal((await send(guest, 'round:answer', { questionId: duel.question.id, choice: (correct(duel) + 1) % 4 })).ok, true);
    assert.equal((await send(host, 'round:answer', { questionId: duel.question.id, choice: correct(duel) })).ok, true);
    const result = await waitState(host, (state) => state.phase === 'result');
    assert.equal(result.battle.outcome, 'ATTACKER_WIN');
    assert.deepEqual(result.battle.pointsDelta, { attacker: 400, defender: -300 });
    assert.equal(result.territories[5].ownerId, created.session.playerId);
    assert.equal(result.players.find((player) => player.id === created.session.playerId).score, 2000);
    const reply = await waitState(guest, (state) => state.phase === 'attack' && state.turn.playerId === joined.session.playerId);
    assert.equal(reply.turn.options.includes('t5'), true);
    await send(host, 'room:end');
    const finished = await waitState(guest, (state) => state.phase === 'finished');
    assert.equal(finished.summary.totalQuestions, 1);
  } finally { await fixture.close(); }
});

test('deadlines place idle capitals and close silent rounds, with malformed and stale actions rejected', async () => {
  const fixture = await setup({ timeScale: 0.01 });
  try {
    const { host, guest, created } = await pair(fixture);
    assert.equal((await send(host, 'room:start', { extra: true })).ok, false);
    assert.equal((await send(host, 'room:start')).ok, true);
    const expand = await waitState(guest, (state) => state.phase === 'expand');
    assert.equal(expand.territories.filter((territory) => territory.capital).length, 2);
    for (const payload of [null, 'text', { questionId: expand.question.id, choice: 9 }, { questionId: expand.question.id, choice: 1.5 }, { questionId: expand.question.id, choice: 0, extra: 1 }]) {
      assert.equal((await send(host, 'round:answer', payload)).ok, false);
    }
    assert.equal((await send(host, 'round:claim', { territoryId: 't0' })).ok, false);
    const silent = await waitState(guest, (state) => state.phase === 'expand' && state.expansionRound === 2);
    assert.match(silent.feed.map((entry) => entry.text).join(' '), /Nobody answered correctly/);
    assert.equal((await send(host, 'round:answer', { questionId: expand.question.id, choice: 0 })).ok, false);
    assert.equal((await send(host, 'room:kick', { playerId: created.session.playerId })).ok, false);
    await send(host, 'room:end');
  } finally { await fixture.close(); }
});

test('practice adds visible bots, keeps the start explicit, and bots answer after genuine delays', async () => {
  const fixture = await setup({ estimates });
  try {
    const host = await fixture.client();
    const created = await send(host, 'room:create', { name: 'Solo', practice: true, categories: ['seo'] });
    const lobby = await waitState(host, (state) => state.players.length === 3);
    assert.equal(lobby.phase, 'lobby');
    assert.deepEqual(lobby.players.filter((player) => player.bot).map((player) => player.name), ['Atlas Bot', 'Pixel Bot']);
    assert.equal((await send(host, 'room:start')).ok, true);
    const placed = await waitState(host, (state) => state.phase === 'capital' && state.turn?.playerId === created.session.playerId);
    assert.equal(placed.territories.filter((territory) => territory.capital).length, placed.turn.index);
    assert.equal((await send(host, 'round:claim', { territoryId: placed.turn.options[0] })).ok, true);
    const expand = await waitState(host, (state) => state.phase === 'expand');
    assert.equal(expand.question.kind, 'estimate');
    for (const key of ['value', 'correctValue', 'explanation', 'source']) assert.equal(key in expand.question, false);
    const ranked = await waitState(host, (state) => state.phase === 'claim' && state.result);
    const botAnswers = ranked.result.answers.filter((answer) => answer.playerId !== created.session.playerId);
    assert.equal(botAnswers.length, 2);
    assert.equal(botAnswers.every((answer) => Number.isFinite(answer.estimate) && answer.estimate >= 0 && answer.estimate <= 1000 && answer.elapsed > 0), true);
    await send(host, 'room:end');
  } finally { await fixture.close(); }
});

test('real sockets handle numeric redaction, invalid input, closest ranking, personal locking and replay rejection', async () => {
  const fixture = await setup({ estimates });
  try {
    const { host, guest, created, joined, socketOf } = await pair(fixture, { categories: ['seo'] });
    assert.equal((await send(host, 'room:start')).ok, true);
    await foundCapitals(host, socketOf);
    const expand = await waitState(host, (state) => state.phase === 'expand');
    assert.equal(expand.question.kind, 'estimate');
    assert.deepEqual([expand.question.unit, expand.question.min, expand.question.max], ['URLs', 0, 1000]);
    for (const key of ['value', 'correctValue', 'options', 'explanation', 'source']) assert.equal(key in expand.question, false);
    for (const estimate of ['100', -1, 1001, null]) assert.match((await send(host, 'round:answer', { questionId: expand.question.id, estimate })).error, /Enter a number/);
    assert.equal((await send(host, 'round:answer', { questionId: expand.question.id, estimate: 80 })).ok, true);
    const mine = await waitState(host, (state) => state.me.answered);
    assert.equal(mine.me.estimate, 80);
    const theirs = await waitState(guest, (state) => state.answered.includes(created.session.playerId));
    assert.equal(theirs.me.estimate, null);
    assert.match((await send(host, 'round:answer', { questionId: expand.question.id, estimate: 100 })).error, /locked/);
    assert.equal((await send(guest, 'round:answer', { questionId: expand.question.id, estimate: 100 })).ok, true);
    const ranked = await waitState(host, (state) => state.phase === 'claim' && state.result);
    assert.deepEqual([ranked.result.correctValue, ranked.result.unit], [100, 'URLs']);
    assert.deepEqual(ranked.result.ranking, [joined.session.playerId, created.session.playerId]);
    assert.deepEqual(ranked.claimQueue, [joined.session.playerId, joined.session.playerId, created.session.playerId]);
    assert.equal((await send(guest, 'round:answer', { questionId: expand.question.id, estimate: 100 })).ok, false);
    await send(host, 'room:end');
  } finally { await fixture.close(); }
});

test('resume replaces the previous socket and host transfers after disconnection grace', async () => {
  const fixture = await setup({ timeScale: 0.01, hostGraceMs: 1000 });
  try {
    const host = await fixture.client();
    const guest = await fixture.client();
    const created = await send(host, 'room:create', { name: 'Host' });
    const joined = await send(guest, 'room:join', { name: 'Guest', code: created.session.code });
    const replacement = await fixture.client();
    assert.equal((await send(replacement, 'session:resume', { ...created.session, token: 'wrong' })).ok, false);
    const previousId = host.id;
    assert.equal((await send(replacement, 'session:resume', created.session)).ok, true);
    const resumed = await waitState(replacement, (state) => state.me.id === created.session.playerId);
    assert.equal(resumed.me.host, true);
    assert.equal(host.connected, false);
    assert.throws(() => fixture.app.engine.handle(previousId, 'room:start', {}), /resume/);
    replacement.disconnect();
    const transferred = await waitState(guest, (state) => state.hostId === joined.session.playerId);
    assert.equal(transferred.me.host, true);
    const secondReplacement = await fixture.client();
    assert.equal((await send(secondReplacement, 'session:resume', created.session)).ok, true);
    const returned = await waitState(secondReplacement, (state) => state.me.id === created.session.playerId);
    assert.equal(returned.me.host, false);
  } finally { await fixture.close(); }
});


test('HTTP API redacts the answer bank and static server blocks traversal, symlinks, and foreign origins', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'keywordia-'));
  const publicDir = join(directory, 'public');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(publicDir);
  await writeFile(join(publicDir, 'index.html'), '<h1>Local game</h1>');
  await writeFile(join(directory, 'private.json'), '{"secret":"not public"}');
  await symlink(join(directory, 'private.json'), join(publicDir, 'leak.json'));
  const fixture = await setup({ publicDir });
  try {
    const health = await fetch(`${fixture.url}/api/health`);
    assert.deepEqual(await health.json(), { ok: true, version: '0.1.0' });
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.match(health.headers.get('content-security-policy'), /connect-src 'self'/);
    const catalog = await (await fetch(`${fixture.url}/api/catalog`)).json();
    assert.equal(catalog.totalQuestions, 36);
    assert.equal(catalog.questions.some((question) => 'correctIndex' in question || 'options' in question || 'explanation' in question), false);
    assert.equal((await fetch(`${fixture.url}/`)).status, 200);
    for (const path of ['/data/questions.json', '/src/game.js', '/%2e%2e/private.json', '/.env', '/leak.json', '/%5c..%5cprivate.json']) assert.equal((await fetch(`${fixture.url}${path}`)).status, 404);
    assert.equal((await fetch(`${fixture.url}/api/health`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${fixture.url}/api/health`, { headers: { Origin: 'https://foreign.example' } })).status, 403);
    const foreignSocket = connect(fixture.url, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: 'https://foreign.example' } });
    const connectionError = await new Promise((resolve) => foreignSocket.once('connect_error', resolve));
    assert.ok(connectionError);
    foreignSocket.disconnect();
    const host = await fixture.client();
    let limited = false;
    for (let index = 0; index < 46; index++) {
      const response = await send(host, 'round:claim', { territoryId: 't0' });
      if (/Too many requests/.test(response.error)) limited = true;
    }
    assert.equal(limited, true);
  } finally { await fixture.close(); await rm(directory, { recursive: true, force: true }); }
});


test('password gate blocks pages, API and sockets until the right password sets a cookie', async () => {
  const fixture = await setup({ accessPassword: 'friends-only' });
  try {
    assert.equal((await fetch(`${fixture.url}/api/health`)).status, 200);
    assert.equal((await fetch(`${fixture.url}/login.css`)).status, 200);
    const gate = await fetch(`${fixture.url}/?room=ABCDEF`);
    assert.equal(gate.status, 401);
    const html = await gate.text();
    assert.match(html, /name="password"/);
    assert.match(html, /value="\/\?room=ABCDEF"/);
    assert.equal((await fetch(`${fixture.url}/api/catalog`)).status, 401);
    assert.equal((await fetch(`${fixture.url}/app.js`)).status, 401);
    await assert.rejects(fixture.client());
    const post = (password, next = '/?room=ABCDEF') => fetch(`${fixture.url}/login`, { method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password, next }) });
    const wrong = await post('nope');
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get('set-cookie'), null);
    assert.equal((await post('friends-only', '//evil.example')).headers.get('location'), '/');
    const right = await post('friends-only');
    assert.equal(right.status, 303);
    assert.equal(right.headers.get('location'), '/?room=ABCDEF');
    const cookie = right.headers.get('set-cookie').split(';')[0];
    assert.match(right.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await fetch(`${fixture.url}/api/catalog`, { headers: { cookie } })).status, 200);
    assert.equal((await fetch(`${fixture.url}/api/catalog`, { headers: { cookie: 'kw_access=forged' } })).status, 401);
    const socket = await fixture.client({ extraHeaders: { cookie } });
    assert.equal(socket.connected, true);
  } finally { await fixture.close(); }
});

test('password gate slows repeated wrong guesses', async () => {
  const fixture = await setup({ accessPassword: 'friends-only' });
  try {
    const post = (password) => fetch(`${fixture.url}/login`, { method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password }) });
    for (let attempt = 0; attempt < 8; attempt++) assert.equal((await post('wrong')).status, 401);
    assert.equal((await post('friends-only')).status, 429);
  } finally { await fixture.close(); }
});

test('trusted proxy headers let an HTTPS origin through and mark the cookie secure', async () => {
  const direct = await setup();
  const proxied = await setup({ trustProxy: true, accessPassword: 'friends-only' });
  try {
    const headers = { origin: 'https://game.example', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'game.example' };
    assert.equal((await fetch(`${direct.url}/api/health`, { headers })).status, 403);
    assert.equal((await fetch(`${proxied.url}/api/health`, { headers })).status, 200);
    const login = await fetch(`${proxied.url}/login`, { method: 'POST', redirect: 'manual',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: 'friends-only' }) });
    assert.equal(login.status, 303);
    assert.match(login.headers.get('set-cookie'), /Secure/);
  } finally { await direct.close(); await proxied.close(); }
});
