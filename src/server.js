import http from 'node:http';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { GameEngine } from './game.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '0.1.0';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const EVENTS = ['room:create', 'room:join', 'session:resume', 'room:leave', 'room:start', 'room:bot', 'room:kick', 'round:answer', 'round:away', 'round:claim', 'room:rematch', 'room:end'];
const HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
const ACCESS_COOKIE = 'kw_access';
// Files the password page itself needs. They are not secret.
const OPEN_PATHS = new Set(['/api/health', '/login.css', '/assets/aimh-logo.png', '/fonts/inter.ttf', '/fonts/manrope.ttf']);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const digest = (value) => createHash('sha256').update(String(value)).digest();
const loginPage = (next, message = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Keywordia</title><link rel="stylesheet" href="/login.css"></head>
<body><main class="gate"><img src="/assets/aimh-logo.png" alt="" width="56" height="56"><h1>Keywordia</h1><p>The AI Marketing Hub community game. Enter the password to play.</p>
<form method="post" action="/login"><input type="hidden" name="next" value="${escapeHtml(next)}"><label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="200">
${message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : ''}<button type="submit">Enter</button></form></main></body></html>`;

export async function createApp({ questions, estimates, tracks, publicDir = resolve(ROOT, 'public'), accessPassword = '', trustProxy = false, ...engineOptions } = {}) {
  // Behind a TLS-terminating proxy (Railway), the original scheme and host arrive in forwarded headers.
  const forwarded = (request, name) => (trustProxy ? String(request.headers[name] || '').split(',')[0].trim() : '');
  const isHttps = (request) => (forwarded(request, 'x-forwarded-proto') || (request.socket.encrypted ? 'https' : 'http')) === 'https';
  const sameOrigin = (request) => {
    if (!request.headers.origin) return true;
    try {
      const origin = new URL(request.headers.origin);
      const host = forwarded(request, 'x-forwarded-host') || String(request.headers.host);
      return origin.protocol === (isHttps(request) ? 'https:' : 'http:') && origin.host.toLowerCase() === host.toLowerCase();
    } catch { return false; }
  };
  const accessToken = accessPassword ? createHmac('sha256', accessPassword).update('keywordia-access-v1').digest('base64url') : '';
  const authorized = (request) => {
    if (!accessPassword) return true;
    const cookie = String(request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${ACCESS_COOKIE}=`));
    return Boolean(cookie) && timingSafeEqual(digest(cookie.slice(ACCESS_COOKIE.length + 1)), digest(accessToken));
  };
  // Failed password attempts: per client and in total, so guessing stays slow.
  const failures = new Map();
  let allFailures = [];
  const clientKey = (request) => forwarded(request, 'x-real-ip') || forwarded(request, 'x-forwarded-for') || request.socket.remoteAddress || 'unknown';
  const recent = (list, now) => list.filter((time) => time > now - 10 * 60_000);
  const tooManyAttempts = (request, now) => recent(failures.get(clientKey(request)) || [], now).length >= 8 || allFailures.filter((time) => time > now - 60_000).length >= 30;
  const recordFailure = (request, now) => {
    if (failures.size > 5000) failures.clear();
    failures.set(clientKey(request), [...recent(failures.get(clientKey(request)) || [], now), now]);
    allFailures = [...allFailures.filter((time) => time > now - 60_000), now];
  };
  const safeNext = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && value.length <= 200 ? value : '/');
  const readForm = (request) => new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; if (body.length > 2048) { rejectBody(new Error('Too large.')); request.destroy(); } });
    request.on('end', () => resolveBody(new URLSearchParams(body)));
    request.on('error', rejectBody);
  });
  const questionData = questions ?? JSON.parse(await readFile(resolve(ROOT, 'data/questions.json'), 'utf8'));
  const trackData = tracks ?? JSON.parse(await readFile(resolve(ROOT, 'data/tracks.json'), 'utf8'));
  // Explicit custom question fixtures keep their original choice-only behavior unless estimates are supplied.
  const estimateData = estimates ?? (questions === undefined ? JSON.parse(await readFile(resolve(ROOT, 'data/estimates.json'), 'utf8')) : []);
  let engine;
  const staticRoot = resolve(publicDir);
  const server = http.createServer(async (request, response) => {
    const send = (status, content, type = 'application/json; charset=utf-8') => {
      response.writeHead(status, { ...HEADERS, 'Content-Type': type, 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : content);
    };
    if (!sameOrigin(request)) { send(403, JSON.stringify({ error: 'Origin is not allowed.' })); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { send(400, JSON.stringify({ error: 'Invalid path.' })); return; }
    if (accessPassword && pathname === '/login' && request.method === 'POST') {
      const now = Date.now();
      if (tooManyAttempts(request, now)) { send(429, loginPage('/', 'Too many tries. Wait a few minutes and try again.'), TYPES['.html']); return; }
      let form;
      try { form = await readForm(request); } catch { send(400, loginPage('/', 'That did not work. Try again.'), TYPES['.html']); return; }
      const next = safeNext(form.get('next'));
      if (!timingSafeEqual(digest(form.get('password') || ''), digest(accessPassword))) {
        recordFailure(request, now);
        send(401, loginPage(next, 'Wrong password. Ask the host for the right one.'), TYPES['.html']); return;
      }
      response.writeHead(303, { ...HEADERS, Location: next, 'Cache-Control': 'no-store',
        'Set-Cookie': `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isHttps(request) ? '; Secure' : ''}` });
      response.end(); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); send(405, JSON.stringify({ error: 'Method not allowed.' })); return; }
    if (!authorized(request) && !OPEN_PATHS.has(pathname)) {
      if (pathname === '/' || pathname === '/index.html') send(401, loginPage(safeNext(request.url)), TYPES['.html']);
      else send(401, JSON.stringify({ error: 'Password required.' }));
      return;
    }
    if (pathname === '/api/health') { send(200, JSON.stringify({ ok: true, version: VERSION })); return; }
    if (pathname === '/api/catalog') { send(200, JSON.stringify(engine.catalog())); return; }
    if (pathname.startsWith('/api/')) { send(404, JSON.stringify({ error: 'Not found.' })); return; }
    if (pathname === '/') pathname = '/index.html';
    // Serve public assets only. No dotfiles, source files, or arbitrary extensions.
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some((part) => part.startsWith('.') || part === '..') || !TYPES[extname(pathname)]) {
      send(404, JSON.stringify({ error: 'Not found.' })); return;
    }
    const target = resolve(staticRoot, `.${pathname}`);
    if (!target.startsWith(staticRoot + sep)) { send(404, JSON.stringify({ error: 'Not found.' })); return; }
    try {
      const resolved = await realpath(target);
      if (!resolved.startsWith(staticRoot + sep)) { send(404, JSON.stringify({ error: 'Not found.' })); return; }
      const info = await stat(resolved);
      if (!info.isFile() || info.size > 10 * 1024 * 1024) { send(404, JSON.stringify({ error: 'Not found.' })); return; }
      const content = await readFile(resolved);
      send(200, content, TYPES[extname(target)]);
    } catch { send(404, JSON.stringify({ error: 'Not found.' })); }
  });
  const io = new Server(server, {
    maxHttpBufferSize: 8192, serveClient: true, allowEIO3: false,
    allowRequest: (request, callback) => callback(null, sameOrigin(request) && authorized(request)),
  });
  io.engine.on('headers', (headers) => { Object.assign(headers, HEADERS); });
  engine = new GameEngine({ ...engineOptions, questions: questionData, estimates: estimateData, tracks: trackData,
    emitState: (socketId, state) => io.to(socketId).emit('state', state),
    revokeSocket: (socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) { socket.emit('session:ended', { reason: 'Your session was replaced, removed, or expired.' }); socket.disconnect(true); }
    },
  });
  io.on('connection', (socket) => {
    const timestamps = [];
    for (const event of EVENTS) socket.on(event, (payload, acknowledgement) => {
      const ack = typeof acknowledgement === 'function' ? acknowledgement : () => {};
      const now = Date.now();
      while (timestamps.length && timestamps[0] <= now - 10_000) timestamps.shift();
      if (timestamps.length >= 45) { ack({ ok: false, error: 'Too many requests. Wait a moment.' }); return; }
      timestamps.push(now);
      try { ack(engine.handle(socket.id, event, payload)); }
      catch (error) { ack({ ok: false, error: error instanceof Error ? error.message : 'Request could not be completed.' }); }
    });
    socket.on('disconnect', () => engine.disconnect(socket.id));
  });
  return {
    server, io, engine,
    listen(port = 4317, host = '127.0.0.1') {
      return new Promise((resolveListen, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => { server.off('error', reject); resolveListen(server.address()); });
      });
    },
    async close() {
      engine.close();
      await new Promise((resolveClose) => io.close(resolveClose));
      if (server.listening) await new Promise((resolveClose) => server.close(resolveClose));
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT === undefined ? 4317 : Number(process.env.PORT);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be a valid TCP port.');
  const app = await createApp({ accessPassword: process.env.ACCESS_PASSWORD || '', trustProxy: process.env.TRUST_PROXY === '1' });
  const address = await app.listen(port, host);
  console.log(`Keywordia is ready at http://${host}:${address.port}${process.env.ACCESS_PASSWORD ? ' (password required)' : ''}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
