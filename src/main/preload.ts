import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('eyeApi', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  getState: () => ipcRenderer.invoke('get-state'),
  togglePause: () => ipcRenderer.send('toggle-pause'),
  resetWork: () => ipcRenderer.send('reset-work'),
  skipBreak: () => ipcRenderer.send('skip-break'),
  breakFinished: () => ipcRenderer.send('break-finished'),
  startBreakNow: () => ipcRenderer.send('start-break-now'),
  onStateChanged: (cb: (s: any) => void) => {
    ipcRenderer.on('state-changed', (_e, s) => cb(s))
  },
  onBreakConfig: (cb: (c: { seconds: number }) => void) => {
    ipcRenderer.on('break-config', (_e, c) => cb(c))
  }
})
