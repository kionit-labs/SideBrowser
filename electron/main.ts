import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { ElectronBlocker, fullLists } from '@ghostery/adblocker-electron';
import { Store } from 'electron-datastore';

// Identity Lockdown at Process Start
app.name = 'Side Browser';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.ismail.sidebrowser');
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let tray: Tray | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

let store: any;

let blocker: ElectronBlocker | null = null;
async function setupAdblocker() {
  try {
    blocker = await ElectronBlocker.fromLists(fetch, fullLists);
  } catch (error) {
    console.error('Failed to load adblocker lists:', error);
  }
}

// ═══════════════════════════════════════════════════
// V16: robotjs - Same approach as original Slide Browser
// ═══════════════════════════════════════════════════

let robot: any = null;

function loadRobotjs() {
  try {
    robot = require('robotjs');
  } catch (e) {
    console.warn('robotjs not available, focus acquisition may not work:', e);
    // Fallback: try dynamic import
    import('robotjs').then((mod) => {
      robot = mod.default || mod;
    }).catch(() => {
      console.error('robotjs completely unavailable');
    });
  }
}

// Exact replica of original app's YB() function
function focusClick(edge: 'left' | 'right') {
  if (!robot) return;
  try {
    const pos = robot.getMousePos();
    const targetX = edge === 'left' ? pos.x + 20 : pos.x - 20;
    robot.moveMouseSmooth(targetX, pos.y);
    robot.mouseClick();
  } catch (e) {
    console.error('focusClick failed:', e);
  }
}

// ═══════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════

let currentSnapSide: 'left' | 'right' | null = null;
let edgeCheckInterval: NodeJS.Timeout | null = null;
let isPinned = false;
let isAutoSnap = true;
let isWindowOpen = false;

// ═══════════════════════════════════════════════════
// Edge Detection (ONLY for opening)
// ═══════════════════════════════════════════════════

function startEdgeCheck() {
  if (!edgeCheckInterval) {
    edgeCheckInterval = setInterval(() => {
      if (!win || isWindowOpen || !currentSnapSide) return;
      
      const point = screen.getCursorScreenPoint();
      const bounds = win.getBounds();
      const winDisplay = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const mouseDisplay = screen.getDisplayNearestPoint(point);
      
      // ONLY trigger if the mouse is on the SAME display as the window
      if (winDisplay.id !== mouseDisplay.id) return;

      const workArea = mouseDisplay.workArea;

      if (
        (currentSnapSide === 'left' && point.x <= workArea.x + 1) ||
        (currentSnapSide === 'right' && point.x >= workArea.x + workArea.width - 2)
      ) {
        triggerFocus();
      }
    }, 50);
  }
}

// ═══════════════════════════════════════════════════
// Panel Open / Close
// ═══════════════════════════════════════════════════

function triggerFocus() {
  if (!win) return;
  win.setIgnoreMouseEvents(false);
  isWindowOpen = true;

  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');

  // V16: After 300ms, use robotjs to physically click INTO the window
  // This is the EXACT same pattern the original Slide Browser uses
  if (process.platform === 'win32') {
    setTimeout(() => {
      if (win && !win.isDestroyed() && isWindowOpen) {
        focusClick(currentSnapSide || 'right');
      }
    }, 300);
  } else {
    app.focus({ steal: true });
    win.focus();
  }

  // Settle to normal top level
  setTimeout(() => {
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(true, 'pop-up-menu');
    }
  }, 100);

  startEdgeCheck();
}

function retractWindow() {
  if (!win || !isWindowOpen) return;
  if (!isAutoSnap) return;
  if (isPinned) return;

  const bounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const workArea = display.workArea;

  const distLeft = bounds.x - workArea.x;
  const distRight = (workArea.x + workArea.width) - (bounds.x + bounds.width);

  let side: 'left' | 'right' = 'right';
  if (distLeft < distRight) {
    side = 'left';
    win.setBounds({ x: workArea.x, y: bounds.y, width: bounds.width, height: bounds.height });
  } else {
    side = 'right';
    win.setBounds({ x: workArea.x + workArea.width - bounds.width, y: bounds.y, width: bounds.width, height: bounds.height });
  }

  currentSnapSide = side;
  win.setAlwaysOnTop(true, 'floating');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.send('window-blur', side);
  isWindowOpen = false;

  startEdgeCheck();
}

// ═══════════════════════════════════════════════════
// Main Window
// ═══════════════════════════════════════════════════

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  const initialWidth = store.get('window-width') || 600;

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
    width: initialWidth,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    title: 'Side Browser',
    frame: false,
    resizable: true,
    titleBarStyle: 'hidden',
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.setBounds({
    x: workArea.x + workArea.width - initialWidth,
    y: workArea.y + Math.floor((workArea.height - 600) / 2),
    width: initialWidth,
    height: 600
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'));
  }

  win.on('moved', () => {
    if (!win) return;
    if (isAutoSnap) {
      const bounds = win.getBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const workArea = display.workArea;

      const distLeft = bounds.x - workArea.x;
      const distRight = (workArea.x + workArea.width) - (bounds.x + bounds.width);

      if (distLeft < distRight) {
        win.setBounds({ x: workArea.x, y: bounds.y, width: bounds.width, height: bounds.height });
        currentSnapSide = 'left';
      } else {
        win.setBounds({ x: workArea.x + workArea.width - bounds.width, y: bounds.y, width: bounds.width, height: bounds.height });
        currentSnapSide = 'right';
      }
    }
  });

  // V16: Native blur handles closing - robotjs gives us REAL focus,
  // so blur fires naturally when user clicks elsewhere
  win.on('blur', () => {
    if (!win) return;
    retractWindow();
  });

  win.on('focus', () => {
    if (!win) return;
    isWindowOpen = true;
    win.setIgnoreMouseEvents(false);
    win.moveTop();
    win.setAlwaysOnTop(true, 'pop-up-menu');
    win.webContents.send('window-focus');
  });

  ipcMain.on('window-mouse-enter', () => {
    if (win && !win.isFocused()) {
      triggerFocus();
    }
  });
}

// ═══════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.whenReady().then(async () => {
  // Load robotjs early
  loadRobotjs();

  store = new Store({
    name: 'slide-browser-preferences',
    template: {
      transparency: 0.8,
      adblockEnabled: true,
      'window-width': 600,
      themeColor: 'Default',
      darkMode: 'System',
      language: 'English',
      addressBar: 'Hidden',
      autoLaunch: false,
      translateEnabled: false,
      passwordManagerEnabled: false,
      alwaysOnTop: true,
      autoCenter: true,
      defaultSnapSide: 'Right',
      autoUpdate: true
    }
  } as any);

  // Initialize defaults if missing
  const defaults = {
    transparency: 0.8,
    adblockEnabled: true,
    'window-width': 600,
    themeColor: 'Default',
    darkMode: 'System',
    language: 'English',
    addressBar: 'Hidden',
    autoLaunch: false,
    translateEnabled: false,
    passwordManagerEnabled: false,
    alwaysOnTop: true,
    autoCenter: true,
    defaultSnapSide: 'Right',
    autoUpdate: true
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (store.get(key) === undefined) {
      store.set(key, value);
    }
  });

  // Apply initial global states
  if (store.get('alwaysOnTop') && win) win.setAlwaysOnTop(true, 'screen-saver');
  if (store.get('autoLaunch')) {
     app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
  }

  await setupAdblocker();
  
  try {
    const iconPath = path.join(process.env.VITE_PUBLIC || '', 'favicon.ico');
    const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Side Browser', click: () => { win?.show(); win?.focus(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('Side Browser');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { win?.show(); win?.focus(); });
  } catch (err) {
    console.warn("Failed to create Tray icon:", err);
  }

  createWindow();
  startEdgeCheck();

  if (store.get('adblockEnabled')) {
    blocker?.enableBlockingInSession(session.defaultSession);
  }
});

// ═══════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════

ipcMain.handle('get-preload-path', () => path.join(__dirname, 'webview-preload.js'));
ipcMain.handle('get-store-val', (_event, key) => store ? store.get(key) : undefined);
ipcMain.on('set-store-val', (_event, key, val) => {
  if (store) store.set(key, val);
  if (key === 'transparency' && win) {
    win.setOpacity(val);
  }
  if (key === 'adblockEnabled') {
    if (val) blocker?.enableBlockingInSession(session.defaultSession);
    else blocker?.disableBlockingInSession(session.defaultSession);
  }
});
ipcMain.on('hide-window', () => {
    if (win) {
       isPinned = false;
       win.blur();
       win.webContents.send('window-blur', currentSnapSide || 'right');
       startEdgeCheck();
    }
});
ipcMain.on('set-auto-hide', (_event, enabled) => {
  isPinned = enabled;
});
ipcMain.on('set-auto-snap', (_event, enabled) => {
  isAutoSnap = enabled;
  if (enabled && win) {
    win.emit('moved'); 
  }
});

ipcMain.on('window-resize', (_event, { deltaX, deltaY }) => {
  if (!win) return;
  const bounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const workArea = display.workArea;

  let newWidth = bounds.width;
  let newHeight = bounds.height;
  let newX = bounds.x;
  let newY = bounds.y;

  // Horizontal Resize
  if (currentSnapSide === 'right') {
    newWidth = bounds.width - deltaX;
    newX = workArea.x + workArea.width - newWidth;
  } else if (currentSnapSide === 'left') {
    newWidth = bounds.width + deltaX;
    newX = workArea.x;
  }

  // Vertical Resize (Always from bottom/corners, keeping top fixed)
  newHeight = bounds.height + deltaY;

  // Enforce mins
  newWidth = Math.max(300, Math.min(newWidth, workArea.width - 50));
  newHeight = Math.max(300, Math.min(newHeight, workArea.height - 50));

  // Recalculate X if right-snapped to ensure it stays pinned
  if (currentSnapSide === 'right') {
    newX = workArea.x + workArea.width - newWidth;
  }

  win.setBounds({
    x: Math.round(newX),
    y: Math.round(newY),
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  });

  store.set('window-width', newWidth);
});

// Settings Handlers
ipcMain.on('set-auto-launch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe'),
  });
  if (store) store.set('autoLaunch', enabled);
});

ipcMain.on('set-always-on-top', (_event, enabled: boolean) => {
  if (win) {
    win.setAlwaysOnTop(enabled, 'screen-saver');
  }
  if (store) store.set('alwaysOnTop', enabled);
});
