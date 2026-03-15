import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	onWindowBlur: (callback) => ipcRenderer.on("window-blur", () => callback()),
	removeWindowBlur: () => ipcRenderer.removeAllListeners("window-blur")
});
//#endregion
