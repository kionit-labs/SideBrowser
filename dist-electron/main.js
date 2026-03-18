//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let path = require("path");
path = __toESM(path);
let fs = require("fs");
fs = __toESM(fs);
let _ghostery_adblocker_electron = require("@ghostery/adblocker-electron");
let electron_datastore = require("electron-datastore");
//#region electron/main.ts
electron.app.name = "Side Browser";
if (process.platform === "win32") electron.app.setAppUserModelId("com.ismail.sidebrowser");
process.setMaxListeners(100);
process.on("unhandledRejection", (reason) => {
	if ((reason?.message || (typeof reason === "string" ? reason : "")).includes("Script failed to execute")) return;
	console.error("Unhandled Rejection reason:", reason);
});
process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
});
electron.app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
electron.app.commandLine.appendSwitch("disable-features", "IsolateOrigins,site-per-process,AudioServiceSandbox");
electron.app.commandLine.appendSwitch("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
if (!electron.app.requestSingleInstanceLock()) electron.app.quit();
else electron.app.on("second-instance", () => {
	if (win) {
		if (win.isMinimized()) win.restore();
		win.show();
		win.focus();
	}
});
process.env.DIST = path.default.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.default.join(process.env.DIST, "../public");
var win = null;
var tray = null;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var store;
var passwordsStore;
var blocker = null;
async function setupAdblocker() {
	try {
		blocker = await _ghostery_adblocker_electron.ElectronBlocker.fromLists(fetch, _ghostery_adblocker_electron.fullLists);
	} catch (error) {
		console.error("Failed to load adblocker lists:", error);
	}
}
var robot = null;
function loadRobotjs() {
	try {
		robot = require("robotjs");
	} catch (e) {
		console.warn("robotjs not available, focus acquisition may not work:", e);
		import("robotjs").then((mod) => {
			robot = mod.default || mod;
		}).catch(() => {
			console.error("robotjs completely unavailable");
		});
	}
}
function focusClick(edge) {
	if (!robot) return;
	try {
		const pos = robot.getMousePos();
		const targetX = edge === "left" ? pos.x + 20 : pos.x - 20;
		robot.moveMouseSmooth(targetX, pos.y);
		robot.mouseClick();
	} catch (e) {
		console.error("focusClick failed:", e);
	}
}
var currentSnapSide = null;
var edgeCheckInterval = null;
var isPinned = false;
var isAutoSnap = true;
var isWindowOpen = false;
function startEdgeCheck() {
	if (!edgeCheckInterval) edgeCheckInterval = setInterval(() => {
		if (!win || isWindowOpen || !currentSnapSide) return;
		const point = electron.screen.getCursorScreenPoint();
		const bounds = win.getBounds();
		const winDisplay = electron.screen.getDisplayNearestPoint({
			x: bounds.x,
			y: bounds.y
		});
		const mouseDisplay = electron.screen.getDisplayNearestPoint(point);
		if (winDisplay.id !== mouseDisplay.id) return;
		const workArea = mouseDisplay.workArea;
		if (currentSnapSide === "left" && point.x <= workArea.x + 1 || currentSnapSide === "right" && point.x >= workArea.x + workArea.width - 2) triggerFocus();
	}, 50);
}
function triggerFocus() {
	if (!win) return;
	win.setIgnoreMouseEvents(false);
	isWindowOpen = true;
	win.show();
	win.setAlwaysOnTop(true, "screen-saver");
	if (process.platform === "win32") setTimeout(() => {
		if (win && !win.isDestroyed() && isWindowOpen) focusClick(currentSnapSide || "right");
	}, 300);
	else {
		electron.app.focus({ steal: true });
		win.focus();
	}
	setTimeout(() => {
		if (win && !win.isDestroyed()) win.setAlwaysOnTop(true, "pop-up-menu");
	}, 100);
	startEdgeCheck();
}
function retractWindow() {
	if (!win || !isWindowOpen) return;
	if (!isAutoSnap) return;
	if (isPinned) return;
	const bounds = win.getBounds();
	const workArea = electron.screen.getDisplayNearestPoint({
		x: bounds.x,
		y: bounds.y
	}).workArea;
	const distLeft = bounds.x - workArea.x;
	const distRight = workArea.x + workArea.width - (bounds.x + bounds.width);
	let side = "right";
	if (distLeft < distRight) {
		side = "left";
		win.setBounds({
			x: workArea.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height
		});
	} else {
		side = "right";
		win.setBounds({
			x: workArea.x + workArea.width - bounds.width,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height
		});
	}
	currentSnapSide = side;
	win.setAlwaysOnTop(true, "floating");
	win.setIgnoreMouseEvents(true, { forward: true });
	win.webContents.send("window-blur", side);
	isWindowOpen = false;
	startEdgeCheck();
}
function createWindow() {
	const workArea = electron.screen.getPrimaryDisplay().workArea;
	const initialWidth = store.get("window-width") || 600;
	currentSnapSide = (store.get("defaultSnapSide") || "right").toLowerCase();
	win = new electron.BrowserWindow({
		icon: path.default.join(process.env.VITE_PUBLIC || "", "favicon.ico"),
		width: initialWidth,
		height: 600,
		minWidth: 300,
		minHeight: 400,
		title: "Side Browser",
		frame: false,
		resizable: true,
		titleBarStyle: "hidden",
		transparent: true,
		skipTaskbar: true,
		alwaysOnTop: true,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: path.default.join(__dirname, "preload.js"),
			webviewTag: true,
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	win.webContents.setMaxListeners(100);
	win.webContents.on("did-attach-webview", (_event, webContents) => {
		webContents.setMaxListeners(100);
	});
	const savedOpacity = store.get("transparency") ?? .95;
	win.setOpacity(savedOpacity);
	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	const initialX = currentSnapSide === "left" ? workArea.x : workArea.x + workArea.width - initialWidth;
	win.setBounds({
		x: initialX,
		y: workArea.y + Math.floor((workArea.height - 600) / 2),
		width: initialWidth,
		height: 600
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.default.join(process.env.DIST || "", "index.html"));
	win.once("ready-to-show", () => {
		if (win) {
			const savedOpacity = store.get("transparency") ?? .95;
			win.setOpacity(savedOpacity);
		}
	});
	win.on("moved", () => {
		if (!win) return;
		if (isAutoSnap) {
			const bounds = win.getBounds();
			const workArea = electron.screen.getDisplayNearestPoint({
				x: bounds.x,
				y: bounds.y
			}).workArea;
			if (bounds.x - workArea.x < workArea.x + workArea.width - (bounds.x + bounds.width)) {
				win.setBounds({
					x: workArea.x,
					y: bounds.y,
					width: bounds.width,
					height: bounds.height
				});
				currentSnapSide = "left";
			} else {
				win.setBounds({
					x: workArea.x + workArea.width - bounds.width,
					y: bounds.y,
					width: bounds.width,
					height: bounds.height
				});
				currentSnapSide = "right";
			}
			store.set("defaultSnapSide", currentSnapSide);
		}
	});
	win.on("blur", () => {
		if (!win) return;
		retractWindow();
	});
	win.on("focus", () => {
		if (!win) return;
		isWindowOpen = true;
		win.setIgnoreMouseEvents(false);
		win.moveTop();
		win.setAlwaysOnTop(true, "pop-up-menu");
		win.webContents.send("window-focus");
	});
	electron.ipcMain.on("window-mouse-enter", () => {
		if (win && !win.isFocused()) triggerFocus();
	});
}
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		if (blocker) blocker.disableBlockingInSession(electron.session.defaultSession);
		electron.app.quit();
		win = null;
	}
});
electron.app.whenReady().then(async () => {
	loadRobotjs();
	store = new electron_datastore.Store({
		name: "slide-browser-preferences",
		template: {
			transparency: .95,
			adblockEnabled: true,
			"window-width": 600,
			themeColor: "Default",
			darkMode: "System",
			language: "English",
			addressBar: "Hidden",
			autoLaunch: false,
			translateEnabled: false,
			passwordManagerEnabled: false,
			alwaysOnTop: true,
			autoCenter: true,
			defaultSnapSide: "right",
			autoUpdate: true
		}
	});
	passwordsStore = new electron_datastore.Store({
		name: "side-browser-passwords",
		template: { passwords: [] }
	});
	Object.entries({
		transparency: .95,
		adblockEnabled: true,
		"window-width": 600,
		themeColor: "Default",
		darkMode: "System",
		language: "English",
		addressBar: "Hidden",
		autoLaunch: false,
		translateEnabled: false,
		passwordManagerEnabled: false,
		alwaysOnTop: true,
		autoCenter: true,
		defaultSnapSide: "right",
		autoUpdate: true
	}).forEach(([key, value]) => {
		if (store.get(key) === void 0) store.set(key, value);
	});
	if (store.get("alwaysOnTop") && win) win.setAlwaysOnTop(true, "screen-saver");
	if (store.get("autoLaunch")) electron.app.setLoginItemSettings({
		openAtLogin: true,
		path: electron.app.getPath("exe")
	});
	await setupAdblocker();
	try {
		const iconPath = path.default.join(process.env.VITE_PUBLIC || "", "favicon.ico");
		tray = new electron.Tray(fs.default.existsSync(iconPath) ? electron.nativeImage.createFromPath(iconPath) : electron.nativeImage.createEmpty());
		const contextMenu = electron.Menu.buildFromTemplate([
			{
				label: "Show Side Browser",
				click: () => {
					win?.show();
					win?.focus();
				}
			},
			{ type: "separator" },
			{
				label: "Quit",
				click: () => {
					electron.app.quit();
				}
			}
		]);
		tray.setToolTip("Side Browser");
		tray.setContextMenu(contextMenu);
		tray.on("click", () => {
			win?.show();
			win?.focus();
		});
	} catch (err) {
		console.warn("Failed to create Tray icon:", err);
	}
	createWindow();
	startEdgeCheck();
	if (store.get("adblockEnabled")) blocker?.enableBlockingInSession(electron.session.defaultSession);
});
electron.ipcMain.handle("get-preload-path", () => path.default.join(__dirname, "webview-preload.js"));
electron.ipcMain.handle("get-store-val", (_event, key) => store ? store.get(key) : void 0);
electron.ipcMain.on("set-store-val", (_event, key, val) => {
	if (store) store.set(key, val);
	if (key === "transparency" && win) win.setOpacity(val);
	if (key === "adblockEnabled") if (val) blocker?.enableBlockingInSession(electron.session.defaultSession);
	else blocker?.disableBlockingInSession(electron.session.defaultSession);
});
electron.ipcMain.handle("get-passwords", () => passwordsStore?.get("passwords") || []);
electron.ipcMain.on("save-passwords", (_event, passwords) => {
	passwordsStore?.set("passwords", passwords);
});
electron.ipcMain.on("clear-passwords", () => {
	passwordsStore?.set("passwords", []);
});
electron.ipcMain.on("hide-window", () => {
	if (win) {
		isPinned = false;
		win.blur();
		win.webContents.send("window-blur", currentSnapSide || "right");
		startEdgeCheck();
	}
});
electron.ipcMain.on("set-auto-hide", (_event, enabled) => {
	isPinned = enabled;
});
electron.ipcMain.on("set-auto-snap", (_event, enabled) => {
	isAutoSnap = enabled;
	if (enabled && win) win.emit("moved");
});
electron.ipcMain.on("window-resize", (_event, { deltaX, deltaY }) => {
	if (!win) return;
	const bounds = win.getBounds();
	const workArea = electron.screen.getDisplayNearestPoint({
		x: bounds.x,
		y: bounds.y
	}).workArea;
	let newWidth = bounds.width;
	let newHeight = bounds.height;
	let newX = bounds.x;
	let newY = bounds.y;
	if (currentSnapSide === "right") {
		newWidth = bounds.width - deltaX;
		newX = workArea.x + workArea.width - newWidth;
	} else if (currentSnapSide === "left") {
		newWidth = bounds.width + deltaX;
		newX = workArea.x;
	}
	newHeight = bounds.height + deltaY;
	newWidth = Math.max(300, Math.min(newWidth, workArea.width - 50));
	newHeight = Math.max(300, Math.min(newHeight, workArea.height - 50));
	if (currentSnapSide === "right") newX = workArea.x + workArea.width - newWidth;
	win.setBounds({
		x: Math.round(newX),
		y: Math.round(newY),
		width: Math.round(newWidth),
		height: Math.round(newHeight)
	});
	store.set("window-width", newWidth);
});
electron.ipcMain.on("set-auto-launch", (_event, enabled) => {
	electron.app.setLoginItemSettings({
		openAtLogin: enabled,
		path: electron.app.getPath("exe")
	});
	if (store) store.set("autoLaunch", enabled);
});
electron.ipcMain.on("set-always-on-top", (_event, enabled) => {
	if (win) win.setAlwaysOnTop(enabled, "screen-saver");
	if (store) store.set("alwaysOnTop", enabled);
});
//#endregion
