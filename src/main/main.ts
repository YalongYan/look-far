import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import Store from 'electron-store'
import { Scheduler } from './scheduler'
import { AppConfig, DEFAULT_CONFIG } from './config'
import { createTrayIcon, createWindowsTrayIcon } from './icon'

const isMac = process.platform === 'darwin'

const store = new Store<{ config: AppConfig }>({
  name: 'look-far',
  defaults: { config: DEFAULT_CONFIG }
})

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

  scheduler = new Scheduler(store.get('config'))

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
    // macOS: 图标旁直接显示文字
    tray.setTitle(text === '时段外' || text === '已暂停' || text.includes('饭点') ? text : `👁 ${text}`)
    tray.setToolTip(`远方 · ${text}`)
  } else {
    // Windows: 倒计时画进图标 + tooltip
    if (/^\d+:\d+$/.test(text)) {
      const minutes = Math.ceil(parseInt(text.split(':')[0], 10))
      tray.setImage(createWindowsTrayIcon(minutes))
      tray.setToolTip(`远方 · ${text} 后休息`)
    } else {
      tray.setImage(createTrayIcon())
      tray.setToolTip(`远方 · ${text}`)
    }
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
  const config = store.get('config')
  if (!config.sound) return
  // 简单可靠方案：给系统通知音。后续可换自定义音频文件。
  try {
    const { Notification } = require('electron')
    if (Notification.isSupported()) {
      new Notification({
        title: '👀 该休息了',
        body: '看向 6 米外，放松眼睛',
        silent: false
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
    height: 620,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: '远方',
    backgroundColor: '#f7f8fa',
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
  const config = store.get('config')
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
      backgroundColor: '#16171c',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.loadFile(path.join(__dirname, '../renderer/break.html'))
    const sendBreakConfig = () => {
      if (win.isDestroyed()) return
      win.webContents.send('break-config', { seconds: config.breakSeconds })
    }
    win.webContents.on('did-finish-load', sendBreakConfig)
    win.webContents.on('did-stop-loading', sendBreakConfig)
    breakWins.push(win)
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
  ipcMain.handle('get-config', () => store.get('config'))

  ipcMain.handle('save-config', (_e, config: AppConfig) => {
    store.set('config', config)
    scheduler.updateConfig(config)
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
