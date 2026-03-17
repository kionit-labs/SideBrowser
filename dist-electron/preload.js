let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	onWindowBlur: (callback) => electron.ipcRenderer.on("window-blur", (_event, side) => callback(side)),
	onWindowFocus: (callback) => electron.ipcRenderer.on("window-focus", () => callback()),
	sendMouseEnter: () => electron.ipcRenderer.send("window-mouse-enter"),
	getStoreValue: (key) => electron.ipcRenderer.invoke("get-store-val", key),
	setStoreValue: (key, value) => electron.ipcRenderer.send("set-store-val", key, value),
	getPreloadPath: () => electron.ipcRenderer.invoke("get-preload-path"),
	hideWindow: () => electron.ipcRenderer.send("hide-window"),
	setAutoHide: (enabled) => electron.ipcRenderer.send("set-auto-hide", enabled),
	setAutoSnap: (enabled) => electron.ipcRenderer.send("set-auto-snap", enabled),
	resizeWindow: (deltas) => electron.ipcRenderer.send("window-resize", deltas),
	setAutoLaunch: (enabled) => electron.ipcRenderer.send("set-auto-launch", enabled),
	setAlwaysOnTop: (enabled) => electron.ipcRenderer.send("set-always-on-top", enabled),
	removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
});
//#endregion
