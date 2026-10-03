# VNExplore — Data

Dữ liệu địa điểm, vai, nhiệm vụ và giá di chuyển cho app.
**Các file trong `sheets/` là nguồn dữ liệu chính** — sửa ở đây, rồi xuất sang app.

## Các file (`sheets/`)

Mở bằng Google Sheets (File → Import → Upload) hoặc Excel. Mã hoá UTF‑8.

| File | Nội dung |
|---|---|
| `places.csv` | Địa điểm dùng trong app: 176 điểm `approved` (29 ở Ba Vì) + bản nháp |
| `candidates.csv` | Kho địa điểm lấy từ OpenStreetMap **chưa có nội dung**: quanh Hồ Gươm (~2,5 km) và Ba Vì (+ Sơn Tây lân cận). Cột `group`: `sight` (tham quan), `food` (ăn uống), `fun` (thể thao, giải trí). Cột `decision`: `keep` / `drop` |
| `to_add_manually.csv` | Điểm nổi tiếng **không có trên OpenStreetMap** — cần điền toạ độ bằng tay |
| `roles.csv` | Vai của chế độ Khám phá (4 đã duyệt + 8 nháp). Người chơi chọn vai **sau khi** có lộ trình |
| `role_templates.csv` | Nhiệm vụ mẫu của từng vai theo loại điểm (`sight` / `food` / `fun` / `event`) |
| `missions.csv` | Nhiệm vụ theo vai × địa điểm |
| `quizzes.csv` | Câu đố thêm cho mỗi địa điểm (lịch sử, truyền thuyết, kiến trúc…), mỗi câu có **giải thích** và **nguồn** |
| `transport.csv` | Giá cước, tốc độ, phí gửi xe (hiện app vẫn đọc từ `Frontend/src/data/transport.ts`) |
| `events.csv` | Sự kiện có ngày giờ (hoà nhạc, triển lãm, phố đi bộ…) — thêm vào quest như một điểm dừng **giờ cố định** |

### Nguồn, lưu ý và số điện thoại (`places.csv`)
- `sources`: link nguồn (cách nhau bằng `; `) — app hiện "Nguồn: …" có link ở thẻ địa điểm và trang điểm dừng.
- `notice_vi` / `notice_en`: lưu ý hiện nổi bật (vd. workshop: "Nên liên hệ trước khi đến"); `phone`: số gọi được (nút "Gọi …").
- Sự kiện: `time_confirmed=false` khi nguồn không ghi giờ — app gắn nhãn "Giờ dự kiến".
- Lần nhập `Van_hoa_Giai_tri_Ha_Noi (1).xlsx` (03/10/2026): `scripts/import_vhgt_2026-10.mjs` — trạng thái theo cột "Xác minh" của file; giá không có trong nguồn là ước tính (ghi ở `review_notes`); toạ độ từ OpenStreetMap/Nominatim. Cần migration `0012_place_notice_event_time.sql` trước khi chạy `seed_content.sql`.

### Hai loại địa điểm (`places.csv`)
| Cột | Giá trị |
|---|---|
| `area` | `hoan-kiem` hoặc `ba-vi` — một lộ trình không trộn hai khu |
| `kind` | `sight` (tham quan) · `food` (ăn uống) · `fun` (vui chơi) |
| `depth` | `full`: có câu chuyện + thử thách, dùng cho cả 3 chế độ · `quick`: chỉ cần giới thiệu, giá, thời gian (quán ăn, chỗ chơi) |

- Tên địa điểm giữ nguyên như bản gốc; `name_en` để trống thì app dùng tên gốc. **Nội dung (giới thiệu, câu chuyện…) phải có đủ VI + EN.**
- Tư liệu duyệt Ba Vì trước đây được lưu tại `review/ba_vi_drafts.md`; các điểm đã duyệt nằm trong `places.csv`.

### Sự kiện (`events.csv`)
App lấy khung giờ chuyến đi (giờ xuất phát → + số giờ yêu cầu) và gợi ý mọi sự kiện **approved** cùng khu vực đang diễn ra trong khung đó. Thêm vào quest thì sự kiện thành một điểm dừng có giờ cố định: app xếp lịch quanh nó, báo **chờ** nếu tới sớm và **muộn** nếu không kịp; nút **Xem chi tiết** mở `event_url`.

| Cột | Giá trị |
|---|---|
| `area` | `hoan-kiem` (≤ 3 km quanh hồ), `ba-vi`, hoặc `hanoi` (mọi nơi khác trong thành phố) — app gợi ý mọi sự kiện mà người dùng **kịp tới từ vị trí thật của họ**, không giới hạn khu vực |
| `kind` | `show`: phải có mặt trước giờ bắt đầu, ở lại `visit_min` phút · `open`: ghé lúc nào cũng được từ `start_times` đến `end_time` (triển lãm, phố đi bộ) |
| `category` | music, theatre, film, exhibition, workshop, talk, market, festival, other |
| `sensitivity` | `ok` hoặc `adult` (quán bar, 18+) |
| `from_date`, `to_date` | YYYY-MM-DD, tính cả hai đầu |
| `weekdays` | Để trống = mọi ngày; hoặc `fri; sat; sun` (sun, mon, tue, wed, thu, fri, sat) |
| `start_times` | Giờ Hà Nội HH:MM; nhiều suất/ngày: `15:00; 16:10; 18:30` |
| `price_min_k`, `price_max_k` | Để trống cả hai = chưa biết giá (app ghi "xem trên trang sự kiện") |
| `event_url` | Phải là `https://` |
| `place_id` | Điểm trong `places.csv` ở ngay cạnh (tự gợi ý trong bán kính ~80 m — kiểm tra lại) |

- Sự kiện tự động lấy **toàn bộ** từ [Hanoi Maps](https://hanoimaps.github.io/events/) (`id` = `hm-…`), không lọc khu vực: `node Data/scripts/fetch_events.mjs`. Chạy lại thì cập nhật ngày/giờ/link từ nguồn nhưng **giữ nguyên các cột bạn đã sửa** (status, tên EN, giới thiệu, giá, kind…). Dòng tự thêm (id khác) không bị đụng tới.
- Dòng nhập mới được `approved` khi có giờ bắt đầu và link https; thiếu giờ, hoặc "show" kéo dài hơn một tuần (thường là lịch hằng tuần — cần điền `weekdays`) thì để `draft`.
- Ngày giờ sự kiện thay đổi liên tục: nên chạy `fetch_events.mjs` → `export_app.mjs` thường xuyên (vd. mỗi tuần).

### Vai và nhiệm vụ (`roles.csv`, `missions.csv`, `role_templates.csv`)
Luồng Khám phá: **chọn điểm → xem lộ trình → chọn vai**. App chấm điểm mỗi vai theo các điểm trong lộ trình và gợi ý 3 vai hợp nhất.
- `roles.csv`: `status` (`draft`/`approved`) · `area` (`any`, `hoan-kiem`, `ba-vi`) · `tags` — chủ đề (culture, food, history, photo, rainy, fun), loại điểm (sight, food, fun), thể loại sự kiện (music, theatre, film, exhibition, workshop, talk, market, festival) hoặc `event` · `fav_places` = điểm rất hợp với vai (cộng điểm khi gợi ý).
- `missions.csv`: nhiệm vụ viết riêng cho một vai tại một điểm (ưu tiên cao nhất).
- `role_templates.csv`: nhiệm vụ mẫu theo loại điểm, `{place}` được thay bằng tên điểm. Nhiều dòng cho cùng vai × loại = nhiều phương án; cột `tag` (tuỳ chọn: một chủ đề hoặc tag của điểm, vd. `cultural` cho đền chùa, `photo`, `history`) để phương án đó được ưu tiên ở đúng loại điểm. Mỗi điểm luôn nhận cùng một phương án.
- **Duyệt bản nháp ngay trong app:** chạy `export_app.mjs` rồi `npm run dev` — khi chạy local, các vai/nhiệm vụ `draft` được hiện kèm nhãn "Nháp" (từ `generated/drafts.json`). Bản build production chỉ có dòng `approved`. Vai nháp cũng không được đưa vào `seed_content.sql`.

### Chơi nhóm (escape room)
Bảng `parties`, `party_members`, `party_progress`, `party_puzzles` (`migrations/0010_parties.sql`). Chủ phòng tạo phòng từ lộ trình → mã 6 ký tự → bạn bè vào bằng tên (đăng nhập khách), mỗi người một vai không trùng, tự đóng dấu từng điểm; câu đố ở điểm "full" được chia gợi ý cho từng người; đồng hồ tắt / bấm giờ / đếm ngược (mặc định theo số giờ trong yêu cầu). Cần bật **Authentication → Sign In / Providers → Allow anonymous sign-ins** trong Supabase; muốn khách nâng cấp bằng Google thì bật thêm **Manual linking**.

**Tài khoản khách** (`migrations/0011_guest_safety.sql`):
- Khách chơi được (phòng, hộ chiếu) nhưng **không đăng / sửa / thả tim quest cộng đồng** (chính sách RLS kiểu restrictive kiểm tra `is_anonymous`).
- Khách đăng nhập vào tài khoản **đã có**: app lấy mã "claim" một lần trước khi đăng nhập, sau đó chuyển hành trình, chỗ trong phòng, phòng đang làm chủ sang tài khoản thật rồi xoá tài khoản khách. Trùng thì giữ dữ liệu của tài khoản thật.
- Mỗi người tạo tối đa 5 phòng / ngày.
- **Dọn dẹp hằng ngày** (pg_cron, 03:30 UTC): xoá khách chưa nâng cấp quá 30 ngày và phòng cũ hơn 30 ngày.
- **CAPTCHA (khuyến nghị):** tạo site Cloudflare Turnstile → đặt `VITE_TURNSTILE_SITE_KEY` cho frontend và deploy → rồi mới bật Supabase **Auth → Attack Protection → Enable CAPTCHA protection** (Turnstile + secret key). Khi đã bật, mọi lần đăng nhập/đăng ký/quên mật khẩu/vào với tư cách khách đều cần token — app và edge function `login-username` đã gửi kèm (cần deploy lại edge function).
- Giới hạn tạo khách theo IP mặc định 30 lần/giờ (Auth → Rate Limits).

### Quy ước
- `status`: `draft` → `approved`. **Chỉ dòng `approved` được xuất sang app.**
- Giá tính bằng **nghìn đồng** (`30` = 30.000đ). `price_checked_on` = ngày kiểm giá (YYYY-MM-DD).
- `answer` = đáp án đúng (1, 2 hoặc 3); app tự xáo thứ tự khi hiển thị.
- Câu đố: câu chính nằm trong `places.csv` (`challenge_*`, kèm `challenge_kind`, `explain_vi/en`), các câu thêm nằm trong `quizzes.csv`. `kind`: look (quan sát tại chỗ), history, legend, culture, architecture, nature. `explain` hiện sau khi trả lời – giải thích vì sao đáp án đúng.
- **Mỗi câu đố phải có `sources`** (script báo lỗi nếu trống). Chỉ đố những gì nguồn ghi rõ; chi tiết các nguồn ghi khác nhau (năm khánh thành, tên người xây…) thì không đem ra đố.
- Nhiều giá trị trong một ô cách nhau bằng `; ` (`themes`, `tags`, `sources`, `fav_places`).
- `themes`: culture, food, rainy, history, photo. `tags`: iconic, groups, quiet, cultural, indoor, localFood, free, history, photo, lively. `tone`: brick, butter, teal, leaf.

### Mức nhạy cảm (`candidates.csv` → cột `sensitivity`)
| Mức | Ý nghĩa |
|---|---|
| *(bị loại, không có trong file)* | Cơ quan nhà nước, quân sự, đồn công an, ngoại giao, toà án, trại giam đang hoạt động; casino và địa điểm tình dục — xem `out/excluded.csv` |
| `review` | Lãnh tụ, chiến tranh, liệt sĩ, nghĩa trang, nhà riêng / không mở cửa tự do — **nội dung phải được duyệt kỹ** |
| `religious` | Cơ sở tôn giáo đang hoạt động — chú ý phần ứng xử |
| `adult` | Quán bar, pub, hộp đêm (có rượu, 18+) — không gợi ý cho nhóm có trẻ em |
| `ok` | Bình thường |

## Quy trình
1. **Chọn điểm** trong `candidates.csv` (cột `decision`: `keep` / `drop`).
2. **Viết nội dung** cho điểm được giữ → chuyển sang `places.csv` với `status=draft`.
3. **Duyệt** (đối chiếu nguồn, đi thực địa, kiểm giá) → `status=approved`.
4. **Xuất sang app:** `node Data/scripts/export_app.mjs` → tạo `Frontend/src/data/generated/*.json`
   (script kiểm tra dữ liệu: thiếu chữ, sai chủ đề, sai đáp án… sẽ báo lỗi và không xuất).
5. Build/deploy lại frontend.

## Scripts

```bash
python Data/scripts/fetch_skeleton.py            # quét OSM + Wikidata cho mọi khu vực → sheets/candidates.csv
python Data/scripts/fetch_skeleton.py ba-vi      # chỉ một khu vực
python Data/scripts/fetch_wiki.py Q1186043       # tải tư liệu Wikipedia → out/wiki/ (không đưa lên git)
node Data/scripts/fetch_events.mjs               # sự kiện từ Hanoi Maps → sheets/events.csv (giữ phần đã sửa tay)
node Data/scripts/export_app.mjs                 # places/roles/missions/events đã duyệt → app
node Data/scripts/export_sql.mjs                 # sheets → supabase/seed_content.sql + seed_candidates/part_*.sql
node Data/scripts/build_csv.mjs --force          # (chỉ dùng một lần lúc khởi tạo — ghi đè sheets!)
```

Khu vực quét được khai báo trong `AREAS` ở đầu `fetch_skeleton.py` (tâm + bán kính, hoặc khung toạ độ).

## Database (Supabase)

- **Project:** `vnexplore` (ref `ywsqmfxyrnfswxgvhsuv`, Singapore, gói Free) — https://ywsqmfxyrnfswxgvhsuv.supabase.co
- File seed hiện có **136 places, 4 roles, 33 missions, 5 transport_fares**. Môi trường Supabase đang triển khai có thể cũ hơn; frontend hợp nhất dữ liệu từ Supabase với catalogue đóng gói theo `id` để nội dung đã duyệt không bị ẩn.
- Migrations đã chạy trên môi trường thật: `0001`–`0007`. Đã chạy thêm `0008`, `0009` và `seed_content.sql`. Đã chạy `0010`, `0011`. **Chưa chạy: `0012_place_notice_event_time.sql`** (chạy trước khi chạy lại `seed_content.sql`).

- `supabase/migrations/0001_init.sql` — cấu trúc bảng: nội dung (`places`, `candidates`, `roles`, `missions`, `transport_fares`) và phần người dùng cho sau này (`profiles`, `quests`, `quest_stops`, `quest_likes`), có sẵn phân quyền (RLS): ai cũng đọc được nội dung đã duyệt; người dùng chỉ sửa quest của chính mình; `candidates` không lộ ra ngoài.
- `node Data/scripts/export_sql.mjs` → `supabase/seed_content.sql + seed_candidates/part_*.sql` (chạy lại nhiều lần được, không tạo trùng).
- Tự làm bằng tay: Supabase Dashboard → SQL Editor → chạy `0001_init.sql`, rồi chạy `seed_content.sql` và lần lượt các file `seed_candidates/part_*.sql`.

## Nguồn dữ liệu và giấy phép
- **OpenStreetMap** — © OpenStreetMap contributors (ODbL). Ghi công trong app.
- **Wikidata** — CC0.
- **Wikipedia** — chỉ dùng làm **tư liệu**; nội dung đã viết lại, không sao chép.
- **Ảnh Wikimedia Commons** (cột `commons_image`) — mỗi ảnh có giấy phép riêng, phải ghi tác giả khi dùng.
- Nội dung do AI viết nháp dựa trên tư liệu → **phải duyệt trước khi `approved`**.
