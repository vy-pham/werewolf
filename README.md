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
pnpm dev:local         # KHÔNG cần Docker: server + MongoDB trong bộ nhớ + web (:5173)
pnpm infra:up          # Docker: Mongo (rs0) + LiveKit dev — cần cho voice chat
# tạo apps/server/.env theo bảng bên dưới
pnpm dev               # server :4000 + web :5173
pnpm dev:mobile        # Expo (Metro)
```

Kiểm tra: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Test của server dùng MongoDB chạy trong bộ nhớ (`mongodb-memory-server`), không cần Docker; lần chạy đầu sẽ tải binary MongoDB.

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

### Chạy app trên điện thoại Android (dev build)

App dùng module native (LiveKit) nên **không chạy trên Expo Go**, cần cài bản dev build một lần:

1. Đăng nhập Expo (chỉ lần đầu): `cd apps/mobile && npx eas-cli@latest login`
2. Build APK dev trên cloud của Expo: `npx eas-cli@latest build --profile development --platform android`. Lần đầu EAS sẽ hỏi tạo project và keystore, cứ chọn mặc định. Build xong, mở link EAS in ra trên điện thoại để tải và cài APK.
3. Điện thoại và máy tính **cùng Wi-Fi**. Tìm IP LAN của máy tính (`ipconfig`, ví dụ `192.168.1.10`), rồi chạy:

   ```bash
   LIVEKIT_NODE_IP=192.168.1.10 pnpm infra:up   # LiveKit quảng bá IP LAN cho điện thoại
   LIVEKIT_URL=ws://192.168.1.10:7880 pnpm dev:local
   pnpm dev:mobile                               # Metro; mở app dev build và chọn server này
   ```

   Trên PowerShell, đặt biến môi trường bằng `$env:LIVEKIT_NODE_IP='192.168.1.10'` trước lệnh.
4. Mở cổng trên Windows Firewall cho mạng Private: TCP 4000, 7880, 7881, 8081 và UDP 7882.

Chỉ cần build lại APK khi thêm hoặc đổi module native; đổi code JS thì Metro tự tải lại.

## Trạng thái

- ✅ M0: monorepo, tooling, CI, khung server / web / mobile / shared / game-engine / i18n
- ✅ M1: game engine đủ 6 vai, lọc thông tin theo người xem, quyền voice theo phase + nói theo lượt (94 test, coverage ~98%)
- ✅ M2: backend core: đăng nhập khách + Google, phòng, game qua Socket.IO, timer có khôi phục khi restart, chat theo lượt, reconnect (22 test tích hợp)
- ✅ M3: web MVP: đăng nhập, sảnh, phòng chờ, màn chơi, chat theo lượt, kết quả; test Playwright 8 trình duyệt chơi hết một trận
- ✅ M4: voice chat (LiveKit) cho web: quyền nói/nghe do server cấp theo phase; đã test với LiveKit thật (sói thì thầm ban đêm, ban ngày chỉ một người nói)
- ✅ M5: app mobile (Expo) ngang bằng web: đăng nhập khách, sảnh, phòng, màn chơi, chat, voice LiveKit native; logic client dùng chung qua `packages/client-core`; test Playwright cho host dùng app mobile chơi cùng 5 người web. Voice trên điện thoại thật cần bản dev build (xem phần trên)
- ⏭️ M6: phụ đề AI + dịch
