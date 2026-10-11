import type { Lang } from '../types'

/**
 * Terms of use and privacy policy. A first draft written from what the app really does (see
 * Data/README.md): have it read by someone who knows Vietnamese law before relying on it, and keep
 * it in step with the app — a new service that receives data belongs under "Who else handles it".
 * The contact email comes from VITE_CONTACT_EMAIL.
 */
export interface LegalDoc {
  title: string
  updated: string
  intro: string
  sections: { h: string; p: string[] }[]
}
export type LegalKind = 'terms' | 'privacy'

export const CONTACT_EMAIL = ((import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '').trim()

const contactVi = CONTACT_EMAIL ? `email ${CONTACT_EMAIL}` : 'mục Tài khoản trong app'
const contactEn = CONTACT_EMAIL ? `email ${CONTACT_EMAIL}` : 'the Account tab in the app'

export const LEGAL: Record<Lang, Record<LegalKind, LegalDoc>> = {
  vi: {
    terms: {
      title: 'Điều khoản sử dụng',
      updated: 'Cập nhật ngày 11/10/2026',
      intro:
        'VNExplore là ứng dụng gợi ý lộ trình khám phá Hà Nội, đang trong giai đoạn thử nghiệm. Khi dùng app, bạn đồng ý với các điều khoản dưới đây.',
      sections: [
        {
          h: '1. Dịch vụ',
          p: [
            'App gợi ý địa điểm, lộ trình, câu chuyện, nhiệm vụ và cho phép đi theo nhóm. App miễn phí và được cung cấp “như hiện có”; tính năng có thể thay đổi, tạm dừng hoặc ngừng mà không báo trước.',
            'Giá, giờ mở cửa, thời gian di chuyển, thời tiết và sự kiện chỉ để tham khảo, có thể đã thay đổi. Hãy tự kiểm tra trước khi đi, nhất là với địa điểm có nhãn “Chưa xác nhận” hoặc “Dữ liệu bản đồ mở”.',
          ],
        },
        {
          h: '2. An toàn khi đi',
          p: [
            'Bạn tự chịu trách nhiệm về sự an toàn của mình và người đi cùng: tuân thủ luật giao thông, chú ý thời tiết, không dùng điện thoại khi đang lái xe, tôn trọng nội quy của nơi bạn đến.',
            'Không đi vào khu vực cấm, nguy hiểm hoặc tài sản riêng chỉ để hoàn thành nhiệm vụ hay lấy con dấu.',
          ],
        },
        {
          h: '3. Tài khoản',
          p: [
            'Bạn có thể dùng app không cần tài khoản, vào bằng tài khoản khách, hoặc tạo tài khoản bằng email. Hãy giữ mật khẩu cẩn thận; bạn chịu trách nhiệm cho hoạt động trong tài khoản của mình.',
            'Tài khoản khách không được nâng cấp sẽ tự xoá sau 30 ngày. Bạn có thể xoá tài khoản bất cứ lúc nào trong mục Tài khoản.',
          ],
        },
        {
          h: '4. Nội dung bạn đăng',
          p: [
            'Quest, địa điểm, mẹo, báo cáo và tên hiển thị bạn đăng công khai sẽ hiện cho mọi người. Bạn giữ quyền với nội dung của mình và cho phép VNExplore lưu trữ, hiển thị, chỉnh định dạng và dùng nó trong app.',
            'Nội dung phải tuân thủ Quy tắc cộng đồng: không bịa đặt, sai sự thật, xúc phạm, vu khống, mạo phạm di tích hay tín ngưỡng, tuyên truyền sai lệch, spam hoặc lừa đảo. Vi phạm có thể bị gỡ nội dung, khoá tài khoản và bị xử lý theo pháp luật Việt Nam.',
            'Địa điểm và quest do người dùng thêm được cộng đồng xác nhận dần (đủ 10 người đã đến hoặc đã đi) và có thể bị ẩn khi nhiều người báo sai. VNExplore không bảo đảm nội dung do người dùng đăng là chính xác.',
          ],
        },
        {
          h: '5. Sử dụng đúng cách',
          p: [
            'Không giả vị trí để lấy con dấu hay xác nhận địa điểm, không tạo nhiều tài khoản để thao túng việc xác nhận, không tấn công, dò quét hay làm quá tải hệ thống, không thu thập dữ liệu của người dùng khác.',
          ],
        },
        {
          h: '6. Dữ liệu bản đồ và bên thứ ba',
          p: [
            'Bản đồ và dữ liệu địa điểm có dùng dữ liệu © những người đóng góp OpenStreetMap (ODbL) và Overture Maps (CDLA-Permissive-2.0). App có liên kết tới trang web và dịch vụ của bên khác (Google Maps, trang sự kiện…); VNExplore không chịu trách nhiệm về nội dung của họ.',
          ],
        },
        {
          h: '7. Giới hạn trách nhiệm',
          p: [
            'Trong phạm vi pháp luật cho phép, VNExplore không chịu trách nhiệm về thiệt hại phát sinh từ việc dựa vào thông tin trong app, từ nội dung do người dùng đăng, hay từ việc app gián đoạn.',
          ],
        },
        {
          h: '8. Thay đổi và luật áp dụng',
          p: [
            'Điều khoản có thể được cập nhật; ngày cập nhật ghi ở đầu trang. Tiếp tục dùng app nghĩa là bạn đồng ý với bản mới. Điều khoản này tuân theo pháp luật Việt Nam.',
            `Liên hệ: ${contactVi}.`,
          ],
        },
      ],
    },
    privacy: {
      title: 'Chính sách quyền riêng tư',
      updated: 'Cập nhật ngày 11/10/2026',
      intro:
        'Chính sách này cho biết VNExplore thu thập dữ liệu cá nhân nào, dùng để làm gì và bạn có những quyền gì, theo Luật Bảo vệ dữ liệu cá nhân (số 91/2025/QH15).',
      sections: [
        {
          h: '1. Dữ liệu chúng tôi lưu',
          p: [
            'Tài khoản: tên hiển thị, tên đăng nhập (@tên), email và mật khẩu (được mã hoá, chúng tôi không đọc được). Tài khoản khách chỉ có tên hiển thị. Đăng nhập bằng Google: tên, email và ảnh đại diện từ Google.',
            'Hoạt động: hành trình đã hoàn thành (các điểm, con dấu, vật phẩm, thời gian, điểm xuất phát, phương tiện, chi phí ước tính), quest bạn tạo và thích, phòng nhóm bạn tham gia, địa điểm bạn thêm, lượt bạn đã đến một địa điểm do cộng đồng thêm, báo cáo và góp ý bạn gửi.',
            'Không đăng nhập: lộ trình và hộ chiếu chỉ lưu trên trình duyệt của bạn (localStorage), không gửi lên máy chủ.',
          ],
        },
        {
          h: '2. Vị trí và micro',
          p: [
            'Vị trí chỉ được dùng khi bạn cho phép: để chọn điểm xuất phát, tính đường đi và kiểm tra bạn đã đến nơi. Vị trí liên tục không được lưu trên máy chủ. Có ba trường hợp toạ độ được gửi đi: điểm xuất phát lưu cùng hành trình khi bạn đã đăng nhập; toạ độ lúc bạn bấm “Tôi đã đến” hoặc thêm địa điểm, gửi để máy chủ kiểm tra khoảng cách (toạ độ đó không được lưu lại); toạ độ các điểm của lộ trình gửi tới dịch vụ tính đường và thời tiết.',
            'Micro chỉ bật khi bạn bấm nút nói. Việc chuyển giọng nói thành chữ do trình duyệt của bạn thực hiện (có thể qua máy chủ của Google hoặc Apple); VNExplore không ghi âm và không lưu âm thanh.',
          ],
        },
        {
          h: '3. Dùng dữ liệu để làm gì',
          p: [
            'Để app hoạt động: lập lộ trình, đóng dấu, lưu hộ chiếu, chơi nhóm, hiển thị quest và địa điểm cộng đồng, xác nhận địa điểm. Để chống gian lận và lạm dụng (giới hạn số lần, CAPTCHA). Để sửa lỗi và cải thiện nội dung.',
            'Chúng tôi không bán dữ liệu cá nhân và không dùng cho quảng cáo.',
          ],
        },
        {
          h: '4. Ai thấy dữ liệu của bạn',
          p: [
            'Mọi người thấy: tên hiển thị, @tên, ảnh đại diện và nội dung bạn đăng công khai (quest, địa điểm, mẹo). Địa điểm cộng đồng không hiện tên người thêm.',
            'Thành viên cùng phòng nhóm thấy tên hiển thị, vai và tiến độ của bạn trong phòng đó. Hành trình và hộ chiếu chỉ mình bạn xem được.',
          ],
        },
        {
          h: '5. Dịch vụ bên thứ ba xử lý dữ liệu',
          p: [
            'Supabase (máy chủ ở Singapore): tài khoản và dữ liệu người dùng. Vercel: phục vụ trang web. Render: máy chủ API.',
            'Google Gemini: đọc câu yêu cầu bạn gõ để hiểu ý (câu yêu cầu được lưu tạm tối đa 24 giờ trong bộ nhớ máy chủ để trả lời nhanh hơn). Cloudflare Turnstile: CAPTCHA chống bot.',
            'OpenStreetMap Nominatim: tìm địa chỉ bạn gõ. OSRM (routing.openstreetmap.de): tính đường đi. Open-Meteo: dự báo thời tiết theo toạ độ. OpenFreeMap: hình bản đồ.',
            'Một số dịch vụ đặt máy chủ ngoài Việt Nam, nên dữ liệu có thể được chuyển ra nước ngoài để xử lý.',
          ],
        },
        {
          h: '6. Lưu trong bao lâu',
          p: [
            'Dữ liệu tài khoản được giữ đến khi bạn xoá tài khoản. Tài khoản khách không nâng cấp tự xoá sau 30 ngày. Khi xoá tài khoản, hồ sơ, hành trình, quest, lượt thích, phòng nhóm và lượt đến của bạn bị xoá ngay; địa điểm bạn đã đưa lên bản đồ được giữ lại nhưng không còn gắn với bạn.',
          ],
        },
        {
          h: '7. Quyền của bạn',
          p: [
            'Bạn có quyền biết, xem, sửa, xoá dữ liệu của mình, rút lại sự đồng ý và phản đối việc xử lý. Xem hộ chiếu và quest của bạn trong mục Tài khoản; xoá tài khoản bằng nút “Xoá tài khoản”; tắt quyền vị trí hoặc micro trong cài đặt trình duyệt bất cứ lúc nào.',
            `Với yêu cầu khác (sửa thông tin, xin bản sao dữ liệu, khiếu nại), hãy liên hệ qua ${contactVi}.`,
          ],
        },
        {
          h: '8. Trẻ em',
          p: ['Nếu bạn dưới 16 tuổi, hãy dùng app và tạo tài khoản khi có sự đồng ý của cha mẹ hoặc người giám hộ.'],
        },
        {
          h: '9. Bảo mật và thay đổi',
          p: [
            'Dữ liệu được truyền qua HTTPS và được bảo vệ bằng phân quyền theo từng người dùng trên cơ sở dữ liệu. Không có hệ thống nào an toàn tuyệt đối; nếu xảy ra sự cố lộ dữ liệu, chúng tôi sẽ thông báo theo quy định.',
            'Chính sách có thể được cập nhật; ngày cập nhật ghi ở đầu trang.',
          ],
        },
      ],
    },
  },
  en: {
    terms: {
      title: 'Terms of use',
      updated: 'Updated 11 October 2026',
      intro: 'VNExplore suggests routes for exploring Hanoi and is being tested. By using the app you accept these terms.',
      sections: [
        {
          h: '1. The service',
          p: [
            'The app suggests places, routes, stories and missions, and lets you go as a group. It is free and provided “as is”; features may change, pause or stop without notice.',
            'Prices, opening hours, travel times, weather and events are for reference and may be out of date. Check before you go, especially places marked “Not confirmed yet” or “Open map data”.',
          ],
        },
        {
          h: '2. Staying safe',
          p: [
            'You are responsible for your own safety and that of the people with you: follow traffic rules, mind the weather, don’t use your phone while driving, and respect the rules of the places you visit.',
            'Don’t enter restricted, dangerous or private areas to complete a mission or get a stamp.',
          ],
        },
        {
          h: '3. Accounts',
          p: [
            'You can use the app without an account, as a guest, or with an email account. Keep your password safe; you are responsible for what happens in your account.',
            'Guest accounts that are not upgraded are deleted after 30 days. You can delete your account at any time from the Account tab.',
          ],
        },
        {
          h: '4. What you publish',
          p: [
            'Quests, places, tips, reports and display names you publish are visible to everyone. You keep your rights to your content and allow VNExplore to store, show, reformat and use it in the app.',
            'Content must follow the community rules: nothing made-up or false, insulting, slanderous, disrespectful to heritage or beliefs, misleading, spam or scams. Breaking them can get content removed, the account blocked, and may be punished under Vietnamese law.',
            'Places and quests added by travellers are confirmed by the community over time (10 people have been there or done it) and can be hidden when several people report them. VNExplore does not guarantee that user content is accurate.',
          ],
        },
        {
          h: '5. Fair use',
          p: [
            'Don’t fake your location to get stamps or confirm places, don’t create several accounts to game confirmations, don’t attack, scan or overload the service, and don’t collect other users’ data.',
          ],
        },
        {
          h: '6. Map data and third parties',
          p: [
            'Maps and place data use data © OpenStreetMap contributors (ODbL) and Overture Maps (CDLA-Permissive-2.0). The app links to other sites and services (Google Maps, event pages…); VNExplore is not responsible for their content.',
          ],
        },
        {
          h: '7. Liability',
          p: [
            'To the extent the law allows, VNExplore is not liable for loss arising from relying on information in the app, from content published by users, or from the app being unavailable.',
          ],
        },
        {
          h: '8. Changes and governing law',
          p: [
            'These terms may be updated; the date is at the top. Continuing to use the app means you accept the new version. These terms are governed by Vietnamese law.',
            `Contact: ${contactEn}.`,
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy policy',
      updated: 'Updated 11 October 2026',
      intro:
        'This policy explains what personal data VNExplore collects, why, and what rights you have, under Vietnam’s Personal Data Protection Law (No. 91/2025/QH15).',
      sections: [
        {
          h: '1. What we store',
          p: [
            'Account: display name, username (@name), email and password (encrypted — we cannot read it). Guest accounts only have a display name. Signing in with Google: your name, email and photo from Google.',
            'Activity: finished journeys (stops, stamps, items, times, start point, transport, estimated cost), quests you create and like, groups you join, places you add, your visits to community places, and reports and suggestions you send.',
            'Signed out: your route and passport stay in your browser (localStorage) and are not sent to our servers.',
          ],
        },
        {
          h: '2. Location and microphone',
          p: [
            'Location is used only with your permission: to pick a start point, work out routes and check you have arrived. Your live location is not stored on our servers. Coordinates are sent in three cases: the start point saved with a journey when you are signed in; your position when you press “I’m here” or add a place, so the server can check the distance (it is not kept); and the route’s points, sent to the routing and weather services.',
            'The microphone is on only while you press the speak button. Speech is turned into text by your browser (possibly via Google’s or Apple’s servers); VNExplore does not record or keep audio.',
          ],
        },
        {
          h: '3. Why we use it',
          p: [
            'To run the app: planning routes, stamps, the passport, group play, community quests and places, and confirming places. To prevent cheating and abuse (rate limits, CAPTCHA). To fix problems and improve content.',
            'We do not sell personal data and do not use it for advertising.',
          ],
        },
        {
          h: '4. Who can see it',
          p: [
            'Everyone: your display name, @name, photo and what you publish (quests, places, tips). Community places don’t show who added them.',
            'Members of a group you join see your display name, role and progress in that group. Your journeys and passport are visible only to you.',
          ],
        },
        {
          h: '5. Services that process data for us',
          p: [
            'Supabase (servers in Singapore): accounts and user data. Vercel: serves the website. Render: the API server.',
            'Google Gemini: reads the request you type to understand it (kept in server memory for up to 24 hours to answer faster). Cloudflare Turnstile: CAPTCHA against bots.',
            'OpenStreetMap Nominatim: address search. OSRM (routing.openstreetmap.de): routes. Open-Meteo: weather forecasts for coordinates. OpenFreeMap: map images.',
            'Some of these are outside Vietnam, so data may be transferred abroad to be processed.',
          ],
        },
        {
          h: '6. How long we keep it',
          p: [
            'Account data is kept until you delete your account. Guest accounts that are not upgraded are deleted after 30 days. Deleting your account removes your profile, journeys, quests, likes, groups and visits at once; places you put on the map stay, no longer linked to you.',
          ],
        },
        {
          h: '7. Your rights',
          p: [
            'You can know about, see, correct and delete your data, withdraw consent and object to processing. See your passport and quests in the Account tab; delete your account with “Delete account”; turn location or microphone off in your browser settings at any time.',
            `For anything else (corrections, a copy of your data, complaints), contact us via ${contactEn}.`,
          ],
        },
        {
          h: '8. Children',
          p: ['If you are under 16, use the app and create an account with the consent of a parent or guardian.'],
        },
        {
          h: '9. Security and changes',
          p: [
            'Data travels over HTTPS and is protected by per-user access rules in the database. No system is perfectly secure; if a data breach happens we will notify as the law requires.',
            'This policy may be updated; the date is at the top.',
          ],
        },
      ],
    },
  },
}
