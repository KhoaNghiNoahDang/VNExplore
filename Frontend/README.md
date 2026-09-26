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
- Đường đi bám theo phố thật nhờ máy chủ OSRM công khai của FOSSGIS (`routing.openstreetmap.de`, miễn phí, không key) — `src/lib/routing.ts`. Chặng đi bộ vẽ nét chấm, chặng đi xe vẽ nét liền. Không gọi được thì tạm vẽ đường thẳng.
  ⚠ Đây là dịch vụ dùng chung theo nguyên tắc sử dụng hợp lý: khi có nhiều người dùng, chuyển lời gọi này sang backend (có cache) hoặc tự dựng OSRM/Valhalla.

## Kết nối backend (Render)

`src/lib/api.ts` đọc biến `VITE_API_URL`. Nếu trống → dùng dữ liệu mock.
Backend cần có endpoint `GET /places` trả về mảng `Place` (xem `src/types.ts`) và bật CORS cho domain Vercel.

## Deploy lên Vercel

1. Push repo lên GitHub.
2. Vercel → **Add New Project** → chọn repo.
3. **Root Directory**: `Frontend` · Framework: **Vite** (tự nhận) · Build: `npm run build` · Output: `dist`.
4. (Khi có backend) **Environment Variables**: `VITE_API_URL = https://<service>.onrender.com`.
5. Deploy. `vercel.json` đã có rewrite để các đường dẫn `/places`, `/quest` không bị 404 khi refresh.
