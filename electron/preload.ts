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
});
