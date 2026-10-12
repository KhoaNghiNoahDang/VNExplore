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
- Lần nhập `Van_hoa_Giai_tri_Ha_Noi (1).xlsx` (03/10/2026): `scripts/import_vhgt_2026-10.mjs` — trạng thái theo cột "Xác minh" của file; giá không có trong nguồn là ước tính (ghi ở `review_notes`); toạ độ từ OpenStreetMap/Nominatim. (Khi đó nội dung còn được đẩy lên Supabase; từ 10/2026 thì không cần nữa.)

### Hai loại địa điểm (`places.csv`)
| Cột | Giá trị |
|---|---|
| `area` | Nhãn khu vực, chữ thường nối bằng `-` (`hoan-kiem`, `ba-vi`, `nam-tu-liem`…). **Chỉ để phân loại** — app gợi ý địa điểm quanh điểm xuất phát (hoặc quanh khu được nêu tên như “Ba Vì”), không giới hạn vùng |
| `kind` | `sight` (tham quan) · `food` (ăn uống) · `fun` (vui chơi) |
| `depth` | `full`: có câu chuyện + thử thách, dùng cho cả 3 chế độ · `quick`: chỉ cần giới thiệu, giá, thời gian (quán ăn, chỗ chơi) |

- Tên địa điểm giữ nguyên như bản gốc; `name_en` để trống thì app dùng tên gốc. **Nội dung (giới thiệu, câu chuyện…) phải có đủ VI + EN.**
- Tư liệu duyệt Ba Vì trước đây được lưu tại `review/ba_vi_drafts.md`; các điểm đã duyệt nằm trong `places.csv`.

### Sự kiện (`events.csv`)
App lấy khung giờ chuyến đi (giờ xuất phát → + số giờ yêu cầu) và gợi ý mọi sự kiện **approved** cùng khu vực đang diễn ra trong khung đó. Thêm vào quest thì sự kiện thành một điểm dừng có giờ cố định: app xếp lịch quanh nó, báo **chờ** nếu tới sớm và **muộn** nếu không kịp; nút **Xem chi tiết** mở `event_url`.

| Cột | Giá trị |
|---|---|
| `area` | Nhãn khu vực (`hoan-kiem`, `ba-vi`, `hanoi`…) — app gợi ý các sự kiện **trong cùng khu với các địa điểm của kế hoạch** (quanh điểm xuất phát, hoặc quanh khu được nêu tên như “Hoàn Kiếm”) mà người dùng **kịp tới từ chỗ họ xuất phát** |
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
- `roles.csv`: `status` (`draft`/`approved`) · `area` (`any`, hoặc nhãn khu vai được viết riêng, vd. `ba-vi`: vai chỉ được gợi ý cho các điểm nằm trong khu đó) · `tags` — chủ đề (culture, food, history, photo, rainy, fun), loại điểm (sight, food, fun), thể loại sự kiện (music, theatre, film, exhibition, workshop, talk, market, festival) hoặc `event` · `fav_places` = điểm rất hợp với vai (cộng điểm khi gợi ý).
- `missions.csv`: nhiệm vụ viết riêng cho một vai tại một điểm (ưu tiên cao nhất).
- `role_templates.csv`: nhiệm vụ mẫu theo loại điểm, `{place}` được thay bằng tên điểm. Nhiều dòng cho cùng vai × loại = nhiều phương án; cột `tag` (tuỳ chọn: một chủ đề hoặc tag của điểm, vd. `cultural` cho đền chùa, `photo`, `history`) để phương án đó được ưu tiên ở đúng loại điểm. Mỗi điểm luôn nhận cùng một phương án.
- **Duyệt bản nháp ngay trong app:** chạy `export_app.mjs` rồi `npm run dev` — khi chạy local, các vai/nhiệm vụ `draft` được hiện kèm nhãn "Nháp" (từ `generated/drafts.json`). Bản build production chỉ có dòng `approved`.

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
- `themes`: culture, food, rainy, history, photo. `tags`: iconic, groups, quiet, cultural, indoor, localFood, free, history, photo, lively, openData (điểm lấy từ dữ liệu bản đồ mở, chưa có nội dung riêng: app gắn nhãn "Dữ liệu bản đồ mở" và xếp sau điểm tuyển chọn). `tone`: brick, butter, teal, leaf.

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
4. **Xuất sang app:** `node Data/scripts/export_app.mjs` → tạo `Frontend/src/data/generated/*.json` (đóng gói vào app) và `Backend/content/content.json` (API phục vụ ở `GET /v1/content`).
   Script kiểm tra dữ liệu: thiếu chữ, sai chủ đề, sai đáp án… sẽ báo lỗi và không xuất.
5. Commit + push → deploy lại frontend và backend (Vercel/Render tự deploy; server riêng thì chạy lại build). **Không cần đẩy gì lên Supabase.**

### Địa điểm và quest do cộng đồng xác nhận (từ migration `0018`)
- **Địa điểm:** người dùng đã đăng nhập (tài khoản khách cũng được) bấm "Thêm địa điểm" → địa điểm vào bảng `community_places` và **hiện ngay trên bản đồ cho mọi người** (id trong app: `cp:<uuid>`), kèm nhãn "Chưa xác nhận · N/10 người đã đến".
  - Mỗi người đăng nhập bấm "Tôi đã đến" khi đang ở cách điểm ≤ 150 m (máy chủ kiểm tra lại toạ độ) được tính **một lần** (`place_visits`). Người thêm được tính nếu lúc thêm đang đứng ở đó. Đủ **10 người** → nhãn tự mất.
  - Nút "Có gì sai?" (`community_place_flags`): **3 người báo** mà điểm chưa đủ 10 lượt đến → điểm tự ẩn (`status = 'hidden'`).
  - Mỗi người thêm tối đa 10 điểm/ngày. Trùng tên trong bán kính 80 m thì không tạo điểm mới.
  - Nhóm vẫn có thể ẩn bất kỳ điểm nào trong Supabase: đặt `status = 'hidden'`. Muốn đưa một điểm đã xác nhận vào danh mục chính: thêm vào `places.csv`, rồi đặt `status = 'imported'` và `place_id`.
- **Quest công khai:** hiện ngay ở tab Quest, kèm nhãn "Chưa xác nhận · N/10 người đã đi". Một người được tính khi lưu xong hành trình của quest đó với ít nhất nửa số điểm đã đến (`quest_runs`, trigger trên `journeys`). Đủ 10 người, hoặc nhóm đặt `review_status = 'approved'` → hết nhãn. `review_status = 'rejected'` → gỡ khỏi tab Quest.
- Chưa đăng nhập thì "Thêm địa điểm" vẫn gửi cho nhóm duyệt như cũ (phần dưới).
- **Quest mẫu** (`quests.is_sample`, migration `0019`): 7 quest nhóm soạn sẵn và đã kiểm tra mang nhãn **"Thử nghiệm"** thay cho "Chưa xác nhận". Chỉ đặt được cột này trong dashboard; người dùng sửa quest không đổi được.
- **Điều khoản và quyền riêng tư:** trang `/terms` và `/privacy` (chữ trong `Frontend/src/i18n/legal.ts`, bản nháp — nên nhờ người có chuyên môn pháp lý đọc lại; khi app dùng thêm dịch vụ nào nhận dữ liệu người dùng thì thêm vào mục 5 của chính sách). Email liên hệ lấy từ biến `VITE_CONTACT_EMAIL`. Form đăng ký và mục Tài khoản có link tới hai trang này.
- **Xoá tài khoản** (migration `0020`): nút trong mục Tài khoản, phải gõ "XOÁ" để xác nhận. Xoá người dùng khỏi Auth → mọi dữ liệu của họ bị xoá theo; địa điểm họ đưa lên bản đồ được giữ lại, không còn tên người thêm. ⚠ Các quest mẫu thuộc tài khoản `@khoanghi`: xoá tài khoản đó là mất luôn quest mẫu.
- **Quy tắc cộng đồng:** đăng quest công khai hoặc qua link phải tích ô cam kết (không bịa đặt, xúc phạm, mạo phạm, tuyên truyền sai…). Bảng quy tắc dẫn Luật An ninh mạng 2025, Nghị định 174/2026/NĐ-CP, Bộ luật Hình sự (Điều 155, 156, 288) và Bộ luật Dân sự (Điều 34). Thêm địa điểm có dòng "Khi đăng, bạn đồng ý…". Chữ nằm trong `Frontend/src/i18n/strings.ts` (`rules*`); khi luật thay đổi thì sửa ở đó.

### Địa điểm người dùng gợi ý (nút "Thêm địa điểm", khi chưa đăng nhập)
Cuối danh sách địa điểm trong app có thẻ **"Biết chỗ hay mà app chưa có?"**. Người dùng điền tên, loại, chọn vị trí trên bản đồ, kèm các thông tin không bắt buộc: địa chỉ, vì sao nên đến, giờ mở cửa, giá, link hoặc số điện thoại. Gợi ý được lưu vào bảng `place_suggestions` trên Supabase, qua backend có giới hạn 5 lần/10 phút. Gợi ý **không** tự hiện lên app.
1. Kéo gợi ý về: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node Data/scripts/pull_place_suggestions.mjs`. Thêm `--dry-run` để xem trước. Dùng đúng hai biến này như trong `Backend/.env`.
   - Mỗi gợi ý thành một dòng `draft` trong `places.csv`; lời người gửi nằm ở `review_notes`.
   - Gợi ý trùng tên với một điểm có sẵn và cách dưới 60 m được đánh dấu `duplicate`, không thêm vào.
   - Sau khi kéo về, gợi ý được đổi trạng thái thành `imported`.
2. Kiểm tra điểm, viết `blurb_vi` và `blurb_en`, điền giá và giờ mở cửa, rồi chuyển sang `approved` và xuất như bình thường.

## Scripts

```bash
python Data/scripts/fetch_skeleton.py            # quét OSM + Wikidata cho mọi khu vực → sheets/candidates.csv
python Data/scripts/fetch_skeleton.py ba-vi      # chỉ một khu vực
python Data/scripts/fetch_wiki.py Q1186043       # tải tư liệu Wikipedia → out/wiki/ (không đưa lên git)
node Data/scripts/fetch_events.mjs               # sự kiện từ Hanoi Maps → sheets/events.csv (giữ phần đã sửa tay)
node Data/scripts/export_app.mjs                 # places/roles/missions/events đã duyệt → app + Backend/content/content.json
node Data/scripts/export_sql.mjs                 # (cũ, không cần chạy) sheets → supabase/seed_content.sql + seed_candidates/part_*.sql
node Data/scripts/pull_place_suggestions.mjs     # địa điểm người dùng gợi ý → places.csv (draft); cần SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
node Data/scripts/build_csv.mjs --force          # (chỉ dùng một lần lúc khởi tạo — ghi đè sheets!)
```

Khu vực quét được khai báo trong `AREAS` ở đầu `fetch_skeleton.py` (tâm + bán kính, hoặc khung toạ độ).

## Database (Supabase)

**Từ 10/2026, Supabase chỉ giữ dữ liệu người dùng; nội dung không nằm trên đó nữa.**
- **Nội dung** gồm địa điểm, câu đố, vai, nhiệm vụ, sự kiện. Nguồn là `sheets/*.csv`, xuất bằng `export_app.mjs` ra JSON, đi kèm app và API khi deploy.
  - Frontend dùng bản đóng gói, không gọi mạng để lấy nội dung.
  - Backend đọc `Backend/content/content.json` để phục vụ `/v1/content` và kiểm tra `placeId` khi người dùng báo cáo địa điểm.
- **Dữ liệu người dùng (Supabase):**
  - Tài khoản (Auth), `profiles`
  - `quests`, `quest_stops`, `quest_likes`, `journeys`
  - Chơi nhóm: `parties`, `party_members`, `party_progress`, `party_puzzles`
  - `place_reports`, `place_suggestions`, `route_cache`
  - Cộng đồng: `community_places`, `place_visits`, `community_place_flags`, `quest_runs`
  - Các bảng này chỉ lưu **id** của địa điểm và vai, không có khoá ngoại sang bảng nội dung. Migration `0016` đã gỡ các khoá ngoại đó.
- Các bảng nội dung cũ (`places`, `roles`, `missions`, `events`, `place_quizzes`, `transport_fares`) vẫn còn để bản app cũ không lỗi khi chưa deploy lại, nhưng **không được cập nhật nữa**. Có thể xoá sau khi bản mới đã chạy ổn.
- **Project:** `vnexplore` (ref `ywsqmfxyrnfswxgvhsuv`, Singapore, gói Free) — https://ywsqmfxyrnfswxgvhsuv.supabase.co
- Migrations đã chạy trên môi trường thật: `0001`–`0020` (`0017_party_mode.sql`: phòng nhóm cho chế độ Thong thả + `party_preview`; `0018_community_places_quests.sql`: địa điểm và quest do cộng đồng xác nhận).
- **Lưu ý từ 30/10/2026:** bảng **mới** trong schema `public` phải được `GRANT` quyền rõ ràng thì Data API mới thấy, ví dụ `grant select, insert on public.<bảng> to authenticated` hoặc `to service_role`. Migration tạo bảng mới phải kèm lệnh `grant`. Bảng hiện có không bị ảnh hưởng.
- `candidates` và `seed_candidates/` là kho điểm OSM để chọn lọc nội bộ, không phải dữ liệu app.

## Nguồn dữ liệu và giấy phép
- **OpenStreetMap** — © OpenStreetMap contributors (ODbL). Ghi công trong app.
- **Overture Maps Places** — CDLA-Permissive-2.0:
  - Toạ độ, địa chỉ của 63 quán nhập từ danh sách Google Maps “Cà phê Hà Nội” (`scripts/import_gmaps_cafes_2026-10.mjs`). Từ Google Maps chỉ lấy tên quán.
  - 1.182 di tích ở Hà Nội (chùa, đền, miếu, đình, phủ, nhà thờ, văn miếu, lăng mộ…), dữ liệu đã lọc ở `imports/overture_heritage_2026-10.json`, nhập bằng `scripts/import_overture_heritage_2026-10.mjs`.
    - Cách lọc: theo tên, ranh giới Hà Nội, bỏ trùng; bỏ chung cư hay cửa hàng bị xếp nhầm loại "historic", và bỏ nhà thờ họ.
    - Giới thiệu chỉ nói đúng loại di tích, kèm lưu ý ứng xử; gắn `openData`.
    - Chiến tranh hoặc độ tin cậy < 0,5 → `draft`. Các điểm về lãnh tụ → `to_add_manually.csv`.
  - 2.889 quán ăn uống (nhà hàng, quán ăn, phở, lẩu, nướng, trà, trà sữa, bánh…) và 82 điểm vui chơi (rạp phim, khu trò chơi, khu vui chơi trẻ em, bowling, escape room, thủy cung, công viên, photobooth). Dữ liệu ở `imports/overture_food_fun_2026-10.json`, nhập bằng `scripts/import_overture_food_fun_2026-10.mjs`.
    - Ăn uống: chỉ lấy quán Overture tin ≥ 90% là có thật (quán trà ≥ 85%), có số điện thoại hoặc website và có địa chỉ, nằm trong Hà Nội.
    - Bỏ tên là địa chỉ, công ty, cửa hàng, khách sạn, karaoke, quán thịt chó, tỉnh khác, quảng cáo bằng chữ kiểu cách, và quán cà phê (đã có danh sách riêng).
    - Vui chơi: chọn tay từng điểm. Chuỗi lớn hoặc điểm có nguồn xác nhận → `approved`; còn lại (photobooth mới, escape room nhỏ) → `draft`.
    - Giá là ước tính theo loại hình (ghi trong `review_notes`), trừ các điểm có nguồn.
- Các điểm `openData` được xuất ra file riêng `Frontend/src/data/generated/places-open.json`; app tải file này sau khi khởi động, để lần tải đầu nhẹ.
- **Wikidata** — CC0.
- **Wikipedia** — chỉ dùng làm **tư liệu**; nội dung đã viết lại, không sao chép.
- **Ảnh Wikimedia Commons** (cột `commons_image`) — mỗi ảnh có giấy phép riêng, phải ghi tác giả khi dùng.
- Nội dung do AI viết nháp dựa trên tư liệu → **phải duyệt trước khi `approved`**.
