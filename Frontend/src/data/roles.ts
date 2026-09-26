import type { Role } from '../types'

export const ROLES: Role[] = [
  {
    id: 'merchant',
    name: { en: 'Hang Street Merchant', vi: 'Thương nhân phố Hàng' },
    intro: {
      en: 'You’ve just arrived from the countryside with a cart and big dreams. The Old Quarter has 36 streets, each selling one thing — find your place among them.',
      vi: 'Bạn vừa từ quê lên kinh với chiếc xe hàng và giấc mơ lớn. Phố cổ có 36 phố phường, mỗi phố một nghề — hãy tìm chỗ đứng của mình.',
    },
    goal: { en: 'Gather {n} goods to open your stall', vi: 'Gom đủ {n} món hàng để mở sạp' },
    itemNoun: { en: 'goods', vi: 'món hàng' },
    favPlaces: ['ma-may-87', 'dong-xuan', 'bach-ma', 'egg-coffee', 'ta-hien', 'women-museum'],
    missions: {
      'ma-may-87': {
        task: { en: 'Learn how an old merchant family set up shop at the front of the house.', vi: 'Học cách một gia đình buôn bán xưa bày hàng ở gian trước.' },
        item: { en: 'A shop signboard', vi: 'Tấm biển hiệu' },
      },
      'dong-xuan': {
        task: { en: 'Find where wholesale traders gather and earn their trust.', vi: 'Tìm nơi dân buôn sỉ tụ họp và lấy được lòng tin của họ.' },
        item: { en: 'A bolt of silk', vi: 'Một súc lụa' },
      },
      'bach-ma': {
        task: { en: 'Ask the guardian of the east for a blessing on your trade.', vi: 'Xin thần trấn phía Đông phù hộ cho việc buôn bán.' },
        item: { en: 'A lucky red ribbon', vi: 'Dải lụa đỏ may mắn' },
      },
      'egg-coffee': {
        task: { en: 'Discover how a clever trader beat the milk shortage.', vi: 'Khám phá cách một người buôn khéo vượt qua lúc thiếu sữa.' },
        item: { en: 'A secret recipe', vi: 'Công thức bí truyền' },
      },
      'ta-hien': {
        task: { en: 'Share a drink with the street and hear the day’s prices.', vi: 'Ngồi cùng phố một ly và nghe giá cả trong ngày.' },
        item: { en: 'A regular customer', vi: 'Một mối khách quen' },
      },
      'women-museum': {
        task: { en: 'Learn the tricks of the street vendors who walk in before dawn.', vi: 'Học mẹo của các chị hàng rong vào phố từ tờ mờ sáng.' },
        item: { en: 'A bamboo shoulder pole', vi: 'Chiếc đòn gánh' },
      },
    },
    fallback: {
      task: { en: 'Find a real detail here to earn something for your stall.', vi: 'Tìm một chi tiết thật ở đây để có thêm hàng cho sạp.' },
      item: { en: 'A trade secret', vi: 'Một bí quyết buôn bán' },
    },
    ending: {
      en: 'With your goods laid out and a red ribbon over the door, your little stall opens on a Hang street. The neighbours come by to wish you luck — you are no longer a newcomer, you are part of the Old Quarter.',
      vi: 'Hàng đã bày đủ, dải lụa đỏ treo trước cửa, sạp hàng nhỏ của bạn mở trên một phố Hàng. Hàng xóm ghé qua chúc may mắn — bạn không còn là người mới đến, bạn đã là một phần của phố cổ.',
    },
    tone: 'butter',
  },
  {
    id: 'scholar',
    name: { en: 'Scholar Bound for the Capital', vi: 'Sĩ tử lên kinh' },
    intro: {
      en: 'You’ve walked for weeks to sit the royal exam in Thang Long. Before the exam gate opens, you must gather the blessings and wisdom of the capital.',
      vi: 'Bạn đã đi bộ nhiều tuần để lên Thăng Long ứng thí. Trước khi cổng trường thi mở, bạn phải thu thập phúc lành và trí tuệ của kinh thành.',
    },
    goal: { en: 'Collect {n} treasures to enter the exam hall', vi: 'Gom {n} bảo vật để vào trường thi' },
    itemNoun: { en: 'treasures', vi: 'bảo vật' },
    favPlaces: ['ngoc-son', 'the-huc', 'turtle-tower', 'bach-ma', 'hoa-lo', 'women-museum'],
    missions: {
      'ngoc-son': {
        task: { en: 'Pray to the god of literature and read the words on the Pen Tower.', vi: 'Thắp hương thần Văn Xương và đọc chữ trên Tháp Bút.' },
        item: { en: 'A calligraphy brush', vi: 'Cây bút lông' },
      },
      'the-huc': {
        task: { en: 'Cross the bridge of morning light with a clear mind.', vi: 'Bước qua cầu ánh ban mai với tâm trí sáng suốt.' },
        item: { en: 'A ray of morning light', vi: 'Tia nắng ban mai' },
      },
      'turtle-tower': {
        task: { en: 'Learn the legend of the returned sword — a lesson in humility.', vi: 'Nghe truyền thuyết trả gươm — bài học về sự khiêm nhường.' },
        item: { en: 'The golden turtle’s blessing', vi: 'Phúc lành của Rùa Vàng' },
      },
      'bach-ma': {
        task: { en: 'Find out how the capital’s walls were first traced.', vi: 'Tìm hiểu thành Thăng Long được vạch ra như thế nào.' },
        item: { en: 'A map of the citadel', vi: 'Bản đồ kinh thành' },
      },
      'hoa-lo': {
        task: { en: 'Remember those who studied and wrote even behind prison walls.', vi: 'Tưởng nhớ những người vẫn học, vẫn viết sau song sắt.' },
        item: { en: 'A hidden notebook', vi: 'Cuốn sổ bí mật' },
      },
      'women-museum': {
        task: { en: 'Learn whose sacrifices let a scholar travel to the capital.', vi: 'Hiểu sự hy sinh của ai đã giúp sĩ tử lên được kinh thành.' },
        item: { en: 'A mother’s letter', vi: 'Lá thư của mẹ' },
      },
    },
    fallback: {
      task: { en: 'Observe carefully — a true scholar notices the details.', vi: 'Quan sát thật kỹ — sĩ tử giỏi là người để ý chi tiết.' },
      item: { en: 'A page of notes', vi: 'Một trang ghi chép' },
    },
    ending: {
      en: 'The drum sounds and the exam gate opens. With your brush, your notes and the blessings of the capital, you take your seat. Whatever the result, you have learned what the city had to teach.',
      vi: 'Trống điểm, cổng trường thi mở. Với cây bút, trang ghi chép và phúc lành của kinh thành, bạn ngồi vào lều thi. Dù kết quả thế nào, bạn đã học được điều kinh thành muốn dạy.',
    },
    tone: 'teal',
  },
  {
    id: 'photographer',
    name: { en: '1930s Photographer', vi: 'Nhiếp ảnh gia thập niên 1930' },
    intro: {
      en: 'It’s 1930-something. You’ve bought your first camera with a handful of glass plates. A Hanoi newspaper will print your exhibition — if you bring the right shots.',
      vi: 'Những năm 1930. Bạn vừa mua chiếc máy ảnh đầu tiên cùng vài tấm kính phim. Một tờ báo Hà Thành sẽ in triển lãm của bạn — nếu bạn mang về đúng những khung hình.',
    },
    goal: { en: 'Capture {n} frames for your exhibition', vi: 'Chụp đủ {n} khung hình cho triển lãm' },
    itemNoun: { en: 'frames', vi: 'khung hình' },
    favPlaces: ['the-huc', 'cathedral', 'turtle-tower', 'dong-xuan', 'ngoc-son', 'hoa-lo'],
    missions: {
      'the-huc': {
        task: { en: 'Wait for the light to rest on the red curve, then shoot.', vi: 'Chờ ánh sáng đậu trên dáng cầu đỏ rồi bấm máy.' },
        item: { en: 'Frame: the red bridge', vi: 'Khung hình: cây cầu đỏ' },
      },
      cathedral: {
        task: { en: 'Photograph the new French-built towers for the newspaper.', vi: 'Chụp đôi tháp chuông Pháp mới xây cho tờ báo.' },
        item: { en: 'Frame: the twin towers', vi: 'Khung hình: đôi tháp chuông' },
      },
      'turtle-tower': {
        task: { en: 'Capture the tower in still water, like a legend frozen in time.', vi: 'Chụp ngọn tháp trên mặt nước lặng, như huyền thoại ngưng đọng.' },
        item: { en: 'Frame: the returned sword', vi: 'Khung hình: hồ trả gươm' },
      },
      'dong-xuan': {
        task: { en: 'Find the market’s busiest moment and freeze it.', vi: 'Tìm khoảnh khắc đông vui nhất của chợ và giữ nó lại.' },
        item: { en: 'Frame: the great market', vi: 'Khung hình: chợ lớn' },
      },
      'ngoc-son': {
        task: { en: 'Photograph the Pen Tower that writes on the sky.', vi: 'Chụp ngọn Tháp Bút viết lên trời xanh.' },
        item: { en: 'Frame: the Pen Tower', vi: 'Khung hình: Tháp Bút' },
      },
      'hoa-lo': {
        task: { en: 'Document the prison gate the newspapers won’t talk about.', vi: 'Ghi lại cổng nhà tù mà báo chí không dám nhắc tới.' },
        item: { en: 'Frame: the iron gate', vi: 'Khung hình: cánh cổng sắt' },
      },
    },
    fallback: {
      task: { en: 'Find the one detail that tells this place’s story.', vi: 'Tìm một chi tiết kể được câu chuyện của nơi này.' },
      item: { en: 'A street frame', vi: 'Khung hình đường phố' },
    },
    ending: {
      en: 'Your glass plates are developed and pinned on the newspaper’s wall. Readers stop in front of them — they recognise their own streets. Ninety years later, you have just taken the same photos again.',
      vi: 'Những tấm kính phim được tráng rửa và treo lên tường toà báo. Người đọc dừng lại trước từng tấm — họ nhận ra chính con phố của mình. Chín mươi năm sau, bạn vừa chụp lại đúng những khung hình ấy.',
    },
    tone: 'brick',
  },
  {
    id: 'chef',
    name: { en: 'Apprentice Cook', vi: 'Đầu bếp tập sự' },
    intro: {
      en: 'Your master sent you into the Old Quarter with an empty basket. To cook your first feast, you must learn the city’s flavours from those who made them.',
      vi: 'Sư phụ giao cho bạn chiếc giỏ trống và bảo vào phố cổ. Muốn nấu mâm cỗ đầu tiên, bạn phải học hương vị Hà Nội từ chính những người làm ra nó.',
    },
    goal: { en: 'Gather {n} ingredients for your first feast', vi: 'Gom {n} nguyên liệu cho mâm cỗ đầu tiên' },
    itemNoun: { en: 'ingredients', vi: 'nguyên liệu' },
    favPlaces: ['bun-cha', 'egg-coffee', 'dong-xuan', 'ta-hien', 'ma-may-87', 'water-puppets'],
    missions: {
      'bun-cha': {
        task: { en: 'Learn the secret of the dipping broth — sweet, sour, salty, smoky.', vi: 'Học bí quyết bát nước chấm — chua, ngọt, mặn, thơm khói.' },
        item: { en: 'Charcoal smoke', vi: 'Làn khói than hoa' },
      },
      'egg-coffee': {
        task: { en: 'Watch how yolk and sugar become cream.', vi: 'Xem lòng đỏ và đường biến thành kem như thế nào.' },
        item: { en: 'Golden egg cream', vi: 'Kem trứng vàng' },
      },
      'dong-xuan': {
        task: { en: 'Find the freshest herbs in the market’s back alley.', vi: 'Tìm rau thơm tươi nhất ở ngõ sau chợ.' },
        item: { en: 'A bundle of fresh herbs', vi: 'Bó rau thơm' },
      },
      'ta-hien': {
        task: { en: 'Taste what the street snacks on in the evening.', vi: 'Nếm thử món nhắm buổi tối của phố.' },
        item: { en: 'A street snack', vi: 'Món nhắm vỉa hè' },
      },
      'ma-may-87': {
        task: { en: 'Find the kitchen of the old house and see how a family cooked.', vi: 'Tìm gian bếp của nhà cổ và xem một gia đình xưa nấu nướng.' },
        item: { en: 'A family clay pot', vi: 'Chiếc niêu đất' },
      },
      'water-puppets': {
        task: { en: 'Watch the rice-field scenes — where every meal begins.', vi: 'Xem cảnh đồng lúa — nơi mọi bữa cơm bắt đầu.' },
        item: { en: 'A handful of new rice', vi: 'Nắm gạo mới' },
      },
    },
    fallback: {
      task: { en: 'Every place has a flavour. Find the detail that hides it.', vi: 'Nơi nào cũng có một hương vị. Tìm chi tiết ẩn giấu nó.' },
      item: { en: 'A pinch of Hanoi', vi: 'Một chút vị Hà Nội' },
    },
    ending: {
      en: 'Back in the kitchen, you lay out everything you gathered. Your master tastes the first spoonful, pauses, and nods. “Now you cook like someone who has walked these streets.”',
      vi: 'Trở về bếp, bạn bày ra tất cả những gì đã gom được. Sư phụ nếm thìa đầu tiên, lặng đi một lúc rồi gật đầu: “Giờ con nấu như người đã đi qua từng con phố ấy.”',
    },
    tone: 'leaf',
  },
]

export function getRole(id: string | null | undefined): Role | null {
  return ROLES.find((r) => r.id === id) ?? null
}

export function missionFor(role: Role, placeId: string) {
  return role.missions[placeId] ?? role.fallback
}
