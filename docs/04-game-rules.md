# 04 — Game Rules (luật chơi chuẩn cho engine)

> Tài liệu này là **nguồn chân lý cho `packages/game-engine`**. Khi đổi luật phải sửa tài liệu này trước, sau đó sửa engine và test.
> Các tùy chọn đánh dấu ⚙️ là cấu hình của phòng (`room.settings.rules`), có giá trị mặc định.

## 0. Luật tùy chỉnh (⚙️)

Chủ phòng chỉnh được **khi tạo phòng và trong sảnh, trước khi bấm bắt đầu**. Mỗi lần đổi, mọi người trong phòng đều thấy ngay. Lúc game bắt đầu, cấu hình được chụp lại vào `game.settingsSnapshot` và **không đổi được trong trận**.

| Key                        | Ý nghĩa                                                | Mặc định                   | Giá trị khác                                     |
| -------------------------- | ------------------------------------------------------ | -------------------------- | ------------------------------------------------ |
| `witchCanSelfHeal`         | Phù thủy được dùng bình cứu cho chính mình             | **`true`**                 | `false`                                          |
| `guardCanSelfProtect`      | Bảo vệ được bảo vệ chính mình                          | **`true`**                 | `false`                                          |
| `noKillFirstNight`         | Đêm đầu tiên sói không được cắn                        | **`false`** (sói được cắn) | `true`                                           |
| `revealRoleOnDeath`        | Công khai vai của người chết                           | **`false`**                | `true`                                           |
| `voteTieBreak`             | Xử lý hòa phiếu ban ngày                               | **`none`** (không ai chết) | `revote` (bỏ phiếu lại, tối đa `maxRevotes` lần) |
| `maxRevotes`               | Số lần bỏ phiếu lại tối đa khi `voteTieBreak = revote` | **`3`**                    | 1–3                                              |
| `witchOnePotionPerNight`   | Mỗi đêm phù thủy chỉ dùng tối đa 1 bình                | `true`                     | `false`                                          |
| `hunterShootsWhenPoisoned` | Thợ săn bị độc vẫn được bắn                            | `false`                    | `true`                                           |
| `wolfTieBreak`             | Sói hòa phiếu chọn mục tiêu                            | `random`                   | `none`                                           |
| Timer (`*Seconds`)         | Thời gian từng phase, xem §4                           | như §4                     | trong giới hạn min/max                           |

## 1. Phe & điều kiện thắng

| Phe                  | Thắng khi                                          |
| -------------------- | -------------------------------------------------- |
| Dân làng (`village`) | Tất cả sói đã chết                                 |
| Sói (`wolves`)       | Số sói còn sống ≥ số người không phải sói còn sống |

Engine kiểm tra thắng thua sau **mỗi lần có người chết** (bình minh, xử tử, thợ săn bắn). Nếu cả hai điều kiện cùng đúng một lúc (hiếm gặp, ví dụ thợ săn bắn chết con sói cuối cùng khi số người bằng nhau), **dân làng thắng**.

## 2. Vai trò MVP

| Vai trò (`RoleId`)  | Phe     | Khả năng                                                                                                                                                                           |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `villager` Dân làng | village | Không có khả năng đêm                                                                                                                                                              |
| `werewolf` Sói      | wolves  | Mỗi đêm cùng bầy chọn 1 người để cắn. Biết đồng đội                                                                                                                                |
| `seer` Tiên tri     | village | Mỗi đêm soi 1 người, biết người đó **có phải sói hay không**                                                                                                                       |
| `guard` Bảo vệ      | village | Mỗi đêm bảo vệ 1 người khỏi bị sói cắn. Không được bảo vệ cùng một người 2 đêm liên tiếp. ⚙️ `guardCanSelfProtect` (mặc định `true`)                                               |
| `witch` Phù thủy    | village | 1 bình cứu và 1 bình độc cho cả trận. Biết ai bị sói cắn đêm đó. Mỗi đêm dùng tối đa 1 bình ⚙️ `witchOnePotionPerNight` (mặc định `true`). ⚙️ `witchCanSelfHeal` (mặc định `true`) |
| `hunter` Thợ săn    | village | Khi chết được bắn 1 người chết theo. ⚙️ `hunterShootsWhenPoisoned` (mặc định `false`)                                                                                              |

### Vai trò Release 2 (đã chừa chỗ trong thiết kế)

`cupid` (đêm đầu ghép cặp đôi: một người chết thì người kia chết theo; nếu cặp đôi khác phe thì tạo phe thứ ba), `alpha_wolf` (1 lần biến người bị cắn thành sói), `little_girl` (thấy mờ hành động của sói), `fool` (bị treo cổ thì không chết nhưng mất quyền bỏ phiếu), `elder` (chịu được 1 lần sói cắn).

## 3. Preset bộ vai theo số người

| Số người | Sói | Tiên tri | Bảo vệ | Phù thủy | Thợ săn | Dân |
| -------- | --- | -------- | ------ | -------- | ------- | --- |
| 6        | 2   | 1        | 1      | 0        | 0       | 2   |
| 7        | 2   | 1        | 1      | 1        | 0       | 2   |
| 8        | 2   | 1        | 1      | 1        | 1       | 2   |
| 9        | 2   | 1        | 1      | 1        | 1       | 3   |
| 10       | 3   | 1        | 1      | 1        | 1       | 3   |
| 12       | 3   | 1        | 1      | 1        | 1       | 5   |
| 14       | 4   | 1        | 1      | 1        | 1       | 6   |
| 16       | 4   | 1        | 1      | 1        | 1       | 8   |

Kiểm tra hợp lệ khi chủ phòng tự chỉnh: tổng số vai = số người; 1 ≤ số sói < số người / 2; các vai đặc biệt tối đa 1 người mỗi vai.

## 4. Vòng lặp phase

```
LOBBY → ROLE_REVEAL (10s)
  → NIGHT ─┬─ step 1 (song song): guard, werewolves, seer      ⚙️ nightActionSeconds = 40
           └─ step 2: witch (thấy kết quả cắn của step 1)       ⚙️ witchSeconds = 20
  → DAWN (công bố người chết, 8s) → [HUNTER_SHOT nếu có] → check win
  → DISCUSSION: lần lượt từng người sống nói theo ghế          ⚙️ speakingSeconds = 30 / người
  → VOTE (im lặng, chỉ bấm phiếu)                               ⚙️ voteSeconds = 30
  → [DEFENSE: người bị nhiều phiếu nhất phát biểu]              ⚙️ defenseSeconds = 20 (0 = bỏ)
  → EXECUTION (công bố) → [HUNTER_SHOT nếu có] → check win
  → NIGHT (round + 1) ...
→ GAME_OVER
```

- Đêm 1 vẫn có sói cắn, trừ khi bật ⚙️ `noKillFirstNight` (mặc định `false`).
- Chuyển phase sớm (chỉ áp dụng cho các step ban đêm, lượt nói và HUNTER_SHOT): khi **mọi người cần hành động** đã gửi hành động (hoặc bấm "bỏ qua"/"Xong"). VOTE luôn chạy hết giờ để người chơi còn đổi phiếu được; DAWN, DEFENSE, EXECUTION cũng chạy hết giờ.
- **Lượt nói ban ngày (DISCUSSION)**: mỗi người còn sống được nói một lượt `speakingSeconds` (mặc định 30 s) theo thứ tự ghế. Ngày thứ N bắt đầu từ người thứ N trong danh sách (xoay vòng) để không ai luôn nói đầu. Chỉ người đang có lượt được nói và gửi chat ở `main`. Người đó bấm **"Xong"** (`END_TURN`) để nhường lượt sớm. Hết vòng thì sang VOTE.
- **Chống lộ thông tin qua thời gian**: nếu người giữ vai đặc biệt (bảo vệ, tiên tri, phù thủy) đã chết và vai đang ẩn (`revealRoleOnDeath = false`), step đó **chờ hết giờ** chứ không kết thúc sớm. Nếu kết thúc sớm, người chơi sẽ đoán ra vai đó đã chết. Tương tự, step 2 (phù thủy) **luôn diễn ra nếu bộ vai có phù thủy**, kể cả khi phù thủy đã chết hoặc đã hết bình.
- Hết giờ mà chưa hành động: coi như bỏ qua. Riêng sói: chưa ai chọn thì đêm đó không ai bị cắn.
- Ràng buộc mục tiêu: sói không cắn được sói; tiên tri không soi chính mình; phù thủy không độc chính mình; thợ săn không bắn chính mình; không ai bỏ phiếu cho chính mình. Mọi mục tiêu phải còn sống.

## 5. Giải quyết đêm (thứ tự resolve)

1. **Sói**: mục tiêu là người có nhiều phiếu nhất trong bầy. Hòa phiếu thì ⚙️ `wolfTieBreak`: `random` (mặc định) hoặc `none`.
2. **Bảo vệ**: nếu bảo vệ đúng mục tiêu của sói thì mục tiêu đó không chết vì sói cắn.
3. **Phù thủy** (step 2) được xem mục tiêu của sói **trước khi áp dụng bảo vệ**, để không lộ ai đã được bảo vệ. Cứu thì mục tiêu sống. Độc thì người bị độc chết, **bảo vệ không chặn được độc**.
4. **Tiên tri**: nhận kết quả **ngay khi soi** qua event riêng, chỉ mình tiên tri thấy. Kết quả không phụ thuộc hành động của vai khác nên không cần chờ hết step 1.
5. Tổng hợp danh sách chết, công bố ở DAWN theo **thứ tự xáo trộn**, không nói nguyên nhân chết. ⚙️ `revealRoleOnDeath` (mặc định `false`) quyết định có công khai vai của người chết hay không. Dù tắt, vai của mọi người vẫn được công khai ở GAME_OVER.

## 6. Bỏ phiếu ban ngày

- Mỗi người sống có 1 phiếu, được đổi tới hết giờ, được bỏ trắng (`skip`). Người không bỏ phiếu là **vắng mặt**, không tính là phiếu trắng.
- Người có số phiếu cao nhất **và** lớn hơn số phiếu trắng thì bị xử tử. Chỉ coi là hòa khi số phiếu cao nhất lớn hơn số phiếu trắng mà có từ 2 người trở lên cùng đứng đầu.
- Hòa phiếu thì ⚙️ `voteTieBreak`:
  - `none` (mặc định): không ai chết, chuyển sang đêm.
  - `revote`: bỏ phiếu lại, **chỉ được bầu cho những người đang hòa** (vẫn được bỏ trắng), timer bằng `voteSeconds`. Hòa tiếp thì lặp lại, tối đa ⚙️ `maxRevotes` lần (mặc định 3). Sau lần cuối vẫn hòa thì không ai chết.
- Phiếu là công khai, mọi người thấy theo thời gian thực.

## 7. Thợ săn

Khi thợ săn chết (do sói, xử tử, hoặc độc nếu ⚙️ cho phép), engine chèn phase `HUNTER_SHOT` (15 s). Thợ săn chọn 1 người còn sống, người đó chết ngay. Hết giờ thì không bắn. Nếu nhiều người chết cùng lúc, mọi cái chết được công bố trước rồi mới tới lượt thợ săn bắn. Kiểm tra thắng thua diễn ra **sau** phát bắn, vì phát bắn có thể đổi kết quả.

## 7b. Ai biết gì

- Mỗi người biết vai của mình. Sói biết toàn bộ bầy sói (kể cả sói đã chết).
- Vai của người chết chỉ công khai khi bật `revealRoleOnDeath`. Ở GAME_OVER thì công khai tất cả.
- **Người chết không được biết thêm vai nào**: thợ săn đã chết vẫn còn phải bắn, và người chết có thể báo cho người sống qua kênh ngoài game.
- Phiếu ban ngày công khai. Phiếu của sói chỉ bầy sói thấy. Kết quả soi chỉ tiên tri thấy. Nạn nhân của sói chỉ phù thủy thấy, và chỉ trong step 2.

## 8. Quyền giao tiếp theo phase (áp dụng cho cả voice, chat chữ và phụ đề)

**Nói theo lượt**: ở mỗi thời điểm, kênh `main` có **tối đa một người được nói**. Kênh sói chỉ mở khi sói thức dậy. "Nói" nghĩa là cả bật mic lẫn gửi chat chữ (engine: `voicePermissions` / `canSend`).

| Phase                   | Người sống (dân)                             | Sói còn sống                     | Người chết                   | Khán giả    |
| ----------------------- | -------------------------------------------- | -------------------------------- | ---------------------------- | ----------- |
| LOBBY                   | nói/nghe `main`                              | nói/nghe `main`                  | —                            | nghe `main` |
| ROLE_REVEAL             | im lặng, không nghe gì                       | im lặng (chỉ được biết đồng đội) | nói/nghe `dead`              | không nghe  |
| NIGHT step 1 (sói thức) | im lặng, không nghe gì                       | nói/nghe `wolves`                | nói/nghe `dead`              | không nghe  |
| NIGHT step 2 (phù thủy) | im lặng, không nghe gì                       | im lặng                          | nói/nghe `dead`              | không nghe  |
| DAWN, VOTE, EXECUTION   | chỉ nghe `main` (không ai nói)               | như dân                          | nghe `main`, nói/nghe `dead` | nghe `main` |
| DISCUSSION              | **chỉ người đang có lượt** nói, còn lại nghe | như dân                          | như trên                     | nghe `main` |
| DEFENSE                 | chỉ người bị đưa lên nói, còn lại nghe       | như dân                          | như trên                     | nghe `main` |
| HUNTER_SHOT             | nghe `main`, chỉ thợ săn (đã chết) nói       | như dân                          | như trên                     | nghe `main` |
| GAME_OVER               | mọi người nói/nghe `main`                    |                                  |                              |             |

Người chết luôn được nói chuyện với nhau ở kênh `dead`; người sống không nghe được kênh này.
