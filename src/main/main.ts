import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, Notification } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import Store from 'electron-store'
import { Scheduler } from './scheduler'
import { AppConfig, DEFAULT_CONFIG, normalizeConfig, overlayWindowBg, panelWindowBg } from './config'
import { createTrayIcon } from './icon'
import { CHIME_DATA_URL } from './chime'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const isMac = process.platform === 'darwin'

const store = new Store<{ config: AppConfig }>({
  name: 'look-far',
  defaults: { config: DEFAULT_CONFIG }
})

function getConfig(): AppConfig {
  return normalizeConfig(store.get('config'))
}

let tray: Tray | null = null
let settingsWin: BrowserWindow | null = null
let breakWins: BrowserWindow[] = []
let scheduler: Scheduler

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.whenReady().then(() => {
  if (isMac) app.dock.hide() // 纯菜单栏应用

  scheduler = new Scheduler(getConfig())

  createTray()
  bindSchedulerEvents()
  bindIpc()
  scheduler.start()

  app.on('activate', () => openSettings())
})

/* ---------------- 托盘 ---------------- */

function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('远方')
  tray.on('click', () => openSettings())
  rebuildTrayMenu()
}

function rebuildTrayMenu() {
  if (!tray) return
  const paused = scheduler.isPaused()
  const menu = Menu.buildFromTemplate([
    { label: paused ? '▶ 继续' : '⏸ 暂停', click: () => togglePause() },
    { label: '↺ 重置', click: () => resetWork() },
    { label: '👀 立即休息', click: () => scheduler.startBreakNow() },
    { type: 'separator' },
    { label: '⚙ 设置', click: () => openSettings() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
}

function togglePause() {
  scheduler.setPaused(!scheduler.isPaused())
  rebuildTrayMenu()
}

function resetWork() {
  scheduler.resetWork()
  rebuildTrayMenu()
}

/** 托盘显示倒计时文本 */
function updateTrayDisplay(text: string) {
  if (!tray) return
  if (isMac) {
    tray.setTitle(text === '时段外' || text === '已暂停' || text.includes('饭点') ? text : `👁 ${text}`)
    tray.setToolTip(`远方 · ${text}`)
  } else if (/^\d+:\d+$/.test(text)) {
    tray.setToolTip(`远方 · ${text} 后休息`)
  } else {
    tray.setToolTip(`远方 · ${text}`)
  }
}

/* ---------------- 调度器事件 ---------------- */

function bindSchedulerEvents() {
  scheduler.on('tray-update', (text: string) => updateTrayDisplay(text))
  scheduler.on('break-start', () => {
    playSound()
    openBreakWindows()
  })
  scheduler.on('break-end', () => closeBreakWindows())
  scheduler.on('state-change', (s: any) => {
    settingsWin?.webContents.send('state-changed', s)
  })
}

/* ---------------- 声音 ---------------- */

function playSound() {
  const config = getConfig()
  if (!config.sound) return
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: '该休息了',
        body: '看向 6 米外，放松眼睛',
        silent: true
      }).show()
    }
  } catch (e) {
    console.error('通知失败', e)
  }
}

/* ---------------- 设置窗口 ---------------- */

function openSettings() {
  if (settingsWin) {
    settingsWin.show()
    settingsWin.focus()
    return
  }
  settingsWin = new BrowserWindow({
    width: 400,
    height: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: '远方',
    backgroundColor: panelWindowBg(getConfig().panelTheme),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  settingsWin.setMenuBarVisibility(false)
  settingsWin.loadFile(path.join(__dirname, '../renderer/index.html'))
  settingsWin.on('closed', () => {
    settingsWin = null
  })
}

/* ---------------- 全屏休息遮罩 ---------------- */

function openBreakWindows() {
  closeBreakWindows()
  const config = getConfig()
  let primary = true
  for (const display of screen.getAllDisplays()) {
    const { x, y, width, height } = display.bounds
    const win = new BrowserWindow({
      x, y, width, height,
      frame: false,
      fullscreen: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      movable: false,
      resizable: false,
      focusable: true,
      backgroundColor: overlayWindowBg(config.overlayTheme),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.loadFile(path.join(__dirname, '../renderer/break.html'))
    const shouldPlaySound = config.sound && primary
    const sendBreakConfig = () => {
      if (win.isDestroyed()) return
      win.webContents.send('break-config', {
        seconds: config.breakSeconds,
        overlayTheme: config.overlayTheme,
        playSound: shouldPlaySound,
        soundDataUrl: shouldPlaySound ? CHIME_DATA_URL : ''
      })
    }
    win.webContents.on('did-finish-load', sendBreakConfig)
    win.webContents.on('did-stop-loading', sendBreakConfig)
    breakWins.push(win)
    primary = false
  }
}

function closeBreakWindows() {
  for (const win of breakWins) {
    if (!win.isDestroyed()) win.close()
  }
  breakWins = []
}

/* ---------------- IPC ---------------- */

function bindIpc() {
  ipcMain.handle('get-config', () => getConfig())

  ipcMain.handle('save-config', (_e, config: AppConfig) => {
    const next = normalizeConfig(config)
    store.set('config', next)
    scheduler.updateConfig(next)
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.setBackgroundColor(panelWindowBg(next.panelTheme))
    }
    return true
  })

  ipcMain.handle('get-state', () => ({
    state: scheduler.getState(),
    remaining: scheduler.getRemaining(),
    paused: scheduler.isPaused()
  }))

  ipcMain.on('toggle-pause', () => togglePause())

  ipcMain.on('reset-work', () => resetWork())

  ipcMain.on('skip-break', () => scheduler.skipBreak())

  ipcMain.on('break-finished', () => scheduler.breakFinished())

  ipcMain.on('start-break-now', () => scheduler.startBreakNow())
}

app.on('window-all-closed', () => {
  // 保持后台运行，不退出
})

app.on('before-quit', () => {
  scheduler?.stop()
})
