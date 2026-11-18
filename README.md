# Werewolf Online

Game Ma Sói online cho **Web** và **Mobile**: voice chat theo phase, game engine tự động (không cần quản trò), phụ đề và dịch đa ngôn ngữ bằng AI.

## Tài liệu

1. [BRD](docs/01-brd.md): mục tiêu, phạm vi, release
2. [Requirements](docs/02-requirements.md): yêu cầu functional và non-functional
3. [Technical Design](docs/03-technical-design.md): kiến trúc, stack, database, realtime, voice, AI
4. [Game Rules](docs/04-game-rules.md): luật chơi chuẩn cho engine

## Stack

| Phần      | Công nghệ                                                               |
| --------- | ----------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces, Turborepo, TypeScript, Biome, Vitest                   |
| Backend   | Node.js, Fastify, Socket.IO, Mongoose (MongoDB), Zod (không dùng Redis) |
| Web       | Vite, React, TanStack Router/Query, Zustand, Tailwind                   |
| Mobile    | Expo, Expo Router                                                       |
| Voice     | LiveKit Cloud (WebRTC SFU)                                              |
| Deploy    | Render (server), MongoDB Atlas, Vercel (web), EAS (mobile)              |
| AI phụ đề | faster-whisper (STT) + NLLB-200 (dịch) qua LiveKit Agents (Python)      |

## Cấu trúc

```
apps/server         Fastify + Socket.IO + Mongoose
apps/web            Vite + React
apps/mobile         Expo + Expo Router
packages/shared     Zod schemas, types, hằng số, socket contract
packages/game-engine Luật chơi (pure TS)
packages/i18n       Bản dịch en / vi
infra/              docker-compose cho dev (Mongo replica set + LiveKit)
```

## Chạy local

Yêu cầu: **Node ≥ 22.13** (khuyên dùng 24, xem `.nvmrc`), pnpm 10, Docker Desktop.

```bash
pnpm install
pnpm infra:up          # Mongo (rs0) + LiveKit dev
# tạo apps/server/.env theo bảng bên dưới
pnpm dev               # server :4000 + web :5173
pnpm dev:mobile        # Expo (Metro)
```

Kiểm tra: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

> **Windows:** mở repo bằng đường dẫn có ký tự ổ đĩa **viết hoa** (`D:\...`). Nếu dùng `d:\...`, Metro (Expo) sẽ không resolve được các package `@werewolf/*`.

### Biến môi trường của server (`apps/server/.env`)

| Biến                                                     | Ví dụ dev                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `PORT`                                                   | `4000`                                                                    |
| `MONGO_URI`                                              | `mongodb://localhost:27017/werewolf?replicaSet=rs0&directConnection=true` |
| `CORS_ORIGINS`                                           | `http://localhost:5173` (cách nhau bằng dấu phẩy)                         |
| `JWT_SECRET`                                             | chuỗi ngẫu nhiên ≥ 32 ký tự                                               |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | `ws://localhost:7880` / `devkey` / `secret`                               |
| `GOOGLE_CLIENT_IDS`                                      | client ID OAuth của web, iOS, Android (cách nhau bằng dấu phẩy)           |
| `LOG_LEVEL`                                              | `info`                                                                    |

Web: `VITE_API_URL` (mặc định `http://localhost:4000`). Mobile: `EXPO_PUBLIC_API_URL` (dev tự lấy IP máy đang chạy Metro).

## Trạng thái

- ✅ M0: monorepo, tooling, CI, khung server / web / mobile / shared / game-engine / i18n
- ✅ M1: game engine đủ 6 vai, lọc thông tin theo người xem, quyền voice theo phase + nói theo lượt (94 test, coverage ~98%)
- ⏭️ M2: backend core (auth, phòng, game qua Socket.IO, timer, chat, reconnect)
