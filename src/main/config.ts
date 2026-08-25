export interface MealBreak {
  enabled: boolean
  start: string // "12:00"
  end: string   // "13:00"
}

export interface AppConfig {
  workMinutes: number
  breakSeconds: number
  allDay: boolean
  scheduleStart: string // "09:00"
  scheduleEnd: string   // "18:00"
  meals: MealBreak[]    // 最多2段
  sound: boolean
}

export const DEFAULT_CONFIG: AppConfig = {
  workMinutes: 20,
  breakSeconds: 20,
  allDay: true,
  scheduleStart: '09:00',
  scheduleEnd: '18:00',
  meals: [
    { enabled: true, start: '12:00', end: '13:00' },
    { enabled: false, start: '18:00', end: '19:00' }
  ],
  sound: true
}

/** 把 "HH:mm" 转成当天分钟数 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** 当前时间是否在 [start, end) 时间段内（支持跨午夜） */
export function isInTimeRange(now: Date, start: string, end: string): boolean {
  const cur = now.getHours() * 60 + now.getMinutes()
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (s <= e) return cur >= s && cur < e
  return cur >= s || cur < e // 跨午夜
}

/** 当前是否处于任一启用的饭点时段 */
export function isMealTime(now: Date, meals: MealBreak[]): boolean {
  return meals.some(m => m.enabled && isInTimeRange(now, m.start, m.end))
}
