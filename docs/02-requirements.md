# 02 — Requirements (Functional & Non-functional)

> Mã yêu cầu dùng để tham chiếu trong code, PR và test: `FR-<MODULE>-<số>` / `NFR-<số>`.
> Ưu tiên: **P0** = MVP bắt buộc, **P1** = Release 2, **P2** = Release 3.
> Luật chơi chi tiết nằm ở [04-game-rules.md](04-game-rules.md).

## 1. Functional Requirements

### 1.1 Auth & tài khoản (`AUTH`)

| ID         | Yêu cầu                                                                                                                                                                 | Ưu tiên |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-AUTH-01 | Đăng nhập khách: chỉ cần nickname (3–20 ký tự), hệ thống tạo user `guest` và cấp token                                                                                  | P0      |
| FR-AUTH-02 | Đăng nhập **Google** (web: Google Identity Services; mobile: Google Sign-In native). Server verify ID token                                                             | P0      |
| FR-AUTH-03 | Liên kết tài khoản khách với Google, giữ nguyên lịch sử và thống kê                                                                                                     | P1      |
| FR-AUTH-04 | Đăng nhập Apple. Cần cân nhắc trước khi lên App Store, vì guideline 4.8 của Apple yêu cầu có lựa chọn đăng nhập bảo vệ quyền riêng tư khi app dùng đăng nhập bên thứ ba | P1      |
| FR-AUTH-05 | Access token 15 phút + refresh token 30 ngày (xoay vòng, thu hồi được)                                                                                                  | P0      |
| FR-AUTH-06 | Hồ sơ: tên hiển thị, avatar, ngôn ngữ giao diện, ngôn ngữ phụ đề muốn nhận                                                                                              | P0      |
| —          | **Không** làm đăng nhập email/password                                                                                                                                  | —       |

### 1.2 Phòng (`ROOM`)

| ID         | Yêu cầu                                                                                                                                                                                                                                                                                                                                                                      | Ưu tiên |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-ROOM-01 | Tạo phòng, sinh mã 6 ký tự (không có ký tự dễ nhầm như 0/O, 1/I)                                                                                                                                                                                                                                                                                                             | P0      |
| FR-ROOM-02 | Vào phòng bằng mã hoặc deep link (`/r/:code`, `werewolf://r/:code`)                                                                                                                                                                                                                                                                                                          | P0      |
| FR-ROOM-03 | Danh sách phòng công khai đang chờ, lọc theo ngôn ngữ và số người                                                                                                                                                                                                                                                                                                            | P0      |
| FR-ROOM-04 | Chủ phòng cấu hình **khi tạo phòng và trong sảnh trước khi bắt đầu**: bộ vai trò (hoặc preset theo số người), timer từng phase, bật/tắt voice và phụ đề, và các luật tùy chỉnh ở [04-game-rules.md §0](04-game-rules.md#0-luật-tùy-chỉnh-) (phù thủy tự cứu, bảo vệ tự bảo vệ, đêm đầu được cắn, công khai vai khi chết, xử lý hòa phiếu). Cấu hình bị khóa khi game bắt đầu | P0      |
| FR-ROOM-05 | Người chơi bấm "Sẵn sàng"; chủ phòng chỉ start được khi đủ số người và bộ vai trò hợp lệ                                                                                                                                                                                                                                                                                     | P0      |
| FR-ROOM-06 | Chủ phòng kick người chơi; chủ phòng rời thì quyền chủ phòng chuyển cho người vào sớm nhất                                                                                                                                                                                                                                                                                   | P0      |
| FR-ROOM-07 | Sau khi trận kết thúc, cả phòng quay lại sảnh để chơi tiếp                                                                                                                                                                                                                                                                                                                   | P0      |
| FR-ROOM-08 | Khán giả: xem trận, nghe kênh ban ngày, không thấy vai trò                                                                                                                                                                                                                                                                                                                   | P1      |
| FR-ROOM-09 | Ghép trận nhanh                                                                                                                                                                                                                                                                                                                                                              | P1      |

### 1.3 Game (`GAME`)

| ID         | Yêu cầu                                                                                                                                                                          | Ưu tiên |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-GAME-01 | Server chia vai ngẫu nhiên (seeded RNG, có log seed để debug), mỗi người chỉ nhận vai của mình                                                                                   | P0      |
| FR-GAME-02 | Vòng lặp phase: Đêm → Bình minh → Thảo luận (nói theo lượt) → Bỏ phiếu → Xử tử → kiểm tra thắng                                                                                  | P0      |
| FR-GAME-14 | **Nói theo lượt** ban ngày: mỗi người sống một lượt `speakingSeconds` theo thứ tự ghế, người bắt đầu xoay vòng mỗi ngày; người đang nói bấm "Xong" để nhường lượt sớm            | P0      |
| FR-GAME-03 | Mỗi phase có timer; hành động đủ sớm thì chuyển phase sớm; hết giờ thì dùng hành động mặc định (bỏ qua)                                                                          | P0      |
| FR-GAME-04 | Hành động ban đêm theo vai trò (Sói cắn, Tiên tri soi, Bảo vệ bảo vệ, Phù thủy cứu/độc), server kiểm tra hợp lệ (đúng vai, còn sống, đúng phase, còn lượt dùng, mục tiêu hợp lệ) | P0      |
| FR-GAME-05 | Sói thấy đồng đội và lựa chọn của nhau theo thời gian thực; mục tiêu là người có nhiều phiếu nhất; nếu hòa thì xử theo cấu hình phòng                                            | P0      |
| FR-GAME-06 | Bỏ phiếu ban ngày công khai, được đổi phiếu tới khi hết giờ, được bỏ phiếu trắng                                                                                                 | P0      |
| FR-GAME-07 | Thợ săn khi chết được chọn 1 người bắn chết theo (có timer)                                                                                                                      | P0      |
| FR-GAME-08 | Phát hiện thắng thua: hết sói → Dân thắng; số sói ≥ số người còn lại → Sói thắng                                                                                                 | P0      |
| FR-GAME-09 | Kết thúc trận: công bố vai trò mọi người và timeline trận đấu                                                                                                                    | P0      |
| FR-GAME-10 | Reconnect: mất kết nối rồi vào lại vẫn tiếp tục được, nhận lại state và các event bị lỡ                                                                                          | P0      |
| FR-GAME-11 | Người chết không hành động được, chỉ xem và nói chuyện ở kênh người chết                                                                                                         | P0      |
| FR-GAME-12 | Vai trò mở rộng (Cupid, Sói đầu đàn, Cô bé, Kẻ ngốc, Già làng)                                                                                                                   | P1      |
| FR-GAME-13 | Lịch sử trận, xem lại timeline                                                                                                                                                   | P2      |

### 1.4 Voice (`VOICE`) — bắt buộc

| ID          | Yêu cầu                                                                                                                                                                                                                                             | Ưu tiên |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-VOICE-01 | Voice chat nhiều người trong phòng (sảnh và trong trận), tối đa 16 người nói                                                                                                                                                                        | P0      |
| FR-VOICE-02 | **Quyền nói/nghe do server quyết định theo phase và lượt nói** (bảng ma trận ở [04-game-rules.md §8](04-game-rules.md#8-quyền-giao-tiếp-theo-phase-áp-dụng-cho-cả-voice-chat-chữ-và-phụ-đề)): kênh `main` có tối đa một người nói tại một thời điểm | P0      |
| FR-VOICE-03 | Ban đêm: dân làng không nói và không nghe; sói chỉ nói và nghe nhau trong kênh riêng **khi tới lượt sói** (đêm step 1). Lúc bỏ phiếu không ai được nói                                                                                              | P0      |
| FR-VOICE-04 | Người chết vào kênh "ma": nghe được ban ngày, nói với người chết khác, người sống không nghe thấy                                                                                                                                                   | P0      |
| FR-VOICE-05 | Tự tắt/mở mic, push-to-talk (tùy chọn), chỉnh âm lượng từng người, hiện chỉ báo đang nói                                                                                                                                                            | P0      |
| FR-VOICE-06 | Chủ phòng mute một người trong sảnh                                                                                                                                                                                                                 | P1      |
| FR-VOICE-07 | Chạy được trên Chrome/Safari/Firefox desktop, Safari iOS, Chrome Android và app Expo                                                                                                                                                                | P0      |

### 1.5 Phụ đề & dịch AI (`CAP`)

| ID        | Yêu cầu                                                                                | Ưu tiên |
| --------- | -------------------------------------------------------------------------------------- | ------- |
| FR-CAP-01 | Chuyển giọng nói thành văn bản (STT) cho từng người nói, hiện phụ đề kèm tên người nói | P1      |
| FR-CAP-02 | Mỗi người chọn 1–2 ngôn ngữ muốn đọc phụ đề; hệ thống dịch sang các ngôn ngữ đó        | P1      |
| FR-CAP-03 | Phụ đề tuân theo đúng quyền nghe (dân làng không nhận phụ đề kênh sói)                 | P1      |
| FR-CAP-04 | Dịch tin nhắn chat chữ (bấm để dịch, hoặc tự dịch)                                     | P1      |
| FR-CAP-05 | Chủ phòng bật/tắt phụ đề cho phòng; người chơi bật/tắt phía mình                       | P1      |
| FR-CAP-06 | Ngôn ngữ bản đầu: vi, en. Mở rộng tiếp: zh, ja, ko, th, id, es                         | P1      |
| FR-CAP-07 | Không lưu audio; transcript chỉ lưu 24 giờ phục vụ báo cáo vi phạm                     | P1      |

### 1.6 Chat chữ (`CHAT`)

| ID         | Yêu cầu                                                                                                                                                                                        | Ưu tiên |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-CHAT-01 | Các kênh `lobby`, `main`, `wolves`, `dead`; server lọc người gửi và người nhận theo **cùng luật lượt nói với voice** (`canSend` của engine): chỉ người đang có lượt mới gửi được tin ở kênh đó | P0      |
| FR-CHAT-02 | Giới hạn tần suất gửi (5 tin / 5 s) và độ dài 300 ký tự; lọc từ cấm cơ bản                                                                                                                     | P0      |
| FR-CHAT-03 | Chat của trận chỉ hiển thị trong trận đó và mất khỏi client khi rời trận. Server lưu chat **24 giờ** (TTL) chỉ để phục vụ reconnect và báo cáo, sau đó tự xóa                                  | P0      |

### 1.7 Thông báo & khác

| ID         | Yêu cầu                                                                                                                                                                                 | Ưu tiên |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-MISC-01 | Mobile rung hoặc gửi thông báo khi đến lượt mình hành động                                                                                                                              | P0      |
| FR-MISC-02 | Báo cáo người chơi **trong vòng 24 giờ sau khi trận kết thúc**; quá 24 giờ thì không báo cáo được nữa. Khi báo cáo, server copy chat và transcript liên quan vào báo cáo làm bằng chứng | P1      |
| FR-MISC-03 | Thống kê cá nhân (số trận, tỉ lệ thắng theo vai)                                                                                                                                        | P1      |
| FR-MISC-04 | Xếp hạng, mùa giải                                                                                                                                                                      | P2      |

## 2. Non-functional Requirements

| ID     | Loại              | Yêu cầu                                                                                                                                                                                                                                                                                                                |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Bảo mật game      | **Server authoritative**: client không bao giờ nhận thông tin mình không được biết (vai trò người khác, mục tiêu của sói, kết quả soi của người khác). Mọi state gửi xuống đều qua hàm projection theo từng người chơi                                                                                                 |
| NFR-02 | Toàn vẹn dữ liệu  | Hành động được ghi atomically: điều kiện vai, phase và lượt nằm trong filter của `findOneAndUpdate`, kèm optimistic concurrency (`version`)                                                                                                                                                                            |
| NFR-03 | Độ trễ            | Socket event p95 < 200 ms; voice p95 < 300 ms; phụ đề ≤ 3 s                                                                                                                                                                                                                                                            |
| NFR-04 | Quy mô            | Mỗi instance server chịu ≥ 300 trận đồng thời. Scale ngang bằng cách cho mỗi trận chạy trên một instance (lease trong Mongo), **không dùng Redis**                                                                                                                                                                     |
| NFR-05 | Độ bền            | Server restart không làm mất trận: state nằm trong Mongo, timer được khôi phục từ `phase.endsAt` khi khởi động                                                                                                                                                                                                         |
| NFR-06 | Bảo mật           | HTTPS/WSS, rate limit, validate mọi input bằng Zod, token LiveKit chỉ do server cấp và có TTL ngắn                                                                                                                                                                                                                     |
| NFR-07 | Quyền riêng tư    | Không ghi âm; phụ đề là opt-in; hiển thị thông báo khi phụ đề AI đang bật                                                                                                                                                                                                                                              |
| NFR-08 | i18n              | Đa ngôn ngữ; MVP có **en** và **vi**, thêm ngôn ngữ mới chỉ cần thêm file locale. Toàn bộ text UI dùng i18n key. **Ngôn ngữ mặc định theo vị trí/locale của thiết bị**: locale hoặc region là `vi`/`VN` thì dùng tiếng Việt, còn lại dùng tiếng Anh. Người dùng đổi được bất cứ lúc nào và lựa chọn được lưu vào hồ sơ |
| NFR-09 | Nền tảng          | Web: 2 phiên bản mới nhất của các trình duyệt lớn. Mobile: iOS 15+, Android 8+ (theo mức tối thiểu của Expo SDK đang dùng)                                                                                                                                                                                             |
| NFR-10 | Chất lượng        | Game engine có unit test ≥ 90% coverage; CI chạy lint, typecheck và test                                                                                                                                                                                                                                               |
| NFR-11 | Quan sát được     | Log có cấu trúc (pino) kèm `gameId`/`userId`; mỗi trận có event log append-only để debug và replay                                                                                                                                                                                                                     |
| NFR-12 | Khả năng truy cập | Hỗ trợ screen reader cơ bản; phụ đề cũng giúp người khiếm thính                                                                                                                                                                                                                                                        |
