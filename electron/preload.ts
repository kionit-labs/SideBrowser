import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onWindowBlur: (callback: (side: string) => void) => ipcRenderer.on('window-blur', (_event, side) => callback(side)),
  onWindowFocus: (callback: () => void) => ipcRenderer.on('window-focus', () => callback()),
  onWindowShortcut: (callback: (type: string, data?: any) => void) => ipcRenderer.on('window-shortcut', (_event, type, data) => callback(type, data)),
  sendMouseEnter: () => ipcRenderer.send('window-mouse-enter'),
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.send('set-store-value', key, value),
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),
  closeWindow: () => ipcRenderer.send('close-window'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  setAutoHide: (enabled: boolean) => ipcRenderer.send('set-auto-hide', enabled),
  onAutoHideToggled: (callback: (isPinned: boolean) => void) => ipcRenderer.on('auto-hide-toggled', (_event, isPinned) => callback(isPinned)),
  setAutoSnap: (enabled: boolean) => ipcRenderer.send('set-auto-snap', enabled),
  setAutoCenter: (enabled: boolean) => ipcRenderer.send('set-auto-center', enabled),
  resizeWindow: (deltas: { deltaX: number; deltaY: number }) => ipcRenderer.send('window-resize', deltas),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.send('set-auto-launch', enabled),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.send('set-always-on-top', enabled),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  onUpdateMessage: (callback: (msg: string, isError: boolean) => void) => ipcRenderer.on('update-message', (_event, msg, isError) => callback(msg, isError)),
  onSnapSideChanged: (callback: (side: string) => void) => ipcRenderer.on('snap-side-changed', (_event, side) => callback(side)),
  // Password Manager (storage only)
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  savePasswords: (passwords: any[]) => ipcRenderer.send('save-passwords', passwords),
  clearPasswords: () => ipcRenderer.send('clear-passwords'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  aiQueryLLM: (prompt: string, threadId: string, imageBase64?: string) => ipcRenderer.invoke('ai:query-llm', prompt, threadId, imageBase64),
  aiQueryLLMStream: (prompt: string, threadId: string, provider: string, model: string, endpoint: string, apiKey: string, imagesBase64?: string[], modelStyle?: string) => {
    ipcRenderer.send('ai:query-llm-stream', { prompt, threadId, provider, model, endpoint, apiKey, imagesBase64, modelStyle });
  },
  onAiStreamChunk: (callback: (data: { threadId: string, chunk: string, usage?: { promptTokens: number, completionTokens: number } }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai:query-llm-chunk', handler);
    return () => ipcRenderer.off('ai:query-llm-chunk', handler);
  },
  onAiStreamDone: (callback: (data: { threadId: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai:query-llm-done', handler);
    return () => ipcRenderer.off('ai:query-llm-done', handler);
  },
  onAiStreamError: (callback: (data: { threadId: string, error: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai:query-llm-error', handler);
    return () => ipcRenderer.off('ai:query-llm-error', handler);
  },
  aiCaptureScreenRegion: () => ipcRenderer.invoke('ai:capture-screen-region'),
  aiAttachFile: () => ipcRenderer.invoke('ai:attach-file'),
  aiCaptureApp: () => ipcRenderer.invoke('ai:capture-app'),
  aiGetOpenWindows: () => ipcRenderer.invoke('ai:get-open-windows'),
  aiTriggerDictation: () => ipcRenderer.invoke('ai:trigger-dictation'),
  aiFileOperation: (action: string, targetPath: string, content?: string) => ipcRenderer.invoke('ai:file-operation', action, targetPath, content),
  aiExecuteAutomation: (command: any) => ipcRenderer.invoke('ai:execute-automation', command),
  aiGetAvailableModels: (provider: string, endpoint: string) => ipcRenderer.invoke('ai:get-available-models', provider, endpoint),
  aiGetProviderBalance: (provider: string, endpoint: string) => ipcRenderer.invoke('ai:get-provider-balance', provider, endpoint),
});
