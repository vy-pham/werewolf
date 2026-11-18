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
                                   │ apps/captions (Py, M6)     │
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
│  └─ captions/      Python worker: LiveKit (rtc) + faster-whisper + NLLB (M6)
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
│  └─ captions/            transcript.model.ts, captions.service.ts, captions.routes.ts (internal API cho worker)
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

| Hướng | Event                        | Payload chính                                                                                                           |
| ----- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| C→S   | `room:join` / `room:leave`   | `{code}`                                                                                                                |
| C→S   | `room:ready`                 | `{ready}`                                                                                                               |
| C→S   | `room:updateSettings` (host) | `RoomSettingsPatch` (merge với settings hiện tại rồi validate lại)                                                      |
| C→S   | `room:kick` (host)           | `{userId}`                                                                                                              |
| C→S   | `game:start` (host)          | `{}` → `{gameId}`                                                                                                       |
| C→S   | `game:action`                | `{gameId, command: GameCommand}` (WOLF_VOTE, GUARD_PROTECT, SEER_CHECK, WITCH_ACT, DAY_VOTE, HUNTER_SHOOT, END_TURN)    |
| C→S   | `game:sync`                  | `{gameId, lastSeq}` → `{view, events (seq > lastSeq, đã lọc), chat}`                                                    |
| C→S   | `chat:send`                  | `{channel, text}` — trong trận bị chặn theo `canSend` (nói theo lượt)                                                   |
| S→C   | `server:hello`               | `{serverTime, userId}`                                                                                                  |
| S→C   | `room:state` / `room:kicked` | `RoomView` / `{roomId}`                                                                                                 |
| S→C   | `game:started`               | `{gameId}`                                                                                                              |
| S→C   | `game:state`                 | `{gameId, view: PlayerView}` (đã project cho riêng người nhận), gửi sau mỗi thay đổi                                    |
| S→C   | `game:event`                 | `{gameId, seq, type, payload}` (ví dụ `PLAYER_DIED`, `SEER_RESULT`, `VOTE_CAST`, `SPEAKER_CHANGED`)                     |
| S→C   | `chat:message`               | `ChatMessageView {id, channel, senderId, senderName, text, at}`                                                         |
| S→C   | `voice:grant` (M4)           | `{url, tokens:{main?, wolves?, dead?}}` — gửi lại mỗi khi quyền thay đổi                                                |
| S→C   | `caption:message`            | `CaptionView {id, channel, speakerId, speakerName, text, lang, original, sourceLang, at}`, đã dịch theo người nhận (§7) |

### 3.6 REST API (tối thiểu, phần còn lại đi qua socket)

`POST /auth/guest` (`{displayName, locale}`), `POST /auth/google` (`{idToken}`: server verify bằng `google-auth-library`, kiểm tra `aud` khớp client ID của web/iOS/Android, rồi upsert user theo `googleSub`), `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `GET /rooms?status=lobby&lang=`, `POST /rooms`, `GET /rooms/:code`, `GET /games/:id/summary` (sau khi kết thúc), `GET /users/:id/stats`, `POST /reports` (trong vòng 24 giờ sau khi trận kết thúc), `GET /internal/captions/rooms` và `POST /internal/captions` (chỉ cho captions worker, header `Authorization: Bearer <CAPTIONS_SECRET>`, xem §7).

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

**`transcripts`**: mỗi câu phụ đề (bản gốc, không lưu bản dịch), làm bằng chứng cho báo cáo

```ts
{
  _id, roomId, gameId | null, channel: 'lobby'|'main'|'wolves'|'dead', speakerId, lang, text, at;
}
// index: { gameId, at }; TTL 24 giờ trên `at` (giống chat). Không bao giờ lưu audio.
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

Room LiveKit (đã cài đặt ở M4, `apps/server/src/modules/voice/`):

| LiveKit room           | Ai có token                                    |
| ---------------------- | ---------------------------------------------- |
| `room-{roomId}-lobby`  | Thành viên phòng khi đang ở sảnh (ai cũng nói) |
| `game-{gameId}-main`   | Mọi người chơi                                 |
| `game-{gameId}-wolves` | Chỉ người có vai sói, kể cả sói đã chết        |
| `game-{gameId}-dead`   | Chỉ người đã chết                              |

Luồng xử lý:

- Client bấm "Vào voice" và gọi `voice:join`. Server trả về `{ url, connections: [{ channel, room, token }], grants }` cho đúng bối cảnh hiện tại (sảnh hoặc trận). Token đã chứa `canPublish` / `canSubscribe` hiện hành. Server **không bao giờ cấp token phòng sói cho người không phải sói**.
- Sau mỗi thay đổi state, `GamesService` gọi `VoiceService.syncGame(game)`. Hàm này tính `engine.voicePermissions()` cho từng người, **so với lần đẩy trước** (bỏ phiếu không làm đổi quyền nên không gọi LiveKit), rồi gọi `updateParticipant` cho người đang kết nối và gửi `voice:update` cho client. Client gọi lại `voice:join` để vào hoặc rời các phòng cho khớp.
- Khi LiveKit thu quyền `canPublish`, nó tự gỡ track của người đó; khi thu `canSubscribe`, người đó không nhận được âm thanh. Vì vậy ở NIGHT dân làng **bị server chặn nghe**, chứ không chỉ bị chặn nói. Client sửa đổi cũng không vượt qua được.
- Lúc bắt đầu trận, `status: 'in_game'` và `currentGameId` được ghi trong cùng một lệnh khóa phòng, nên `voice:join` ngay sau đó đã trả về phòng của trận. (Bug này do test với LiveKit thật phát hiện.)
- Chủ phòng tắt voice (`settings.voice = false`) thì `voice:join` trả về `enabled: false`.
- Dev: `pnpm infra:up` chạy LiveKit với `--node-ip 127.0.0.1 --udp-port 7882`, để trình duyệt trên cùng máy kết nối được tới container.

Client:

- Web: `livekit-client` (`apps/web/src/lib/voice.ts`): mỗi kênh một `Room`; tự phát hoặc ngắt mic theo `grants` và theo `ParticipantPermissionsChanged`; chỉ báo người đang nói lấy từ `activeSpeakers`. UI nằm ở `features/voice/VoiceBar.tsx`.
- Mobile: `@livekit/react-native` + `@livekit/react-native-webrtc` + `@livekit/react-native-expo-plugin` → **phải dùng Expo Dev Client / EAS Build, không chạy được trên Expo Go**.

## 7. AI phụ đề & dịch — `apps/captions` (M6)

Python, vì các model STT và dịch tối ưu nhất đều có trong hệ sinh thái Python. Worker **chỉ chuyển giọng thành chữ**. Ai được đọc phụ đề do server quyết định, theo đúng ma trận quyền của voice.

```
apps/captions (1 process)                                apps/server
  mỗi 3 s: GET /internal/captions/rooms  ───────────────►  phòng có voice + captions bật và có người online
           ◄── { url, rooms: [{ room, token }] }            → token LiveKit "captions-bot": hidden, chỉ subscribe
  join từng room LiveKit (participant ẩn), subscribe mọi audio track
  → AudioStream 16 kHz mono → Segmenter (năng lượng + noise floor thích nghi, cắt theo khoảng lặng 0,6 s, tối đa 8 s)
  → hàng đợi có giới hạn (32, bỏ câu cũ nhất khi đầy; câu chờ > 8 s thì bỏ)
  → 1 thread model: faster-whisper (int8, vad_filter = Silero ONNX của faster-whisper)
       ngôn ngữ: lần đầu tự nhận (giới hạn trong CAPTION_LANGS), sau đó dùng lại ngôn ngữ của người nói, cứ 5 câu nhận lại 1 lần
  → NLLB-200-distilled-600M (CTranslate2 int8) dịch sang các ngôn ngữ người nghe phòng đó cần
  → POST /internal/captions { room, speakerId, lang, text, translations }  ──►  CaptionsService.ingest:
                                                              - parse tên room → lobby / game + channel
                                                              - speaker phải thuộc kênh (eligibleChannels); phòng phải bật captions
                                                              - người nhận = ai đang có subscribe trên kênh đó (voicePermissions)
                                                              - lưu transcripts (TTL 24 h)
                                                              - emit `caption:message` tới user:{id}, chữ theo ngôn ngữ của từng người
           ◄── { delivered, wanted: [ngôn ngữ người nghe cần] } (lần sau worker chỉ dịch sang các ngôn ngữ này)
```

- **Vì sao server-driven thay vì LiveKit Agents dispatch**: worker chỉ cần `CAPTIONS_SECRET`, không cần API secret của LiveKit; server là nơi duy nhất quyết định worker vào phòng nào và ai đọc được gì; không phụ thuộc API Agents (thay đổi nhanh); không cần torch.
- **Vì sao không dùng LiveKit data channel để gửi phụ đề**: Socket.IO đã có sẵn kênh `user:{id}`, client nào cũng nhận được (kể cả người không vào voice), và server lọc theo `voicePermissions` ngay lúc gửi.
- **Bảo mật**: phụ đề kênh `wolves` chỉ tới sói đang có quyền nghe. Ban đêm không ai nghe `main` nên không có phụ đề `main`. Người không thuộc kênh thì bị bỏ qua. Câu nói xong muộn sau khi đổi phase được gửi theo quyền **hiện tại** (an toàn hơn). Log của worker không ghi nội dung câu nói.
- **Ngôn ngữ phụ đề của người dùng** = `captionLangs[0]`, không có thì lấy `locale` (client đồng bộ `locale` lên `PATCH /me` khi đổi ngôn ngữ giao diện). Hiện chỉ dùng ngôn ngữ đầu tiên của `captionLangs`.
- **Cấu hình worker** (env): `SERVER_URL`, `CAPTIONS_SECRET` (bắt buộc, trùng với server), `WHISPER_MODEL` (`small` mặc định), `DEVICE` (`auto|cpu|cuda`; `auto` thử GPU rồi lùi về CPU nếu thiếu cuBLAS/cuDNN), `TRANSLATOR` (`nllb|none`), `NLLB_MODEL`, `CAPTION_LANGS` (`en,vi`), `POLL_SECONDS`, `MAX_LAG_SECONDS`, `MODEL_DIR`, `LOG_LEVEL`.
- **Chỉ chạy 1 instance worker**: 2 instance sẽ cùng nghe và gửi phụ đề trùng. Khi cần scale: chia phòng theo hash (`shard i/n` trong `GET /internal/captions/rooms`).
- **Đo được (laptop, CPU, whisper `small` int8)**: câu đầu của mỗi người nói khoảng 4,6 s (có nhận ngôn ngữ); các câu sau STT khoảng 2,6 s + dịch 0,5–1 s cho câu 3 s. `base` nhanh hơn khoảng 3 lần nhưng tiếng Việt kém hơn. Muốn ≤ 3 s ổn định: máy CPU mạnh hơn, GPU (`large-v3-turbo`), hoặc STT cloud.
- **Chưa làm**: dịch chat chữ (FR-CAP-04); hiện nhiều ngôn ngữ phụ đề cùng lúc; `STT_PROVIDER=deepgram`, `TRANSLATOR=llm` (interface `SpeechToText` / `Translator` đã sẵn để thêm).

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

| Mảng         | Lựa chọn (đã cài đặt ở M5)                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | **Expo SDK 58** + **Expo Router** (`src/app/index.tsx`, `src/app/r/[code].tsx`)                                                                          |
| Build        | **EAS Build**: profile `development` (dev client, APK), `preview`, `production` trong `eas.json`. **Không chạy trên Expo Go** (LiveKit là module native) |
| Styling      | `StyleSheet` + palette trong `src/components/theme.ts` (cùng màu với web). NativeWind để sau nếu thật sự cần                                             |
| Logic client | **`packages/client-core`** (dùng chung với web): session, REST có refresh token, Socket.IO, game store, voice manager, helper UI                         |
| Voice        | `livekit-client` + `@livekit/react-native` (`registerGlobals`, `AudioSession`) + expo plugins, trong `src/lib/voice-platform.native.ts`                  |
| Lưu token    | `expo-secure-store` (bản web export dùng localStorage)                                                                                                   |
| Đăng nhập    | Khách. Google trên mobile cần OAuth client ID Android/iOS (chưa làm)                                                                                     |
| i18n         | i18next + `expo-localization`; lựa chọn lưu trong SecureStore                                                                                            |
| Khác         | `expo-haptics` (rung khi tới lượt), `expo-keep-awake` (chỉ native), `Share` / `expo-clipboard` (mời bạn), deep link `werewolf://r/CODE`                  |

Chia sẻ code: **mọi logic không phụ thuộc UI nằm ở `packages/client-core`**. Mỗi app chỉ có `lib/client.ts` để nối phần riêng của nền tảng: chỗ lưu token, cách phát âm thanh, URL API. Component UI **không** dùng chung, vì web dùng DOM + Tailwind còn mobile dùng React Native.

Kiểm thử mobile:

- App mobile export ra web được (react-native-web). Test Playwright `e2e/mobile-web.spec.ts` cho host dùng app mobile và 5 người chơi web cùng chơi hết một trận (`pnpm --filter @werewolf/web e2e:mobile`). Phần UI dùng `testID` có mã hóa trạng thái, ví dụ `action-panel-WOLF_VOTE-open`.
- Voice native chỉ kiểm tra được trên thiết bị thật hoặc emulator, bằng bản dev build từ EAS.

## 10. Hạ tầng & môi trường

`infra/docker-compose.yml` cho dev:

- `mongo` (replica set `rs0`, 1 node) — port 27017
- `livekit` (`livekit/livekit-server --dev`) — 7880 (HTTP/WS), 7881 (TCP), 7882 (UDP). `--node-ip` mặc định `127.0.0.1`; khi thử bằng điện thoại thì đặt `LIVEKIT_NODE_IP=<IP LAN của máy>`

ENV chính của server: `MONGO_URI`, `JWT_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `CAPTIONS_SECRET` (không đặt = tắt API cho worker), `CORS_ORIGINS`.

Dev phụ đề: `pnpm infra:up`, `pnpm dev:local` (secret dev `dev-captions-secret`), `pnpm captions:dev` (lần đầu tải khoảng 1 GB model vào cache Hugging Face).

Production (đã chốt):

| Thành phần | Dịch vụ                                                       | Ghi chú                                                                                                                                                      |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server     | **Render** Web Service                                        | Gói trả phí (gói Free tự tắt sau khoảng 15 phút không có request, làm đứt WebSocket và timer). 1 instance cho MVP                                            |
| Database   | **MongoDB Atlas**                                             | Cùng region với Render (ví dụ Singapore)                                                                                                                     |
| Web        | **Vercel**                                                    | Build static từ Vite                                                                                                                                         |
| Voice      | **LiveKit Cloud**                                             |                                                                                                                                                              |
| Captions   | Render Background Worker (Docker, `apps/captions/Dockerfile`) | Chỉ có kết nối ra ngoài. RAM khoảng 2 GB (whisper small + NLLB-600M int8, model nằm sẵn trong image). 1 instance. Cần GPU nếu muốn chất lượng/độ trễ tốt hơn |
| Mobile     | EAS Build / Submit                                            |                                                                                                                                                              |

CI (GitHub Actions): job `check`: `pnpm install` → lint, typecheck, test, build; job `captions`: `uv sync` → ruff, pytest (dùng fake, không tải model).

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
