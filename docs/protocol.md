# Keywordia protocol

Implementation references are [the game engine](../src/game.js), [the HTTP and Socket.IO server](../src/server.js), and [package scripts](../package.json). Room state, sessions, scores, and timers exist in process memory. Restarting discards them. There are no accounts, persistent rankings, or shared state between processes.

## Runtime and HTTP

Use Node.js 22 or newer. `npm start` runs the server; `npm run dev` enables watch mode. `HOST` defaults to `127.0.0.1`; `PORT` to `4317`. Ports accept integers 0 through 65535; 0 requests an ephemeral port. No external providers are required.

`await createApp(options)` returns `{server, io, engine, listen, close}`. `listen(port, host)` uses those defaults. Optional `questions`, `estimates`, `tracks`, and `publicDir` support fixtures. Startup reads three JSON files under [data](../data/). Custom `questions` default to no estimates unless supplied. `GameEngine` accepts internal clock, timer-scale, capacity, expiry, and host-grace overrides, not HTTP settings.

| Route | Response |
| --- | --- |
| `GET /api/health` | `{ok:true, version:'0.1.0'}`. No session or room information. |
| `GET /api/catalog` | `{tracks, maps, totalQuestions, questions, totalEstimates, estimates}`, detailed below. |
| `GET /` | `public/index.html`. |
| `GET /<public asset>` | An allowed file within `public/`; missing paths return 404. |
| `/socket.io/` | Socket.IO transport routes and its browser client bundle, managed by Socket.IO. |

Application routes accept `HEAD` without a body. Other methods receive 405 with `Allow: GET, HEAD`; Socket.IO handles its transport methods. Malformed paths receive 400. Application responses use `Cache-Control: no-store`. There is no SPA fallback.

`maps` lists `{id, name, blurb, regions}` for each board. The browser draws a board from `GET /maps/<id>.json`.

Catalog tracks retain their configured metadata plus `count`, which counts multiple-choice questions only. `questions` contains `{id, category, difficulty, prompt, source}`. `estimates` contains `{id, category, prompt, unit, min, max, source}`. Source objects are `{title, url}`. Catalog responses omit options, answer keys, explanations, and arithmetic descriptors. The shipped banks contain 300 multiple-choice questions and 36 estimates.

## Socket requests

Clients emit an event with a plain payload object and an acknowledgement callback. Use `{}` for events without fields. Successful acknowledgements are `{ok:true}`. Creation, joining, and resume additionally return `session:{code, playerId, token}`. Failures return `{ok:false, error:string}`. The token is a private bearer credential, never part of public state.

Unknown fields are rejected. Leave current membership before creating or joining another room.

| Event | Payload | Requirements |
| --- | --- | --- |
| `room:create` | `{name, categories?, rounds?, duration?, practice?, map?}` | Unattached socket; available room capacity. |
| `room:join` | `{code, name}` | Unattached socket; existing lobby; fewer than six seats taken. |
| `session:resume` | `{code, playerId, token}` | Valid existing human session. Replaces its previous socket. |
| `room:leave` | `{}` | Current player; revokes their resume token. |
| `room:start` | `{}` | Host, lobby, at least two connected players including bots. |
| `room:bot` | `{}` | Host, lobby, fewer than six seats taken. |
| `room:kick` | `{playerId}` | Host, lobby; target cannot be the host. |
| `round:answer` | `{questionId, choice}` or `{questionId, estimate}` | Player in `eligible`, question phase, before deadline, no prior answer. |
| `round:claim` | `{territoryId}` | `turn.playerId`, before `turn.deadline`, `territoryId` in `turn.options`. Used for capitals, expansion claims and attack targets. |
| `room:rematch` | `{}` | Host, finished phase, at least two connected players. |
| `room:end` | `{}` | Host, any active phase. |

Creation defaults are `categories:[]`, `rounds:6`, `duration:15`, `practice:false` and `map:'romania'`. `map` must be `romania|europe|usa|world`. `rounds` is the number of war rounds and must be `4|6|8`; `duration` is seconds per question and must be `10|15|20`. Categories are unique IDs from `seo, ads, content, local, ai, clients`; an empty array selects all. Explicit null values are invalid. The selected multiple-choice pool must contain at least six questions. Practice rooms add Atlas Bot and Pixel Bot; the host still starts explicitly.

Names are normalized, nonempty, case-insensitively unique within the room, and limited to 24 JavaScript characters. Join codes must be uppercase six-character strings. Generated codes exclude `I`, `O`, `0`, and `1`.

Choice answers require an integer `choice` from 0 through 3. Numeric answers require a finite number within the question's inclusive bounds. Strings, null, and mixed answer types are rejected. Answer acceptance locks the submission; clients cannot submit scores or correctness. `questionId` must match the current question ID.

## Server emissions and personalized state

`state` sends a complete personalized snapshot to each connected human. `session:ended` sends `{reason:string}` before disconnecting a replaced, removed, or expired socket. State may arrive before its acknowledgement.

```ts
type Phase = 'lobby' | 'capital' | 'expand' | 'claim' | 'attack' | 'march' | 'duel' | 'tiebreak' | 'result' | 'finished';
type State = {
  code: string; practice: boolean;
  settings: { categories: string[]; rounds: number; duration: number; map: string };
  phase: Phase; stage: 'lobby' | 'capitals' | 'expansion' | 'war' | 'finished';
  hostId: string; order: string[];
  players: Array<{
    id: string; name: string; color: string; bot: boolean; connected: boolean; alive: boolean;
    score: number; territories: number; capitalId: string | null; towers: number;
    stats: { answered; correct; wrong; closest; maxStreak; accuracy; avgTimeMs };
  }>;
  territories: Array<{ id: string; label: string; category: string; ownerId: string | null; value: number; capital: boolean; towers: number }>;
  question: ChoiceQuestion | EstimateQuestion | null;   // only in expand, duel and tiebreak
  deadline: number | null; deadlineMs: number | null;
  eligible: string[]; answered: string[];              // who may answer, and who already did
  turn: { kind: 'capital' | 'claim' | 'attack'; playerId: string; options: string[]; deadline: number; index?: number } | null;
  claimQueue: string[]; expansionRound: number;
  war: { round: number; totalRounds: number; turn: number; order: string[]; attackerId: string | null } | null;
  battle: Battle | null; result: ExpansionResult | null;
  summary: { durationMs: number; totalQuestions: number; warRounds: number; fastest: { playerId: string; elapsed: number } | null } | null;
  me: { id: string; host: boolean; eligible: boolean; answered: boolean; choice: number | null; estimate: number | null };
  feed: Array<{ id: string; text: string }>;
};
```

Deadlines are server Unix milliseconds; `deadlineMs` is the length of the current window. Feed retains 12 entries. Socket IDs, tokens, other players' submissions and every answer key are hidden while a question is open. `answered` lists who has locked in, without their answers.

| Shape | Fields |
| --- | --- |
| `ChoiceQuestion` | `{id, kind:'choice', category, difficulty, prompt, options:string[4]}`; difficulty: Starter, Applied, or Expert. |
| `EstimateQuestion` | `{id, kind:'estimate', category, prompt, unit, min, max}` |
| Revealed question | `{kind, prompt, category, explanation, source, answers}` plus `options, correctIndex` (choice) or `correctValue, unit` (estimate). Choice answers: `{playerId, choice, correct, elapsed}`. Estimate answers: `{playerId, estimate, distance, exact, elapsed}`. |
| `ExpansionResult` | Revealed question plus `ranking:string[]` and `expansionRound`. |
| `Battle` | `{attackerId, defenderId, targetId, isBase, siege, towersBefore, towersAfter, duel, tiebreak, outcome, wasTiebreaker, pointsDelta, captured, eliminated, takenIds?}`. `duel` and `tiebreak` are revealed questions (the tie-break adds `winnerId`) and stay null until resolved. `outcome` is `ATTACKER_WIN`, `DEFENDER_WIN` or `BOTH_INCORRECT`. |

## Match lifecycle and scoring

The host picks the board when creating the room: Romania (22 regions), Europe (23), United States (22) or World (24). Regions are `t0` upward. Borders and sea routes come from the same `public/maps/<id>.json` file the browser draws, loaded by `src/maps.js`; a test checks every map is connected and its borders are symmetric. Rematch keeps the map. Map outlines are built from Natural Earth (public domain) by `node scripts/build-maps.mjs <folder with the Natural Earth GeoJSON>`; the source files are not stored in the repository. Score is always computed: the value of every region a player owns plus their defence bonus.

| Phase | What happens |
| --- | --- |
| `capital` | Players take turns in a shuffled order. Each picks a free region, preferring ones that do not border another capital. A capital has 3 towers and is worth 1,000. |
| `expand` | Everyone alive answers one question. Estimates are used while more than two remain in the numeric deck, so the tie-break always has some; otherwise multiple choice. Estimate rounds get 5 extra seconds. |
| `claim` | Ranking is fastest correct (choice) or closest, then fastest (estimate). The claim queue is first, first, second. Each pick must border the picker's land, unless none does. Regions claimed in expansion rounds 1 and 2 are worth 200, later ones 300. An empty ranking skips the claims. After 12 expansion rounds any leftovers go to a bordering player. |
| `attack` | When the map is full, war starts for `settings.rounds` rounds. Each round the alive order rotates by one. The attacker picks a rival region that borders their land. A player with no rival border is skipped. |
| `march`, `duel` | Only the attacker and defender answer a multiple-choice question; everyone else spectates. |
| `tiebreak` | If both are right, a numeric question decides: closest, then fastest. With no numeric pool, the faster duel answer wins. If nobody answers the tie-break, the defender wins. |
| `result` | Attacker win on a normal region: it changes owner and becomes worth 400. Defender win: the defender gains 100 bonus. Both wrong: nothing changes. Attacker win on a capital removes one tower and the siege continues with another duel; the third tower hands every region of that player to the attacker and eliminates them. A defended capital ends the siege but keeps its damage. |
| `finished` | After the last war round, when one player is left, or when the host ends the match. The podium ranks by score. Rematch resets the map and starts again with the same roster and settings. |

| Timer | Behavior |
| --- | --- |
| Capital pick | 15 seconds. |
| Claim pick, attack pick | 10 seconds each. |
| Question | Configured duration (plus 5 seconds for estimates); closes early once every connected eligible player has answered. |
| Interstitials | Ranking 2.5 seconds, march 1.8 seconds, duel result 4.5 seconds. |
| Missed picks | An expired turn picks a random highlighted region. Offline players are auto-picked after 1.5 seconds; bots pick after 0.9 to 1.8 seconds and press weakened fortresses first. |
| Bot answers | 20% to 75% of the question window, with per-bot accuracy and numeric error. |
| Host grace | 10 seconds after disconnection, then transfer to a connected human. Explicit departure transfers immediately. |
| Expiry | Six hours absolute lifetime; also 30 minutes without connected humans since latest recorded activity/disconnection. Cleanup runs every minute and before requests. |

Disconnected players keep resumable seats and never block the table. Explicit departure removes lobby seats; later departures keep the seat offline but revoke resume capability. Joining is lobby-only.

## Limits and hosting boundary

Defaults allow 200 rooms and 6 seats per room, including bots and offline players. Requests permit at most 4096 serialized characters; Socket.IO limits transport payloads to 8192 bytes. Throttling allows 45 handled requests per socket per rolling ten seconds. Reconnection resets that bucket; there is no per-IP throttle or overall connection cap.

HTTP routes and the Socket.IO handshake reject a supplied foreign Origin by exact scheme/host comparison; requests without Origin are accepted. Forwarded headers are ignored unless `TRUST_PROXY=1`, which lets a TLS-terminating proxy pass `X-Forwarded-Proto` and `X-Forwarded-Host` and marks the access cookie `Secure`. There is no built-in TLS or multi-process coordination.

Setting `ACCESS_PASSWORD` puts every page, the catalog and the socket handshake behind a password form (`POST /login`). The right password sets an HttpOnly `kw_access` cookie for 30 days; repeated wrong guesses are throttled. `/api/health` and the login stylesheet stay open.

Static serving checks extension, public-directory boundary, resolved path, regular-file type, and a 10MiB cap. Traversal, dot paths, backslashes, and escaping symlinks are rejected. Headers set `nosniff`, frame denial, same-origin referrer policy, and CSP. Scripts/connections/fonts are same-origin; inline style attributes and data images are allowed. Keep answer banks outside `public/`.

See [engine tests](../tests/game.test.js) and [HTTP/socket tests](../tests/server.test.js) for coverage. `npm run check` validates syntax and content; startup does not run the complete validator.
