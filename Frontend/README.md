# VNExplore — Frontend

Mobile-first web app built from the design in [`design/vnexplore-superdesign-draft.html`](design/vnexplore-superdesign-draft.html).
Stack: Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router · lucide-react.

## Chạy local

```bash
cd Frontend
npm install
npm run dev
```

Mở http://localhost:5173

## Luồng

```
/  (nói nhu cầu + chọn chế độ) ─┬─ Khám phá  → /role → /places → /quest → /go/:i (nhiệm vụ) → /finish
                                ├─ Nghe kể   →         /places → /quest → /go/:i (audio tự phát) → /finish
                                └─ Thong thả →         /places → /quest → /go/:i (thu gọn) → /finish
```

Đổi chế độ giữa chừng bằng nút chế độ ở thanh trên cùng: rời Khám phá thì vai tạm dừng, vật phẩm giữ lại;
vào Khám phá thì app hỏi chọn vai và các điểm còn lại có nhiệm vụ.

## Cấu trúc

```
src/
  pages/        AskPage · RolePage · PlacesPage · QuestPage · StopPage · FinishPage
  components/   AppShell, TopBar, ModePicker, ModeSwitcher, PlaceCard, MapPreview, Stamp, ...
  data/         places.ts (địa điểm + câu chuyện, "Vì sao?", góc chụp, ứng xử, thử thách) · roles.ts (4 vai)
  lib/          api.ts (gọi backend) · intent.ts (tách tag) · quest.ts (tuyến, giờ, tiền) · useNarration.ts (audio TTS tạm)
  i18n/         strings.ts — EN / VI
  store/        QuestContext — chế độ, vai, hành trình; lưu vào localStorage (reload không mất tiến độ)
```

## Phương tiện, giao thông, định vị

- Phương tiện: đi bộ · xe máy · GrabBike · taxi/GrabCar. App đọc phương tiện từ câu yêu cầu ("đi xe máy", "đi Grab"…), hoặc người dùng chọn tay qua tag.
- `src/data/transport.ts` — **bảng số liệu ước lượng** (tốc độ thường/cao điểm, thời gian gửi xe/chờ xe, giá cước, xăng, gửi xe, giờ cao điểm, vùng phố đi bộ). Cập nhật giá ở đây.
- `src/lib/travel.ts` — `estimateLeg()` tính thời gian + chi phí từng chặng: giờ cao điểm, phố đi bộ cuối tuần (T6 19h → hết CN), chặng ngắn thì đi bộ.
  Khi có backend: giữ nguyên chữ ký hàm, thay phần thân bằng gọi API định tuyến có giao thông thực (vd. TomTom qua Render, giấu key ở backend).
- Định vị dùng Geolocation của trình duyệt (miễn phí, cần HTTPS — Vercel có sẵn). Trong Hà Nội thì dùng làm điểm xuất phát và tự đóng dấu khi cách điểm đến ≤ 50 m.

## Bản đồ

- Bản đồ thật dùng **MapLibre GL** + nền **OpenFreeMap** (dữ liệu OpenStreetMap) — miễn phí, không cần API key, không cần đăng ký. Đã đổi màu theo bảng màu của app.
- `src/components/MapView.tsx` tải bản đồ lười (chỉ khi trên màn hình có bản đồ). Khi đang tải, máy không hỗ trợ WebGL hoặc mất mạng → hiện bản đồ minh hoạ (`MapPreview`).
- Worker của MapLibre được phục vụ ở `/maplibre/` bởi plugin trong `vite.config.ts` (cả lúc dev và lúc build).
- Đường đi bám theo phố thật qua backend `POST /v1/route` (cache RAM + Supabase). Frontend chờ tối đa 4 giây; nếu backend lỗi/chậm thì gọi thẳng OSRM công khai của FOSSGIS (`routing.openstreetmap.de`) làm fallback. Chặng đi bộ vẽ nét chấm, chặng đi xe vẽ nét liền; nếu cả hai nguồn lỗi thì tạm vẽ đường thẳng.
- Khi mở app, frontend gọi `GET /health` không chặn giao diện để đánh thức backend Render.

## Kết nối backend (Render)

`src/lib/backend.ts` đọc biến `VITE_API_URL`. Nếu trống, frontend bỏ qua warm-up và gọi OSRM trực tiếp.
Backend cung cấp `GET /health`, `POST /v1/route` và `GET /v1/content`. Nội dung ứng dụng hiện vẫn đọc trực tiếp từ Supabase và fallback về dữ liệu bundled.

## Tài khoản (Supabase Auth)

- Đăng ký: tên, @tên người dùng, **email hoặc số điện thoại**, mật khẩu. Đăng nhập: email / SĐT / @tên + mật khẩu, hoặc Google.
- ⚠ **Số điện thoại chưa xác minh thật** (`PHONE_VERIFY = 'fake'` trong `src/store/AuthContext.tsx`): bước nhập mã chấp nhận 6 số bất kỳ, không gửi SMS. Phải thay bằng SMS OTP thật trước khi mở công khai.
- Đăng nhập bằng @tên đi qua Edge Function `login-username` (mã trong `Data/supabase/functions/`), để email không lộ ra trình duyệt.
- Luồng chính không cần tài khoản; chỉ cần khi **Lưu thành quest** / xem **Của tôi**.

## Deploy lên Vercel

1. Push repo lên GitHub.
2. Vercel → **Add New Project** → chọn repo.
3. **Root Directory**: `Frontend` · Framework: **Vite** (tự nhận) · Build: `npm run build` · Output: `dist`.
4. **Environment Variables** (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (lấy trong `.env.local`), `VITE_GOOGLE_AUTH=false`, `VITE_API_URL=https://<render-service>.onrender.com`.
5. Deploy. `vercel.json` đã có rewrite để các đường dẫn `/places`, `/quest` không bị 404 khi refresh.
