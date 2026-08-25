export interface MealBreak {
  enabled: boolean
  start: string // "12:00"
  end: string   // "13:00"
}

export type ThemeId = 'light' | 'dark' | 'warm'

export const THEME_IDS: ThemeId[] = ['light', 'dark', 'warm']

export interface AppConfig {
  workMinutes: number
  breakSeconds: number
  allDay: boolean
  scheduleStart: string // "09:00"
  scheduleEnd: string   // "18:00"
  meals: MealBreak[]    // 最多2段
  sound: boolean
  panelTheme: ThemeId
  overlayTheme: ThemeId
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
  sound: true,
  panelTheme: 'light',
  overlayTheme: 'dark'
}

const PANEL_WINDOW_BG: Record<ThemeId, string> = {
  light: '#f7f8fa',
  dark: '#1c1e24',
  warm: '#f6efe6'
}

const OVERLAY_WINDOW_BG: Record<ThemeId, string> = {
  light: '#eef3fa',
  dark: '#16171c',
  warm: '#1f1a16'
}

function asTheme(value: unknown, fallback: ThemeId): ThemeId {
  return THEME_IDS.includes(value as ThemeId) ? (value as ThemeId) : fallback
}

export function normalizeConfig(raw?: Partial<AppConfig> | null): AppConfig {
  const merged = { ...DEFAULT_CONFIG, ...(raw || {}) }
  merged.panelTheme = asTheme(merged.panelTheme, 'light')
  merged.overlayTheme = asTheme(merged.overlayTheme, 'dark')
  if (!Array.isArray(merged.meals) || merged.meals.length === 0) {
    merged.meals = DEFAULT_CONFIG.meals.map(m => ({ ...m }))
  }
  return merged
}

export function panelWindowBg(theme: ThemeId): string {
  return PANEL_WINDOW_BG[theme] || PANEL_WINDOW_BG.light
}

export function overlayWindowBg(theme: ThemeId): string {
  return OVERLAY_WINDOW_BG[theme] || OVERLAY_WINDOW_BG.dark
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
