---

name: werewolf-overview
description: Project map for the Werewolf Online monorepo (multiplayer Ma Sói game with web, mobile, voice chat and AI captions). Use at the start of any task in this repo — implementing features, fixing bugs, adding roles, touching game rules, voice, captions, database models or socket events — to quickly understand architecture, conventions and where things live.
---

# Werewolf Online — project overview

Multiplayer social-deduction game (Ma Sói / Werewolf), 6–16 players, played on **web and mobile in the same room**, with **mandatory in-game voice chat** whose permissions change by game phase, and (Release 2) **AI speech captions + translation**.

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
- **apps/captions** (Python, Release 2): LiveKit Agents + Silero VAD + **faster-whisper** (STT) + **NLLB-200-distilled-600M** via CTranslate2 (translation).
- **packages/shared**: Zod schemas, types, typed Socket.IO event maps, role/phase constants, error codes.
- **packages/game-engine**: pure, deterministic rules engine (no I/O).
- **packages/i18n**: locale JSON (vi, en) shared by web and mobile.
- **infra/docker-compose.yml** (dev only): mongo (rs0), livekit (`--dev`).

## Non-negotiable rules

1. **Server authoritative.** Clients send intents only. Every state sent to a client goes through `projectFor(state, viewerId)`. Never emit raw game docs. Leaking a role, a wolf target or a seer result is a critical bug.
2. **All game rules live in `packages/game-engine`.** Server services orchestrate: load → `validate` → atomic Mongo write → `advancePhase` → emit. No rule logic in socket handlers, routes or UI.
3. **Rule change order**: update `docs/04-game-rules.md` → engine → engine tests. Every rule has a test, and there are "no info leak" projection tests per role.
4. **Atomic writes**: game mutations use `findOneAndUpdate` with rule conditions (`$elemMatch` on role/alive/ability-used, phase/step) **and** `version` for optimistic concurrency; on `null`, reload and retry, at most 3 times.
5. **Voice permissions are server-enforced** via LiveKit `updateParticipant` (`canPublish`/`canSubscribe`), driven by `engine.voicePermissions()`. Never rely on client-side mute. LiveKit rooms per game: `{gameId}-main`, `{gameId}-wolves`, `{gameId}-dead`. Captions and chat follow the same matrix.
6. **One contract source**: define schemas and socket events once in `packages/shared` and import them everywhere. Do not duplicate types in apps.
7. **Timers** go through the `PhaseScheduler` interface. The MVP uses `setTimeout` plus `phase.endsAt` persisted in Mongo. A timeout applies only if `game.version` still matches, so a stale timer is a no-op. On boot, timers are rescheduled for every `status: 'running'` game. Clients render countdowns from `phase.endsAt`. Scaling plan: one game per instance via a Mongo lease (`ownerInstanceId`/`ownerLeaseUntil`). Never use `@socket.io/mongo-adapter` at scale.
8. No audio is ever stored. Chat (`chat_messages`) and transcripts have a **24h TTL**; they exist only for reconnect and reports. Reports are allowed only until `game.endedAt + 24h` (checked in code) and **copy** the evidence into `reports`. Socket.IO clients use `transports: ['websocket']`.
9. All UI text uses i18n keys. The MVP ships **en + vi**. Default language comes from the device/browser locale (`vi` language or `VN` region → `vi`, otherwise `en`). Users can change it and the choice is saved on their profile.
10. **Auth is guest + Google only** (no email/password). Google ID tokens are verified server-side, then we issue our own JWT access/refresh tokens.
11. **Room rules are host-configurable only while the room is in `lobby`.** They are snapshotted into `game.settingsSnapshot` at start and are immutable during the game. Defaults are in `docs/04-game-rules.md` §0 (witch self-heal ON, guard self-protect ON, first-night kill ON, reveal role on death OFF, vote tie → nobody dies, optional revote up to 3 times).

## Where to put things

| Task              | Location                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New role          | `packages/shared` RoleId/ROLE_TEAM → `packages/game-engine/src/actions/<role>.ts` + wire in `actions/index.ts`, `expectedCommand` (projection.ts), `nightStepComplete` (phases.ts) → tests in `src/test/` → rules doc → i18n strings |
| New socket event  | `packages/shared/src/socket.ts` (schema + event map) → `apps/server/src/modules/<feature>/<feature>.socket.ts` → client handlers                                                                                                     |
| New REST endpoint | `apps/server/src/modules/<feature>/<feature>.routes.ts` (thin) + `<feature>.service.ts` (logic)                                                                                                                                      |
| New Mongo model   | `apps/server/src/modules/<feature>/<name>.model.ts`; declare indexes in the schema; update DB section of `docs/03-technical-design.md`                                                                                               |
| Web screen        | `apps/web/src/routes/*` + `apps/web/src/features/<feature>/*`                                                                                                                                                                        |
| Mobile screen     | `apps/mobile/app/*` (Expo Router) + `apps/mobile/src/features/<feature>/*`                                                                                                                                                           |

Server module file convention: `*.routes.ts` (Fastify plugin, no logic), `*.service.ts` (pure-ish, deps via params), `*.socket.ts` (Zod-validate → service → `ack`), `*.model.ts` (Mongoose schema + `InferSchemaType`).

## Game loop (short)

`LOBBY → ROLE_REVEAL → NIGHT(step1: guard+wolves+seer in parallel; step2: witch) → DAWN → [HUNTER_SHOT] → DISCUSSION → VOTE → [DEFENSE] → EXECUTION → [HUNTER_SHOT] → win check → NIGHT…  → GAME_OVER`.
MVP roles: villager, werewolf, seer, guard, witch, hunter. Village wins when all wolves are dead. Wolves win when wolves ≥ others. See `docs/04-game-rules.md` for tie-breaks and configurable rules (⚙️).

## Game engine API (`@werewolf/game-engine`)

- `createGame({ players, settings }, ctx)`, `dispatch(state, { kind: 'command', actorId, command } | { kind: 'timeout' }, ctx)`, `projectFor(state, viewerId | null)`, `voicePermissions(state, viewerId | null)`. `ctx = { now, rng: createRng(seed) }`.
- All return new data: `{ ok: true, state, events } | { ok: false, error: RuleError }`. The input state is never mutated. `GameState` is plain JSON (store as-is). `events[].audience` tells the server who receives each event.
- Commands (`GameCommandSchema` in shared): `WOLF_VOTE`, `GUARD_PROTECT`, `SEER_CHECK`, `WITCH_ACT {heal, poisonTargetId}`, `DAY_VOTE`, `HUNTER_SHOOT`. `targetId: null` = skip.
- Anti-leak rules baked in: the witch step always runs if the role set has a witch; night steps wait for the timer when a hidden-role holder is dead; dead players gain no extra role knowledge. Keep these when changing the engine.
- Tests live in `src/test/` and use the `Harness` helper (seat-fixed roles, `night()`, `vote()`, `advanceTo()`). Coverage ≥ 90% is enforced in `vitest.config.ts`.

## Common commands

`pnpm infra:up` (docker services) · `pnpm dev` (server + web) · `pnpm dev:mobile` · `pnpm test` · `pnpm typecheck` · `pnpm lint` (Biome) · `pnpm format`

## Gotchas

- Internal packages have **no build step**: `exports` points at `src/index.ts`. The server bundles them with tsup (`noExternal: [/^@werewolf\//]`).
- Mobile (Expo SDK 58) needs **Node ≥ 22.13**. Add mobile deps with `npx expo install <pkg>` (SDK-matched versions), and read `apps/mobile/AGENTS.md` first. Expo APIs change per SDK, so check the versioned docs before writing code.
- On Windows, run tools from an **uppercase drive path** (`D:\...`). A lowercase `d:\` cwd makes Metro fail to resolve `@werewolf/*`.
- `apps/web/src/routeTree.gen.ts` is generated by the TanStack Router Vite plugin and committed. Do not edit it by hand.
- The user's permission settings block writing `.env*` files. Server env vars are documented in `README.md`, and `apps/server/src/config/env.ts` validates them.

## Current status

- 2026-11-18: docs defined; **M0 done** (monorepo, tooling, CI, skeletons). The server has `/health` + Socket.IO `server:hello`. Web and mobile show a placeholder home with a language switch and server status.
- **M1 done**: full game engine for the 6 MVP roles (85 tests, ~98% statements / 93% branches).
- Next: **M2**, backend core: auth (guest + Google), rooms, games over Socket.IO using the engine, PhaseScheduler + recovery, chat, reconnect. See `docs/03-technical-design.md` §11 for all milestones.
- If code and docs disagree, ask the user which one is correct and then update the other to match.
