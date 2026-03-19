import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onWindowBlur: (callback: (side: string) => void) => ipcRenderer.on('window-blur', (_event, side) => callback(side)),
  onWindowFocus: (callback: () => void) => ipcRenderer.on('window-focus', () => callback()),
  sendMouseEnter: () => ipcRenderer.send('window-mouse-enter'),
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store-val', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.send('set-store-val', key, value),
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  setAutoHide: (enabled: boolean) => ipcRenderer.send('set-auto-hide', enabled),
  setAutoSnap: (enabled: boolean) => ipcRenderer.send('set-auto-snap', enabled),
  resizeWindow: (deltas: { deltaX: number; deltaY: number }) => ipcRenderer.send('window-resize', deltas),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.send('set-auto-launch', enabled),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.send('set-always-on-top', enabled),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  onUpdateMessage: (callback: (msg: string, isError: boolean) => void) => ipcRenderer.on('update-message', (_event, msg, isError) => callback(msg, isError)),
  // Password Manager (storage only)
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  savePasswords: (passwords: any[]) => ipcRenderer.send('save-passwords', passwords),
  clearPasswords: () => ipcRenderer.send('clear-passwords'),
});
