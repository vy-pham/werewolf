# 03 — Technical Design

> Ghi lại các quyết định kỹ thuật cho backend, web, mobile, voice và AI phụ đề, cùng lý do chọn.
> Phiên bản thư viện: dùng **bản stable mới nhất tại thời điểm scaffold** và ghi cố định trong lockfile. Không ghi số version vào tài liệu này để tránh lỗi thời.

## 1. Tổng quan kiến trúc

```
   Vercel                         EAS (App Store / Play Store)
 ┌──────────────┐                ┌──────────────┐
 │  Web (Vite)  │                │ Mobile (Expo)│
 └──────┬───────┘                └──────┬───────┘
        │ REST (HTTPS) + Socket.IO (WSS)│            WebRTC audio
        ▼                               ▼                 │
 ┌──────────────────────────────────────────────┐         │
 │  Render: apps/server (Node.js + Fastify)     │         │
 │  ├─ REST: auth, users, rooms, reports        │         │
 │  ├─ Socket.IO: room / game / chat            │         │
 │  ├─ GameService ⇄ packages/game-engine       │         │
 │  ├─ PhaseScheduler (in-process timers)       │         │
 │  └─ VoiceService (LiveKit server SDK) ───────┼──API──┐ │
 └──────────────┬───────────────────────────────┘       ▼ ▼
                │                               ┌─────────────────┐
         ┌──────▼───────┐                       │  LiveKit Cloud  │
         │ MongoDB Atlas│◄── transcripts ──┐    │  (SFU, voice)   │
         └──────────────┘                  │    └────────┬────────┘
                                   ┌───────┴────────────▼───────┐
                                   │ apps/captions (Py, R2)     │
                                   │ Render Background Worker   │
                                   │ faster-whisper + NLLB      │
                                   └────────────────────────────┘
```

Hạ tầng chỉ gồm **server (Render) + database (Atlas) + LiveKit Cloud** (web static trên Vercel). **Không dùng Redis**.

Nguyên tắc cốt lõi:

1. **Server authoritative**: toàn bộ luật nằm ở server. Client chỉ gửi _ý định_ (`intent`) và hiển thị state đã được lọc cho riêng mình.
2. **Game engine là pure TypeScript**, không I/O, deterministic → test dễ, dùng chung cho server và (nếu cần) để client hiện gợi ý UI.
3. **Một nguồn kiểu dữ liệu**: Zod schema trong `packages/shared` sinh ra type cho REST, Socket event, form ở web và mobile.
4. **Voice permission theo phase do server điều khiển**, không tin vào việc client tự mute.

## 2. Monorepo

Công cụ: **pnpm workspaces + Turborepo** (cache build/test, chạy task song song).

```
werewolf/
├─ apps/
│  ├─ server/        Node.js + Fastify + Socket.IO + Mongoose
│  ├─ web/           Vite + React + TS
│  ├─ mobile/        Expo (React Native) + Expo Router
│  └─ captions/      Python worker: LiveKit Agents + faster-whisper + NLLB (Release 2)
├─ packages/
│  ├─ shared/        Zod schemas, types, socket event contracts, constants (roles, phases), error codes
│  ├─ game-engine/   Pure rules engine: reducer + projection + validators
│  └─ i18n/          Locale JSON (vi, en, …) dùng chung web và mobile
├─ infra/
│  └─ docker-compose.yml   mongo (replica set 1 node), livekit (dev mode)
├─ tsconfig.base.json, biome.json, turbo.json   config dùng chung ở root
├─ docs/
└─ .claude/skills/werewolf-overview/   Skill tóm tắt dự án cho Claude
```

Tooling chung: **TypeScript strict**, ESM, **Biome** (lint + format, nhanh, ít config hơn ESLint + Prettier), **Vitest**, Node.js **≥ 22.13** (Expo SDK yêu cầu; `.nvmrc` = 24), `.npmrc` đặt `node-linker=hoisted` để Metro/Expo chạy ổn trong monorepo pnpm.

**Package nội bộ không có bước build**: `packages/*` export thẳng file `src/index.ts`. Vite, Vitest, tsx và Metro đọc trực tiếp TypeScript; server build bằng tsup và bundle luôn `@werewolf/*` (`noExternal`). Mobile phải cài dependency bằng `npx expo install` để đúng version theo SDK.

Script gốc: `pnpm dev` (chạy server + web), `pnpm dev:mobile`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm infra:up`.

## 3. Backend — `apps/server`

### 3.1 Lựa chọn: **Fastify + Socket.IO + Mongoose + Zod**

| Phương án      | Đánh giá                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS         | Có structure rõ nhưng nhiều boilerplate (module, provider, decorator, DTO class). Repo cũ (Nest + GraphQL + Prisma) đã chậm vì việc này → **không chọn**                                 |
| Express        | Tối giản nhưng không có validation, typing hay plugin system → dễ thành spaghetti code                                                                                                   |
| **Fastify** ✅ | Nhanh, có plugin/encapsulation tạo ra structure tự nhiên, logger pino tích hợp sẵn, `fastify-type-provider-zod` cho phép validate và sinh type từ Zod schema dùng chung, tự sinh OpenAPI |

Thư viện chính:

- `fastify`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` (store trong bộ nhớ), `@fastify/swagger` (+ UI ở môi trường dev), `fastify-type-provider-zod`
- `socket.io` (không dùng adapter, xem §3.7 về scale)
- `mongoose`
- `jose` (JWT của mình), `google-auth-library` (verify Google ID token). Không có password nên không cần thư viện hash
- `livekit-server-sdk` (cấp token, đổi quyền participant)
- `nanoid` (mã phòng), `pino` (log)
- Dev: `tsx watch`, build bằng `tsup`; test bằng `vitest` + `mongodb-memory-server` + `fastify.inject`

### 3.2 Cấu trúc thư mục (feature-module, không có tầng thừa)

```
apps/server/src/
├─ main.ts                 bootstrap: buildApp() + listen
├─ app.ts                  tạo Fastify instance, đăng ký plugins + modules
├─ config/env.ts           đọc ENV bằng Zod (fail fast)
├─ plugins/                mongoose.ts, auth.ts (request.user + app.authenticate), socket.ts (IO + handshake auth), error-handler.ts
├─ modules/
│  ├─ auth/                auth.routes.ts, auth.service.ts, token.service.ts, google.ts, session.model.ts
│  ├─ users/               user.model.ts, users.routes.ts (/me)
│  ├─ rooms/               room.model.ts, rooms.routes.ts, rooms.service.ts
│  ├─ games/               game.model.ts (Game + GameEventLog), games.service.ts, phase-scheduler.ts, delivery.ts
│  ├─ chat/                chat-message.model.ts, chat.service.ts
│  ├─ realtime.ts          toàn bộ handler Socket.IO (mỏng: Zod → service → ack)
│  ├─ reports/             (P1) report.model.ts, reports.routes.ts
│  ├─ voice/               (M4) voice.service.ts: token LiveKit + đồng bộ quyền theo phase
│  └─ captions/            (R2) transcript.model.ts, internal API cho Python worker
├─ lib/                    clock.ts, errors.ts, ids.ts, presence.ts, socket-handler.ts
└─ test/                   test tích hợp: MongoDB trong bộ nhớ + client Socket.IO thật
```

Quy ước mỗi module:

- `*.routes.ts` = Fastify plugin; schema lấy từ `@werewolf/shared`; **không chứa business logic**.
- `*.service.ts` = class nhận dependency qua constructor (dễ test), không phụ thuộc Fastify.
- Handler socket nằm trong `modules/realtime.ts`, dùng `onEvent(socket, log, event, ZodSchema, handler)`: validate payload, gọi service, luôn trả `ack({ ok, data | error })`.
- `*.model.ts` = Mongoose schema + model + interface `*Doc`.
- Dependency có thể thay trong test qua `buildApp({ deps: { clock, scheduler, google } })`.

### 3.3 Luồng xử lý một hành động trong game

```
client ──emit('game:action', { gameId, command }, ack)──► realtime.ts (Zod: GameActionSchema)
  GamesService.act(userId, gameId, command)  — tuần tự hóa theo gameId trong instance
    1. load game (lean)
    2. engine.dispatch(state, { kind:'command', actorId, command }, { now, rng(seed, version) })
         lỗi luật → ack({ ok:false, error }) — không ghi gì
    3. Game.findOneAndUpdate({ _id, version }, { $set:{ state }, $inc:{ version:1, eventSeq:n } })
         null (có người ghi trước) → reload + chạy lại engine (tối đa 3 lần) → CONFLICT
    4. insert game_events (seq liên tục), route từng event theo audience tới `user:{id}`,
       gửi `game:state` = projectFor(state, userId) cho từng người chơi
    5. đặt timer mới (PhaseScheduler) hoặc, nếu GAME_OVER: cập nhật thống kê, phòng về sảnh
```

Timeout dùng cùng luồng với `{ kind: 'timeout' }` và chỉ áp dụng nếu `version` vẫn khớp.

### 3.4 Timer phase (không dùng Redis/queue)

Đặt sau interface `PhaseScheduler { schedule(gameId, version, endsAt); cancel(gameId) }` để có thể đổi cách chạy mà không sửa logic game.

- **Bản MVP (`InProcessScheduler`)**: khi vào phase mới, ghi `phase.endsAt` vào Mongo rồi gọi `setTimeout(() => onPhaseTimeout(gameId, version), endsAt - now)`.
- Khi timer chạy: apply command `PHASE_TIMEOUT` **chỉ khi `game.version` vẫn bằng `version`**. Nếu phase đã chuyển sớm thì bỏ qua. Timer chạy trùng hoặc chạy muộn đều vô hại.
- **Khôi phục khi server restart**: lúc khởi động, query `Game.find({ status: 'running' })` và đặt lại timer theo `phase.endsAt`. Trận nào đã quá hạn thì xử lý ngay. State luôn nằm trong Mongo nên không mất trận.
- Client hiển thị đồng hồ theo `phase.endsAt` (ISO time do server gửi).

### 3.5 Realtime (Socket.IO)

- Namespace mặc định; khi handshake, xác thực bằng `auth.token` (JWT). Client dùng `transports: ['websocket']` (bỏ long-polling, không cần sticky session).
- Socket rooms: `user:{userId}` (mọi event riêng và event game, server tự lọc người nhận) và `room:{roomId}` (trạng thái phòng, chat sảnh). Không dùng room cho kênh sói/người chết: server tính người nhận từ state.
- Contract event định nghĩa **một lần** trong `packages/shared/src/socket.ts` dưới dạng `ClientToServerEvents` / `ServerToClientEvents` (typed generics của Socket.IO) kèm Zod schema.

| Hướng | Event                                             | Payload chính                                                                                                        |
| ----- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| C→S   | `room:join` / `room:leave`                        | `{code}`                                                                                                             |
| C→S   | `room:ready`                                      | `{ready}`                                                                                                            |
| C→S   | `room:updateSettings` (host)                      | `RoomSettingsPatch` (merge với settings hiện tại rồi validate lại)                                                   |
| C→S   | `room:kick` (host)                                | `{userId}`                                                                                                           |
| C→S   | `game:start` (host)                               | `{}` → `{gameId}`                                                                                                    |
| C→S   | `game:action`                                     | `{gameId, command: GameCommand}` (WOLF_VOTE, GUARD_PROTECT, SEER_CHECK, WITCH_ACT, DAY_VOTE, HUNTER_SHOOT, END_TURN) |
| C→S   | `game:sync`                                       | `{gameId, lastSeq}` → `{view, events (seq > lastSeq, đã lọc), chat}`                                                 |
| C→S   | `chat:send`                                       | `{channel, text}` — trong trận bị chặn theo `canSend` (nói theo lượt)                                                |
| S→C   | `server:hello`                                    | `{serverTime, userId}`                                                                                               |
| S→C   | `room:state` / `room:kicked`                      | `RoomView` / `{roomId}`                                                                                              |
| S→C   | `game:started`                                    | `{gameId}`                                                                                                           |
| S→C   | `game:state`                                      | `{gameId, view: PlayerView}` (đã project cho riêng người nhận), gửi sau mỗi thay đổi                                 |
| S→C   | `game:event`                                      | `{gameId, seq, type, payload}` (ví dụ `PLAYER_DIED`, `SEER_RESULT`, `VOTE_CAST`, `SPEAKER_CHANGED`)                  |
| S→C   | `chat:message`                                    | `ChatMessageView {id, channel, senderId, senderName, text, at}`                                                      |
| S→C   | `voice:grant` (M4)                                | `{url, tokens:{main?, wolves?, dead?}}` — gửi lại mỗi khi quyền thay đổi                                             |
| S→C   | `caption` (qua LiveKit data, không qua Socket.IO) | xem §7                                                                                                               |

### 3.6 REST API (tối thiểu, phần còn lại đi qua socket)

`POST /auth/guest` (`{displayName, locale}`), `POST /auth/google` (`{idToken}`: server verify bằng `google-auth-library`, kiểm tra `aud` khớp client ID của web/iOS/Android, rồi upsert user theo `googleSub`), `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `GET /rooms?status=lobby&lang=`, `POST /rooms`, `GET /rooms/:code`, `GET /games/:id/summary` (sau khi kết thúc), `GET /users/:id/stats`, `POST /reports` (trong vòng 24 giờ sau khi trận kết thúc), `POST /internal/transcripts` (chỉ cho captions worker, dùng shared secret).

### 3.7 Chat

- Server kiểm tra quyền kênh và rate limit, broadcast cho đúng người, đồng thời ghi vào `chat_messages` (TTL **24 giờ**). Client giữ chat của trận hiện tại trong bộ nhớ và xóa khi rời trận.
- Reconnect: `game:sync` trả về luôn các tin nhắn gần đây của những kênh người đó được xem.
- **Báo cáo**: chỉ cho phép khi `game.endedAt + 24h > now` (kiểm tra trong code, không dựa vào thời điểm TTL xóa). Khi tạo báo cáo, server **copy** các tin nhắn và transcript liên quan sang `reports` để giữ bằng chứng sau khi bản gốc bị xóa.

### 3.8 Scale (sau MVP, vẫn không cần Redis)

- MVP: **1 instance** trên Render, đủ cho vài trăm trận đồng thời.
- Nhiều instance: **mỗi trận chỉ chạy trên một instance**. `games.ownerInstanceId` + `ownerLeaseUntil` được gia hạn định kỳ trong Mongo. Khi vào phòng, client được chỉ tới instance sở hữu trận, nên event trong trận không phải đi qua instance khác và không cần Socket.IO adapter. Instance chết thì instance khác nhận lại trận khi hết lease và khôi phục timer từ `phase.endsAt`.
- **Không dùng `@socket.io/mongo-adapter` ở quy mô lớn**, vì mỗi broadcast sẽ thành một lần ghi Mongo.
- Mongo: mọi query trong luồng realtime đều đi theo `_id`/`gameId` và có index. Khi cần, shard Atlas theo `gameId` dạng hashed.

## 4. Game engine — `packages/game-engine`

```ts
// API công khai (đã cài đặt ở M1). ctx = { now: number (ms), rng: Rng }
createGame({ players, settings }, ctx): EngineResult        // chia vai, vào ROLE_REVEAL
dispatch(state, input, ctx): EngineResult                   // input = { kind:'command', actorId, command } | { kind:'timeout' }
projectFor(state, viewerId | null): PlayerView              // lọc thông tin theo người xem (null = khán giả)
voicePermissions(state, viewerId | null): VoiceGrant        // ma trận ở game-rules §8
checkWinner(players): Team | null
createRng(seed): Rng                                        // PRNG có seed; lưu seed vào game để replay
// EngineResult = { ok: true, state, events } | { ok: false, error: RuleError }
```

- `dispatch` **pure**: không đụng vào state đầu vào. Lỗi luật thì trả `{ ok: false }` và không có gì thay đổi. Hành động ban đêm tự chuyển step hoặc phase khi đủ người. `timeout` chỉ được nhận khi `now ≥ phase.endsAt`.
- `GameState` là **JSON thuần**, lưu thẳng vào Mongo (`games.state`). Server không bao giờ gửi `GameState` xuống client.
- Cấu trúc code:
  - `src/actions/<role>.ts`: validate + apply cho lệnh của từng vai (`werewolf`, `guard`, `seer`, `witch`, `hunter`, `day-vote`); `actions/index.ts` điều phối.
  - `src/phases.ts`: máy trạng thái phase, resolve đêm, phiếu, chết, thợ săn, kiểm tra thắng.
  - `src/projection.ts`, `src/voice.ts`, `src/create.ts`, `src/dispatch.ts`.
- Lệnh (`GameCommand`, Zod schema trong `@werewolf/shared`): `WOLF_VOTE`, `GUARD_PROTECT`, `SEER_CHECK`, `WITCH_ACT { heal, poisonTargetId }`, `DAY_VOTE`, `HUNTER_SHOOT`, `END_TURN` (người đang nói nhường lượt). `targetId: null` nghĩa là bỏ qua.
- Lượt nói: `voicePermissions` cho biết ai được nói ở kênh nào; `canSend(state, userId, channel)` dùng chung cho chat chữ. Server chỉ việc áp dụng kết quả, không tự viết luật.
- `GameEvent` có `audience`: `all | wolves | player:<id> | dead`. Server dựa vào đó để route.
- Thêm vai mới: thêm RoleId vào shared, viết `actions/<role>.ts`, nối vào `actions/index.ts`, `expectedCommand` (projection), `nightStepComplete` (phases), viết test và cập nhật rules doc.
- Test (`src/test/`): mỗi luật trong [04-game-rules.md](04-game-rules.md) có ít nhất 1 test. Có thêm test cả trận, test "không lộ thông tin" (kiểm tra `projectFor` của mọi người chơi ở từng mốc trong trận) và test ma trận voice. Coverage ≥ 90% được ép trong `vitest.config.ts`.

## 5. Database — MongoDB + Mongoose

Chạy **replica set** (kể cả dev, 1 node) để dùng được transaction và change stream. Production: MongoDB Atlas.

Ngoài việc lưu dữ liệu, MongoDB còn thay luôn phần Redis thường làm: timer được khôi phục từ `phase.endsAt`, chat có TTL, và khi scale thì `games.ownerInstanceId`/lease cho biết instance nào chạy trận nào.

### 5.1 Collections

**`users`**

```ts
{ _id, kind: 'guest'|'google', googleSub?, email?,
  displayName, avatarUrl?, locale: 'en'|'vi', captionLangs: string[],
  stats: { games, wins, byRole: { [roleId]: { games, wins } } },
  createdAt, lastSeenAt }
// index: googleSub unique sparse
// Guest không hoạt động 90 ngày có thể bị dọn (TTL trên lastSeenAt chỉ áp dụng khi kind = 'guest', dùng partialFilterExpression)
```

**`sessions`**: refresh token

```ts
{ _id, userId, tokenHash, userAgent, expiresAt, revokedAt? }   // TTL index trên expiresAt
```

**`rooms`**

```ts
{ _id, code, name, hostId, visibility: 'public'|'private', lang, status: 'lobby'|'in_game'|'closed',
  settings: { roles: { [roleId]: number }, timers: {...}, voice: boolean, captions: boolean,
              rules: { witchCanSelfHeal, guardCanSelfProtect, noKillFirstNight, revealRoleOnDeath,
                       voteTieBreak: 'none'|'revote', maxRevotes, ... } },   // xem 04-game-rules §0
  // settings chỉ host sửa được, chỉ khi status = 'lobby'
  members: [{ userId, displayName, seat, ready, isSpectator, joinedAt }],
  currentGameId?, createdAt, updatedAt }
// index: code unique; { visibility, status, lang, updatedAt }
```

**`games`**: snapshot authoritative, một document mỗi trận (16 người nên document nhỏ, embed là hợp lý)

```ts
{ _id, roomId, status: 'running'|'finished', winner: 'village'|'wolves'|null,
  version,            // optimistic concurrency, +1 mỗi lần ghi
  seed,               // RNG của mỗi bước = createRng(seed, version) → tái hiện được
  eventSeq,           // seq cuối cùng đã ghi vào game_events
  players: [{ userId, displayName, seat }],
  state: GameState,   // JSON thuần của engine: rules, timers, phase, players(role, alive…), night, day, memory
  createdAt, endedAt }
// index: { roomId, createdAt:-1 }, { status }, { 'players.userId': 1, status: 1 }
```

`state` là nguồn chân lý duy nhất về luật. Server không đọc từng field để tự quyết định luật, mà luôn gọi engine.

**`game_events`**: event log append-only (reconnect, replay, debug)

```ts
{
  _id, gameId, seq, round, phase, type, payload, audience, at;
}
// index: { gameId, seq } unique
```

**`chat_messages`**: chỉ phục vụ reconnect và báo cáo

```ts
{ _id, roomId, gameId?, channel: 'lobby'|'main'|'wolves'|'dead', senderId, text, lang,
  translations?: { [lang]: string }, at }
// index: { gameId, channel, at }; TTL 24 giờ trên `at` (expireAfterSeconds: 86400)
```

**`reports`**: lưu lâu dài, chứa bản copy bằng chứng

```ts
{ _id, gameId, reporterId, targetId, reason, note?,
  evidence: { messages: [...], transcripts: [...] }, status: 'open'|'reviewed'|'actioned', createdAt }
// index: { status, createdAt }, { targetId }
```

**`transcripts`**: phụ đề, Release 2

```ts
{
  _id, gameId, channel, speakerId, startedAt, durationMs, text, lang, translations, at;
}
// index: { gameId, at }; TTL 24 giờ (giống chat)
```

### 5.2 Mẫu query cho logic phức tạp (role, turn, quyền)

**Cách đã cài đặt (M2):** engine kiểm tra luật trên đúng phiên bản state vừa đọc, rồi lệnh ghi có điều kiện `{ _id, version }`. Nếu giữa lúc đọc và ghi có ai thay đổi trận (dù chỉ một field), `version` đã tăng, lệnh ghi trả về `null`, server đọc lại và chạy lại engine. Như vậy mọi điều kiện luật (đúng vai, đúng phase, còn sống, chưa dùng kỹ năng) đều được đảm bảo atomic mà không phải viết lại luật bằng query Mongo.

Mẫu dưới đây (gộp điều kiện luật vào filter) vẫn hữu ích cho các thao tác **ngoài engine** như thống kê, công cụ admin hay migration; không dùng nó cho luồng realtime:

```ts
// Ví dụ: chỉ thành công khi đúng phase/step, là witch còn sống, chưa dùng bình
await Game.findOneAndUpdate(
  {
    _id: gameId,
    version,
    'phase.name': 'NIGHT',
    'phase.step': 2,
    players: {
      $elemMatch: { userId: actorId, role: 'witch', alive: true, 'state.witchHealUsed': false },
    },
  },
  {
    $set: { 'players.$[w].state.witchHealUsed': true },
    $push: {
      actions: { round, phase: 'NIGHT', step: 2, actorId, type: 'WITCH_HEAL', targetId, at: now },
    },
    $inc: { version: 1 },
  },
  { arrayFilters: [{ 'w.userId': actorId }], new: true },
);
```

```ts
// Đếm phiếu ban ngày bằng aggregation (dùng cho thống kê/replay; luồng realtime dùng engine)
Game.aggregate([
  { $match: { _id: gameId } },
  { $unwind: '$votes' },
  { $match: { 'votes.round': round } },
  { $group: { _id: '$votes.targetId', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
```

Quy tắc: **engine quyết định luật** (validate trong bộ nhớ), còn **filter Mongo đảm bảo tính atomic và chống race**. Cả hai cùng có mặt. Không để client hay socket handler tự viết query luật mà không qua `GamesService`.

## 6. Voice chat — LiveKit Cloud

**Chốt: LiveKit Cloud** (dịch vụ managed của LiveKit, một WebRTC SFU mã nguồn mở). Các phương án đã cân nhắc và lý do loại:

- **P2P mesh**: 4G hay dùng symmetric NAT/CGNAT nên một phần người chơi bắt buộc cần TURN. Ngoài ra lộ IP, server không cắt được quyền nghe/nói, AI phụ đề không lấy được audio, và tốn pin.
- **Tự host (mediasoup/LiveKit) hoặc TURN**: cần cổng UDP/TCP tự do, Render không hỗ trợ.
- **Audio qua WebSocket**: độ trễ cao và không có khử tiếng vọng (AEC).
- **Agora/Daily**: phân quyền nghe theo từng người kém linh hoạt hơn và bị khóa vào nhà cung cấp. Agora là phương án dự phòng nếu độ trễ tới Việt Nam không đạt.

Lý do chọn LiveKit:

- **Phân quyền phía server**: `RoomServiceClient.updateParticipant(room, identity, { permission: { canPublish, canSubscribe, canPublishData } })` đổi quyền ngay khi đổi phase.
- Ít code nhất: SDK Node, component React cho web, plugin Expo cho mobile.
- **Không bị khóa vào nhà cung cấp**: khi chi phí lớn có thể tự host LiveKit trên VPS mà gần như không sửa client.
- Có **LiveKit Agents** để gắn AI phụ đề vào cùng room. Worker chỉ kết nối ra ngoài, nên chạy được trên Render.
- Dev local: `livekit-server --dev` trong docker-compose. Staging và production dùng LiveKit Cloud project (region gần Việt Nam nhất). **Cần đo độ trễ thực tế ở milestone M4.**

Thiết kế room LiveKit cho mỗi trận:

| LiveKit room      | Ai tham gia                          |
| ----------------- | ------------------------------------ |
| `{gameId}-main`   | Mọi người chơi + khán giả            |
| `{gameId}-wolves` | Sói (chỉ tồn tại khi trận đang chạy) |
| `{gameId}-dead`   | Người chết                           |

`VoiceService.syncPermissions(game)` chạy sau mỗi lần `PHASE_CHANGED` hoặc `PLAYER_DIED`. Hàm này dựa vào `engine.voicePermissions()` để gọi `updateParticipant` cho từng người. Client nhận `voice:grant` để join hoặc rời room phù hợp. Ở NIGHT, dân làng bị `canSubscribe=false` trong `main`, tức server **chặn không cho nghe**, chứ không chỉ chặn nói.

Client:

- Web: `livekit-client` + `@livekit/components-react`
- Mobile: `@livekit/react-native` + `@livekit/react-native-webrtc` + `@livekit/react-native-expo-plugin` → **phải dùng Expo Dev Client / EAS Build, không chạy được trên Expo Go**.

## 7. AI phụ đề & dịch — `apps/captions` (Release 2)

**Pipeline** (Python, vì các model tối ưu nhất đều có trong hệ sinh thái Python):

```
LiveKit Agents worker (hidden participant) join {gameId}-main / -wolves / -dead
  → subscribe từng audio track
  → Silero VAD (cắt câu theo khoảng lặng)
  → STT: faster-whisper (CTranslate2, int8)
       CPU: model "small" (multilingual) — đủ tốt cho vi/en, ~1–2 s/câu
       GPU: "large-v3-turbo" — chất lượng tiếng Việt tốt hơn rõ rệt
  → Dịch: NLLB-200-distilled-600M qua CTranslate2 (int8, ~600 MB RAM), dịch sang
          tập ngôn ngữ = hợp các `captionLangs` của những người đang nghe track đó
  → Publish qua LiveKit data (topic "captions", destinationIdentities = chỉ người có quyền nghe)
  → POST /internal/transcripts (lưu 24 giờ, phục vụ báo cáo)
```

- **Vì sao không dùng LLM để dịch**: NLLB nhẹ, nhanh, chạy được offline trên CPU và hỗ trợ 200 ngôn ngữ. Thiết kế có interface `Translator` để sau này đổi sang Claude Haiku hoặc model khác nếu cần chất lượng cao hơn.
- Chat chữ dùng cùng `Translator` qua endpoint nội bộ `POST /translate` của service này.
- Bảo mật: worker chỉ join room khi `captions: true`. Phụ đề kênh `wolves` chỉ gửi cho sói. Không ghi lại audio.
- Có fallback cấu hình: `STT_PROVIDER=local|deepgram`, `TRANSLATOR=nllb|llm` để chuyển sang API cloud khi tải lớn.

## 8. Web — `apps/web`

| Mảng              | Lựa chọn                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build             | **Vite** + React + TypeScript                                                                                                                            |
| Routing           | **TanStack Router** (file-based, type-safe params như `/r/$code`)                                                                                        |
| Server state      | **TanStack Query** (REST)                                                                                                                                |
| Client/game state | **Zustand**: store `game` được cập nhật từ socket events                                                                                                 |
| Realtime          | `socket.io-client`, dùng typed events từ `@werewolf/shared`                                                                                              |
| UI                | **Tailwind CSS** + vài primitive tự viết (`components/ui.tsx`: Button, Card, Input, Badge, Toggle). Có thể thêm shadcn/ui sau khi cần component phức tạp |
| Form              | react-hook-form + Zod resolver (schema dùng chung)                                                                                                       |
| i18n              | i18next + react-i18next, đọc locale từ `packages/i18n`. Phát hiện ngôn ngữ: lựa chọn đã lưu → `navigator.languages` (`vi*` thì dùng `vi`) → `en`         |
| Đăng nhập Google  | Google Identity Services (`@react-oauth/google`), lấy ID token rồi gửi lên `POST /auth/google`                                                           |
| Voice             | `livekit-client` + `@livekit/components-react`                                                                                                           |
| Test              | Vitest + Testing Library; Playwright cho e2e (mở nhiều browser context để mô phỏng cả trận)                                                              |
| Deploy            | Vercel (static)                                                                                                                                          |

Cấu trúc:

```
apps/web/src/
├─ routes/                 __root.tsx (header, toaster), index.tsx (đăng nhập hoặc sảnh), r.$code.tsx (phòng chờ → màn chơi → kết quả)
├─ features/{auth,lobby,room,game,chat,i18n}/   component theo feature (game: PhaseHeader, PlayerGrid, ActionPanel, EventLog, GameOver)
├─ lib/                    api.ts (fetch + tự refresh token), socket.ts (kết nối, call(), joinRoom/syncGame, tự resync khi reconnect), errors.ts, hooks.ts, i18n.ts
├─ stores/                 session.ts (token, lưu localStorage), game.ts (room, view, events, chat), toast.ts
├─ components/             ui.tsx, Toaster.tsx
└─ e2e/ (ngoài src)         Playwright: 8 trình duyệt chơi hết một trận (`pnpm --filter @werewolf/web e2e`)
```

## 9. Mobile — `apps/mobile`

| Mảng             | Lựa chọn                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework        | **Expo** (SDK mới nhất) + **Expo Router** (file-based)                                                                                                          |
| Build            | **EAS Build** + **Expo Dev Client** (bắt buộc vì LiveKit/WebRTC là native module); EAS Update cho OTA                                                           |
| Styling          | **NativeWind** (Tailwind cho RN) → dùng chung design token với web                                                                                              |
| State/Realtime   | Zustand, TanStack Query, socket.io-client: **cùng pattern và hook logic với web**                                                                               |
| Voice            | `@livekit/react-native` + expo plugin; xử lý audio session (loa ngoài, tai nghe, Bluetooth)                                                                     |
| Lưu token        | `expo-secure-store`                                                                                                                                             |
| Đăng nhập Google | `@react-native-google-signin/google-signin` (native, chạy với Dev Client), lấy ID token rồi gửi lên `POST /auth/google`                                         |
| i18n             | i18next + `expo-localization`: lựa chọn đã lưu → `getLocales()` (languageCode `vi` hoặc regionCode `VN` thì dùng `vi`) → `en`                                   |
| Khác             | `expo-haptics` (rung khi tới lượt), `expo-notifications`, `expo-keep-awake` (không tắt màn hình khi đang chơi), `expo-linking` (deep link `werewolf://r/:code`) |

Chia sẻ code: logic không phụ thuộc UI (store, socket client, hook xử lý event, format) đặt ở `packages/shared` hoặc viết giống nhau trong `features/*`. **Không chia sẻ component UI** giữa web và RN để tránh phức tạp. Nếu sau này thấy trùng nhiều mới cân nhắc tách `packages/client-core`.

## 10. Hạ tầng & môi trường

`infra/docker-compose.yml` cho dev:

- `mongo` (replica set `rs0`, 1 node) — port 27017
- `livekit` (`livekit/livekit-server --dev`) — 7880 (HTTP/WS), 7881 (TCP), UDP 50000-50100
- (Release 2) `captions` — build từ `apps/captions`

ENV chính của server: `MONGO_URI`, `JWT_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `CAPTIONS_INTERNAL_SECRET`, `CORS_ORIGINS`.

Production (đã chốt):

| Thành phần    | Dịch vụ                                   | Ghi chú                                                                                                           |
| ------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Server        | **Render** Web Service                    | Gói trả phí (gói Free tự tắt sau khoảng 15 phút không có request, làm đứt WebSocket và timer). 1 instance cho MVP |
| Database      | **MongoDB Atlas**                         | Cùng region với Render (ví dụ Singapore)                                                                          |
| Web           | **Vercel**                                | Build static từ Vite                                                                                              |
| Voice         | **LiveKit Cloud**                         |                                                                                                                   |
| Captions (R2) | Render Background Worker (Docker, Python) | Cần nhiều RAM (NLLB-600M int8 + whisper small). Chuyển sang VM có GPU nếu cần chất lượng cao hơn                  |
| Mobile        | EAS Build / Submit                        |                                                                                                                   |

CI (GitHub Actions): `pnpm install` → `turbo run lint typecheck test build` cho các package bị ảnh hưởng.

## 11. Lộ trình (milestones)

| Milestone       | Nội dung                                                                         | Done khi                                                              |
| --------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| M0 Setup        | Monorepo, tooling, docker-compose, CI, skeleton 3 app                            | `pnpm dev` chạy, CI xanh                                              |
| M1 Engine       | `game-engine` đủ 6 vai + test                                                    | Test coverage ≥ 90%, test cả trận pass                                |
| M2 Backend core | Auth, rooms, games qua socket, PhaseScheduler + khôi phục timer, chat, reconnect | Chơi được cả trận bằng script; restart server giữa trận vẫn chơi tiếp |
| M3 Web MVP      | Lobby, phòng, màn chơi, chat                                                     | 8 người chơi hết một trận trên web                                    |
| M4 Voice        | LiveKit Cloud + permission theo phase (web)                                      | Ban đêm dân không nghe được sói; đo độ trễ từ Việt Nam                |
| M5 Mobile       | App Expo đạt parity với web, kể cả voice                                         | Web và mobile chơi chung một trận                                     |
| M6 Captions     | apps/captions, phụ đề + dịch vi↔en                                               | Phụ đề ≤ 3 s, đúng quyền nghe                                         |
| M7 Beta         | Vai trò mở rộng, stats, báo cáo                                                  | Đạt tiêu chí thành công ở BRD §8                                      |
