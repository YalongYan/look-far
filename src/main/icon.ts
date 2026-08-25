import { nativeImage, NativeImage } from 'electron'

/** 圆形眼睛图标的 SVG 模板（macOS 模板图标：黑色+透明即可自动适配深浅菜单栏） */
export function createTrayIcon(): NativeImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="9" fill="none" stroke="black" stroke-width="2"/>
    <circle cx="11" cy="11" r="3.5" fill="black"/>
  </svg>`
  const img = nativeImage.createFromDataURL(
    'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
  )
  img.setTemplateImage(true)
  return img
}

/**
 * Windows 用：把分钟数字画进 32x32 图标。
 * 浅灰圆底 + 深色数字，系统托盘里可读。
 */
export function createWindowsTrayIcon(minutes: number): NativeImage {
  const text = minutes > 99 ? '99' : String(minutes)
  const fontSize = text.length === 1 ? 18 : 14
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#E8F0FE" stroke="#4285F4" stroke-width="2"/>
    <text x="16" y="21" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="#1a73e8" text-anchor="middle">${text}</text>
  </svg>`
  return nativeImage.createFromDataURL(
    'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
  )
}
