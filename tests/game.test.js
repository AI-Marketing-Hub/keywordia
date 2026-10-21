import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GameEngine, CATEGORY_IDS, RULES } from '../src/game.js';
import { MAPS, MAP_IDS, DEFAULT_MAP } from '../src/maps.js';

const ADJACENCY = MAPS[DEFAULT_MAP].adjacency;

export const questions = CATEGORY_IDS.flatMap((category) => Array.from({ length: 6 }, (_, index) => ({
  id: `${category}-${index}`, category, difficulty: 'Starter', prompt: `${category} question ${index}`,
  options: [`Correct ${category}-${index}`, 'Wrong one', 'Wrong two', 'Wrong three'], correctIndex: 0,
  explanation: `Explanation for ${category}-${index}`, source: { title: 'Official source', url: 'https://example.org/docs' },
})));
export const tracks = CATEGORY_IDS.map((id) => ({ id, name: id, short: id, description: `${id} practice`, color: '#abcdef', icon: 'star', repoUrl: 'https://example.org' }));
const estimate = (index, category = 'seo') => ({ id: `numeric-${category}-${index}`, category, prompt: `A teaching scenario has 10 groups of 10 URLs (${index}). How many URLs?`,
  value: 100, unit: 'URLs', min: 0, max: 1000, explanation: '10 times 10 is 100.', source: { title: 'Official source', url: 'https://example.org/docs' } });
const estimates = [estimate(1), estimate(2), estimate(3), estimate(4)];
const create = (engine, socketId, extra = {}) => engine.handle(socketId, 'room:create', { name: socketId, rounds: 6, duration: 15, ...extra });

/** Timers become manual so each test can step the match one phase at a time. */
function manual(engine) {
  engine.schedule = (room, key, delay, callback) => { engine.cancel(room, key); room.timers.set(key, { callback, delay }); };
}
function fire(room, key) {
  const timer = room.timers.get(key);
  assert.ok(timer, `expected a pending ${key} timer in phase ${room.phase}`);
  room.timers.delete(key);
  timer.callback();
}
function table(names, { extra = {}, ...engineOptions } = {}) {
  const engine = new GameEngine({ questions, tracks, ...engineOptions });
  manual(engine);
  const sessions = { [names[0]]: create(engine, names[0], extra).session };
  for (const name of names.slice(1)) sessions[name] = engine.handle(name, 'room:join', { code: sessions[names[0]].code, name }).session;
  const room = engine.rooms.get(sessions[names[0]].code);
  const socketOf = (playerId) => Object.keys(sessions).find((name) => sessions[name].playerId === playerId);
  const idOf = (name) => sessions[name].playerId;
  return { engine, room, sessions, socketOf, idOf };
}
/** Starts a match, then lays out the map directly and opens the war. Every region not listed goes to `rest`. */
function war(layout, rest, options = {}) {
  const names = layout.map(([name]) => name);
  const fixture = table(names, options);
  const { engine, room, idOf } = fixture;
  engine.handle(names[0], 'room:start', {});
  engine.cancelAll(room);
  room.order = names.map(idOf);
  for (const territory of room.territories) Object.assign(territory, { ownerId: null, value: 0, capital: false, towers: 0 });
  for (const [name, capital, regions] of layout) {
    Object.assign(room.territories[capital], { ownerId: idOf(name), value: RULES.capitalValue, capital: true, towers: RULES.towers });
    for (const index of regions) Object.assign(room.territories[index], { ownerId: idOf(name), value: 300 });
  }
  for (const territory of room.territories) if (!territory.ownerId) Object.assign(territory, { ownerId: idOf(rest), value: 300 });
  engine.startWar(room);
  return fixture;
}
const right = (engine, room, socketId) => engine.handle(socketId, 'round:answer', { questionId: room.question.id, choice: room.question.correctIndex });
const wrong = (engine, room, socketId) => engine.handle(socketId, 'round:answer', { questionId: room.question.id, choice: (room.question.correctIndex + 1) % 4 });
const scoreOf = (engine, room, playerId) => engine.view(room, playerId).players.find((player) => player.id === playerId).score;
const ids = (indexes) => indexes.map((index) => `t${index}`);

test('rooms validate settings, cap seats at six, and redact catalog answers', () => {
  const engine = new GameEngine({ questions, tracks, maxRooms: 1 });
  try {
    for (const extra of [{ rounds: 5 }, { rounds: 18 }, { rounds: null }, { duration: 1 }, { duration: 30 }, { mode: 'conquest' }, { categories: null },
      { categories: ['unknown'] }, { categories: ['seo', 'seo'] }, { practice: 'yes' }, { name: '<script>' }, { extra: true }]) {
      assert.throws(() => create(engine, 'host', extra));
    }
    const session = create(engine, 'host', { rounds: 4, duration: 10 });
    const room = engine.rooms.get(session.session.code);
    assert.deepEqual({ rounds: room.settings.rounds, duration: room.settings.duration }, { rounds: 4, duration: 10 });
    assert.match(room.code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    assert.throws(() => create(engine, 'overflow'), /busy/);
    for (let index = 1; index < RULES.maxPlayers; index++) engine.handle(`s${index}`, 'room:join', { code: room.code, name: `Player ${index}` });
    assert.throws(() => engine.handle('s7', 'room:join', { code: room.code, name: 'Overflow' }), /6 players/);
    assert.throws(() => engine.handle('host', 'room:bot', {}), /6 players/);
    const small = new GameEngine({ questions, tracks });
    const trio = small.handle('t0', 'room:create', { name: 'Trio', maxPlayers: 3 });
    assert.equal(small.rooms.get(trio.session.code).settings.maxPlayers, 3);
    small.handle('t1', 'room:join', { code: trio.session.code, name: 'One' }); small.handle('t0', 'room:bot', {});
    assert.throws(() => small.handle('t3', 'room:join', { code: trio.session.code, name: 'Four' }), /3 players/);
    for (const maxPlayers of [1, 7, 2.5, '4']) assert.throws(() => small.handle(`bad${maxPlayers}`, 'room:create', { name: 'Bad', maxPlayers }), /between 2 and 6/);
    small.close();
    assert.throws(() => engine.handle('s1', 'room:end', {}), /Only the host/);
    const catalog = engine.catalog();
    assert.equal(catalog.totalQuestions, 36);
    assert.equal(catalog.tracks[0].count, 6);
    for (const question of catalog.questions) for (const key of ['options', 'correctIndex', 'explanation']) assert.equal(key in question, false);
  } finally { engine.close(); }
});

test('capitals are founded in turn, keep apart, and an idle player is placed automatically', () => {
  const { engine, room, socketOf } = table(['host', 'guest']);
  try {
    assert.throws(() => engine.handle('guest', 'room:start', {}), /Only the host/);
    engine.handle('host', 'room:start', {});
    assert.throws(() => engine.handle('late', 'room:join', { code: room.code, name: 'Late' }), /started/);
    assert.equal(room.phase, 'capital');
    assert.equal(room.turn.kind, 'capital');
    assert.equal(room.turn.options.length, MAPS[DEFAULT_MAP].labels.length);
    const first = socketOf(room.turn.playerId);
    const second = first === 'host' ? 'guest' : 'host';
    assert.throws(() => engine.handle(second, 'round:claim', { territoryId: 't5' }), /Wait for your turn/);
    assert.throws(() => engine.handle(first, 'round:claim', { territoryId: 't99' }), /highlighted/);
    engine.handle(first, 'round:claim', { territoryId: 't5' });
    assert.deepEqual({ ...room.territories[5], label: undefined, category: undefined },
      { id: 't5', label: undefined, category: undefined, ownerId: room.order[0], value: RULES.capitalValue, capital: true, towers: RULES.towers });
    assert.equal(room.turn.index, 1);
    for (const blocked of ['t5', ...ids(ADJACENCY[5])]) assert.equal(room.turn.options.includes(blocked), false);
    fire(room, 'turn');
    assert.equal(room.phase, 'expand');
    assert.equal(room.expansionRound, 1);
    const view = engine.view(room, room.order[1]);
    assert.equal(view.stage, 'expansion');
    assert.deepEqual(view.players.map((player) => [player.score, player.towers, player.territories]), [[1000, 3, 1], [1000, 3, 1]]);
    assert.deepEqual(view.eligible.sort(), [...room.order].sort());
    for (const key of ['correctIndex', 'explanation', 'source']) assert.equal(key in view.question, false);
  } finally { engine.close(); }
});

test('expansion ranks the fastest correct answers into a two then one claim queue next to owned land', () => {
  let now = 1000;
  const { engine, room, idOf } = table(['host', 'guest', 'third'], { now: () => now });
  try {
    engine.handle('host', 'room:start', {});
    for (let index = 0; index < 3; index++) fire(room, 'turn');
    assert.equal(room.phase, 'expand');
    const questionId = room.question.id;
    now += 100;
    right(engine, room, 'guest');
    assert.equal(engine.view(room, idOf('host')).me.answered, false);
    assert.equal(engine.view(room, idOf('guest')).me.answered, true);
    assert.deepEqual(engine.view(room, idOf('host')).answered, [idOf('guest')]);
    assert.throws(() => right(engine, room, 'guest'), /locked/);
    now += 100;
    right(engine, room, 'third');
    wrong(engine, room, 'host');
    assert.equal(room.phase, 'claim');
    assert.equal(room.turn, null);
    assert.deepEqual(room.result.ranking, [idOf('guest'), idOf('third')]);
    assert.deepEqual(room.claimQueue, [idOf('guest'), idOf('guest'), idOf('third')]);
    const reveal = engine.view(room, idOf('host')).result;
    assert.match(reveal.options[reveal.correctIndex], /^Correct /);
    assert.throws(() => engine.handle('host', 'round:answer', { questionId, choice: 0 }), /closed/);
    fire(room, 'next');
    assert.equal(room.turn.playerId, idOf('guest'));
    const own = room.territories.filter((territory) => territory.ownerId === idOf('guest')).map((territory) => Number(territory.id.slice(1)));
    for (const option of room.turn.options) {
      assert.equal(room.territories[Number(option.slice(1))].ownerId, null);
      assert.equal(own.some((index) => ADJACENCY[index].includes(Number(option.slice(1)))), true);
    }
    assert.throws(() => engine.handle('third', 'round:claim', { territoryId: room.turn.options[0] }), /Wait for your turn/);
    const taken = room.turn.options[0];
    engine.handle('guest', 'round:claim', { territoryId: taken });
    assert.equal(room.territories[Number(taken.slice(1))].value, RULES.earlyValue);
    assert.equal(room.turn.playerId, idOf('guest'));
    fire(room, 'turn');
    assert.equal(room.turn.playerId, idOf('third'));
    fire(room, 'turn');
    assert.equal(room.turn, null);
    assert.equal(room.result, null, 'the answer card must not come back while the next question loads');
    assert.equal(scoreOf(engine, room, idOf('guest')), 1000 + 2 * RULES.earlyValue);
    assert.equal(scoreOf(engine, room, idOf('third')), 1000 + RULES.earlyValue);
    fire(room, 'next');
    assert.equal(room.phase, 'expand');
    assert.equal(room.expansionRound, 2);
    for (const socketId of ['host', 'guest', 'third']) wrong(engine, room, socketId);
    assert.deepEqual(room.claimQueue, []);
    assert.match(room.feed.at(-1).text, /Nobody answered correctly/);
    fire(room, 'next');
    fire(room, 'next');
    assert.equal(room.expansionRound, 3);
    right(engine, room, 'host');
    fire(room, 'question');
    fire(room, 'next');
    const late = room.turn.options[0];
    engine.handle('host', 'round:claim', { territoryId: late });
    assert.equal(room.territories[Number(late.slice(1))].value, RULES.lateValue);
  } finally { engine.close(); }
});

test('leaving the game window locks that question, counts as no answer and still lets the table move on', () => {
  const { engine, room, idOf } = table(['host', 'guest', 'third']);
  try {
    engine.handle('host', 'room:start', {});
    for (let index = 0; index < 3; index++) fire(room, 'turn');
    assert.equal(room.phase, 'expand');
    const questionId = room.question.id;
    engine.handle('guest', 'round:away', { questionId: 'stale' });
    assert.equal(room.away.size, 0);
    engine.handle('guest', 'round:away', { questionId });
    const guestView = engine.view(room, idOf('guest'));
    assert.deepEqual([guestView.me.away, guestView.me.answered], [true, false]);
    assert.deepEqual(engine.view(room, idOf('host')).away, [idOf('guest')]);
    assert.throws(() => right(engine, room, 'guest'), /left the game window/);
    right(engine, room, 'host');
    engine.handle('host', 'round:away', { questionId });
    assert.equal(room.away.has(idOf('host')), false);
    right(engine, room, 'third');
    assert.equal(room.phase, 'claim');
    assert.deepEqual(room.result.ranking, [idOf('host'), idOf('third')]);
    assert.deepEqual(room.result.away, [idOf('guest')]);
    assert.equal(room.players.find((player) => player.id === idOf('guest')).stats.wrong, 1);
    engine.handle('guest', 'round:away', { questionId });
    assert.equal(engine.view(room, idOf('guest')).me.away, false);
  } finally { engine.close(); }
});

test('a duelist who leaves the window loses the duel and an away pair closes it at once', () => {
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 11, []]], 'guest');
  try {
    engine.handle('host', 'round:claim', { territoryId: 't3' });
    fire(room, 'next');
    assert.equal(room.phase, 'duel');
    engine.handle('guest', 'round:away', { questionId: room.question.id });
    right(engine, room, 'host');
    assert.equal(room.battle.outcome, 'ATTACKER_WIN');
    assert.deepEqual(room.battle.duel.away, [idOf('guest')]);
  } finally { engine.close(); }
});

test('numeric expansion questions redact the key, validate input, and rank distance before time', () => {
  let now = 1000;
  const { engine, room, idOf } = table(['host', 'guest', 'third'], { now: () => now, estimates, extra: { categories: ['seo'] } });
  try {
    engine.handle('host', 'room:start', {});
    for (let index = 0; index < 3; index++) fire(room, 'turn');
    assert.equal(room.question.kind, 'estimate');
    const questionId = room.question.id;
    const view = engine.view(room, idOf('host'));
    for (const key of ['value', 'correctValue', 'correctIndex', 'options', 'explanation', 'source']) assert.equal(key in view.question, false);
    assert.equal(room.deadlineMs, (15_000 + RULES.estimateExtraMs));
    for (const bad of [null, '100', NaN, Infinity, -1, 1001]) assert.throws(() => engine.handle('host', 'round:answer', { questionId, estimate: bad }), /Enter a number/);
    assert.throws(() => engine.handle('host', 'round:answer', { questionId, choice: 0 }), /Enter a number/);
    now += 100;
    engine.handle('host', 'round:answer', { questionId, estimate: 80 });
    assert.equal(engine.view(room, idOf('host')).me.estimate, 80);
    assert.equal(engine.view(room, idOf('guest')).me.estimate, null);
    now += 100;
    engine.handle('guest', 'round:answer', { questionId, estimate: 101 });
    now += 100;
    engine.handle('third', 'round:answer', { questionId, estimate: 99 });
    const result = engine.view(room, idOf('host')).result;
    assert.equal(result.correctValue, 100);
    assert.equal(result.unit, 'URLs');
    assert.deepEqual(result.ranking, [idOf('guest'), idOf('third'), idOf('host')]);
    assert.deepEqual(result.answers.map((answer) => answer.distance), [1, 1, 20]);
    assert.deepEqual(room.claimQueue, [idOf('guest'), idOf('guest'), idOf('third')]);
    assert.equal(room.players.find((player) => player.id === idOf('guest')).stats.closest, 1);
  } finally { engine.close(); }
});

test('war turns attack only bordering rivals, and duels score conquest, defence and double misses', () => {
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 11, []], ['third', 16, [14, 15]]], 'guest');
  try {
    assert.equal(room.phase, 'attack');
    assert.deepEqual({ round: room.war.round, turn: room.war.turn, attackerId: room.war.attackerId }, { round: 1, turn: 1, attackerId: idOf('host') });
    assert.deepEqual(room.turn.options, ids([3, 4, 5, 6]));
    assert.equal(engine.view(room, idOf('host')).stage, 'war');
    assert.throws(() => engine.handle('host', 'round:claim', { territoryId: 't13' }), /highlighted/);
    engine.handle('host', 'round:claim', { territoryId: 't3' });
    assert.equal(room.phase, 'march');
    assert.deepEqual([room.battle.attackerId, room.battle.defenderId, room.battle.targetId, room.battle.isBase], [idOf('host'), idOf('guest'), 't3', false]);
    fire(room, 'next');
    assert.equal(room.phase, 'duel');
    assert.deepEqual([...room.eligible], [idOf('host'), idOf('guest')]);
    const spectator = engine.view(room, idOf('third'));
    assert.equal(spectator.me.eligible, false);
    assert.equal('correctIndex' in spectator.question, false);
    assert.throws(() => right(engine, room, 'third'), /Spectating/);
    right(engine, room, 'host');
    wrong(engine, room, 'guest');
    assert.equal(room.phase, 'result');
    assert.equal(room.battle.outcome, 'ATTACKER_WIN');
    assert.deepEqual(room.battle.pointsDelta, { attacker: RULES.conquestValue, defender: -300 });
    assert.deepEqual([room.territories[3].ownerId, room.territories[3].value], [idOf('host'), RULES.conquestValue]);
    assert.equal(scoreOf(engine, room, idOf('host')), 1000 + 300 + 300 + RULES.conquestValue);
    fire(room, 'next');
    assert.equal(room.turn.playerId, idOf('guest'));
    engine.handle('guest', 'round:claim', { territoryId: 't3' });
    fire(room, 'next');
    wrong(engine, room, 'host');
    wrong(engine, room, 'guest');
    assert.equal(room.battle.outcome, 'BOTH_INCORRECT');
    assert.equal(room.territories[3].ownerId, idOf('host'));
    fire(room, 'next');
    assert.equal(room.turn.playerId, idOf('third'));
    assert.deepEqual(room.turn.options, ids([7, 8, 13, 17]));
    engine.handle('third', 'round:claim', { territoryId: 't13' });
    fire(room, 'next');
    wrong(engine, room, 'third');
    right(engine, room, 'guest');
    assert.equal(room.battle.outcome, 'DEFENDER_WIN');
    assert.deepEqual(room.battle.pointsDelta, { attacker: 0, defender: RULES.defenseBonus });
    assert.equal(room.territories[13].ownerId, idOf('guest'));
    const guestScore = scoreOf(engine, room, idOf('guest'));
    assert.equal(guestScore, room.territories.filter((territory) => territory.ownerId === idOf('guest')).reduce((total, territory) => total + territory.value, 0) + RULES.defenseBonus);
    fire(room, 'next');
    assert.deepEqual({ round: room.war.round, order: room.war.order }, { round: 2, order: [idOf('guest'), idOf('third'), idOf('host')] });
    assert.equal(room.turn.playerId, idOf('guest'));
  } finally { engine.close(); }
});

test('two correct duelists go to a numeric tie-break that the closest guess wins', () => {
  let now = 1000;
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 11, []], ['third', 16, [14, 15]]], 'guest', { now: () => now, estimates });
  try {
    engine.handle('host', 'round:claim', { territoryId: 't4' });
    fire(room, 'next');
    right(engine, room, 'guest');
    right(engine, room, 'host');
    assert.equal(room.phase, 'tiebreak');
    assert.equal(room.question.kind, 'estimate');
    assert.equal(room.battle.duel.answers.every((answer) => answer.correct), true);
    assert.throws(() => engine.handle('third', 'round:answer', { questionId: room.question.id, estimate: 100 }), /Spectating/);
    now += 100;
    engine.handle('guest', 'round:answer', { questionId: room.question.id, estimate: 120 });
    engine.handle('host', 'round:answer', { questionId: room.question.id, estimate: 95 });
    assert.deepEqual([room.battle.outcome, room.battle.wasTiebreaker, room.battle.tiebreak.winnerId], ['ATTACKER_WIN', true, idOf('host')]);
    assert.equal(room.territories[4].ownerId, idOf('host'));
    fire(room, 'next');
    engine.handle('guest', 'round:claim', { territoryId: 't4' });
    fire(room, 'next');
    right(engine, room, 'guest');
    right(engine, room, 'host');
    fire(room, 'question');
    assert.deepEqual([room.battle.outcome, room.battle.tiebreak.winnerId], ['DEFENDER_WIN', idOf('host')]);
  } finally { engine.close(); }
});

test('without numeric questions the faster correct duelist wins the tie', () => {
  let now = 1000;
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 18, []]], 'guest', { now: () => now });
  try {
    engine.handle('host', 'round:claim', { territoryId: 't4' });
    fire(room, 'next');
    now += 50;
    right(engine, room, 'guest');
    now += 50;
    right(engine, room, 'host');
    assert.deepEqual([room.phase, room.battle.outcome, room.battle.wasTiebreaker], ['result', 'DEFENDER_WIN', true]);
    assert.equal(room.territories[4].ownerId, idOf('guest'));
  } finally { engine.close(); }
});

test('a capital loses a tower per won duel, the siege continues, and the third tower eliminates its owner', () => {
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 5, []]], 'guest');
  try {
    const guestLand = room.territories.filter((territory) => territory.ownerId === idOf('guest'));
    const guestValue = guestLand.reduce((total, territory) => total + territory.value, 0);
    engine.handle('host', 'round:claim', { territoryId: 't5' });
    assert.equal(room.battle.isBase, true);
    fire(room, 'next');
    for (let siege = 1; siege <= RULES.towers; siege++) {
      assert.deepEqual([room.phase, room.battle.siege], ['duel', siege]);
      right(engine, room, 'host');
      wrong(engine, room, 'guest');
      assert.equal(room.battle.outcome, 'ATTACKER_WIN');
      assert.equal(room.battle.towersAfter, RULES.towers - siege);
      if (siege < RULES.towers) {
        assert.deepEqual([room.territories[5].ownerId, room.battle.captured], [idOf('guest'), false]);
        fire(room, 'next');
      }
    }
    assert.deepEqual([room.battle.captured, room.battle.eliminated], [true, true]);
    assert.equal(room.battle.takenIds.length, guestLand.length);
    assert.deepEqual(room.battle.pointsDelta, { attacker: guestValue, defender: -guestValue });
    assert.equal(room.territories.every((territory) => territory.ownerId === idOf('host')), true);
    assert.deepEqual([room.territories[5].capital, room.territories[5].towers], [false, 0]);
    const loser = engine.view(room, idOf('guest')).players.find((player) => player.id === idOf('guest'));
    assert.deepEqual([loser.alive, loser.territories, loser.score, loser.towers], [false, 0, 0, 0]);
    fire(room, 'next');
    assert.equal(room.phase, 'finished');
    assert.equal(room.summary.warRounds, 1);
    assert.equal(room.summary.totalQuestions, RULES.towers);
  } finally { engine.close(); }
});

test('a defended capital ends the siege and keeps its damage', () => {
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 5, []]], 'guest');
  try {
    engine.handle('host', 'round:claim', { territoryId: 't5' });
    fire(room, 'next');
    right(engine, room, 'host');
    wrong(engine, room, 'guest');
    fire(room, 'next');
    wrong(engine, room, 'host');
    right(engine, room, 'guest');
    assert.equal(room.battle.outcome, 'DEFENDER_WIN');
    fire(room, 'next');
    assert.deepEqual([room.phase, room.turn.playerId, room.territories[5].towers], ['attack', idOf('guest'), RULES.towers - 1]);
    assert.equal(engine.view(room, idOf('host')).players.find((player) => player.id === idOf('guest')).towers, RULES.towers - 1);
  } finally { engine.close(); }
});

test('an absent duelist cannot stall the table and the host can end the war early', () => {
  const { engine, room, idOf } = war([['host', 0, [1, 2]], ['guest', 18, []]], 'guest');
  try {
    engine.handle('host', 'round:claim', { territoryId: 't5' });
    fire(room, 'next');
    engine.disconnect('guest');
    right(engine, room, 'host');
    assert.deepEqual([room.phase, room.battle.outcome], ['result', 'ATTACKER_WIN']);
    fire(room, 'next');
    assert.equal(room.turn.playerId, idOf('guest'));
    assert.equal(room.timers.get('turn').delay, 1_500);
    engine.handle('host', 'room:end', {});
    assert.equal(room.phase, 'finished');
    assert.throws(() => engine.handle('host', 'room:end', {}), /no active match/);
  } finally { engine.close(); }
});

test('a full practice match with bots reaches the podium and the rematch resets the map', async () => {
  const engine = new GameEngine({ questions, tracks, estimates, timeScale: 0.002 });
  try {
    const host = create(engine, 'host', { practice: true, rounds: 4, duration: 10 });
    const room = engine.rooms.get(host.session.code);
    const asked = []; const ask = engine.ask.bind(engine);
    engine.ask = (target, phase, question, eligible) => { asked.push(question); return ask(target, phase, question, eligible); };
    assert.deepEqual(room.players.filter((player) => player.bot).map((player) => player.name), ['Atlas Bot', 'Pixel Bot']);
    assert.equal(room.phase, 'lobby');
    engine.handle('host', 'room:start', {});
    const phases = new Set();
    for (let waited = 0; room.phase !== 'finished' && waited < 20_000; waited += 5) {
      phases.add(room.phase);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(room.phase, 'finished');
    for (const phase of ['capital', 'expand', 'claim']) assert.equal(phases.has(phase), true, `saw ${phase}`);
    const choiceIds = asked.filter((question) => question.kind === 'choice').slice(0, questions.length).map((question) => question.id);
    const estimateIds = asked.filter((question) => question.kind === 'estimate').map((question) => question.id);
    assert.equal(new Set(choiceIds).size, choiceIds.length, 'no question repeats in one match');
    assert.equal(new Set(estimateIds).size, estimateIds.length, 'no number question repeats in one match');
    assert.equal(room.territories.every((territory) => territory.ownerId), true);
    const view = engine.view(room, host.session.playerId);
    assert.equal(view.summary.totalQuestions > 0, true);
    assert.equal(view.summary.warRounds <= 4, true);
    for (const player of room.players) {
      const land = room.territories.filter((territory) => territory.ownerId === player.id).reduce((total, territory) => total + territory.value, 0);
      assert.equal(view.players.find((entry) => entry.id === player.id).score, land + player.bonus);
    }
    engine.handle('host', 'room:rematch', {});
    assert.equal(room.phase, 'capital');
    assert.equal(room.territories.every((territory) => !territory.ownerId), true);
    assert.equal(engine.view(room, host.session.playerId).players.every((player) => player.score === 0 && player.alive), true);
    engine.handle('host', 'room:end', {});
  } finally { engine.close(); }
});

test('every map file is a connected board with symmetric borders that the engine can load', async () => {
  for (const mapId of MAP_IDS) {
    const file = JSON.parse(await readFile(new URL(`../public/maps/${mapId}.json`, import.meta.url), 'utf8'));
    assert.equal(file.id, mapId);
    assert.deepEqual(file.regions.map((region) => region.id), file.regions.map((_, index) => `t${index}`));
    assert.equal(file.regions.length >= 18 && file.regions.length <= 30, true, `${mapId} region count`);
    assert.equal(file.regions.every((region) => region.path.startsWith('M') && region.center.length === 2 && region.label), true);
    file.adjacency.forEach((list, index) => {
      assert.equal(list.length > 0, true, `${mapId} t${index} has a neighbour`);
      for (const other of list) assert.equal(file.adjacency[other].includes(index), true, `${mapId} t${index} and t${other} agree`);
    });
    for (const [a, b] of file.links) assert.equal(file.adjacency[a].includes(b), true, `${mapId} sea link ${a}-${b}`);
    const seen = new Set([0]); const queue = [0];
    while (queue.length) for (const next of file.adjacency[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    assert.equal(seen.size, file.regions.length, `${mapId} is connected`);
    assert.deepEqual(MAPS[mapId].adjacency, file.adjacency);
  }
});

test('the host picks the map, invalid maps are rejected and a rematch keeps the board', () => {
  const engine = new GameEngine({ questions, tracks });
  manual(engine);
  try {
    assert.throws(() => create(engine, 'nowhere', { map: 'atlantis' }), /available maps/);
    assert.throws(() => create(engine, 'nowhere', { map: null }), /available maps/);
    const { session } = create(engine, 'host', { map: 'asia' });
    const room = engine.rooms.get(session.code);
    const view = engine.view(room, session.playerId);
    assert.equal(view.settings.map, 'asia');
    assert.deepEqual(view.territories.map((territory) => territory.label), MAPS.asia.labels);
    assert.equal(engine.rooms.get(create(engine, 'other').session.code).settings.map, DEFAULT_MAP);
    assert.deepEqual(engine.catalog().maps.map((map) => map.id), MAP_IDS);
  } finally { engine.close(); }
});

test('decks balance tracks and never repeat a question in one match', () => {
  const { engine, room } = table(['host', 'guest'], { estimates });
  try {
    engine.handle('host', 'room:start', {});
    assert.equal(new Set(room.deck.map((question) => question.id)).size, 36);
    assert.equal(new Set(room.deck.slice(0, 6).map((question) => question.category)).size, 6);
    const drawn = Array.from({ length: 36 }, () => engine.drawChoice(room).id);
    assert.equal(new Set(drawn).size, 36);
    // Only once every question was asked may the bank start over.
    assert.equal(drawn.includes(engine.drawChoice(room).id), true);
    const numbers = Array.from({ length: estimates.length }, () => engine.drawEstimate(room).id);
    assert.equal(new Set(numbers).size, estimates.length);
    assert.equal(engine.drawEstimate(room), null, 'number questions do not recycle; a tie then goes to the faster duelist');
    engine.handle('host', 'room:end', {});
    engine.handle('host', 'room:rematch', {});
    assert.equal(room.asked.size, 0);
    assert.equal(room.estimateDeck.length, estimates.length);
  } finally { engine.close(); }
});

test('look-alike prompts are never asked back to back', () => {
  const alike = (index, thing) => ({ ...estimate(index), id: `alike-${index}`, prompt: `What is the maximum number of characters in a YouTube video ${thing}?` });
  const pool = [alike(1, 'title'), alike(2, 'description'), estimate(3), estimate(4), estimate(5)];
  const { engine, room } = table(['host', 'guest'], { estimates: pool, extra: { categories: ['seo'] } });
  try {
    for (let run = 0; run < 200; run++) {
      room.asked = new Set(); room.recent = [];
      const deck = engine.makeDeck(room, pool).map((question) => question.id);
      assert.equal(deck.length, pool.length);
      assert.notEqual(Math.abs(deck.indexOf('alike-1') - deck.indexOf('alike-2')), 1, deck.join(' '));
    }
  } finally { engine.close(); }
});

test('expiry deletes abandoned rooms and host transfers without trusting a forged socket', () => {
  let now = 1000;
  const engine = new GameEngine({ questions, tracks, now: () => now, roomTtlMs: 100, emptyRoomTtlMs: 20 });
  try {
    const host = create(engine, 'host');
    const guest = engine.handle('guest', 'room:join', { code: host.session.code, name: 'Guest' });
    assert.throws(() => engine.handle('forged', 'room:end', {}), /resume/);
    engine.handle('host', 'room:leave', {});
    const room = engine.rooms.get(host.session.code);
    assert.equal(room.hostId, guest.session.playerId);
    engine.disconnect('guest');
    now += 21;
    engine.cleanup();
    assert.equal(engine.rooms.size, 0);
    assert.throws(() => engine.handle('again', 'session:resume', host.session), /expired/);
  } finally { engine.close(); }
});

test('a new lobby arrival receives host authority when the previous host left an offline guest', () => {
  const engine = new GameEngine({ questions, tracks });
  try {
    const host = create(engine, 'host');
    engine.handle('guest', 'room:join', { code: host.session.code, name: 'Guest' });
    engine.disconnect('guest');
    engine.handle('host', 'room:leave', {});
    const newcomer = engine.handle('new', 'room:join', { code: host.session.code, name: 'New host' });
    const room = engine.rooms.get(host.session.code);
    assert.equal(room.hostId, newcomer.session.playerId);
    engine.handle('new', 'room:bot', {});
    assert.equal(room.players.some((player) => player.bot), true);
    const practice = create(engine, 'solo', { name: 'atlas bot', practice: true });
    assert.deepEqual(engine.rooms.get(practice.session.code).players.map((player) => player.name), ['atlas bot', 'Pixel Bot', 'Query Bot']);
    assert.throws(() => engine.handle('bad', 'session:resume', { ...newcomer.session, token: 'é'.repeat(64) }), /could not be resumed/);
  } finally { engine.close(); }
});

test('kicked and departed sessions cannot resume', () => {
  const engine = new GameEngine({ questions, tracks });
  try {
    const host = create(engine, 'host');
    const removed = engine.handle('removed', 'room:join', { code: host.session.code, name: 'Removed' });
    engine.handle('host', 'room:kick', { playerId: removed.session.playerId });
    assert.throws(() => engine.handle('removed2', 'session:resume', removed.session), /could not be resumed/);
    const guest = engine.handle('guest', 'room:join', { code: host.session.code, name: 'Guest' });
    engine.handle('host', 'room:start', {});
    assert.throws(() => engine.handle('host', 'room:kick', { playerId: guest.session.playerId }), /lobby/);
    engine.handle('guest', 'room:leave', {});
    assert.throws(() => engine.handle('guest-returned', 'session:resume', guest.session), /could not be resumed/);
  } finally { engine.close(); }
});

test('numeric estimation bank rejects non-finite bounds, out-of-range keys, duplicate IDs and unsupported categories', () => {
  for (const extra of [{ value: Infinity }, { min: 1001 }, { max: 10 }, { category: 'unknown' }, { id: questions[0].id }]) {
    assert.throws(() => new GameEngine({ questions, estimates: [{ ...estimates[0], ...extra }], tracks }));
  }
});
