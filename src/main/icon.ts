import { app, nativeImage, NativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

function resolveAppPng(): string {
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.png'),
    path.join(__dirname, '../../assets/icon.png'),
    path.join(app.getAppPath(), 'assets/icon.png')
  ]
  return candidates.find(p => p && fs.existsSync(p)) || ''
}

/** macOS 菜单栏：模板图标（黑+透明，系统自动适配深浅色） */
export function createMacTrayIcon(): NativeImage {
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
 * Windows 托盘不支持 SVG data URL，会变成空白占位。
 * 用应用 PNG 生成 16/32 两套尺寸。
 */
export function createWindowsTrayIcon(): NativeImage {
  const file = resolveAppPng()
  if (!file) return nativeImage.createEmpty()
  const src = nativeImage.createFromPath(file)
  if (src.isEmpty()) return nativeImage.createEmpty()
  const img = nativeImage.createEmpty()
  img.addRepresentation({
    width: 16,
    height: 16,
    scaleFactor: 1,
    buffer: src.resize({ width: 16, height: 16 }).toPNG()
  })
  img.addRepresentation({
    width: 32,
    height: 32,
    scaleFactor: 2,
    buffer: src.resize({ width: 32, height: 32 }).toPNG()
  })
  return img
}

export function createTrayIcon(): NativeImage {
  if (process.platform === 'darwin') return createMacTrayIcon()
  return createWindowsTrayIcon()
}
