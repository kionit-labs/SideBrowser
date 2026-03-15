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
	setAutoSnap: (enabled) => electron.ipcRenderer.send("set-auto-snap", enabled)
});
//#endregion
