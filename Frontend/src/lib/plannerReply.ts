import { TRANSPORT_INFO } from '../i18n/strings'
import type { Area, Intent, Lang } from '../types'
import { distance, duration, money } from './format'
import { walkingOf, WALK_LIMIT, type QuestSummary, type TransportHint } from './quest'
import type { Weather } from './weather'

const AREA_NAME: Record<Lang, Record<Area, string>> = {
  vi: { 'hoan-kiem': 'Hoàn Kiếm', 'ba-vi': 'Ba Vì' },
  en: { 'hoan-kiem': 'Hoan Kiem', 'ba-vi': 'Ba Vi' },
}

/** Reliable local response when the language model is unavailable or too slow. */
export function buildPlannerReply(intent: Intent, area: Area, lang: Lang, weather: Weather | null): string {
  const place = AREA_NAME[lang][area]
  const theme = intent.themes[0] ?? 'culture'

  if (lang === 'vi') {
    const openings: Record<string, string> = {
      culture: `Hay đấy — một chuyến khám phá văn hóa ở ${place} nghe rất hợp!`,
      food: `Nghe ngon đấy — cùng khám phá ẩm thực ${place} nhé!`,
      history: `${place} có rất nhiều câu chuyện đáng để khám phá!`,
      photo: `Ý tưởng tuyệt đấy — ${place} có nhiều góc rất ăn ảnh!`,
      fun: `Nghe vui đấy — mình sẽ tìm một hành trình thật vừa sức ở ${place}!`,
      rainy: `Một ngày mưa vẫn có thể khám phá ${place} rất thú vị!`,
    }
    const opening = openings[theme] ?? `Tuyệt đấy — cùng khám phá ${place} nhé!`
    let advice: string
    if (weather?.rainy) advice = `Khả năng mưa khoảng ${weather.rainProb}%, mình sẽ ưu tiên các điểm trong nhà và chặng di chuyển ngắn.`
    else if (weather?.hot) advice = `Trời khoảng ${weather.tempC}°C, mình sẽ ưu tiên các điểm gần nhau và có chỗ nghỉ mát.`
    else if (intent.transport === 'walk') advice = 'Bạn đi bộ nên mình sẽ gom các điểm gần nhau để hành trình nhẹ nhàng hơn.'
    else if (intent.transport === 'motorbike') advice = 'Đi xe máy khá linh hoạt; mình sẽ sắp các điểm theo cụm để hạn chế phải vòng lại.'
    else if (intent.transport === 'grabbike') advice = 'Đi GrabBike sẽ nhanh gọn; mình sẽ giữ các chặng hợp lý để bạn đỡ phải đặt xe nhiều lần.'
    else if (intent.transport === 'car') advice = 'Đi ô tô sẽ thoải mái hơn; mình sẽ ưu tiên lộ trình gọn để giảm thời gian trên đường.'
    else if (intent.people > 2) advice = `Với nhóm ${intent.people} người, mình sẽ ưu tiên các điểm dễ trải nghiệm cùng nhau.`
    else advice = `Trong ${intent.hours} giờ, mình sẽ giữ lịch trình vừa đủ để bạn không phải vội.`
    return `${opening} ${advice}`
  }

  const openings: Record<string, string> = {
    culture: `Lovely choice — a cultural wander around ${place} sounds just right!`,
    food: `That sounds delicious — let’s explore the flavours of ${place}!`,
    history: `${place} has plenty of stories worth uncovering!`,
    photo: `Great idea — ${place} has some wonderfully photogenic corners!`,
    fun: `That sounds fun — I’ll keep your ${place} route lively but comfortable!`,
    rainy: `A rainy day can still be a lovely way to experience ${place}!`,
  }
  const opening = openings[theme] ?? `Great choice — let’s explore ${place}!`
  let advice: string
  if (weather?.rainy) advice = `Rain is around ${weather.rainProb}% likely, so I’ll favour indoor stops and shorter transfers.`
  else if (weather?.hot) advice = `It’s around ${weather.tempC}°C, so I’ll favour nearby stops with chances to cool down.`
  else if (intent.transport === 'walk') advice = 'Since you’re walking, I’ll keep the stops close together for an easier pace.'
  else if (intent.transport === 'motorbike') advice = 'A motorbike gives you flexibility, so I’ll group stops to reduce backtracking.'
  else if (intent.transport === 'grabbike') advice = 'GrabBike should keep things nimble, so I’ll avoid making you book too many short rides.'
  else if (intent.transport === 'car') advice = 'A car will be comfortable, so I’ll keep the route compact to reduce time on the road.'
  else if (intent.people > 2) advice = `For a group of ${intent.people}, I’ll favour places that are easy to enjoy together.`
  else advice = `With ${intent.hours} hours, I’ll keep the plan full enough without making it feel rushed.`
  return `${opening} ${advice}`
}

/**
 * "Trip details" once places are picked: worked out from the actual route, so it follows every
 * change of stops, transport or departure — time against the hours asked for, how much walking,
 * and whether another way of getting around fits better.
 */
export function buildRouteDetails(
  intent: Intent,
  lang: Lang,
  weather: Weather | null,
  sum: QuestSummary,
  hint: TransportHint | null,
): string {
  const vi = lang === 'vi'
  const tr = intent.transport
  const name = TRANSPORT_INFO[lang][tr].name
  const n = sum.stops.length
  const budget = intent.hours * 60
  const { walkedM, walkMin, longestWalkM } = walkingOf(sum)
  const rides = sum.legs.filter((l) => l.transport !== 'walk')
  const forced = sum.legs.filter((l) => l.transport === 'walk' && tr !== 'walk')
  const inStreet = forced.some((l) => l.note === 'walkingStreet')
  const peak = rides.some((l) => l.peak)
  const out: string[] = []

  // 1. Time against what they asked for.
  const total = duration(sum.totalMin, lang)
  const parts = vi
    ? [`${duration(sum.visitMin, lang)} tham quan`, `${duration(sum.travelMin, lang)} di chuyển`]
    : [`${duration(sum.visitMin, lang)} visiting`, `${duration(sum.travelMin, lang)} getting around`]
  if (sum.waitTotalMin > 0) parts.push(vi ? `${duration(sum.waitTotalMin, lang)} chờ sự kiện` : `${duration(sum.waitTotalMin, lang)} waiting for events`)
  const fit =
    sum.totalMin > budget + 10
      ? vi ? `vượt ${duration(sum.totalMin - budget, lang)} so với ${intent.hours} giờ bạn muốn, bỏ bớt một điểm sẽ thong thả hơn` : `${duration(sum.totalMin - budget, lang)} over your ${intent.hours} hours; dropping a stop would ease the pace`
      : vi ? `vừa trong ${intent.hours} giờ bạn muốn` : `within your ${intent.hours} hours`
  out.push(vi ? `${n} điểm, khoảng ${total} (${parts.join(', ')}) — ${fit}.` : `${n} stops, about ${total} (${parts.join(', ')}) — ${fit}.`)

  // 2. Getting around.
  if (tr === 'walk') {
    const far = longestWalkM > WALK_LIMIT.legM || walkedM > WALK_LIMIT.totalM || walkMin > WALK_LIMIT.totalMin
    if (hint && hint.to !== 'walk') {
      const alt = TRANSPORT_INFO[lang][hint.to].name
      const extra = hint.extraCostK > 0 ? money(hint.extraCostK) : null
      out.push(vi
        ? `Đi bộ tổng ${distance(walkedM)} (~${walkMin} phút), chặng dài nhất ${distance(longestWalkM)} — khá xa để đi bộ. Đi ${alt} sẽ nhanh hơn khoảng ${hint.savedMin} phút${extra ? `, thêm khoảng ${extra} tiền xe` : ''}.`
        : `That’s ${distance(walkedM)} on foot (~${walkMin} min), the longest stretch ${distance(longestWalkM)} — a long way to walk. ${alt} would save about ${hint.savedMin} min${extra ? ` for roughly ${extra} in fares` : ''}.`)
    } else if (far) {
      out.push(vi
        ? `Đi bộ tổng ${distance(walkedM)} (~${walkMin} phút) — hơi dài, nhưng đi xe cũng không nhanh hơn bao nhiêu vì phải chờ xe và gửi xe.`
        : `That’s ${distance(walkedM)} on foot (~${walkMin} min) — quite a lot, but a ride wouldn’t be much quicker once you count waiting and parking.`)
    } else {
      out.push(vi
        ? `Đi bộ tổng ${distance(walkedM)} (~${walkMin} phút), chặng dài nhất ${distance(longestWalkM)} — vừa sức đi bộ.`
        : `About ${distance(walkedM)} on foot (~${walkMin} min), the longest stretch ${distance(longestWalkM)} — an easy walk.`)
    }
  } else if (hint?.to === 'walk') {
    out.push(vi
      ? `Các điểm chỉ cách nhau vài trăm mét — đi bộ cũng nhanh như đi ${name} mà không tốn gửi xe hay cước.`
      : `The stops are only a few hundred metres apart — walking is as quick as ${name}, with no parking or fares.`)
  } else {
    const fare = sum.travelCostK > 0 ? money(sum.travelCostK) : null
    out.push(vi
      ? `Đi ${name}: ${rides.length}/${sum.legs.length} chặng đi xe, mất ${duration(sum.travelMin, lang)}${fare ? `, chi phí khoảng ${fare}` : ''}.`
      : `By ${name}: ${rides.length} of ${sum.legs.length} legs ride, ${duration(sum.travelMin, lang)} on the move${fare ? `, about ${fare}` : ''}.`)
    if (forced.length)
      out.push(inStreet
        ? vi ? `${forced.length} chặng nằm trong phố đi bộ cuối tuần nên vẫn phải đi bộ.` : `${forced.length} legs are inside the weekend walking street, so they’re on foot.`
        : vi ? `${forced.length} chặng quá ngắn để gọi xe nên tính là đi bộ.` : `${forced.length} legs are too short to be worth a ride, so they’re walked.`)
    if (peak) out.push(vi ? 'Có chặng rơi vào giờ cao điểm nên xe đi chậm hơn.' : 'Some legs fall in rush hour, so traffic is slower.')
  }

  // 3. Weather, briefly.
  if (weather?.rainy) out.push(vi ? `Khả năng mưa ${weather.rainProb}% — mang theo áo mưa.` : `${weather.rainProb}% chance of rain — bring a raincoat.`)
  else if (weather?.hot && tr === 'walk') out.push(vi ? `Trời khoảng ${weather.tempC}°C, nhớ mang nước.` : `Around ${weather.tempC}°C — carry water.`)
  return out.join(' ')
}
