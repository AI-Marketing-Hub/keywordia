import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const questions = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'));
const estimates = JSON.parse(await readFile(new URL('../data/estimates.json', import.meta.url), 'utf8'));
const tracks = JSON.parse(await readFile(new URL('../data/tracks.json', import.meta.url), 'utf8'));
const sourceMap = await readFile(new URL('../docs/content-sources.md', import.meta.url), 'utf8');
const expectedIds = ['seo', 'ads', 'content', 'local', 'ai', 'clients'];
assert.deepEqual(tracks.map((track) => track.id), expectedIds);
assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, 'Question IDs must be unique.');
assert.equal(new Set(questions.map((question) => question.prompt.toLowerCase().trim())).size, questions.length, 'Question prompts must be unique.');
const counts = Object.fromEntries(expectedIds.map((id) => [id, 0]));
for (const track of tracks) {
  for (const field of ['id', 'name', 'short', 'description', 'color', 'icon', 'repoUrl']) assert.equal(typeof track[field], 'string', `${track.id}: ${field} required.`);
  assert.match(track.color, /^#[a-f0-9]{6}$/i);
  assert.equal(new URL(track.repoUrl).protocol, 'https:');
}
for (const question of questions) {
  assert.ok(expectedIds.includes(question.category), `${question.id}: invalid track.`);
  counts[question.category]++;
  for (const field of ['id', 'prompt', 'explanation']) assert.ok(typeof question[field] === 'string' && question[field].trim(), `${question.id}: ${field} required.`);
  assert.ok(['Starter', 'Applied', 'Expert'].includes(question.difficulty), `${question.id}: invalid difficulty.`);
  assert.equal(question.options.length, 4, `${question.id}: four options required.`);
  assert.equal(new Set(question.options.map((option) => option.toLowerCase().trim())).size, 4, `${question.id}: options must be distinct.`);
  assert.ok(question.options.every((option) => typeof option === 'string' && option.trim()), `${question.id}: empty choice.`);
  assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4, `${question.id}: invalid answer key.`);
  assert.ok(question.source?.title?.trim(), `${question.id}: source title required.`);
  assert.equal(new URL(question.source.url).protocol, 'https:');
  assert.ok(sourceMap.includes(question.source.url), `${question.id}: source absent from provenance map.`);
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(question)), `${question.id}: replace em or en dash.`);
}
for (const [category, count] of Object.entries(counts)) assert.ok(count >= 6, `${category}: at least six questions required.`);
assert.equal(new Set([...questions, ...estimates].map((question) => question.id)).size, questions.length + estimates.length, 'All question IDs must be unique.');
assert.equal(new Set(estimates.map((question) => question.prompt.toLowerCase().trim())).size, estimates.length, 'Estimate prompts must be unique.');
const estimateCounts = Object.fromEntries(expectedIds.map((id) => [id, 0]));
for (const question of estimates) {
  assert.ok(expectedIds.includes(question.category), `${question.id}: invalid estimate track.`);
  estimateCounts[question.category]++;
  for (const field of ['id', 'prompt', 'unit', 'explanation']) assert.ok(typeof question[field] === 'string' && question[field].trim(), `${question.id}: ${field} required.`);
  assert.ok([question.value, question.min, question.max].every(Number.isFinite), `${question.id}: finite bounds and value required.`);
  assert.ok(question.min < question.max && question.value >= question.min && question.value <= question.max, `${question.id}: answer must lie within bounds.`);
  assert.ok(Math.abs(question.min) <= 1e9 && Math.abs(question.max) <= 1e9, `${question.id}: numeric bounds are too large.`);
  if (question.calculation) {
    const { operation, a, b, factor } = question.calculation;
    assert.ok(['multiply', 'divide'].includes(operation) && [a, b, factor].every(Number.isFinite), `${question.id}: reproducible arithmetic required.`);
    assert.ok(operation !== 'divide' || b !== 0, `${question.id}: cannot divide by zero.`);
    const calculated = (operation === 'multiply' ? a * b : a / b) * factor;
    assert.ok(Math.abs(calculated - question.value) < 1e-9, `${question.id}: arithmetic does not match the answer.`);
  }
  assert.ok(question.source?.title?.trim(), `${question.id}: source title required.`);
  assert.equal(new URL(question.source.url).protocol, 'https:');
  assert.ok(sourceMap.includes(question.source.url), `${question.id}: source absent from provenance map.`);
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(question)), `${question.id}: replace em or en dash.`);
}
for (const [category, count] of Object.entries(estimateCounts)) assert.ok(count >= 2, `${category}: at least two closest guess questions required.`);
console.log(JSON.stringify({ result: 'PASS', questions: questions.length, estimates: estimates.length, tracks: tracks.length, counts, estimateCounts, uniqueSources: new Set([...questions, ...estimates].map((question) => question.source.url)).size }, null, 2));
