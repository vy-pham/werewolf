# 01 — Business Requirements Document (BRD)

> Dự án: **Werewolf Online** (tên tạm) — game Ma Sói nhiều người chơi trên Web và Mobile, có voice chat và phụ đề đa ngôn ngữ bằng AI.
> Trạng thái: Draft v1 — 2026-11-18

## 1. Bối cảnh & vấn đề

Ma Sói là trò chơi suy luận xã hội: phần lớn thời gian người chơi **nói chuyện, buộc tội và thuyết phục nhau**. Các bản online hiện có thường gặp những vấn đề sau:

- Chỉ có chat chữ, hoặc phải mở thêm Discord/Zalo để nói chuyện → mất trải nghiệm, lộ thông tin (ví dụ sói vẫn nghe được dân làng vào ban đêm).
- Cần một người làm quản trò (moderator) điều phối thủ công → chậm, dễ sai luật, dễ thiên vị.
- Người chơi khác ngôn ngữ không chơi chung được.

## 2. Mục tiêu sản phẩm

| #   | Mục tiêu                                                                     | Thước đo (KPI)                                             |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| G1  | Chơi Ma Sói hoàn toàn tự động, không cần quản trò                            | 100% luật MVP do server điều phối; 0 bug lộ vai trò        |
| G2  | Voice chat tích hợp sẵn, tự đổi kênh theo phase (ngày/đêm/sói/người chết)    | Độ trễ voice < 300 ms (p95)                                |
| G3  | Chơi được trên cả Web và Mobile (iOS/Android), cùng một phòng                | Người chơi Web và Mobile vào chung một trận                |
| G4  | Phụ đề và dịch lời nói theo thời gian thực để người khác ngôn ngữ chơi chung | Phụ đề xuất hiện ≤ 3 s sau khi nói; hỗ trợ vi/en ở bản đầu |
| G5  | Vào trận nhanh                                                               | Từ mở app đến vào phòng ≤ 30 s (chơi bằng tài khoản khách) |

## 3. Đối tượng người dùng

- **Nhóm bạn bè** tạo phòng riêng, gửi mã phòng cho nhau (use case chính của MVP).
- **Người chơi lẻ** vào phòng công khai hoặc dùng ghép trận nhanh (sau MVP).
- **Cộng đồng quốc tế** chơi chung nhờ phụ đề dịch tự động.
- **Streamer/người xem**: chế độ khán giả (sau MVP).

## 4. Phạm vi

### 4.1 Trong phạm vi MVP (Release 1)

- Đăng nhập khách (chỉ nhập nickname) và đăng nhập Google. Không có email/password.
- Tạo phòng, vào bằng mã, danh sách phòng công khai, chủ phòng cấu hình vai trò và thời gian từng phase.
- Game engine tự động với 6 vai trò: **Dân làng, Sói, Tiên tri, Bảo vệ, Phù thủy, Thợ săn**.
- Từ 6 đến 16 người chơi mỗi phòng.
- Voice chat theo phase (ban ngày ai cũng nói được; ban đêm chỉ sói nói với nhau; người chết chỉ nghe/nói ở kênh ma).
- Chat chữ theo kênh (sảnh / ban ngày / sói / người chết).
- Web (desktop + mobile browser) và app Mobile (Expo).
- Giao diện đa ngôn ngữ: MVP có tiếng Anh và tiếng Việt, mặc định theo vị trí/locale của người dùng, đổi được.
- Chủ phòng tùy chỉnh luật trước khi bắt đầu: phù thủy tự cứu, bảo vệ tự bảo vệ, đêm đầu sói được cắn, công khai vai khi chết, xử lý hòa phiếu.

### 4.2 Release 2

- Phụ đề AI cho voice (speech-to-text) và dịch sang ngôn ngữ mỗi người chọn; dịch tin nhắn chat chữ.
- Vai trò mở rộng: Cupid (cặp đôi), Sói đầu đàn, Cô bé, Kẻ ngốc, Già làng.
- Chế độ khán giả, ghép trận nhanh, bạn bè, mời vào phòng.

### 4.3 Release 3

- Xếp hạng (ELO/mùa giải), thống kê, lịch sử trận, xem lại trận.
- Vật phẩm trang trí (avatar, khung, hiệu ứng): chỉ cosmetic, không pay-to-win.
- Công cụ quản trị: báo cáo, cấm người chơi, kiểm duyệt.

### 4.4 Ngoài phạm vi

- Chơi offline hoặc với bot AI.
- Thanh toán thật (chưa làm ở các release trên).
- Lưu file ghi âm voice của người chơi (**không lưu audio**, xem phần quyền riêng tư).

## 5. Các bên liên quan

| Vai trò                      | Trách nhiệm                         |
| ---------------------------- | ----------------------------------- |
| Product owner (Stephan Pham) | Ưu tiên tính năng, duyệt luật chơi  |
| Dev team                     | Backend, Web, Mobile, AI service    |
| Người chơi thử (beta)        | Phản hồi về luật, cân bằng game, UX |

## 6. Ràng buộc & giả định

- **Database bắt buộc dùng MongoDB + Mongoose.**
- Backend Node.js; Web build bằng Vite; Mobile dùng Expo (React Native).
- Voice bắt buộc có → dùng **LiveKit Cloud** (WebRTC SFU). Không dùng P2P mesh vì mạng 4G cần TURN, server không cắt được quyền nghe/nói và người chơi bị lộ IP.
- Hạ tầng tối giản: **Render (server) + MongoDB Atlas + Vercel (web) + LiveKit Cloud**. Không dùng Redis.
- Chat chữ không lưu lâu dài: chỉ giữ 24 giờ để phục vụ báo cáo.
- AI phụ đề phải **nhẹ, tự host được** (Whisper + NLLB bản nhỏ), có thể chạy CPU ở quy mô nhỏ.
- Team nhỏ → ưu tiên ít boilerplate, chia sẻ code TypeScript tối đa giữa các app.

## 7. Rủi ro

| Rủi ro                                 | Ảnh hưởng        | Giảm thiểu                                                                                                                                       |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lộ vai trò qua network/voice/phụ đề    | Phá hỏng game    | Server authoritative, gửi state đã lọc theo từng người; phân quyền voice phía server; phụ đề chỉ gửi đúng người được nghe                        |
| Chi phí voice/AI khi nhiều người chơi  | Chi phí vận hành | Bắt đầu với LiveKit Cloud; khi lớn thì tự host LiveKit trên VPS (mã nguồn mở, client gần như không đổi); AI phụ đề opt-in, có thể tắt theo phòng |
| Độ trễ LiveKit Cloud tới Việt Nam      | Voice trễ        | Đo ở milestone M4; dự phòng bằng Agora hoặc tự host                                                                                              |
| Độ trễ và chất lượng phụ đề tiếng Việt | Trải nghiệm kém  | Chọn model theo phần cứng (small → large-v3-turbo khi có GPU); đánh dấu phụ đề là "beta"                                                         |
| Người chơi AFK hoặc thoát giữa trận    | Trận bị kẹt      | Mọi phase có timer; hết giờ dùng hành động mặc định; cho phép reconnect                                                                          |
| Expo Go không chạy được module WebRTC  | Chậm dev mobile  | Dùng Expo Dev Client và EAS Build ngay từ đầu                                                                                                    |

## 8. Tiêu chí thành công của MVP

- 20 trận beta liên tiếp không có bug luật nghiêm trọng hoặc lộ thông tin.
- Người chơi Web và Mobile chơi chung một trận 12 người, voice ổn định suốt trận.
- Thời gian trung bình một trận 8 người: 15–25 phút.
