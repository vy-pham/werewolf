---

name: werewolf-overview
description: Project map for the Werewolf Online monorepo (multiplayer Ma Sói game with web, mobile, voice chat and AI captions). Use at the start of any task in this repo — implementing features, fixing bugs, adding roles, touching game rules, voice, captions, database models or socket events — to quickly understand architecture, conventions and where things live.
---

# Werewolf Online — project overview

Multiplayer social-deduction game (Ma Sói / Werewolf), 6–16 players, played on **web and mobile in the same room**, with **mandatory in-game voice chat** whose permissions change by game phase, and **AI speech captions + translation** (M6).

Docs are in Vietnamese and are the source of truth. Read only what the task needs:

| Need                                                                          | Read                          |
| ----------------------------------------------------------------------------- | ----------------------------- |
| Why / scope / releases                                                        | `docs/01-brd.md`              |
| Requirement IDs (`FR-*`, `NFR-*`) and priorities P0/P1/P2                     | `docs/02-requirements.md`     |
| Architecture, stack, folder layout, DB schema, socket events, voice, captions | `docs/03-technical-design.md` |
| Exact game rules, night resolution order, voice/chat permission matrix        | `docs/04-game-rules.md`       |

## Stack at a glance

- **Monorepo**: pnpm workspaces + Turborepo, TypeScript strict, ESM, Biome, Vitest.
- **apps/server**: Node.js LTS + **Fastify** + `fastify-type-provider-zod` + **Socket.IO** (no adapter) + **Mongoose** (MongoDB replica set) + `livekit-server-sdk`. NestJS was deliberately rejected (boilerplate). **No Redis/BullMQ** (deliberate): timers are in-process and recovered from Mongo.
- **Deploy**: server → Render (paid instance, single instance for MVP), DB → MongoDB Atlas (same region), web → Vercel, voice → **LiveKit Cloud**, mobile → EAS. Render has no UDP, so never plan to self-host media/TURN there.
- **apps/web**: **Vite** + React + TanStack Router + TanStack Query + Zustand + Tailwind + shadcn/ui + i18next + `livekit-client`.
- **apps/mobile**: **Expo** + Expo Router + NativeWind + Zustand/TanStack Query + `@livekit/react-native`. Needs **Expo Dev Client / EAS Build** (WebRTC is native, Expo Go won't work).
- **apps/captions** (Python 3.12, **uv**, not in the pnpm workspace): `livekit` rtc SDK (hidden listen-only participant) + energy segmenter + **faster-whisper** (STT, int8) + **NLLB-200-distilled-600M** via CTranslate2 (translation). No torch, no LiveKit Agents framework.
- **packages/shared**: Zod schemas, types, typed Socket.IO event maps, role/phase constants, error codes.
- **packages/game-engine**: pure, deterministic rules engine (no I/O).
- **packages/client-core**: client logic shared by web and mobile (session, REST + token refresh, Socket.IO, game store, LiveKit voice manager, UI helpers). Apps inject storage, audio playback and API URL.
- **packages/i18n**: locale JSON (vi, en) shared by web and mobile.
- **infra/docker-compose.yml** (dev only): mongo (rs0), livekit (`--dev`).

## Non-negotiable rules

1. **Server authoritative.** Clients send intents only. Every state sent to a client goes through `projectFor(state, viewerId)`. Never emit raw game docs. Leaking a role, a wolf target or a seer result is a critical bug.
2. **All game rules live in `packages/game-engine`.** `GamesService` orchestrates: load → `engine.dispatch` → versioned Mongo write → log events → route events by audience + send `projectFor` views → reschedule the timer. No rule logic in socket handlers, routes or UI.
3. **Rule change order**: update `docs/04-game-rules.md` → engine → engine tests. Every rule has a test, and there are "no info leak" projection tests per role.
4. **Atomic writes**: the engine validates against the exact state version it loaded, then `Game.findOneAndUpdate({ _id, version }, { $set: { state }, $inc: { version: 1, eventSeq: n } })`. If the result is `null`, reload, re-run the engine and retry, at most 3 times. Work is also serialized per game inside the instance. The engine RNG for a step is `createRng(seed + version * k)`, so steps are reproducible.
5. **Voice permissions are server-enforced** via LiveKit `updateParticipant` (`canPublish`/`canSubscribe`), driven by `engine.voicePermissions()`. Never rely on client-side mute. LiveKit rooms: `room-{roomId}-lobby`, `game-{gameId}-main`, `game-{gameId}-wolves` (wolves only: never issue a wolves token to anyone else), `game-{gameId}-dead`. `VoiceService.syncGame` diffs grants per player and pushes only changes, then emits `voice:update`; clients re-call `voice:join` and reconcile their rooms. Captions and chat follow the same matrix.
6. **One contract source**: define schemas and socket events once in `packages/shared` and import them everywhere. Do not duplicate types in apps.
7. **Timers** go through the `PhaseScheduler` interface. The MVP uses `setTimeout` plus `phase.endsAt` persisted in Mongo. A timeout applies only if `game.version` still matches, so a stale timer is a no-op. On boot, timers are rescheduled for every `status: 'running'` game. Clients render countdowns from `phase.endsAt`. Scaling plan: one game per instance via a Mongo lease (`ownerInstanceId`/`ownerLeaseUntil`). Never use `@socket.io/mongo-adapter` at scale.
8. No audio is ever stored. Chat (`chat_messages`) and transcripts have a **24h TTL**; they exist only for reconnect and reports. Reports are allowed only until `game.endedAt + 24h` (checked in code) and **copy** the evidence into `reports`. Socket.IO clients use `transports: ['websocket']`.
9. All UI text uses i18n keys. The MVP ships **en + vi**. Default language comes from the device/browser locale (`vi` language or `VN` region → `vi`, otherwise `en`). Users can change it and the choice is saved on their profile.
10. **Auth is guest + Google only** (no email/password). Google ID tokens are verified server-side, then we issue our own JWT access/refresh tokens.
11. **Room rules are host-configurable only while the room is in `lobby`.** They are copied into the engine state (`game.state.rules` / `timers` / `roleCounts`) at start and are immutable during the game. Defaults are in `docs/04-game-rules.md` §0 (witch self-heal ON, guard self-protect ON, first-night kill ON, reveal role on death OFF, vote tie → nobody dies, optional revote up to 3 times).

## Where to put things

| Task              | Location                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New role          | `packages/shared` RoleId/ROLE_TEAM → `packages/game-engine/src/actions/<role>.ts` + wire in `actions/index.ts`, `expectedCommand` (projection.ts), `nightStepComplete` (phases.ts) → tests in `src/test/` → rules doc → i18n strings |
| New socket event  | `packages/shared/src/socket.ts` (Zod schema + event map) → `apps/server/src/modules/realtime.ts` (`onEvent(...)`) → service → client handlers                                                                                        |
| New REST endpoint | `apps/server/src/modules/<feature>/<feature>.routes.ts` (thin) + `<feature>.service.ts` (logic)                                                                                                                                      |
| New Mongo model   | `apps/server/src/modules/<feature>/<name>.model.ts`; declare indexes in the schema; update DB section of `docs/03-technical-design.md`                                                                                               |
| Web screen        | `apps/web/src/routes/*` + `apps/web/src/features/<feature>/*`                                                                                                                                                                        |
| Mobile screen     | `apps/mobile/src/app/*` (Expo Router) + `apps/mobile/src/features/<feature>/*`. Client logic goes in `packages/client-core`, not in the app                                                                                          |

Server module file convention: `*.routes.ts` (Fastify plugin factory taking its service, no logic), `*.service.ts` (class, deps via constructor), `*.model.ts` (Mongoose schema + `*Doc` interface). All socket handlers live in `modules/realtime.ts` (Zod → service → `ack({ ok, data | error })`). Throw `AppError(code, message)` from services; it maps to HTTP status and to socket acks.

Server wiring (`apps/server/src/app.ts`): `TokenService` → `AuthService`; `RoomsService(io, presence)`; `ChatService(io, clock, rooms)`; `GamesService({ io, clock, scheduler, log, onFinished, recentChat })`. `buildApp({ env, connectDb, rateLimit, deps: { clock, scheduler, google } })` lets tests inject a fake clock, a `ManualScheduler` and a fake Google verifier. Events are always emitted to `user:{id}` socket rooms after computing recipients from the state (`modules/games/delivery.ts`). Never broadcast game data to a whole room.

## Game loop (short)

`LOBBY → ROLE_REVEAL → NIGHT(step1: guard+wolves+seer in parallel; step2: witch) → DAWN → [HUNTER_SHOT] → DISCUSSION (speaking turns, phase.step = turn) → VOTE (silent) → [DEFENSE] → EXECUTION → [HUNTER_SHOT] → win check → NIGHT…  → GAME_OVER`.

**Turn-based speech (user requirement):** `main` has at most ONE speaker at any time. In DISCUSSION it is the current speaker, in DEFENSE the accused, in HUNTER_SHOT the hunter. DAWN, VOTE and EXECUTION are silent. The wolves' channel opens only during night step 1. The dead always talk on `dead`. Text chat follows the exact same rules via `canSend`.
Roles: villager, werewolf, seer, guard, witch, hunter + (M7) cupid, alpha_wolf, fool, elder. Village wins when all wolves are dead. Wolves win when wolves ≥ others. A mixed Cupid couple (`lovers`) wins as the last two alive. See `docs/04-game-rules.md` for tie-breaks and configurable rules (⚙️).

## Game engine API (`@werewolf/game-engine`)

- `createGame({ players, settings }, ctx)`, `dispatch(state, { kind: 'command', actorId, command } | { kind: 'timeout' }, ctx)`, `projectFor(state, viewerId | null)`, `voicePermissions(state, viewerId | null)`, `canSend(state, viewerId, channel)`, `currentSpeaker(state)`. `ctx = { now, rng: createRng(seed) }`.
- All return new data: `{ ok: true, state, events } | { ok: false, error: RuleError }`. The input state is never mutated. `GameState` is plain JSON (store as-is). `events[].audience` tells the server who receives each event.
- Commands (`GameCommandSchema` in shared): `WOLF_VOTE`, `GUARD_PROTECT`, `SEER_CHECK`, `WITCH_ACT {heal, poisonTargetId}`, `DAY_VOTE`, `HUNTER_SHOOT`, `END_TURN` (current speaker yields). `targetId: null` = skip.
- Anti-leak rules baked in: the witch step always runs if the role set has a witch; night steps wait for the timer when a hidden-role holder is dead; dead players gain no extra role knowledge. Keep these when changing the engine.
- Tests live in `src/test/` and use the `Harness` helper (seat-fixed roles, `night()`, `vote()`, `advanceTo()`). Coverage ≥ 90% is enforced in `vitest.config.ts`.

## Common commands

Captions: `pnpm captions:dev` (worker, needs `pnpm dev:local` + `pnpm infra:up`), `pnpm captions:test`, `uv run --project apps/captions werewolf-captions try file.wav`, opt-in e2e `CAPTIONS_E2E=1 pnpm --filter @werewolf/web e2e captions`.

`pnpm dev:local` (server on an in-memory MongoDB + web, **no Docker**) · `pnpm infra:up` + `pnpm dev` (with Docker / a real Mongo) · `pnpm dev:mobile` · `pnpm test` · `pnpm typecheck` · `pnpm lint` (Biome) · `pnpm format` · `pnpm --filter @werewolf/web e2e` (Playwright: 8 browsers play a full game, about 2.5 min)

## Gotchas

- **Wolf checks:** never write `role === 'werewolf'`. Use `isWolfRole(role)` (shared) or `isWolf(p)` (engine): `alpha_wolf` and players infected by the alpha are wolves too. For "which team is this player on" use the engine's `teamOf(state, p)` (lovers), and for stats use `startingRole`. Engine state gained fields in M7, and `dispatch` runs `normalize()` so games stored by an older server version keep working.
- **Captions worker:** the server is the only authority on who reads a caption (`CaptionsService.ingest` re-checks `eligibleChannels` + `voicePermissions`). Never add delivery logic to the worker. Python is checked with ruff + pytest (`pnpm captions:test`, CI job `captions`), and unit tests use fakes (no models). On Windows: `DEVICE=auto` falls back to CPU when cuBLAS is missing; set `PYTHONIOENCODING=utf-8` when printing Vietnamese; `taskkill //F //IM werewolf-captions.exe` if a stopped `pnpm captions:dev` leaves the process running (two workers = duplicate captions). Below DEBUG, libwebrtc logs are silenced (they flood ICE errors from virtual network adapters).
- Internal packages have **no build step**: `exports` points at `src/index.ts`. The server bundles them with tsup (`noExternal: [/^@werewolf\//]`).
- Mobile (Expo SDK 58) needs **Node ≥ 22.13**. Add mobile deps with `npx expo install <pkg>` (SDK-matched versions), and read `apps/mobile/AGENTS.md` first. Expo APIs change per SDK, so check the versioned docs before writing code.
- On Windows, run tools from an **uppercase drive path** (`D:\...`). A lowercase `d:\` cwd makes Metro fail to resolve `@werewolf/*`.
- `apps/web/src/routeTree.gen.ts` is generated by the TanStack Router Vite plugin and committed. Do not edit it by hand.
- The user's permission settings block writing `.env*` files. Server env vars are documented in `README.md`, and `apps/server/src/config/env.ts` validates them.
- Server integration tests (`apps/server/src/test/`) use **mongodb-memory-server** (no Docker needed). The binary is downloaded once in `global-setup.ts` and cached in CI. They also use real socket.io clients (`TestClient`), a `FakeClock` + `ManualScheduler` (`scheduler.fire(gameId)` jumps to the phase end), and `rateLimit: false`.
- With `nodeLinker: hoisted`, pnpm occasionally leaves a dependency nested (seen with `tslib`). If you hit "Cannot find module" for a declared dependency, run `pnpm install --force`.
- **One React for the whole repo.** `react` / `react-dom` are pinned to the Expo SDK version (`overrides` in `pnpm-workspace.yaml`, exact versions in web, `react-dom` added to mobile via `expo install`). Two copies crash hooks at runtime ("Cannot read properties of null (reading 'useEffect')"). Bump them only together with the Expo SDK.
- **Mobile:** add native deps with `npx expo install` from `apps/mobile`. `typedRoutes` is OFF on purpose (generated types are missing in CI); use string paths like `router.push(`/r/${code}`)`. Platform files: `voice-platform.native.ts` (registerGlobals + AudioSession) vs `voice-platform.ts` (web export). Use `<Badge label=… />` (Biome forbids raw text in non-Text RN components). `useKeepAwake` must not run on web (it throws on fast unmounts). RN testIDs encode state for e2e (`action-panel-<ACTION>-<open|done>`, `player-card-<on|off>`, `phase-<NAME>`, `my-role-<role>`, `game-over-<winner>`).
- **Zod patch schemas:** never use `.partial()` on schemas that have `.default()`, because Zod fills in defaults and a patch silently resets other fields. Use `RoomRulesPatchSchema` / `PhaseTimersPatchSchema` (`patchOf` in shared `settings.ts`). On the server, write only the patched paths (`$set: { 'settings.timers.x': … }`), never the whole object.
- Web: game UI is driven by `PlayerView` (`me.pendingAction`, `submitted`, `channels`). `data-testid` attributes on cards and panels are used by the Playwright bot, so keep them when refactoring.
- **Voice locally:** `pnpm infra:up` starts LiveKit in Docker with `--node-ip 127.0.0.1 --udp-port 7882` (needed so browsers on the host can reach the container). Server tests inject `FakeVoice` (`server.voice.latest(room, userId)`), so CI needs no LiveKit. `e2e/voice.spec.ts` uses the real LiveKit + Chromium fake microphones, checks through the LiveKit API, and is skipped when LiveKit is down.
- Playwright: `actionTimeout: 5s` is required. Without it, a bot click that races a phase change (the button just got disabled) waits forever. In assertions, read the phase and the data from the **same** page, because pages can be one phase apart.

## Current status

- 2026-11-18: docs defined; **M0 done** (monorepo, tooling, CI, skeletons). The server has `/health` + Socket.IO `server:hello`. Web and mobile show a placeholder home with a language switch and server status.
- **M1 done**: full game engine for the 6 MVP roles, with turn-based speech (94 tests, ~98% statements / 93% branches).
- **M2 done**: guest + Google auth (JWT access + rotating refresh), `/me`, rooms (REST + socket: join/leave/ready/settings/kick/start), games over Socket.IO with the engine, `InProcessScheduler` + timer recovery on boot, `game:sync` reconnect, turn-based text chat with a 24h TTL, user stats. 22 integration tests: full game, chat, restart.
- **M3 done**: web MVP (guest/Google login, lobby, room with host settings, game screen with action panel per role, turn-based chat, event log, results), all text in en/vi. A Playwright e2e test has 8 browsers play a full game. Fixed along the way: duplicate React; patch defaults resetting settings; lost settings updates.
- **M4 done (web)**: LiveKit voice. The server issues tokens per channel and pushes permission diffs after every state change; the web voice bar has join/leave, mute, per-channel status and a speaking glow. Verified with real LiveKit: lobby (everyone hears 5 others), night (only the 2 wolves publish; nobody may subscribe on main), discussion (exactly one publisher). Fixed: lobby-voice race at game start (`currentGameId` is now set atomically with the room lock).
- **M5 done**: Expo app at parity with web: guest login, lobby, room + host settings, game screen, chat, native LiveKit voice, haptics on your turn, keep-awake, share invite. New `packages/client-core` holds all non-UI client logic for web AND mobile (session/api/realtime/voice factories + game store + UI helpers); each app wires platform bits in `src/lib/client.ts`. Verified with Playwright: the Expo **web export** hosts a full game with 5 web players (`pnpm --filter @werewolf/web e2e:mobile`).
- Not done yet: real-device test of native voice (needs the user to `eas login` and build the dev APK; see README "Chạy app trên điện thoại Android"), Google sign-in on mobile, LiveKit Cloud + latency from Vietnam, reports (P1), per-player volume / push-to-talk. E2E tests are not in CI.
- **M6 done**: AI captions. The worker polls `GET /internal/captions/rooms` (Bearer `CAPTIONS_SECRET`) for rooms with voice + captions on, joins them with hidden listen-only tokens, segments each audio track, transcribes and translates on one model thread, then `POST /internal/captions`. `CaptionsService.ingest` (server) picks readers = players with `subscribe` on that channel right now, stores `transcripts` (24h TTL), and emits `caption:message` per user in their caption language (`captionLangs[0]` ?? `locale`). Clients show a CC bar (web + mobile). Fixed: CORS did not allow PATCH, so `PATCH /me` from browsers had always failed. Measured on a laptop CPU with whisper small: about 2.6 s STT + 0.6 s MT per sentence (the first sentence takes about 4.6 s because of language detection).
- **M7 done (code)**: extended roles `cupid`, `alpha_wolf`, `fool`, `elder` (the product owner dropped little_girl); third team `lovers` (a mixed couple wins as the last two alive); player reports (`modules/reports`: `POST /reports`, `GET /reports/reportable`, evidence COPIED, 24h window → 410 `REPORT_WINDOW_CLOSED`); `GET /users/:id/stats` (wins via `teamOf`, by dealt role via `startingRole`). Web + mobile: Cupid picks two players (`nextSelection`), alpha "infect" toggle, lovers badge, ReportPanel (result screen + home), StatsCard. Playwright `m7-roles.spec.ts`.
- Next: a real beta (BRD §8 success criteria need real players) and the production deploy. Still open: chat translation (FR-CAP-04), several caption languages at once, captions worker sharding (run exactly ONE worker instance), admin review of reports (Release 3), spectators, matchmaking, friends. See `docs/03-technical-design.md` §11.
- If code and docs disagree, ask the user which one is correct and then update the other to match.
