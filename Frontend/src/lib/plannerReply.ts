import type { Area, Intent, Lang } from '../types'
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
