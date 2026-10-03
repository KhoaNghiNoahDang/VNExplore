/**
 * One-off import (2026-10-03) of "Van_hoa_Giai_tri_Ha_Noi (1).xlsx" — museums, heritage sites, live-
 * music cafés, workshops, photobooths, theatres and events compiled from web sources — into
 * places.csv / events.csv / to_add_manually.csv.
 *
 *  - Every row keeps its source link(s) in `sources` (places) or `event_url` + `source` (events).
 *  - Status follows the sheet's own "Xác minh" column: checked → approved; "Cần kiểm tra", a weak
 *    source ("Hiểu biết chung"), or a sensitive topic (leaders, war — see Data/README) → draft.
 *  - Workshops carry a notice "contact before you go" (+ phone when the sheet has one).
 *  - Coordinates: OpenStreetMap / Nominatim (2026-10-03); approximate ones are flagged in review_notes.
 *  - Prices the sheet doesn't give are estimates, flagged in review_notes. EN text translated by AI.
 *  - Duplicates of existing places/events only get the extra source appended.
 *  - Skipped: rows in Ho Chi Minh City, rows without any locatable venue (see the summary printed).
 *
 * Safe to run once; running again does nothing (ids already present are left alone).
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, writeCsv } from './lib/csv.mjs'

const SHEETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'sheets')
const SRC = 'Văn hoá–Giải trí HN (tổng hợp 03/10/2026)'
const EST = 'Giá là ước tính (nguồn không ghi) — kiểm tra trước khi đi.'
const APPROX = 'Toạ độ gần đúng (theo tên đường) — kiểm tra lại.'
const EN_AI = 'Bản tiếng Anh do AI dịch.'
const CONTACT = { vi: 'Nên liên hệ trước khi đến — lịch lớp có thể thay đổi.', en: 'Contact them before you go — class times can change.' }
const RELIGIOUS = {
  vi: 'Ăn mặc kín đáo, nói khẽ, không chụp ảnh người đang lễ.',
  en: 'Dress modestly, keep your voice down and don’t photograph people praying.',
}

// ---------------------------------------------------------------- places
// [id, status, area, kind, name_vi, name_en, lat, lng, address, hours, themes, tags, visit, pmin, pmax, tone,
//  blurb_vi, blurb_en, sources[], notes[], extra{}]
const P = (id, status, area, kind, name_vi, name_en, lat, lng, address, opening_hours, themes, tags, visit_min, price_min_k, price_max_k, tone, blurb_vi, blurb_en, sources, notes = [], extra = {}) => ({
  id, status, area, kind, depth: 'quick', name_vi, name_en, name_vi_short: '', lat: String(lat), lng: String(lng), address, opening_hours,
  themes, tags, visit_min: String(visit_min), price_min_k: String(price_min_k), price_max_k: String(price_max_k), price_checked_on: '', tone,
  blurb_vi, blurb_en, sources: sources.filter(Boolean).join('; '), review_notes: [`Nhập từ ${SRC}.`, ...notes, EN_AI].join(' '),
  notice_vi: '', notice_en: '', phone: '', ...extra,
})
const vietnamTravel = 'https://vietnam.travel/vi/things-to-do/vietnams-must-see-museums'
const vinMuseums = 'https://vinwonders.com/vi/wonderpedia/news/bao-tang-binh-chung-thong-tin/'
const vinpearlMuseums = 'https://vinpearl.com/vi/danh-sach-20-bao-tang-o-ha-noi-noi-tieng-thu-hut-du-khach'
const baovanhoa = 'https://baovanhoa.vn/di-san/trien-lam-di-tich-quoc-gia-dac-biet-o-ha-noi-59651.html'
const congthuong = 'https://kinhte.congthuong.vn/apicenter@/print_article&i=368066'
const vinpearlCafe = 'https://vinpearl.com/vi/quan-cafe-nhac-song-ha-noi'
const toplistHD = 'https://www.toplist.vn/top-list/quan-cafe-nhac-acoustic-o-ha-dong-ha-noi-41374.htm'
const znews = 'https://znews.vn/5-quan-ca-phe-nhac-song-duoc-yeu-thich-o-ha-noi-post737418.html'
const vinGom = 'https://vinwonders.com/vi/wonderpedia/news/workshop-lam-gom-ha-noi/'
const vinVe = 'https://vinwonders.com/?p=76241'
const finhay = 'https://www.finhay.com.vn/chup-photobooth-o-dau-ha-noi-dep'
const mia = 'https://mia.vn/cam-nang-du-lich/photobooth-ha-noi-cuc-hot-19165'
const workshop = (phone = '', extraVi = '', extraEn = '') => ({
  notice_vi: CONTACT.vi + (extraVi ? ` ${extraVi}` : ''),
  notice_en: CONTACT.en + (extraEn ? ` ${extraEn}` : ''),
  phone,
})
const finhayPromo = {
  notice_vi: 'Chụp miễn phí trong chương trình của Finhay, từ 04/08 đến hết 31/12/2026 hoặc đến khi hết quà.',
  notice_en: 'Free shots during Finhay’s campaign, 4 Aug – 31 Dec 2026 or while gifts last.',
}

const places = [
  // Museums
  P('bao-tang-ha-noi', 'approved', 'hoan-kiem', 'sight', 'Bảo tàng Hà Nội', 'Hanoi Museum', 21.01001, 105.78631, 'Phạm Hùng, Nam Từ Liêm', '', 'history; culture; rainy', 'indoor; history; photo', 75, 30, 30, 'teal',
    'Bảo tàng về lịch sử nghìn năm Thăng Long – Hà Nội, lưu giữ hơn 70.000 tài liệu, hiện vật; toà nhà hình kim tự tháp ngược là điểm check-in quen thuộc.',
    'A museum of a thousand years of Thang Long – Hanoi, holding over 70,000 documents and objects; its upside-down pyramid building is a favourite photo stop.',
    [congthuong], ['Giá 30.000đ theo Nghị quyết 44/2024/NQ-HĐND (từ 1/1/2025); miễn phí ngày 18/5. Giờ mở cửa: xem nguồn.']),
  P('bao-tang-dan-toc-hoc', 'approved', 'hoan-kiem', 'sight', 'Bảo tàng Dân tộc học Việt Nam', 'Vietnam Museum of Ethnology', 21.04008, 105.79884, 'Nguyễn Văn Huyên, Cầu Giấy', 'Tu-Su 08:30-17:30', 'culture; history; photo', 'cultural; groups; photo', 120, 40, 40, 'leaf',
    'Mở cửa năm 1997, giới thiệu văn hoá 54 dân tộc Việt Nam; có khu trưng bày trong nhà, vườn nhà truyền thống ngoài trời và toà Cánh Diều về Đông Nam Á. Có biểu diễn miễn phí 2 lần/ngày ở khu vườn.',
    'Opened in 1997, it presents the cultures of Vietnam’s 54 ethnic groups: indoor galleries, a garden of traditional houses and the Kite building on Southeast Asia. Free shows twice a day in the garden.',
    ['https://www.vme.org.vn', 'https://en.wikipedia.org/wiki/Vietnam_Museum_of_Ethnology']),
  P('bao-tang-my-thuat', 'approved', 'hoan-kiem', 'sight', 'Bảo tàng Mỹ thuật Việt Nam', 'Vietnam National Fine Arts Museum', 21.03064, 105.83704, '66 Nguyễn Thái Học, Ba Đình', 'Tu-Su 08:30-17:00', 'culture; rainy; photo', 'indoor; cultural', 75, 30, 30, 'brick',
    'Bảo tàng mỹ thuật quốc gia, nằm đối diện Văn Miếu và cách Hoàng thành khoảng 10 phút đi bộ; tiện ghép lịch tham quan cả cụm.',
    'The national fine arts museum, opposite the Temple of Literature and about 10 minutes’ walk from the Imperial Citadel — easy to combine in one outing.',
    [vietnamTravel]),
  P('bao-tang-ho-chi-minh', 'draft', 'hoan-kiem', 'sight', 'Bảo tàng Hồ Chí Minh', 'Ho Chi Minh Museum', 21.03562, 105.83263, '19 Ngọc Hà, Ba Đình', '', 'history; rainy', 'indoor; history', 60, 0, 40, 'teal',
    'Trưng bày theo hành trình cuộc đời Chủ tịch Hồ Chí Minh; không gian trưng bày chính do sinh viên ĐH Mỹ thuật Hà Nội thiết kế.',
    'Exhibits follow the life of President Ho Chi Minh; the main exhibition space was designed by students of the Hanoi University of Fine Arts.',
    ['https://vinwonders.com/vi/wonderpedia/news/bao-tang-binh-chung-thong-tin/', vietnamTravel], ['Chủ đề lãnh tụ — duyệt kỹ trước khi đưa lên (xem README). Nguồn ghi giá khách nước ngoài 40.000đ.']),
  P('bao-tang-thien-nhien', 'approved', 'hoan-kiem', 'sight', 'Bảo tàng Thiên nhiên Việt Nam', 'Vietnam Museum of Nature', 21.04807, 105.80054, '18 Hoàng Quốc Việt, Cầu Giấy', '08:00-17:00', 'culture; rainy', 'indoor; free; groups', 60, 0, 0, 'leaf',
    'Bảo tàng về thế giới tự nhiên Việt Nam, thường được gợi ý cho gia đình có trẻ nhỏ.',
    'A museum of Vietnam’s natural world, often recommended for families with young children.',
    [vinMuseums, 'https://vinwonders.com/vi/wonderpedia/news/bao-tang-o-ha-noi/']),
  P('bao-tang-phong-khong-khong-quan', 'draft', 'hoan-kiem', 'sight', 'Bảo tàng Phòng không – Không quân', 'Air Defence – Air Force Museum', 20.99954, 105.82924, '171 Trường Chinh, Đống Đa', '08:00-11:30,13:00-16:30', 'history; photo', 'history; free; photo', 60, 0, 0, 'teal',
    'Bảo tàng quân sự về lực lượng phòng không – không quân, có khu trưng bày khí tài ngoài trời; vào cửa miễn phí.',
    'A military museum of Vietnam’s air defence and air force, with aircraft and equipment displayed outdoors; free entry.',
    [vinMuseums], ['Chủ đề chiến tranh — duyệt kỹ (xem README).']),
  P('bao-tang-binh-chung-thong-tin', 'draft', 'hoan-kiem', 'sight', 'Bảo tàng Binh chủng Thông tin', 'Signal Corps Museum', 21.03034, 105.82663, '1 Giang Văn Minh, Ba Đình', '', 'history; rainy', 'indoor; history', 45, 0, 30, 'teal',
    'Bảo tàng quân sự về lịch sử ngành thông tin liên lạc trong quân đội, trực thuộc Cục Chính trị.',
    'A military museum on the history of army communications.',
    [vinMuseums, vinpearlMuseums], ['Chủ đề quân sự — duyệt kỹ.', EST]),
  P('bat-trang-tinh-hoa-lang-nghe', 'approved', 'hoan-kiem', 'sight', 'Bảo tàng Gốm Bát Tràng (Trung tâm Tinh hoa Làng nghề Việt)', 'Bat Trang Ceramics Museum', 20.97388, 105.91295, 'Số 28, thôn 5, Bát Tràng, Gia Lâm', '08:00-17:00', 'culture; photo; rainy', 'cultural; indoor; photo; groups', 120, 30, 30, 'butter',
    'Công trình kiến trúc độc đáo giữa làng gốm Bát Tràng, vừa trưng bày gốm vừa có khu trải nghiệm làm gốm (tầng G).',
    'A striking building in the heart of Bat Trang pottery village, with ceramics galleries and a hands-on pottery area on the ground floor.',
    [vinMuseums, 'https://vinwonders.com/vi/wonderpedia/news/bao-tang-o-ha-noi/', vinGom], [APPROX, 'Giá 30.000đ là vé bảo tàng; workshop làm gốm tính riêng.'], workshop()),
  P('bao-tang-lich-su-quan-su', 'draft', 'hoan-kiem', 'sight', 'Bảo tàng Lịch sử Quân sự Việt Nam', 'Vietnam Military History Museum', 21.01159, 105.75471, 'Km 6+500 Đại lộ Thăng Long, Nam Từ Liêm', '08:00-16:30', 'history; photo', 'history; photo; groups', 90, 40, 40, 'teal',
    'Bảo tàng quân sự quy mô lớn mới xây trên Đại lộ Thăng Long, trưng bày nhiều khí tài, hiện vật chiến tranh.',
    'A large, newly built military museum on Thang Long Avenue, displaying wartime equipment and artefacts.',
    [], ['Nguồn: "hiểu biết chung", chưa có link — cần bổ sung nguồn. Chủ đề chiến tranh — duyệt kỹ.']),
  P('bao-tang-chien-thang-b52', 'draft', 'hoan-kiem', 'sight', 'Bảo tàng Chiến thắng B52', 'B52 Victory Museum', 21.03535, 105.81952, '157 Đội Cấn, Ba Đình', '', 'history', 'history; free', 45, 0, 0, 'teal',
    'Trưng bày về chiến dịch phòng không "Hà Nội – Điện Biên Phủ trên không" tháng 12/1972, có xác máy bay B52.',
    'Exhibits on the December 1972 air-defence campaign over Hanoi, including the wreck of a B-52.',
    [], ['Sheet ghi "tạm thời đóng cửa". Nguồn: "hiểu biết chung", chưa có link. Toạ độ theo tên phố. Chủ đề chiến tranh — duyệt kỹ.']),

  // Heritage sites
  P('van-mieu', 'approved', 'hoan-kiem', 'sight', 'Văn Miếu – Quốc Tử Giám', 'Temple of Literature', 21.02746, 105.835, 'Phố Quốc Tử Giám, Đống Đa', '', 'culture; history; photo', 'iconic; history; cultural; photo; groups', 75, 30, 70, 'brick',
    'Văn Miếu thờ Khổng Tử dựng năm 1070, Quốc Tử Giám lập năm 1076, được xem là trường đại học đầu tiên của Việt Nam; nổi tiếng với Khuê Văn Các và 82 bia Tiến sĩ (Di sản tư liệu thế giới).',
    'The Temple of Literature, built for Confucius in 1070, and the Imperial Academy founded in 1076 — seen as Vietnam’s first university; famous for the Khue Van pavilion and 82 doctoral stelae (UNESCO Memory of the World).',
    [baovanhoa, 'https://en.wikipedia.org/wiki/Temple_of_Literature,_Hanoi'], [EST, 'Toạ độ theo phố Quốc Tử Giám (cổng chính).'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('co-loa', 'approved', 'hoan-kiem', 'sight', 'Khu di tích Cổ Loa', 'Co Loa Citadel', 21.11568, 105.86844, 'Cổ Loa, Đông Anh', '', 'history; culture; photo', 'history; quiet; photo', 120, 0, 30, 'leaf',
    'Thành cổ hình xoắn ốc, kinh đô nước Âu Lạc của An Dương Vương (thế kỷ 3 TCN), cách trung tâm khoảng 17 km về phía bắc; nhiều di vật văn hoá Đông Sơn.',
    'A spiral-walled ancient citadel, capital of King An Duong Vuong’s Au Lac (3rd century BC), about 17 km north of the centre; many Dong Son artefacts.',
    [baovanhoa, 'https://en.wikipedia.org/wiki/C%E1%BB%95_Loa_Citadel'], [EST, APPROX, 'Ngoại thành (~17 km).']),
  P('den-phu-dong', 'draft', 'hoan-kiem', 'sight', 'Đền Phù Đổng', 'Phu Dong Temple', 21.05508, 105.96091, 'Phù Đổng, Gia Lâm', '', 'culture; history', 'cultural; history; quiet', 60, 0, 20, 'brick',
    'Đền thờ Thánh Gióng tại quê hương của Gióng; nơi diễn ra Hội Gióng, di sản văn hoá phi vật thể được UNESCO ghi danh.',
    'The temple to Saint Giong in his home village, where the Giong Festival — on UNESCO’s intangible heritage list — is held.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung" (link chỉ xác nhận xếp hạng).', EST, 'Ngoại thành.'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('den-soc-son', 'draft', 'hoan-kiem', 'sight', 'Đền Sóc Sơn', 'Soc Son Temple', 21.28225, 105.8422, 'Núi Vệ Linh, Sóc Sơn', '', 'culture; history', 'cultural; history; quiet', 90, 0, 20, 'brick',
    'Đền thờ Thánh Gióng trên núi Vệ Linh, tương truyền là nơi Gióng bay về trời; cũng tổ chức Hội Gióng.',
    'A temple to Saint Giong on Ve Linh mountain, where legend says he flew up to heaven; it also holds a Giong Festival.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST, APPROX, 'Ngoại thành (~35 km).'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('chua-thay', 'draft', 'hoan-kiem', 'sight', 'Chùa Thầy', 'Thay Pagoda', 21.02294, 105.64545, 'Sài Sơn, Quốc Oai', '', 'culture; history; photo', 'cultural; quiet; photo', 120, 0, 20, 'leaf',
    'Chùa cổ dưới chân núi Sài Sơn, gắn với Thiền sư Từ Đạo Hạnh; có thuỷ đình múa rối nước giữa hồ.',
    'An old pagoda at the foot of Sai Son mountain, linked to the monk Tu Dao Hanh, with a water-puppet pavilion in its pond.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST, 'Ngoại thành (~25 km).'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('chua-tay-phuong', 'draft', 'hoan-kiem', 'sight', 'Chùa Tây Phương', 'Tay Phuong Pagoda', 21.02557, 105.58526, 'Thạch Xá, Thạch Thất', '', 'culture; history', 'cultural; quiet', 90, 0, 20, 'leaf',
    'Chùa cổ trên đồi, nổi tiếng với bộ tượng La Hán gỗ được xem là kiệt tác điêu khắc.',
    'A hilltop pagoda famous for its wooden arhat statues, regarded as masterpieces of sculpture.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST, 'Ngoại thành (~30 km).'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('dinh-chem', 'draft', 'hoan-kiem', 'sight', 'Đình Chèm', 'Chem Communal House', 21.09404, 105.77421, 'Thuỵ Phương, Bắc Từ Liêm', '', 'culture; history', 'cultural; history; quiet', 45, 0, 0, 'brick',
    'Một trong những ngôi đình cổ nhất Hà Nội, thờ Lý Ông Trọng, nằm ven sông Hồng.',
    'One of Hanoi’s oldest communal houses, dedicated to Ly Ong Trong, on the bank of the Red River.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('dinh-tay-dang', 'draft', 'ba-vi', 'sight', 'Đình Tây Đằng', 'Tay Dang Communal House', 21.19646, 105.42111, 'Tây Đằng, Ba Vì', '', 'culture; history', 'cultural; history; quiet', 45, 0, 0, 'brick',
    'Ngôi đình cổ ở Ba Vì, nổi tiếng với nghệ thuật chạm khắc gỗ dân gian.',
    'An old communal house in Ba Vi, known for its folk woodcarving.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('den-hat-mon', 'draft', 'ba-vi', 'sight', 'Đền Hát Môn', 'Hat Mon Temple', 21.08642, 105.63442, 'Hát Môn, Phúc Thọ', '', 'culture; history', 'cultural; history; quiet', 60, 0, 0, 'brick',
    'Đền thờ Hai Bà Trưng ở Phúc Thọ, gắn với lễ tế cờ khởi nghĩa của Hai Bà.',
    'A temple to the Trung Sisters in Phuc Tho, linked to the flag ceremony of their uprising.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST, APPROX], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('den-hai-ba-trung-me-linh', 'draft', 'hoan-kiem', 'sight', 'Đền Hai Bà Trưng (Mê Linh)', 'Trung Sisters Temple (Me Linh)', 21.15485, 105.73106, 'Mê Linh', '', 'culture; history', 'cultural; history; quiet', 60, 0, 0, 'brick',
    'Đền thờ Hai Bà Trưng tại quê hương Mê Linh của Hai Bà.',
    'A temple to the Trung Sisters in their home district of Me Linh.',
    [baovanhoa], ['Giới thiệu theo "hiểu biết chung".', EST, 'Ngoại thành.'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('chua-huong', 'draft', 'hoan-kiem', 'sight', 'Quần thể danh thắng Hương Sơn (chùa Hương)', 'Perfume Pagoda (Huong Son)', 20.61788, 105.74638, 'Hương Sơn, Mỹ Đức', '', 'culture; photo', 'cultural; iconic; photo; groups', 240, 0, 0, 'leaf',
    'Quần thể chùa động trong núi cách trung tâm khoảng 60 km, một trong những điểm hành hương đông nhất dịp đầu năm.',
    'A complex of mountain pagodas and caves about 60 km from the centre — one of the busiest pilgrimage sites at the start of the year.',
    ['https://www.vietnammonpaysnatal.fr/pagoda-of-vietnam-va-part-2/', baovanhoa], ['Toạ độ theo chùa Thiên Trù (bến vào quần thể). Giá vé + đò chưa có — cần bổ sung. Ngoại thành (~60 km), đi nửa ngày đến cả ngày.'], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('dinh-tuong-phieu', 'draft', 'ba-vi', 'sight', 'Đình Tường Phiêu', 'Tuong Phieu Communal House', 21.11397, 105.51834, 'Tích Giang, Phúc Thọ', '', 'culture; history', 'cultural; history; quiet', 45, 0, 0, 'brick',
    'Ngôi đình cổ ở Phúc Thọ, được nâng hạng di tích quốc gia đặc biệt.',
    'An old communal house in Phuc Tho, raised to a Special National Monument.',
    [congthuong], [EST], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('cua-bac-gate', 'approved', 'hoan-kiem', 'sight', 'Cửa Bắc (Chính Bắc Môn)', 'North Gate (Chinh Bac Mon)', 21.04056, 105.84103, '46 Phan Đình Phùng, Ba Đình', '24/7', 'history; photo', 'history; free; photo', 15, 0, 0, 'brick',
    'Một trong năm cổng của thành Hà Nội xưa còn sót lại, tham quan tự do; trên tường còn dấu đạn pháo năm 1882.',
    'One of the old Hanoi citadel’s surviving gates, free to visit; its wall still bears cannon-shell marks from 1882.',
    ['https://www.vietnamairlines.com/at/vi/plan-book/travel/travel-guide/di-tich-lich-su-o-ha-noi']),
  P('chua-tran-quoc', 'approved', 'hoan-kiem', 'sight', 'Chùa Trấn Quốc', 'Tran Quoc Pagoda', 21.04788, 105.83684, '46 Thanh Niên, Tây Hồ', 'Mo-Su 08:00-16:00', 'culture; history; photo', 'cultural; iconic; free; photo', 30, 0, 0, 'brick',
    'Ngôi chùa cổ bên Hồ Tây, nổi bật với bảo tháp nhiều tầng; điểm ngắm hoàng hôn quen thuộc. Ngày rằm, mùng 1 mở 6:00–18:00.',
    'An ancient pagoda on West Lake with a tall multi-tiered stupa — a classic sunset spot. Open 6:00–18:00 on the 1st and 15th of the lunar month.',
    ['https://www.vietnamairlines.com/at/vi/plan-book/travel/travel-guide/di-tich-lich-su-o-ha-noi'], [], { etiquette_vi: RELIGIOUS.vi, etiquette_en: RELIGIOUS.en }),
  P('hoi-quan-quang-dong', 'approved', 'hoan-kiem', 'sight', 'Hội quán Quảng Đông – 22 Hàng Buồm', 'Cantonese Assembly Hall (22 Hang Buom)', 21.03647, 105.8521, '22 Hàng Buồm, Hoàn Kiếm', '', 'culture; history; photo', 'cultural; history; indoor', 30, 20, 20, 'butter',
    'Hội quán của người Hoa gốc Quảng Đông, di tích kiến trúc nghệ thuật quốc gia từ 2007; nay là Trung tâm Văn hoá Nghệ thuật, hay có triển lãm và biểu diễn.',
    'The assembly hall of Hanoi’s Cantonese community, a national architectural monument since 2007; now an arts centre with frequent exhibitions and performances.',
    [congthuong, 'https://baoquocte.vn/jazz-ha-noi-giai-dieu-khong-bien-gioi-430625.html'], ['Giá 20.000đ từ 1/1/2025.']),

  // Theatres
  P('nha-hat-ho-guom', 'approved', 'hoan-kiem', 'fun', 'Nhà hát Hồ Gươm', 'Ho Guom Opera', 21.02217, 105.85178, '40 Hàng Bài, Hoàn Kiếm', '', 'culture; fun; rainy', 'indoor; iconic; photo', 150, 300, 2000, 'butter',
    'Nhà hát mới ở trung tâm, chuyên giao hưởng, opera và đang mở rộng thành điểm đến văn hoá đa trải nghiệm. Vé bán online trên web nhà hát.',
    'A new theatre in the centre for symphony and opera, growing into a cultural destination. Tickets are sold on the theatre’s website.',
    ['https://hoguomopera.com/'], [EST + ' (giá vé tuỳ chương trình)']),

  // Live-music cafés
  ...[
    ['g4u-acoustic-cafe', 'approved', 'G4U Acoustic Cafe', 21.02858, 105.79955, '29 Nguyễn Khang, Cầu Giấy', 'quiet; indoor', 60, 120,
      'Quán acoustic trên phố Nguyễn Khang — nơi tập trung nhiều quán nhạc sống; nhạc sống buổi tối, đông khách, giá đồ uống khá cao.',
      'An acoustic café on Nguyen Khang, a street full of live-music spots; live music in the evening, busy, drinks on the pricey side.',
      ['https://www.foody.vn/ha-noi/g4u-acoustic-cafe'], [APPROX]],
    ['trinh-ca-cafe', 'approved', 'Trịnh Ca Café', 21.04219, 105.79559, 'Ngõ 233 Tô Hiệu, Cầu Giấy', 'quiet; indoor', 40, 80,
      'Quán chuyên nhạc Trịnh, không gian hoài cổ.', 'A café devoted to Trinh Cong Son’s songs, in a nostalgic setting.', [vinpearlCafe], [APPROX]],
    ['xom-ca-phe', 'approved', 'Xóm Cà Phê', 21.04219, 105.79559, '111C8 Tô Hiệu, Cầu Giấy (và N6E Trung Hoà, Thanh Xuân)', 'quiet; indoor', 40, 80,
      'Quán cà phê không gian cổ, có đêm nhạc Trịnh và acoustic tối thứ Sáu, thứ Bảy.', 'An old-style café with Trinh and acoustic music nights on Friday and Saturday evenings.', [vinpearlCafe], [APPROX, 'Có 2 chi nhánh; toạ độ theo chi nhánh Tô Hiệu.']],
    ['swing-music-lounge', 'draft', 'Swing Music Lounge', 21.02445, 105.85621, '21 Tràng Tiền, Hoàn Kiếm', 'lively; indoor', 80, 200,
      'Lounge nhạc sống ngay trung tâm, nổi bật về thiết kế; âm thanh, sân khấu và ánh sáng được đầu tư.', 'A live-music lounge right in the centre, notable for its design, sound system and stage lighting.',
      ['https://mytour.vn/vi/blog/bai-viet/10-quan-cafe-acoustic-hang-dau-tai-ha-noi-khong-the-bo-lo.html'], ['Sheet: "Cần kiểm tra: số tầng giữa các nguồn khác nhau".']],
    ['ay-lounge', 'approved', 'Ấy Lounge', 21.04364, 105.8457, '63 Hàng Bún, Ba Đình', 'lively; indoor', 50, 100,
      'Một trong những quán đầu tiên ở Hà Nội làm mô hình cà phê kết hợp nhạc sống.', 'One of the first cafés in Hanoi to pair coffee with live music.', [vinpearlCafe], [APPROX]],
    ['trixie-cafe-lounge', 'approved', 'Trixie Cafe & Lounge', 21.01461, 105.81713, '165 Thái Hà, Đống Đa', 'lively; indoor', 60, 150,
      'Phòng trà – cà phê nhạc sống theo phong cách sang trọng.', 'An upmarket live-music lounge in the style of a Vietnamese "phong trà".', [vinpearlCafe], []],
    ['acoustic-cafe-hang-bong', 'approved', 'Acoustic Cafe 236 Hàng Bông', 21.02957, 105.84582, '236 Hàng Bông, Hoàn Kiếm', 'quiet; indoor', 40, 80,
      'Quán nhạc sống acoustic ngay khu phố cổ.', 'An acoustic live-music café in the Old Quarter.', [vinpearlCafe], [APPROX]],
    ['polygon-musik', 'approved', 'Polygon Musik', 21.02956, 105.82971, '36 Cát Linh, Đống Đa', 'lively; indoor', 50, 100,
      'Quán cà phê nhạc sống có phong cách khá độc đáo trên phố Cát Linh.', 'A live-music café with a distinctive style on Cat Linh street.', ['https://vinwonders.com/vi/wonderpedia/news/cafe-nhac-song-ha-noi/'], []],
    ['giang-coffee-ha-dong', 'approved', 'Giang Coffee (Hà Đông)', 20.97885, 105.78643, '119B Trần Phú, Hà Đông', 'quiet; indoor; localFood', 30, 60,
      'Chi nhánh của thương hiệu cà phê trứng lâu đời, có nhạc acoustic.', 'A branch of the long-running egg-coffee brand, with acoustic music.', [toplistHD], [APPROX]],
    ['ca-phe-cuc-cu', 'approved', 'Cà phê Cúc Cu', 20.97724, 105.79189, 'B4-BT1 KĐT Văn Quán, Hà Đông', 'quiet; indoor', 30, 60,
      'Quán acoustic ở khu đô thị Văn Quán, được giới trẻ Hà Đông ưa chuộng.', 'An acoustic café in Van Quan, popular with young people in Ha Dong.', [toplistHD, 'https://www.facebook.com/CucCuHoiAn'], [APPROX]],
    ['atc-coffee-music', 'draft', 'ATC Coffee Music', 20.97521, 105.7607, 'Biệt thự B06, KĐT Nam Cường, Hà Đông', 'lively; indoor; photo', 40, 80,
      'Điểm nhạc sống trong biệt thự ở KĐT Nam Cường, có góc check-in đẹp.', 'A live-music venue in a villa in the Nam Cuong area, with nice photo corners.', ['https://www.facebook.com/atclivemusic/', toplistHD], ['Sheet: "Cần kiểm tra: tên quán suy từ fanpage".', APPROX]],
    ['acoustic-coffee-ha-dong', 'approved', 'Acoustic Coffee (Hà Đông)', 20.97686, 105.78755, 'C40 ngõ 54 Nguyễn Khuyến, Hà Đông', 'quiet; indoor', 30, 60,
      'Quán nhỏ ấm cúng kết hợp cà phê và nhạc acoustic.', 'A small, cosy café with acoustic music.', [toplistHD], [APPROX]],
    ['kuku-acoustic-coffee', 'approved', 'Kuku Acoustic Coffee', 21.00223, 105.83132, 'Khu A8 Tôn Thất Tùng, Đống Đa', 'quiet; indoor', 30, 60,
      'Quán nhỏ tông đen trắng trong khu tập thể A8 Tôn Thất Tùng.', 'A small black-and-white café in the A8 Ton That Tung housing block.', [znews], [APPROX]],
    ['ca-phe-cuoi-ngo', 'approved', 'Cà phê Cuối Ngõ', 21.02124, 105.78547, 'Ngõ 68 Cầu Giấy', 'quiet; indoor', 30, 60,
      'Quán trong ngõ sâu, vừa uống trà vừa nghe nhạc sống.', 'A café deep in an alley — tea with live music.', [znews], [APPROX]],
  ].map(([id, status, name, lat, lng, address, tags, pmin, pmax, bvi, ben, src, notes]) =>
    P(id, status, 'hoan-kiem', 'fun', name, '', lat, lng, address, '', 'fun; culture; rainy', tags, 75, pmin, pmax, 'teal', bvi, ben, src, [EST + ' (đồ uống)', ...notes])),

  // Workshops — always "contact before you go"
  P('gom-chi', 'approved', 'hoan-kiem', 'fun', 'Gốm Chi', 'Gom Chi pottery workshop', 21.01816, 105.86267, '43 Vạn Kiếp, Hai Bà Trưng', '', 'culture; fun; rainy', 'indoor; groups; cultural', 120, 150, 350, 'butter',
    'Xưởng nặn gốm được giới trẻ chọn làm điểm vui chơi cuối tuần.', 'A pottery studio that young Hanoians pick for a weekend activity.',
    [vinGom], [EST, APPROX], workshop()),
  P('puppets-studio', 'approved', 'hoan-kiem', 'fun', 'Puppets Studio', 'Puppets Studio (pottery)', 21.00348, 105.82051, '1/1/61 Tây Sơn, Đống Đa', '', 'culture; fun; rainy', 'indoor; quiet; cultural', 120, 150, 350, 'butter',
    'Studio gốm có lớp học và workshop thường xuyên, không gian yên tĩnh.', 'A pottery studio with regular classes and workshops in a quiet space.',
    [vinGom], [EST, APPROX], workshop()),
  P('cheapie-coffee-art', 'approved', 'hoan-kiem', 'fun', 'Cheapie Coffee & Art', '', 21.07366, 105.81274, 'Tầng 4, Lotte Mall West Lake, 683 Lạc Long Quân, Tây Hồ', '', 'culture; fun; rainy', 'indoor; groups', 120, 150, 300, 'leaf',
    'Tiệm cà phê kiêm không gian vẽ tranh, workshop hằng tuần theo chủ đề.', 'A café and painting space with weekly themed workshops.',
    [vinVe], [EST, 'Sheet: nguồn chưa nêu địa chỉ — địa chỉ do người lập sheet bổ sung.'], workshop()),
  P('thekandle', 'approved', 'hoan-kiem', 'fun', 'Thekandle', 'Thekandle (candle making)', 21.04364, 105.8457, 'Tầng 2, 21 Hàng Bún, Ba Đình', '', 'culture; fun; rainy', 'indoor; quiet', 120, 200, 350, 'leaf',
    'Workshop làm nến thơm theo hướng nghệ thuật ở phố cổ.', 'An arty scented-candle workshop near the Old Quarter.',
    ['https://vinwonders.com/vi/wonderpedia/news/workshop-lam-nen-thom-ha-noi/'], [EST, APPROX], workshop('0868334331')),
  P('ribbon-florist', 'approved', 'hoan-kiem', 'fun', 'Ribbon Florist', 'Ribbon Florist (flower arranging)', 21.02554, 105.85758, '6 Lý Đạo Thành, Hoàn Kiếm', '', 'culture; fun; photo', 'indoor; photo', 120, 300, 600, 'leaf',
    'Tiệm hoa có workshop cắm hoa theo nhiều chủ đề.', 'A florist running flower-arranging workshops on different themes.',
    ['https://vinwonders.com/?p=73751'], [EST], workshop('+84969755323', 'Không phải tuần nào cũng mở lớp.', 'Classes don’t run every week.')),

  // Photobooths
  ...[
    ['photo-time-chua-lang', 'Photo Time (Chùa Láng)', 21.02469, 105.80695, '99 Chùa Láng, Đống Đa', 'Chuỗi photobooth được đánh giá cao về chất lượng ảnh.', 'A photobooth chain praised for its photo quality.', finhay, [APPROX], {}],
    ['photo-time-xuan-thuy', 'Photo Time (Xuân Thuỷ)', 21.03618, 105.78227, '241 Xuân Thuỷ, Cầu Giấy', 'Chuỗi photobooth được đánh giá cao về chất lượng ảnh.', 'A photobooth chain praised for its photo quality.', finhay, [], {}],
    ['finhay-photobooth-nha-chung', 'Finhay Photobooth (Nhà Chung)', 21.02736, 105.85014, '8 Nhà Chung, Hoàn Kiếm', 'Chương trình photobooth chụp miễn phí do Finhay tổ chức.', 'A free photobooth campaign run by Finhay.', finhay, [APPROX], finhayPromo],
    ['finhay-photobooth-chua-boc', 'Finhay Photobooth (Chùa Bộc)', 21.00817, 105.82822, '27 Chùa Bộc, Đống Đa', 'Chương trình photobooth chụp miễn phí do Finhay tổ chức.', 'A free photobooth campaign run by Finhay.', finhay, [APPROX], finhayPromo],
    ['finhay-photobooth-nhat-chieu', 'Finhay Photobooth (Nhật Chiêu)', 21.07612, 105.81536, '47 Nhật Chiêu, Tây Hồ', 'Chương trình photobooth chụp miễn phí do Finhay tổ chức.', 'A free photobooth campaign run by Finhay.', finhay, [APPROX], finhayPromo],
    ['finhay-photobooth-duong-khue', 'Finhay Photobooth (Dương Khuê)', 21.03574, 105.77417, '6 Dương Khuê, Cầu Giấy', 'Chương trình photobooth chụp miễn phí do Finhay tổ chức.', 'A free photobooth campaign run by Finhay.', finhay, [APPROX], finhayPromo],
    ['photobooth-mot-hai-ba-tran-quoc-toan', 'Photobooth Một Hai Ba (Trần Quốc Toản)', 21.01926, 105.85068, '64A Trần Quốc Toản, Hoàn Kiếm', 'Chuỗi photobooth với hai concept Vivid và Neutral; chi nhánh này theo concept Vivid.', 'A photobooth chain with Vivid and Neutral concepts; this branch is Vivid.', finhay, [APPROX], {}],
    ['photobooth-mot-hai-ba-trich-sai', 'Photobooth Một Hai Ba (Trích Sài)', 21.0549, 105.80993, '171 Trích Sài, Tây Hồ', 'Chuỗi photobooth với hai concept Vivid và Neutral; chi nhánh này theo concept Vivid.', 'A photobooth chain with Vivid and Neutral concepts; this branch is Vivid.', finhay, [APPROX], {}],
    ['photobooth-mot-hai-ba-mac-dinh-chi', 'Photobooth Một Hai Ba (Mạc Đĩnh Chi)', 21.04658, 105.84132, '1 Mạc Đĩnh Chi, Ba Đình', 'Chuỗi photobooth với hai concept Vivid và Neutral; chi nhánh này theo concept Neutral.', 'A photobooth chain with Vivid and Neutral concepts; this branch is Neutral.', finhay, [], {}],
    ['photoism-xuan-thuy', 'Photoism (Xuân Thuỷ)', 21.03626, 105.78769, '83 Xuân Thuỷ, Cầu Giấy', 'Chuỗi photobooth chuẩn Hàn Quốc, ảnh sắc nét, nhiều phông nền.', 'A Korean-style photobooth chain with sharp photos and many backdrops.', 'https://www.vietnamairlines.com/at/vi/plan-book/travel/travel-guide/photobooth-ha-noi', [], {}],
    ['pose-photo', 'Pose Photo', 21.01647, 105.81485, '33 ngõ 49 Huỳnh Thúc Kháng, Đống Đa', 'Photobooth phong cách Hàn, tông hồng ngọt ngào, nằm trong ngõ nhỏ.', 'A Korean-style photobooth in soft pink, tucked down a small alley.', mia, [APPROX], {}],
    ['photo-story-chua-lang', 'Photo Story (Chùa Láng)', 21.02357, 105.80493, '128 Chùa Láng, Đống Đa', 'Photobooth quen thuộc với giới trẻ trên phố Chùa Láng.', 'A photobooth popular with young people on Chua Lang street.', mia, [APPROX], {}],
  ].map(([id, name, lat, lng, address, bvi, ben, src, notes, extra]) =>
    P(id, 'approved', 'hoan-kiem', 'fun', name, '', lat, lng, address, '', 'photo; fun; rainy', 'photo; indoor; groups', 20,
      extra === finhayPromo ? 0 : 50, extra === finhayPromo ? 0 : 120, 'butter', bvi, ben, [src],
      extra === finhayPromo ? notes : [EST, ...notes], extra)),
  P('photobooth-dang-van-ngu', 'draft', 'hoan-kiem', 'fun', 'Life4cuts & Photo Story (Đặng Văn Ngữ)', '', 21.01144, 105.83334, 'Phố Đặng Văn Ngữ, Đống Đa', '', 'photo; fun; rainy', 'photo; indoor; groups', 20, 50, 120, 'butter',
    'Cụm photobooth phong cách tươi trẻ, phù hợp nhóm dưới 6 người; mở cửa đến khoảng 22h.', 'A cluster of youthful photobooths, good for groups under six; open until about 10 pm.',
    ['https://www.greensm.com/vn-vi/news/photobooth-dang-van-ngu-ha-noi'], ['Sheet: "nguồn chưa ghi số nhà".', EST, APPROX]),
]

// Existing places: only add the new source(s) (+ fill an empty opening_hours).
const enrich = {
  'women-museum': { sources: [vietnamTravel], opening_hours: 'Mo-Su 08:00-17:00' },
  'imperial-citadel': { sources: ['https://hoangthanhthanglong.com'], note: 'Sheet VH-GT: giờ & giá giữa các nguồn không khớp; vé điện tử tại vedientu.hoangthanhthanglong.com.' },
  'ngoc-son': { sources: [baovanhoa] },
  'ma-may-87': { sources: [congthuong], note: 'Sheet VH-GT: vé 20.000đ/lượt từ 1/1/2025 (đang ghi 10k — kiểm tra lại).' },
  'water-puppets': { sources: ['https://www.vietnamtourism.com/vi/nha-hat-mua-roi-nuoc-thang-long-o-ha-noi-gio-dien-ve-va-thoi'] },
  'opera-house': { sources: ['https://www.vietnamplus.vn/infographics-nha-hat-lon-thanh-pho-ha-noi-diem-hen-van-hoa-post329834.vnp'] },
}

// Could not be placed on the map: their own sheet (fill lat/lng, then move to places.csv).
const manual = [
  { area: 'hoan-kiem', name_vi: 'Bảo tàng Tăng Thiết giáp', note: `${SRC}: nguồn chưa nêu địa chỉ. Giờ 8:00–17:00. ${vinpearlMuseums}` },
  { area: 'hoan-kiem', name_vi: 'Bảo tàng Công binh', note: `${SRC}: nguồn chưa nêu địa chỉ. T3–T6 7:30–11:00, 13:30–16:00; miễn phí. ${vinpearlMuseums}` },
  { area: 'hoan-kiem', name_vi: 'OUR.Hanoi (workshop vẽ tranh)', note: `${SRC}: 292 Bạch Đằng — không tìm được toạ độ. Workshop: nên liên hệ trước khi đến. ${vinVe}` },
  { area: 'hoan-kiem', name_vi: 'Nhà hát Ca Múa Nhạc Thăng Long', note: `${SRC}: chưa có địa chỉ. Show "Chuyện Hà Nội – Một ngày rất Hà Nội". https://nhadautu.vn/kham-pha-ban-do-nhac-jazz-quoc-te-tai-ha-noi-vao-thang-9-d106942.html` },
]

// ---------------------------------------------------------------- events
const E = (id, status, kind, category, name_vi, name_en, blurb_vi, blurb_en, venue, address, lat, lng, from_date, to_date, start_times, end_time, visit_min, price, needs_ticket, event_url, source, notes = [], place_id = '') => ({
  id, status, area: 'hoan-kiem', kind, category, sensitivity: 'ok', name_vi, name_en, blurb_vi, blurb_en, place_id, venue, address,
  lat: String(lat), lng: String(lng), from_date, to_date, weekdays: '', start_times, end_time, visit_min: String(visit_min),
  price_min_k: price === null ? '' : String(price[0]), price_max_k: price === null ? '' : String(price[1]), needs_ticket: needs_ticket ? 'true' : 'false',
  event_url, host_name: '', host_url: '', source: `${source} · ${SRC}`, checked_on: '2026-10-03', time_confirmed: 'false',
  review_notes: ['Giờ chưa được nguồn xác nhận (app ghi "giờ dự kiến").', ...notes, EN_AI].join(' '),
})
const events = [
  E('vh-le-hoi-van-hoa-the-gioi-2026', 'approved', 'open', 'festival', 'Lễ hội Văn hoá Thế giới tại Hà Nội lần II – "Hội tụ di sản, Kiến tạo tương lai"', 'World Culture Festival in Hanoi (2nd edition)',
    '45 không gian văn hoá, 35 gian ẩm thực, chiếu phim 18 nước, thời trang 19 nước, 20 đoàn nghệ thuật quốc tế.', '45 culture spaces, 35 food stalls, films from 18 countries, fashion from 19 and 20 international arts troupes.',
    'Hoàng thành Thăng Long', '19C Hoàng Diệu, Ba Đình', 21.036289, 105.840442, '2026-10-01', '2026-10-04', '09:00', '21:00', 90, null, false,
    'https://mekongasean.vn/sap-dien-ra-le-hoi-van-hoa-the-gioi-tai-ha-noi-lan-thu-hai-59854.html', 'Báo chí (mekongasean.vn)', ['Giá vé: chưa công bố.'], 'imperial-citadel'),
  ...['2026-10-09', '2026-10-16', '2026-11-06'].map((d) =>
    E(`vh-nguyen-du-hxh-${d.slice(5).replace('-', '')}`, 'approved', 'show', 'theatre', 'Sân khấu kịch huyền ảo: Nguyễn Du – Hồ Xuân Hương Ngoại Truyện', 'Fantasy play: Nguyen Du – Ho Xuan Huong, the untold story',
      'Vở kịch huyền ảo về hai đại thi hào; giá vé tuỳ vị trí ghế.', 'A fantasy play about two great poets; ticket price depends on the seat.',
      'Nhà hát Tuổi Trẻ', 'Số 11 Ngô Thì Nhậm, Hai Bà Trưng', 21.017581, 105.853308, d, d, '20:00', '', 120, [300, 300], true,
      'https://ticketgo.vn/', 'Nền tảng bán vé (ticketgo.vn)', ['Các suất 09/10, 16/10, 06/11/2026. Sheet: "trang vé không ghi rõ thành phố" — địa chỉ nhà hát ở Hà Nội.'])),
  E('vh-bigbang-my-dinh-2026', 'approved', 'show', 'music', 'BIGBANG 2026-2027 World Tour <XX: COSMOS> in Hanoi', '',
    'Tâm điểm mùa concert tháng 10; mua vé qua kênh bán vé chính thức.', 'The highlight of October’s concert season; tickets through the official sellers.',
    'Sân vận động Quốc gia Mỹ Đình', '1 Lê Đức Thọ, Nam Từ Liêm', 21.0205, 105.76393, '2026-10-24', '2026-10-25', '20:00', '', 180, null, true,
    'https://vtv.vn/su-bung-no-cua-cac-concert-quy-mo-lon-va-co-hoi-dinh-hinh-cac-ip-van-hoa-100260928161459087.htm', 'Báo chí (vtv.vn)'),
  E('vh-le-hoi-thiet-ke-sang-tao-2026', 'draft', 'open', 'festival', 'Lễ hội Thiết kế Sáng tạo Hà Nội 2026 – "Kinh tế sáng tạo"', 'Hanoi Creative Design Festival 2026',
    'Hoạt động chính tháng 11, trung tâm ở khu chợ Đồng Xuân – Bắc Qua và nhiều điểm toàn thành phố.', 'Main programme in November, centred on the Dong Xuan – Bac Qua market area with venues across the city.',
    'Chợ Đồng Xuân – Bắc Qua', 'Đồng Xuân, Hoàn Kiếm', 21.0381, 105.8497, '2026-11-01', '2026-11-30', '09:00', '21:00', 90, null, false,
    'https://daibieunhandan.vn/print/10400007.html', 'Báo chí (daibieunhandan.vn)', ['Sheet: "ngày cụ thể trong tháng 11 chưa công bố". Văn bản gốc: https://datafiles.hanoi.gov.vn/gov-hni/6249/VanBan/2025/12/10/KH-333-2025.pdf'], 'dong-xuan'),
  E('vh-tu-hoi-sang-tao-2026', 'approved', 'open', 'festival', 'Tụ hội Sáng tạo – khởi động Lễ hội Thiết kế Sáng tạo Hà Nội 2026', 'Creative Gathering — opening of the Hanoi Creative Design Festival 2026',
    'Hơn 200 đơn vị sáng tạo tham gia; miễn phí.', 'Over 200 creative groups taking part; free.',
    'Quảng trường Đông Kinh Nghĩa Thục & phố đi bộ hồ Hoàn Kiếm', 'Đinh Tiên Hoàng, Hoàn Kiếm', 21.03208, 105.85159, '2026-01-10', '2026-01-11', '09:00', '21:00', 60, [0, 0], false,
    'https://baovanhoa.vn/van-hoa/khai-mac-chuong-trinh-tu-hoi-sang-tao-hanh-trinh-den-le-hoi-thiet-ke-sang-tao-ha-noi-2026-196443.html', 'Báo chí (baovanhoa.vn)', ['Đã diễn ra.']),
  E('vh-crescendo-2026', 'draft', 'show', 'music', 'Crescendo – Giao hưởng kết nối (hoà nhạc ngoài trời)', 'Crescendo — open-air symphony concert',
    'Một phần Liên hoan Âm nhạc Quốc tế Crescendo 2026; miễn phí, ngoài trời.', 'Part of the Crescendo International Music Festival 2026; free, outdoors.',
    'Nhà Bát Giác, hồ Hoàn Kiếm', 'Hồ Hoàn Kiếm', 21.0287, 105.8524, '2026-07-04', '2026-07-04', '20:00', '', 120, [0, 0], false,
    'https://thoibaotaichinhvietnam.vn/nhieu-phim-viet-se-duoc-chieu-tai-lien-hoan-phim-quoc-te-ha-noi-71410.html', 'Báo chí (thoibaotaichinhvietnam.vn)',
    ['Đã diễn ra. Link nguồn trong sheet có vẻ là bài về liên hoan phim, không phải Crescendo — cần thay link đúng.']),
  E('vh-lien-hoan-san-khau-2026', 'approved', 'show', 'theatre', 'Liên hoan Sân khấu Hà Nội mở rộng 2026', 'Hanoi Open Theatre Festival 2026',
    'Chèo, cải lương, kịch nói, nhạc kịch, xiếc, rối, tuồng; giá vé theo từng vở.', 'Cheo, cai luong, spoken drama, musicals, circus, puppetry and tuong; prices per show.',
    'Rạp Công Nhân (và Đại Nam, Hồng Hà, Cung Việt Xô, Nhà hát Hồ Gươm…)', '42 Tràng Tiền, Hoàn Kiếm', 21.025308, 105.854807, '2026-09-03', '2026-09-13', '19:30', '', 150, null, true,
    'https://daibieunhandan.vn/dau-thang-9-se-dien-ra-lien-hoan-san-khau-ha-noi-mo-rong-2026-10416231.html', 'Báo chí (daibieunhandan.vn)', ['Đã diễn ra. Nhiều rạp; toạ độ theo Rạp Công Nhân.']),
  E('vh-festival-thang-long-2026', 'approved', 'open', 'festival', 'Festival Thăng Long – Hà Nội lần II "Dòng chảy di sản"', 'Thang Long – Hanoi Festival (2nd edition)',
    'Hàng chục sự kiện, hơn 3.000 nghệ sĩ; phần lớn miễn phí.', 'Dozens of events and over 3,000 artists; mostly free.',
    'Hoàng thành (và Văn Miếu, Bảo tàng Hà Nội, Bát Tràng, Tượng đài Cảm tử, QT Đông Kinh Nghĩa Thục)', '19C Hoàng Diệu, Ba Đình', 21.036289, 105.840442, '2026-09-11', '2026-09-20', '09:00', '21:00', 90, [0, 0], false,
    'https://baoquocte.vn/khai-mac-festival-thang-long-ha-noi-2026-bua-tiec-nghe-thuat-da-mau-sac-van-hoa-442897.html', 'Báo chí (baoquocte.vn)', ['Đã diễn ra. Nhiều địa điểm; toạ độ theo Hoàng thành.'], 'imperial-citadel'),
  E('vh-jazztival-2026', 'approved', 'show', 'music', 'Hanoi Jazztival 2026 – "Jazz Hà Nội, Giai điệu không biên giới"', 'Hanoi Jazztival 2026',
    'Khai mạc, toạ đàm, workshop và Night Jam tại các jazz club; phần lớn miễn phí.', 'Opening night, talks, workshops and Night Jams at jazz clubs; mostly free.',
    'Vườn âm nhạc Nhà hát Lớn (và 22 Hàng Buồm, Bảo tàng Phụ nữ, các jazz club)', '1A Tràng Tiền, Hoàn Kiếm', 21.024193, 105.857825, '2026-09-17', '2026-09-19', '20:00', '', 120, [0, 0], false,
    'https://nhadautu.vn/kham-pha-ban-do-nhac-jazz-quoc-te-tai-ha-noi-vao-thang-9-d106942.html', 'Báo chí (nhadautu.vn)', ['Đã diễn ra.'], 'opera-house'),
  E('vh-lhp-tai-lieu-chau-au-2026', 'approved', 'show', 'film', 'Liên hoan Phim tài liệu châu Âu – Việt Nam lần 16', '16th European–Vietnamese Documentary Film Festival',
    '25 phim (11 quốc tế, 14 Việt Nam).', '25 films (11 international, 14 Vietnamese).',
    'Hãng Phim tài liệu và khoa học Trung ương', '465 Hoàng Hoa Thám, Ba Đình', 21.04374, 105.81308, '2026-09-18', '2026-09-26', '19:00', '', 120, null, false,
    'https://mekongasean.vn/14-tac-pham-trong-nuoc-tham-gia-lien-hoan-phim-tai-lieu-chau-au-viet-nam-2026-59631.html', 'Báo chí (mekongasean.vn)', ['Đã diễn ra.']),
]
// Events already imported from Hanoi Maps: note the second source.
const eventNotes = {
  'hm-5': 'Cũng có trong sheet VH-GT: London Symphony Orchestra, Sir Antonio Pappano chỉ huy; vé trên https://hoguomopera.com/',
  'hm-119': 'Cũng có trong sheet VH-GT: giá từ 900.000đ, tại Cung Văn hoá Lao động Hữu nghị Việt Xô (nguồn vticket.com.vn).',
  'hm-86': 'Cũng có trong sheet VH-GT: giá từ 500.000đ (nguồn ticketgo.vn).',
}
const skipped = [
  'Concert "Anh trai vượt ngàn chông gai 2026" — ở TP.HCM',
  'Workshop Tipsy Art — địa chỉ ở TP.HCM',
  'Giải Marathon Quốc tế Hà Nội Techcombank (4/10) — không có điểm cụ thể (chạy qua 37 địa danh)',
  'Liveshow Hoàng Tôn – 14 Casper – Bon Nghiêm (Sky Melody) — nguồn không rõ thành phố/địa điểm',
  'Liên hoan Phim Quốc tế Hà Nội lần VIII (HANIFF) — chưa có địa điểm, lịch dự kiến',
  'Live concert Thanh Tùng (15/8) — chưa có địa điểm, đã diễn ra',
  'Vietnam Airlines Classic, Musique de Salon 22, Subscription Concert 187 — đã có (hm-5, hm-119, hm-86), chỉ ghi chú thêm nguồn',
  'Bảo tàng Lịch sử Quốc gia, Nhà tù Hoả Lò — đã có, sheet chưa có link nguồn',
  'Cung Việt Xô, rạp Công Nhân/Đại Nam/Hồng Hà, Hãng phim tài liệu, SVĐ Mỹ Đình — chỉ dùng làm địa điểm sự kiện',
]

// ---------------------------------------------------------------- write
const addCols = (cols, extra) => [...cols, ...extra.filter((c) => !cols.includes(c))]

const placeRows = readCsv(join(SHEETS, 'places.csv'))
let placeCols = Object.keys(placeRows[0]).filter((k) => k !== '__line')
placeCols = addCols(placeCols, ['notice_vi', 'notice_en', 'phone'])
const have = new Set(placeRows.map((r) => r.id))
let addedP = 0
for (const p of places) if (!have.has(p.id)) (placeRows.push(p), addedP++)
for (const [id, e] of Object.entries(enrich)) {
  const r = placeRows.find((x) => x.id === id)
  if (!r) continue
  const list = (r.sources || '').split(';').map((s) => s.trim()).filter(Boolean)
  for (const s of e.sources) if (!list.includes(s)) list.push(s)
  r.sources = list.join('; ')
  if (e.opening_hours && !r.opening_hours) r.opening_hours = e.opening_hours
  if (e.note && !(r.review_notes || '').includes(e.note)) r.review_notes = [r.review_notes, e.note].filter(Boolean).join(' ')
}
writeCsv(join(SHEETS, 'places.csv'), placeCols, placeRows)

const eventRows = readCsv(join(SHEETS, 'events.csv'))
let eventCols = Object.keys(eventRows[0]).filter((k) => k !== '__line')
eventCols = addCols(eventCols, ['time_confirmed'])
const haveE = new Set(eventRows.map((r) => r.id))
let addedE = 0
for (const e of events) if (!haveE.has(e.id)) (eventRows.push(e), addedE++)
for (const [id, note] of Object.entries(eventNotes)) {
  const r = eventRows.find((x) => x.id === id)
  if (r && !(r.review_notes || '').includes(note)) r.review_notes = [r.review_notes, note].filter(Boolean).join(' ')
}
writeCsv(join(SHEETS, 'events.csv'), eventCols, eventRows)

const manualRows = readCsv(join(SHEETS, 'to_add_manually.csv'))
const haveM = new Set(manualRows.map((r) => r.name_vi))
for (const m of manual) if (!haveM.has(m.name_vi)) manualRows.push({ ...m, lat: '', lng: '' })
writeCsv(join(SHEETS, 'to_add_manually.csv'), ['area', 'name_vi', 'note', 'lat', 'lng'], manualRows)

const approved = places.filter((p) => p.status === 'approved').length
console.log(`places.csv: +${addedP} (${approved} approved, ${places.length - approved} draft), ${Object.keys(enrich).length} existing got extra sources`)
console.log(`events.csv: +${addedE}; ${Object.keys(eventNotes).length} existing events annotated`)
console.log(`to_add_manually.csv: ${manual.length} rows need coordinates`)
console.log('Skipped:\n  - ' + skipped.join('\n  - '))
