const OFFSET = 7 * 3_600_000 // Vietnam: UTC+7, no daylight saving time

/**
 * Day of week (0 = Sunday), hour and minute of an instant in Hanoi — whatever time zone the phone
 * is set to (visitors often keep their home zone). Rush hour, the walking street and opening
 * hours all follow Hanoi's clock.
 */
export function hanoiClock(at: Date | number): { day: number; hour: number; minute: number } {
  const d = new Date(+at + OFFSET)
  return { day: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}
