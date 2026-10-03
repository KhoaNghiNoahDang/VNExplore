# VNExplore — Data

Dữ liệu địa điểm, vai, nhiệm vụ và giá di chuyển cho app.
**Các file trong `sheets/` là nguồn dữ liệu chính** — sửa ở đây, rồi xuất sang app.

## Các file (`sheets/`)

Mở bằng Google Sheets (File → Import → Upload) hoặc Excel. Mã hoá UTF‑8.

| File | Nội dung |
|---|---|
| `places.csv` | Địa điểm dùng trong app. 136 điểm `approved`, trong đó có 29 điểm tại Ba Vì |
| `candidates.csv` | Kho địa điểm lấy từ OpenStreetMap **chưa có nội dung**: quanh Hồ Gươm (~2,5 km) và Ba Vì (+ Sơn Tây lân cận). Cột `group`: `sight` (tham quan), `food` (ăn uống), `fun` (thể thao, giải trí). Cột `decision`: `keep` / `drop` |
| `to_add_manually.csv` | Điểm nổi tiếng **không có trên OpenStreetMap** — cần điền toạ độ bằng tay |
| `roles.csv` | 4 vai của chế độ Khám phá |
| `missions.csv` | Nhiệm vụ theo vai × địa điểm |
| `quizzes.csv` | Câu đố thêm cho mỗi địa điểm (lịch sử, truyền thuyết, kiến trúc…), mỗi câu có **giải thích** và **nguồn** |
| `transport.csv` | Giá cước, tốc độ, phí gửi xe (hiện app vẫn đọc từ `Frontend/src/data/transport.ts`) |

### Hai loại địa điểm (`places.csv`)
| Cột | Giá trị |
|---|---|
| `area` | `hoan-kiem` hoặc `ba-vi` — một lộ trình không trộn hai khu |
| `kind` | `sight` (tham quan) · `food` (ăn uống) · `fun` (vui chơi) |
| `depth` | `full`: có câu chuyện + thử thách, dùng cho cả 3 chế độ · `quick`: chỉ cần giới thiệu, giá, thời gian (quán ăn, chỗ chơi) |

- Tên địa điểm giữ nguyên như bản gốc; `name_en` để trống thì app dùng tên gốc. **Nội dung (giới thiệu, câu chuyện…) phải có đủ VI + EN.**
- Tư liệu duyệt Ba Vì trước đây được lưu tại `review/ba_vi_drafts.md`; các điểm đã duyệt nằm trong `places.csv`.

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
node Data/scripts/export_app.mjs                 # places/roles/missions đã duyệt → app
node Data/scripts/export_sql.mjs                 # sheets → supabase/seed_content.sql + seed_candidates/part_*.sql
node Data/scripts/build_csv.mjs --force          # (chỉ dùng một lần lúc khởi tạo — ghi đè sheets!)
```

Khu vực quét được khai báo trong `AREAS` ở đầu `fetch_skeleton.py` (tâm + bán kính, hoặc khung toạ độ).

## Database (Supabase)

- **Project:** `vnexplore` (ref `ywsqmfxyrnfswxgvhsuv`, Singapore, gói Free) — https://ywsqmfxyrnfswxgvhsuv.supabase.co
- File seed hiện có **136 places, 4 roles, 33 missions, 5 transport_fares**. Môi trường Supabase đang triển khai có thể cũ hơn; frontend hợp nhất dữ liệu từ Supabase với catalogue đóng gói theo `id` để nội dung đã duyệt không bị ẩn.
- Migrations đã chạy: `0001_init.sql`, `0002_perf.sql` (index + tách policy theo gợi ý của Supabase advisor).

- `supabase/migrations/0001_init.sql` — cấu trúc bảng: nội dung (`places`, `candidates`, `roles`, `missions`, `transport_fares`) và phần người dùng cho sau này (`profiles`, `quests`, `quest_stops`, `quest_likes`), có sẵn phân quyền (RLS): ai cũng đọc được nội dung đã duyệt; người dùng chỉ sửa quest của chính mình; `candidates` không lộ ra ngoài.
- `node Data/scripts/export_sql.mjs` → `supabase/seed_content.sql + seed_candidates/part_*.sql` (chạy lại nhiều lần được, không tạo trùng).
- Tự làm bằng tay: Supabase Dashboard → SQL Editor → chạy `0001_init.sql`, rồi chạy `seed_content.sql` và lần lượt các file `seed_candidates/part_*.sql`.

## Nguồn dữ liệu và giấy phép
- **OpenStreetMap** — © OpenStreetMap contributors (ODbL). Ghi công trong app.
- **Wikidata** — CC0.
- **Wikipedia** — chỉ dùng làm **tư liệu**; nội dung đã viết lại, không sao chép.
- **Ảnh Wikimedia Commons** (cột `commons_image`) — mỗi ảnh có giấy phép riêng, phải ghi tác giả khi dùng.
- Nội dung do AI viết nháp dựa trên tư liệu → **phải duyệt trước khi `approved`**.
