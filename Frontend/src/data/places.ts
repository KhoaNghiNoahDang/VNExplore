import type { LatLng, Place } from '../types'

/** Default starting point: the northern shore of Hoan Kiem Lake. */
export const START: LatLng = { lat: 21.0296, lng: 105.8526 }

const TEMPLE_ETIQUETTE = {
  en: 'Cover shoulders and knees, speak softly, and don’t point at the altars. Photos are fine outside the main shrine.',
  vi: 'Mặc kín vai và gối, nói nhỏ, không chỉ tay vào ban thờ. Chụp ảnh thoải mái ở ngoài chính điện.',
}

/**
 * Mock data used until the backend (on Render) is ready.
 * Prices are rough estimates per person, in thousand VND.
 */
export const PLACES: Place[] = [
  {
    id: 'ngoc-son',
    name: { en: 'Ngoc Son Temple', vi: 'Đền Ngọc Sơn' },
    nameVi: 'Đền Ngọc Sơn',
    lat: 21.0307, lng: 105.8524,
    priceMin: 30, priceMax: 30, visitMin: 20,
    themes: ['culture', 'history', 'photo'],
    tags: ['iconic', 'groups'],
    blurb: {
      en: 'Cross the red bridge into a story at the heart of the lake.',
      vi: 'Bước qua cây cầu đỏ để vào câu chuyện giữa lòng hồ.',
    },
    tone: 'brick',
    story: {
      en: 'The temple sits on Jade Island in the lake. Its present form dates from the 1860s, when the scholar Nguyen Van Sieu restored it and added the Pen Tower and Ink Slab at the gate. Inside, people honour Van Xuong, the god of literature, and the general Tran Hung Dao, who defeated the Mongol armies. Students still come here to pray before exams.',
      vi: 'Đền nằm trên đảo Ngọc giữa hồ. Diện mạo ngày nay có từ những năm 1860, khi nhà nho Nguyễn Văn Siêu tu sửa và dựng thêm Tháp Bút, Đài Nghiên ở cổng. Trong đền thờ Văn Xương – vị thần văn chương – và Hưng Đạo Đại Vương Trần Quốc Tuấn, người ba lần đánh thắng quân Nguyên Mông. Đến nay học trò vẫn tới đây cầu may trước kỳ thi.',
    },
    why: {
      en: 'Why a brush-shaped tower? It says “write on the blue sky” — a scholar’s wish for great ambition, carved in stone.',
      vi: 'Vì sao lại có tháp hình ngọn bút? Trên tháp khắc “Tả Thanh Thiên” – viết lên trời xanh – ước vọng lớn của người đi học.',
    },
    photoTip: {
      en: 'Stand on Dinh Tien Hoang street, just south of the gate, to fit the red bridge and the temple roof in one frame.',
      vi: 'Đứng trên phố Đinh Tiên Hoàng, lệch về phía nam cổng đền, để lấy trọn cầu đỏ và mái đền trong một khung.',
    },
    etiquette: TEMPLE_ETIQUETTE,
    challenge: {
      prompt: {
        en: 'At the gate stands a stone tower shaped like a writing brush. What do the three characters on it mean?',
        vi: 'Ở cổng có ngọn tháp đá hình cây bút. Ba chữ trên tháp có nghĩa là gì?',
      },
      options: [
        { en: 'Write on the blue sky', vi: 'Viết lên trời xanh' },
        { en: 'Peace under heaven', vi: 'Thiên hạ thái bình' },
        { en: 'Ten thousand years of life', vi: 'Vạn thọ vô cương' },
      ],
      answer: 0,
      hint: { en: 'Think of a brush and a very big sheet of paper above you.', vi: 'Hãy nghĩ tới cây bút và một tờ giấy thật lớn trên đầu bạn.' },
    },
  },
  {
    id: 'ma-may-87',
    name: { en: 'Heritage House 87 Ma May', vi: 'Nhà cổ 87 Mã Mây' },
    nameVi: 'Nhà cổ 87 Mã Mây',
    lat: 21.0345, lng: 105.8538,
    priceMin: 10, priceMax: 10, visitMin: 25,
    themes: ['culture', 'history', 'rainy'],
    tags: ['quiet', 'cultural'],
    blurb: {
      en: 'Step into the rhythm of an Old Quarter merchant home.',
      vi: 'Bước vào nhịp sống của một ngôi nhà buôn phố cổ.',
    },
    tone: 'butter',
    story: {
      en: 'This is a classic “tube house”: narrow at the street, very deep inside. Shops were taxed by the width of their frontage, so merchants built long and thin — shop in front, family behind. The house dates from the late 19th century and was restored in 1999 to show how an Old Quarter family lived and traded.',
      vi: 'Đây là kiểu “nhà ống” điển hình: mặt tiền hẹp, lòng nhà rất sâu. Ngày xưa thuế tính theo bề ngang mặt phố nên người buôn bán xây nhà dài và hẹp – trước là cửa hàng, sau là chỗ ở. Ngôi nhà có từ cuối thế kỷ 19, được trùng tu năm 1999 để kể lại cách một gia đình phố cổ sống và buôn bán.',
    },
    why: {
      en: 'Why the open courtyard in the middle? In a house this deep, it’s the only way to get light, air and rainwater inside.',
      vi: 'Vì sao giữa nhà có khoảng sân trống? Nhà sâu như vậy, đó là cách duy nhất để lấy ánh sáng, gió và nước mưa vào trong.',
    },
    photoTip: {
      en: 'From the first courtyard, shoot up toward the wooden balcony — soft light falls from the open sky.',
      vi: 'Đứng ở khoảng sân thứ nhất, chụp hắt lên ban công gỗ – ánh sáng dịu rơi từ khoảng trời trống.',
    },
    etiquette: {
      en: 'Walk gently on the old wooden floors and don’t sit on displayed furniture.',
      vi: 'Đi nhẹ trên sàn gỗ cũ và không ngồi lên đồ trưng bày.',
    },
    challenge: {
      prompt: {
        en: 'What lets light and air reach the middle of this long house?',
        vi: 'Thứ gì giúp ánh sáng và gió vào được giữa ngôi nhà dài này?',
      },
      options: [
        { en: 'An open-sky courtyard', vi: 'Giếng trời' },
        { en: 'A glass roof', vi: 'Mái kính' },
        { en: 'Big back windows', vi: 'Cửa sổ lớn phía sau' },
      ],
      answer: 0,
      hint: { en: 'Look up when you reach the first open space.', vi: 'Hãy ngước lên khi bạn tới khoảng trống đầu tiên.' },
    },
  },
  {
    id: 'bach-ma',
    name: { en: 'Bach Ma Temple', vi: 'Đền Bạch Mã' },
    nameVi: 'Đền Bạch Mã',
    lat: 21.0368, lng: 105.8518,
    priceMin: 0, priceMax: 20, visitMin: 20,
    themes: ['culture', 'history'],
    tags: ['quiet', 'free'],
    blurb: {
      en: 'The white horse that showed a king where to build his city walls.',
      vi: 'Con ngựa trắng chỉ đường cho nhà vua đắp thành Thăng Long.',
    },
    tone: 'teal',
    story: {
      en: 'Legend says that when King Ly Thai To moved the capital to Thang Long in 1010, his walls kept collapsing. He prayed here, and a white horse appeared and trotted a path around the city. The king built along its hoofprints and the walls held. The temple became the eastern guardian of the four that protect the old capital.',
      vi: 'Tương truyền khi vua Lý Thái Tổ dời đô về Thăng Long năm 1010, thành đắp mãi vẫn đổ. Vua đến đây cầu khấn thì thấy một con ngựa trắng hiện ra, chạy vòng quanh kinh thành. Vua cho đắp thành theo vết chân ngựa và thành đứng vững. Đền trở thành trấn phía Đông trong Thăng Long tứ trấn.',
    },
    why: {
      en: 'Why is it so small for such a big legend? Old Quarter plots were tiny — the temple grew inward, not outward.',
      vi: 'Vì sao huyền thoại lớn mà đền lại nhỏ? Đất phố cổ chật hẹp – ngôi đền phát triển vào trong chứ không lan ra ngoài.',
    },
    photoTip: {
      en: 'From the doorway, frame the red lacquered pillars leading your eye to the altar.',
      vi: 'Đứng ở cửa, lấy những hàng cột sơn son dẫn mắt người xem vào ban thờ.',
    },
    etiquette: TEMPLE_ETIQUETTE,
    challenge: {
      prompt: {
        en: 'According to the legend, what did the white horse show the king?',
        vi: 'Theo truyền thuyết, con ngựa trắng đã chỉ cho nhà vua điều gì?',
      },
      options: [
        { en: 'Where to build the city walls', vi: 'Nơi đắp thành' },
        { en: 'Where to dig a lake', vi: 'Nơi đào hồ' },
        { en: 'Where the enemy was hiding', vi: 'Nơi quân giặc ẩn náu' },
      ],
      answer: 0,
      hint: { en: 'The walls kept falling down…', vi: 'Thành đắp mãi vẫn đổ…' },
    },
  },
  {
    id: 'water-puppets',
    name: { en: 'Thang Long Water Puppets', vi: 'Nhà hát Múa rối nước Thăng Long' },
    nameVi: 'Múa rối nước Thăng Long',
    lat: 21.0318, lng: 105.8535,
    priceMin: 100, priceMax: 150, visitMin: 50,
    themes: ['culture', 'rainy'],
    tags: ['iconic', 'indoor', 'groups'],
    blurb: {
      en: 'Rice-field folk tales performed on water, with live music.',
      vi: 'Tích trò đồng quê diễn trên mặt nước cùng nhạc cụ dân tộc.',
    },
    tone: 'leaf',
    story: {
      en: 'Water puppetry began in the flooded rice fields of the Red River Delta almost a thousand years ago. Puppeteers stand waist-deep in water behind a bamboo screen and move carved wooden figures with long poles hidden underwater. The show opens with Chu Teu, a cheeky village boy who introduces every scene.',
      vi: 'Múa rối nước ra đời trên những cánh đồng ngập nước vùng châu thổ sông Hồng từ gần một nghìn năm trước. Nghệ nhân đứng ngâm nửa người trong nước sau bức mành tre, điều khiển con rối gỗ bằng sào dài giấu dưới mặt nước. Mở màn luôn là chú Tễu – cậu bé làng tinh nghịch dẫn dắt từng tích trò.',
    },
    why: {
      en: 'Why water? It hides the rods and machinery, so the puppets seem to move on their own.',
      vi: 'Vì sao lại diễn trên nước? Mặt nước giấu đi sào và máy móc, khiến con rối như tự chuyển động.',
    },
    photoTip: {
      en: 'No flash. Sit a few rows back and wait for the dragons — they breathe fire and spray water.',
      vi: 'Không dùng đèn flash. Ngồi lùi vài hàng và chờ màn rồng phun lửa, phun nước.',
    },
    etiquette: {
      en: 'Arrive 15 minutes early; shows start on time. Keep phones silent during the performance.',
      vi: 'Đến sớm 15 phút vì suất diễn bắt đầu đúng giờ. Để điện thoại im lặng khi xem.',
    },
    challenge: {
      prompt: {
        en: 'Who is the cheeky puppet who opens the show?',
        vi: 'Con rối tinh nghịch mở màn buổi diễn là ai?',
      },
      options: [
        { en: 'Chu Teu', vi: 'Chú Tễu' },
        { en: 'Thanh Giong', vi: 'Thánh Gióng' },
        { en: 'Son Tinh', vi: 'Sơn Tinh' },
      ],
      answer: 0,
      hint: { en: 'He’s a round-bellied village boy with a big grin.', vi: 'Cậu bé làng bụng tròn, cười toe toét.' },
    },
  },
  {
    id: 'cathedral',
    name: { en: "St. Joseph's Cathedral", vi: 'Nhà thờ Lớn Hà Nội' },
    nameVi: 'Nhà thờ Lớn',
    lat: 21.0287, lng: 105.8490,
    priceMin: 0, priceMax: 0, visitMin: 15,
    themes: ['culture', 'photo', 'history'],
    tags: ['free', 'photo'],
    blurb: {
      en: 'Neo-gothic towers above a square full of lemon-tea stools.',
      vi: 'Tháp chuông tân gothic bên quảng trường trà chanh vỉa hè.',
    },
    tone: 'brick',
    story: {
      en: 'Completed in 1886, the cathedral was one of the first buildings of French colonial Hanoi. Its twin bell towers were modelled on Notre-Dame de Paris. It stands on the site of the ancient Bao Thien pagoda, which was demolished to make way for it. Today the square in front is where young Hanoians sit on tiny stools with iced lemon tea.',
      vi: 'Hoàn thành năm 1886, nhà thờ là một trong những công trình đầu tiên của Hà Nội thời Pháp. Hai tháp chuông được mô phỏng theo Nhà thờ Đức Bà Paris. Nhà thờ được xây trên nền chùa Báo Thiên cổ đã bị phá bỏ. Ngày nay quảng trường phía trước là chỗ giới trẻ Hà Nội ngồi ghế nhựa uống trà chanh.',
    },
    why: {
      en: 'Why does it look so dark? The facade was left unpainted — decades of tropical rain gave it that grey patina.',
      vi: 'Vì sao nhà thờ trông sẫm màu? Mặt tiền không sơn – hàng chục năm mưa nắng nhiệt đới phủ lên lớp rêu xám ấy.',
    },
    photoTip: {
      en: 'Cross to the lemon-tea stalls on the corner of Nha Chung and shoot upward — both towers fit with the street in front.',
      vi: 'Sang quán trà chanh góc phố Nhà Chung và chụp hất lên – vừa đủ hai tháp chuông và con phố phía trước.',
    },
    etiquette: {
      en: 'It is an active church: enter only during open hours and stay quiet during Mass.',
      vi: 'Nhà thờ vẫn làm lễ: chỉ vào trong giờ mở cửa và giữ yên lặng khi có thánh lễ.',
    },
    challenge: {
      prompt: {
        en: 'Which famous church inspired the twin towers?',
        vi: 'Hai tháp chuông được lấy cảm hứng từ nhà thờ nổi tiếng nào?',
      },
      options: [
        { en: 'Notre-Dame de Paris', vi: 'Nhà thờ Đức Bà Paris' },
        { en: "St. Peter's in Rome", vi: 'Vương cung thánh đường Thánh Phêrô, Rome' },
        { en: 'Cologne Cathedral', vi: 'Nhà thờ lớn Cologne' },
      ],
      answer: 0,
      hint: { en: 'The architects were French.', vi: 'Những người thiết kế là người Pháp.' },
    },
  },
  {
    id: 'women-museum',
    name: { en: "Vietnamese Women's Museum", vi: 'Bảo tàng Phụ nữ Việt Nam' },
    nameVi: 'Bảo tàng Phụ nữ Việt Nam',
    lat: 21.0237, lng: 105.8513,
    priceMin: 40, priceMax: 40, visitMin: 45,
    themes: ['culture', 'history', 'rainy'],
    tags: ['indoor', 'cultural'],
    blurb: {
      en: 'Market traders, mothers and soldiers — Vietnam told through women.',
      vi: 'Người bán hàng, người mẹ, người lính — Việt Nam qua câu chuyện phụ nữ.',
    },
    tone: 'teal',
    story: {
      en: 'Four floors follow Vietnamese women through family life, history and fashion. One of the most loved rooms is about Hanoi’s street vendors — women who walk in from nearby villages before dawn, carrying fruit, flowers and snacks on a bamboo shoulder pole, and send their earnings home to their children.',
      vi: 'Bốn tầng trưng bày theo chân người phụ nữ Việt qua gia đình, lịch sử và thời trang. Một phòng được yêu thích nhất kể về những người bán hàng rong Hà Nội – các chị từ làng ven đô vào phố từ tờ mờ sáng, gánh hoa quả, hoa tươi, quà vặt, dành dụm gửi về nuôi con.',
    },
    why: {
      en: 'Why a shoulder pole? It balances two heavy baskets and leaves the walker free to weave through narrow streets.',
      vi: 'Vì sao lại là đòn gánh? Nó giữ thăng bằng hai quang hàng nặng và giúp người đi len lỏi qua phố nhỏ.',
    },
    photoTip: {
      en: 'The ground-floor street-vendor wall is great for a group photo.',
      vi: 'Bức tường hàng rong ở tầng trệt rất hợp để chụp ảnh nhóm.',
    },
    etiquette: {
      en: 'Some personal stories are painful — read quietly and let others take their time.',
      vi: 'Một số câu chuyện rất xúc động – hãy đọc lặng lẽ và nhường người khác thời gian.',
    },
    challenge: {
      prompt: {
        en: 'In the street-vendor room, what do the women carry their goods with?',
        vi: 'Trong phòng hàng rong, các chị mang hàng bằng gì?',
      },
      options: [
        { en: 'A bamboo shoulder pole', vi: 'Đòn gánh' },
        { en: 'A push cart', vi: 'Xe đẩy' },
        { en: 'A backpack', vi: 'Ba lô' },
      ],
      answer: 0,
      hint: { en: 'Two baskets, one long stick.', vi: 'Hai cái quang, một thanh tre dài.' },
    },
  },
  {
    id: 'hoa-lo',
    name: { en: 'Hoa Lo Prison Relic', vi: 'Di tích Nhà tù Hỏa Lò' },
    nameVi: 'Nhà tù Hỏa Lò',
    lat: 21.0254, lng: 105.8465,
    priceMin: 50, priceMax: 50, visitMin: 45,
    themes: ['history', 'rainy'],
    tags: ['history', 'indoor'],
    blurb: {
      en: 'A century of Hanoi in one set of walls, from colonial cells to war.',
      vi: 'Một thế kỷ Hà Nội sau những bức tường, từ thời thuộc địa đến chiến tranh.',
    },
    tone: 'butter',
    story: {
      en: 'The French built this prison in 1896 on the site of a village of potters — “hoa lo” means fiery furnace. It held Vietnamese revolutionaries under colonial rule, and later American pilots, who nicknamed it the “Hanoi Hilton”. Only a part remains; the rest became a tower block in the 1990s.',
      vi: 'Người Pháp xây nhà tù năm 1896 trên đất làng gốm Phụ Khánh – “hỏa lò” nghĩa là lò lửa. Nơi đây giam giữ các chiến sĩ cách mạng Việt Nam thời thuộc địa, sau này giam phi công Mỹ, những người gọi nó là “Hanoi Hilton”. Hiện chỉ còn giữ lại một phần; phần còn lại đã thành toà nhà cao tầng từ thập niên 1990.',
    },
    why: {
      en: 'Why is it called “fiery furnace”? Before the prison, the street was full of kilns making pottery and charcoal stoves.',
      vi: 'Vì sao gọi là “Hỏa Lò”? Trước khi có nhà tù, phố này đầy lò nung gốm và làm bếp lò.',
    },
    photoTip: {
      en: 'The arched gate with its French lettering is best shot from across Hoa Lo street.',
      vi: 'Cổng vòm có dòng chữ tiếng Pháp chụp đẹp nhất từ bên kia đường Hỏa Lò.',
    },
    etiquette: {
      en: 'This is a place of suffering. Avoid posing playfully in the cells.',
      vi: 'Đây là nơi của đau thương. Tránh tạo dáng đùa cợt trong phòng giam.',
    },
    challenge: {
      prompt: {
        en: 'What French words are written above the gate?',
        vi: 'Dòng chữ tiếng Pháp trên cổng là gì?',
      },
      options: [
        { en: 'Maison Centrale', vi: 'Maison Centrale' },
        { en: 'Palais de Justice', vi: 'Palais de Justice' },
        { en: 'Hôtel de Ville', vi: 'Hôtel de Ville' },
      ],
      answer: 0,
      hint: { en: 'It means “central house”.', vi: 'Nghĩa là “ngôi nhà trung tâm”.' },
    },
  },
  {
    id: 'egg-coffee',
    name: { en: 'Egg coffee at Giang', vi: 'Cà phê trứng Giảng' },
    nameVi: 'Cà phê Giảng',
    lat: 21.0331, lng: 105.8547,
    priceMin: 35, priceMax: 45, visitMin: 25,
    themes: ['food', 'rainy'],
    tags: ['localFood', 'indoor'],
    blurb: {
      en: 'Whipped yolk and sugar over strong coffee, invented here in 1946.',
      vi: 'Lòng đỏ đánh bông trên nền cà phê đậm, ra đời từ năm 1946.',
    },
    tone: 'butter',
    story: {
      en: 'In 1946, fresh milk was scarce in Hanoi. Nguyen Van Giang, a bartender at the Metropole hotel, whisked egg yolk with sugar into a thick cream and spooned it over strong coffee. The family still runs the café, hidden at the end of a narrow passage, and serves the cup in a bowl of hot water to keep it warm.',
      vi: 'Năm 1946, sữa tươi ở Hà Nội rất khan hiếm. Ông Nguyễn Văn Giảng, khi ấy pha chế ở khách sạn Metropole, đánh lòng đỏ trứng với đường thành lớp kem sánh rồi rưới lên cà phê đậm. Gia đình ông vẫn giữ quán, nằm cuối một con ngõ hẹp, và ly cà phê được đặt trong bát nước nóng để giữ ấm.',
    },
    why: {
      en: 'Why the bowl of hot water? The egg cream cools fast — the water keeps it warm and silky to the last sip.',
      vi: 'Vì sao có bát nước nóng? Kem trứng nguội rất nhanh – nước nóng giữ cho nó ấm và mịn đến ngụm cuối.',
    },
    photoTip: {
      en: 'Shoot from above on the low wooden table to catch the golden foam and the bowl together.',
      vi: 'Chụp từ trên xuống bàn gỗ thấp để thấy lớp bọt vàng và chiếc bát cùng lúc.',
    },
    etiquette: {
      en: 'Order at the counter, then find a seat — tables are shared when it’s busy.',
      vi: 'Gọi đồ ở quầy rồi mới tìm chỗ – lúc đông khách thường ngồi chung bàn.',
    },
    challenge: {
      prompt: {
        en: 'Why did Mr. Giang use egg instead of milk?',
        vi: 'Vì sao ông Giảng dùng trứng thay cho sữa?',
      },
      options: [
        { en: 'Fresh milk was scarce', vi: 'Sữa tươi khan hiếm' },
        { en: 'A French chef asked for it', vi: 'Một đầu bếp Pháp yêu cầu' },
        { en: 'Eggs were a royal tradition', vi: 'Trứng là món cung đình' },
      ],
      answer: 0,
      hint: { en: 'It was 1946 — times were hard.', vi: 'Đó là năm 1946 – thời buổi khó khăn.' },
    },
  },
  {
    id: 'bun-cha',
    name: { en: 'Bun cha on Hang Manh', vi: 'Bún chả Hàng Mành' },
    nameVi: 'Bún chả Hàng Mành',
    lat: 21.0322, lng: 105.8478,
    priceMin: 60, priceMax: 80, visitMin: 35,
    themes: ['food'],
    tags: ['localFood', 'groups'],
    blurb: {
      en: 'Charcoal-grilled pork, fresh noodles, and a dipping bowl for everyone.',
      vi: 'Chả nướng than hoa, bún rối và bát nước chấm cho cả mâm.',
    },
    tone: 'brick',
    story: {
      en: 'Bun cha is Hanoi’s lunch. Pork patties and slices of pork belly are grilled over charcoal on the sidewalk, then dropped into a sweet-and-sour fish-sauce broth with green papaya. You dip cold rice noodles and fresh herbs into the bowl, bite by bite. Hang Manh street was once the street of bamboo blinds — “manh” means blind.',
      vi: 'Bún chả là bữa trưa của người Hà Nội. Chả viên và chả miếng ba chỉ nướng trên than hoa ngay vỉa hè, rồi thả vào bát nước chấm chua ngọt có đu đủ xanh. Bạn gắp bún nguội và rau sống chấm vào bát, từng miếng một. Phố Hàng Mành xưa là phố làm mành tre – “mành” là tấm rèm.',
    },
    why: {
      en: 'Why grill on the street? The smoke is the advertisement — you follow your nose to the stall.',
      vi: 'Vì sao lại nướng ngay ngoài phố? Khói chính là biển quảng cáo – mùi thơm dẫn khách tới quán.',
    },
    photoTip: {
      en: 'Catch the smoke rising from the charcoal grill at the shop entrance.',
      vi: 'Bắt khoảnh khắc khói bốc lên từ bếp than ở cửa quán.',
    },
    etiquette: {
      en: 'Add chilli and garlic to your own bowl, not the shared plates. Tissues usually cost a little extra.',
      vi: 'Cho ớt, tỏi vào bát của mình, đừng cho vào đĩa chung. Giấy ăn thường tính thêm chút tiền.',
    },
    challenge: {
      prompt: {
        en: 'How do you eat bun cha?',
        vi: 'Ăn bún chả thế nào cho đúng?',
      },
      options: [
        { en: 'Dip noodles into the broth with the pork', vi: 'Gắp bún chấm vào bát nước có chả' },
        { en: 'Pour everything into one big soup', vi: 'Đổ tất cả vào một bát canh lớn' },
        { en: 'Eat the pork first, noodles after', vi: 'Ăn hết chả trước, bún sau' },
      ],
      answer: 0,
      hint: { en: 'Watch the table next to you.', vi: 'Hãy nhìn bàn bên cạnh.' },
    },
  },
  {
    id: 'dong-xuan',
    name: { en: 'Dong Xuan Market', vi: 'Chợ Đồng Xuân' },
    nameVi: 'Chợ Đồng Xuân',
    lat: 21.0381, lng: 105.8497,
    priceMin: 0, priceMax: 50, visitMin: 30,
    themes: ['food', 'culture', 'rainy'],
    tags: ['lively', 'indoor'],
    blurb: {
      en: "Hanoi's oldest covered market, with a street-food alley at the back.",
      vi: 'Chợ có mái lâu đời nhất Hà Nội, phía sau là ngõ ăn vặt.',
    },
    tone: 'leaf',
    story: {
      en: 'Opened by the French in 1889, Dong Xuan was the biggest market in Indochina. Traders from the Old Quarter’s craft streets — silk, silver, paper, tin — sold here. A fire destroyed much of it in 1994; it was rebuilt behind the original arched facade, and wholesale trading still starts before sunrise.',
      vi: 'Được người Pháp mở năm 1889, Đồng Xuân từng là chợ lớn nhất Đông Dương. Người buôn từ các phố nghề trong phố cổ – hàng lụa, hàng bạc, hàng mã, hàng thiếc – đều mang hàng về đây. Trận hỏa hoạn năm 1994 thiêu rụi phần lớn chợ; chợ được xây lại phía sau mặt tiền vòm cũ, và việc buôn sỉ vẫn bắt đầu từ trước khi trời sáng.',
    },
    why: {
      en: 'Why so many streets named “Hang…”? Each street specialised in one good — and Dong Xuan gathered them all under one roof.',
      vi: 'Vì sao nhiều phố tên “Hàng…”? Mỗi phố chuyên một mặt hàng – và Đồng Xuân gom tất cả về dưới một mái chợ.',
    },
    photoTip: {
      en: 'Stand across Dong Xuan street to get the whole arched facade and the motorbike traffic in front.',
      vi: 'Đứng bên kia phố Đồng Xuân để lấy trọn mặt tiền vòm và dòng xe máy phía trước.',
    },
    etiquette: {
      en: 'Ask before photographing sellers. Bargaining is normal for souvenirs, not for food.',
      vi: 'Hỏi trước khi chụp người bán. Mặc cả là bình thường với đồ lưu niệm, không phải với đồ ăn.',
    },
    challenge: {
      prompt: {
        en: 'Count the arched gates on the front of the market. How many are there?',
        vi: 'Đếm số cửa vòm ở mặt tiền chợ. Có bao nhiêu cửa?',
      },
      options: [
        { en: 'Five', vi: 'Năm' },
        { en: 'Three', vi: 'Ba' },
        { en: 'Seven', vi: 'Bảy' },
      ],
      answer: 0,
      hint: { en: 'The biggest one is in the middle, with two on each side.', vi: 'Cửa lớn nhất ở giữa, mỗi bên hai cửa.' },
    },
  },
  {
    id: 'ta-hien',
    name: { en: 'Ta Hien corner', vi: 'Góc phố Tạ Hiện' },
    nameVi: 'Phố Tạ Hiện',
    lat: 21.0362, lng: 105.8524,
    priceMin: 20, priceMax: 40, visitMin: 20,
    themes: ['food'],
    tags: ['lively', 'localFood'],
    blurb: {
      en: 'Tiny plastic stools, fresh beer and the Old Quarter going by.',
      vi: 'Ghế nhựa nhỏ, bia hơi và phố cổ lướt qua trước mặt.',
    },
    tone: 'teal',
    story: {
      en: 'Bia hoi is beer brewed fresh each day, delivered in kegs every morning and meant to be finished by night. It is light, cheap and drunk on low plastic stools right on the pavement. The crossroads of Ta Hien and Luong Ngoc Quyen became famous as the place where locals and travellers sit elbow to elbow.',
      vi: 'Bia hơi là bia nấu trong ngày, giao bằng thùng mỗi sáng và phải bán hết trước đêm. Bia nhẹ, rẻ và uống trên ghế nhựa thấp ngay vỉa hè. Ngã tư Tạ Hiện – Lương Ngọc Quyến nổi tiếng là nơi người Hà Nội và du khách ngồi sát vai nhau.',
    },
    why: {
      en: 'Why such tiny stools? They stack easily, fit narrow pavements and can be cleared in seconds.',
      vi: 'Vì sao ghế lại nhỏ vậy? Dễ xếp chồng, vừa vỉa hè hẹp và dọn đi chỉ trong vài giây.',
    },
    photoTip: {
      en: 'Early evening, from the crossroads, when the lanterns light up and stools spill into the street.',
      vi: 'Chập tối, đứng ở ngã tư khi đèn lồng bật sáng và ghế nhựa tràn ra phố.',
    },
    etiquette: {
      en: 'Say “Một, hai, ba, dô!” when toasting. Don’t drink and ride a motorbike.',
      vi: 'Nâng ly và hô “Một, hai, ba, dô!”. Đã uống bia thì không lái xe.',
    },
    challenge: {
      prompt: { en: 'What makes “bia hoi” special?', vi: '“Bia hơi” đặc biệt ở điểm nào?' },
      options: [
        { en: 'It’s brewed fresh and sold the same day', vi: 'Nấu trong ngày và bán hết trong ngày' },
        { en: 'It’s aged for a year', vi: 'Được ủ một năm' },
        { en: 'It’s imported from France', vi: 'Nhập từ Pháp' },
      ],
      answer: 0,
      hint: { en: 'Kegs arrive every morning.', vi: 'Thùng bia được chở đến mỗi sáng.' },
    },
  },
  {
    id: 'the-huc',
    name: { en: 'The Huc Bridge at dusk', vi: 'Cầu Thê Húc lúc hoàng hôn' },
    nameVi: 'Cầu Thê Húc',
    lat: 21.0302, lng: 105.8527,
    priceMin: 0, priceMax: 0, visitMin: 10,
    themes: ['photo'],
    tags: ['free', 'photo'],
    blurb: {
      en: 'The red bridge photographs best from the shore, just before the lights come on.',
      vi: 'Cầu đỏ đẹp nhất khi chụp từ bờ hồ, ngay trước lúc lên đèn.',
    },
    tone: 'brick',
    story: {
      en: 'The curved wooden bridge was built in 1865 by Nguyen Van Sieu to lead to Ngoc Son Temple. Its name means “where the morning sunlight rests”. It has been rebuilt several times, but it keeps the same red curve that has appeared on Hanoi postcards for over a century.',
      vi: 'Cây cầu gỗ cong được Nguyễn Văn Siêu cho dựng năm 1865 để dẫn vào đền Ngọc Sơn. Tên cầu có nghĩa là “nơi đậu ánh sáng ban mai”. Cầu đã được làm lại nhiều lần nhưng vẫn giữ dáng cong màu đỏ xuất hiện trên bưu thiếp Hà Nội hơn một thế kỷ qua.',
    },
    why: {
      en: 'Why red? Red is the colour of luck and of the rising sun — fitting for “where morning light rests”.',
      vi: 'Vì sao sơn đỏ? Đỏ là màu may mắn và của mặt trời mọc – hợp với cái tên “nơi đậu ánh ban mai”.',
    },
    photoTip: {
      en: 'Go 20 minutes before the street lights switch on. Shoot from the shore so the curve reflects in the water.',
      vi: 'Đến trước giờ lên đèn khoảng 20 phút. Chụp từ bờ để dáng cầu in bóng xuống mặt nước.',
    },
    etiquette: {
      en: 'The bridge is narrow — step aside to take photos so others can pass.',
      vi: 'Cầu hẹp – hãy đứng sang một bên khi chụp để người khác đi qua.',
    },
    challenge: {
      prompt: { en: 'What does “The Huc” mean?', vi: '“Thê Húc” có nghĩa là gì?' },
      options: [
        { en: 'Where the morning sunlight rests', vi: 'Nơi đậu ánh sáng ban mai' },
        { en: 'The dragon’s back', vi: 'Lưng rồng' },
        { en: 'The bridge of scholars', vi: 'Cầu của sĩ tử' },
      ],
      answer: 0,
      hint: { en: 'Think of the rising sun.', vi: 'Hãy nghĩ tới mặt trời lúc sớm mai.' },
    },
  },
  {
    id: 'turtle-tower',
    name: { en: 'Turtle Tower view', vi: 'Góc nhìn Tháp Rùa' },
    nameVi: 'Tháp Rùa',
    lat: 21.0281, lng: 105.8520,
    priceMin: 0, priceMax: 0, visitMin: 10,
    themes: ['photo', 'history'],
    tags: ['free', 'photo'],
    blurb: {
      en: 'A small tower in the lake that carries the legend of the returned sword.',
      vi: 'Ngọn tháp nhỏ giữa hồ gắn với truyền thuyết trả gươm.',
    },
    tone: 'leaf',
    story: {
      en: 'Legend says that after King Le Loi drove out the Ming army in the 15th century, a golden turtle rose from this lake and took back the magic sword that had helped him win. The lake has been called Hoan Kiem — “Returned Sword” — ever since. The small tower on the islet was built in the late 19th century.',
      vi: 'Tương truyền sau khi vua Lê Lợi đánh đuổi quân Minh vào thế kỷ 15, một con rùa vàng nổi lên giữa hồ và đòi lại thanh gươm thần đã giúp vua thắng trận. Từ đó hồ mang tên Hoàn Kiếm – “trả gươm”. Ngọn tháp nhỏ trên gò giữa hồ được xây vào cuối thế kỷ 19.',
    },
    why: {
      en: 'Why a turtle? In Vietnamese legend the turtle is a sacred messenger of wisdom and long life.',
      vi: 'Vì sao lại là rùa? Trong truyền thuyết Việt, rùa là linh vật tượng trưng cho trí tuệ và trường thọ.',
    },
    photoTip: {
      en: 'From the west shore on Le Thai To street, early morning, when the water is still.',
      vi: 'Từ bờ tây trên phố Lê Thái Tổ, sáng sớm khi mặt hồ còn phẳng lặng.',
    },
    etiquette: {
      en: 'On weekend evenings the lake roads are pedestrian-only — enjoy them, and keep litter out of the water.',
      vi: 'Tối cuối tuần quanh hồ là phố đi bộ – hãy tận hưởng và giữ hồ sạch.',
    },
    challenge: {
      prompt: { en: 'In the legend, which king returned the sword?', vi: 'Trong truyền thuyết, vị vua nào trả gươm?' },
      options: [
        { en: 'Le Loi', vi: 'Lê Lợi' },
        { en: 'Ly Thai To', vi: 'Lý Thái Tổ' },
        { en: 'Tran Hung Dao', vi: 'Trần Hưng Đạo' },
      ],
      answer: 0,
      hint: { en: 'He fought the Ming army in the 1400s.', vi: 'Ông đánh quân Minh vào thế kỷ 15.' },
    },
  },
]
