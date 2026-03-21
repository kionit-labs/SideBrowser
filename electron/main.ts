import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage, shell, globalShortcut } from 'electron';
import type { WebContents } from 'electron';
import path from 'path';
import fs from 'fs';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { Store } from 'electron-datastore';
import { autoUpdater } from 'electron-updater';
// Identity Lockdown at Process Start
app.name = 'SideBrowser';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kionitlabs.sidebrowser');
}

// Increase global event listener limit to prevent MaxListenersExceededWarning
process.setMaxListeners(100);

// Handle unhandled promises and exceptions to prevent Terminal clutter and crashes
process.on('unhandledRejection', (reason: any) => {
    const msg = reason?.message || (typeof reason === 'string' ? reason : '');
    // Suppress "Script failed to execute" which is a common noise in WebViews with strict CSP
    if (msg.includes('Script failed to execute')) return;
    console.error('Unhandled Rejection reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Optimization Switches for High-Performance Media & Stability
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Removed AutomationControlled and enable-automation flags as they are often detected by Google
// Removed global userAgentFallback to match Slide Browser's clean session-only approach

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWin = Array.from(windowManager.values())[0]?.win;
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  });
}

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let tray: Tray | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

let store: any;
let passwordsStore: any;

let blocker: ElectronBlocker | null = null;
async function setupAdblocker() {
  try {
    // Use pre-baked filters for faster startup and more reliable YouTube blocking
    blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    console.log('Adblocker initialized with pre-built filters');
  } catch (error) {
    console.error('Failed to initialize adblocker:', error);
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
// State: Multi-window Management
// ═══════════════════════════════════════════════════

interface WindowState {
  win: BrowserWindow;
  currentSnapSide: 'left' | 'right';
  isPinned: boolean;
  isAutoSnap: boolean;
  isWindowOpen: boolean;
}

const windowManager = new Map<number, WindowState>();
let edgeCheckInterval: NodeJS.Timeout | null = null;

function getWindowState(webContents: WebContents): WindowState | undefined {
  const win = BrowserWindow.fromWebContents(webContents);
  if (!win) return undefined;
  return windowManager.get(win.id);
}

function getFocusedWindowState(): WindowState | undefined {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return undefined;
  return windowManager.get(win.id);
}

// ═══════════════════════════════════════════════════
// Edge Detection (ONLY for opening)
// ═══════════════════════════════════════════════════

function startEdgeCheck() {
  if (!edgeCheckInterval) {
    edgeCheckInterval = setInterval(() => {
      const point = screen.getCursorScreenPoint();
      
      windowManager.forEach((state) => {
        const { win, isWindowOpen, currentSnapSide } = state;
        if (win.isDestroyed() || isWindowOpen || !currentSnapSide) return;
        
        const bounds = win.getBounds();
        const winDisplay = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
        const mouseDisplay = screen.getDisplayNearestPoint(point);
        
        if (winDisplay.id !== mouseDisplay.id) return;

        const workArea = mouseDisplay.workArea;

        if (
          (currentSnapSide === 'left' && point.x <= workArea.x + 1) ||
          (currentSnapSide === 'right' && point.x >= workArea.x + workArea.width - 2)
        ) {
          triggerFocus(state);
        }
      });
    }, 50);
  }
}

// ═══════════════════════════════════════════════════
// Global Shortcuts
// ═══════════════════════════════════════════════════

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  const shortcutShowHide = store.get('shortcutShowHide');
  const shortcutAutoHide = store.get('shortcutAutoHide');

  if (shortcutShowHide) {
    try {
      const success = globalShortcut.register(shortcutShowHide, () => {
        const state = getFocusedWindowState();
        if (!state) {
          // If no window focused, maybe show the first one?
          const first = Array.from(windowManager.values())[0];
          if (first) triggerFocus(first);
          return;
        }

        if (state.isWindowOpen && state.win.isFocused()) {
          retractWindow(state);
        } else {
          triggerFocus(state);
        }
      });
      if (!success) console.warn('Failed to register show/hide shortcut:', shortcutShowHide);
    } catch (e) {
      console.error('Error registering show/hide shortcut:', e);
    }
  }

  if (shortcutAutoHide) {
    try {
      const success = globalShortcut.register(shortcutAutoHide, () => {
        const state = getFocusedWindowState();
        if (state) {
          state.isPinned = !state.isPinned;
          state.win.webContents.send('auto-hide-toggled', state.isPinned);
        }
      });
      if (!success) console.warn('Failed to register auto-hide shortcut:', shortcutAutoHide);
    } catch (e) {
      console.error('Error registering auto-hide shortcut:', e);
    }
  }
}

// ═══════════════════════════════════════════════════
// In-window Shortcuts
// ═══════════════════════════════════════════════════

function setupShortcutHandlers(webContents: WebContents) {
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const control = process.platform === 'darwin' ? input.meta : input.control;
    const shift = input.shift;

    if (control) {
      const state = getWindowState(webContents);
      const win = state?.win;

      // Tab management
      if (input.key === 'Tab') {
        win?.webContents.send('window-shortcut', shift ? 'prev-tab' : 'next-tab');
        event.preventDefault();
      } else if (input.key >= '1' && input.key <= '9') {
        win?.webContents.send('window-shortcut', 'switch-tab', parseInt(input.key) - 1);
        event.preventDefault();
      }
      
      // Standard Browser actions
      switch (input.key.toLowerCase()) {
        case 'n':
          createWindow(true); // Open new browser window as secondary
          event.preventDefault();
          break;
        case 't':
          win?.webContents.send('window-shortcut', 'home');
          event.preventDefault();
          break;
        case 'w':
          win?.webContents.send('window-shortcut', 'close-tab');
          event.preventDefault();
          break;
        case 'b':
          win?.webContents.send('window-shortcut', 'toggle-sidebar');
          event.preventDefault();
          break;
        case 'r':
          win?.webContents.send('window-shortcut', 'reload');
          event.preventDefault();
          break;
        case 'm':
          win?.webContents.send('window-shortcut', 'toggle-mute');
          event.preventDefault();
          break;
        case ',':
          win?.webContents.send('window-shortcut', 'open-settings');
          event.preventDefault();
          break;
        case 'd':
          win?.webContents.send('window-shortcut', 'add-favorite');
          event.preventDefault();
          break;
        case '=': 
        case '+':
          win?.webContents.send('window-shortcut', 'zoom-in');
          event.preventDefault();
          break;
        case '-':
          win?.webContents.send('window-shortcut', 'zoom-out');
          event.preventDefault();
          break;
        case '0':
          win?.webContents.send('window-shortcut', 'zoom-reset');
          event.preventDefault();
          break;
        case 'arrowleft':
          win?.webContents.send('window-shortcut', 'go-back');
          event.preventDefault();
          break;
        case 'arrowright':
          win?.webContents.send('window-shortcut', 'go-forward');
          event.preventDefault();
          break;
        case 'i':
          if (shift) {
            win?.webContents.send('window-shortcut', 'devtools');
            event.preventDefault();
          }
          break;
      }
    } else {
      // F-Keys
      if (input.key === 'F5') {
        getWindowState(webContents)?.win.webContents.send('window-shortcut', 'reload');
        event.preventDefault();
      } else if (input.key === 'F12') {
        getWindowState(webContents)?.win.webContents.send('window-shortcut', 'devtools');
        event.preventDefault();
      }
    }
  });
}


function triggerFocus(state: WindowState) {
  const { win, currentSnapSide } = state;
  if (win.isDestroyed()) return;
  
  win.setIgnoreMouseEvents(false);
  state.isWindowOpen = true;

  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');

  if (process.platform === 'win32') {
    setTimeout(() => {
      if (!win.isDestroyed() && state.isWindowOpen) {
        focusClick(currentSnapSide);
      }
    }, 300);
  } else {
    app.focus({ steal: true });
    win.focus();
  }

  setTimeout(() => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(true, 'pop-up-menu');
    }
  }, 100);

  startEdgeCheck();
}

function retractWindow(state: WindowState) {
  const { win, isWindowOpen, isAutoSnap, isPinned } = state;
  if (win.isDestroyed() || !isWindowOpen) return;
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

  state.currentSnapSide = side;
  win.setAlwaysOnTop(true, 'floating');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.send('window-blur', side);
  state.isWindowOpen = false;

  startEdgeCheck();
}

// ═══════════════════════════════════════════════════
// Main Window
// ═══════════════════════════════════════════════════

function createWindow(isSecondary = false) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  const initialWidth = store.get('window-width') || 600;
  const lastSnapSide = store.get('defaultSnapSide') || 'right';
  const currentSnapSide = (lastSnapSide.toLowerCase() as 'left' | 'right') || 'right';

  const win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
    width: initialWidth,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    title: 'SideBrowser',
    frame: false,
    resizable: true,
    titleBarStyle: 'hidden',
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const state: WindowState = {
    win,
    currentSnapSide,
    isWindowOpen: false,
    isPinned: false,
    isAutoSnap: true
  };

  windowManager.set(win.id, state);

  win.webContents.setMaxListeners(100);

  win.webContents.on('did-attach-webview', (_event, webContents) => {
     webContents.setMaxListeners(100);
     setupShortcutHandlers(webContents);
  });

  setupShortcutHandlers(win.webContents);

  const queryParams = isSecondary ? '?isSecondary=true' : '';
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + queryParams);
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'), { query: isSecondary ? { isSecondary: 'true' } : {} });
  }

  const savedOpacity = store.get('transparency') ?? 0.95;
  win.setOpacity(savedOpacity);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const initialX = currentSnapSide === 'left' 
    ? workArea.x 
    : workArea.x + workArea.width - initialWidth;

  const autoCenter = store.get('autoCenter') ?? false;
  const initialY = autoCenter 
    ? workArea.y + Math.floor((workArea.height - 600) / 2)
    : store.get('window-y') ?? (workArea.y + Math.floor((workArea.height - 600) / 2));

  win.setBounds({ x: initialX, y: initialY, width: initialWidth, height: 600 });

  win.on('moved', () => {
    if (win.isDestroyed()) return;
    if (state.isAutoSnap) {
      const bounds = win.getBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const workArea = display.workArea;

      const distLeft = bounds.x - workArea.x;
      const distRight = (workArea.x + workArea.width) - (bounds.x + bounds.width);

      let newX = bounds.x;
      let newY = bounds.y;

      if (distLeft < distRight) {
        newX = workArea.x;
        state.currentSnapSide = 'left';
      } else {
        newX = workArea.x + workArea.width - bounds.width;
        state.currentSnapSide = 'right';
      }
      
      if (store.get('autoCenter')) {
        newY = workArea.y + Math.floor((workArea.height - bounds.height) / 2);
      } else if (!isSecondary) {
        store.set('window-y', bounds.y);
      }

      win.setBounds({ x: Math.round(newX), y: Math.round(newY), width: bounds.width, height: bounds.height });
      if (!isSecondary) store.set('defaultSnapSide', state.currentSnapSide);
    }
  });

  win.on('blur', () => {
    if (win.isDestroyed()) return;
    retractWindow(state);
  });

  win.on('focus', () => {
    if (win.isDestroyed()) return;
    state.isWindowOpen = true;
    win.setIgnoreMouseEvents(false);
    win.moveTop();
    win.setAlwaysOnTop(true, 'pop-up-menu');
    win.webContents.send('window-focus');
  });

  win.on('closed', () => {
    windowManager.delete(win.id);
  });

  ipcMain.on('window-mouse-enter', (event) => {
    const state = getWindowState(event.sender);
    if (state && !state.win.isFocused()) {
      triggerFocus(state);
    }
  });
}

// ═══════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (blocker) {
      blocker.disableBlockingInSession(session.defaultSession);
    }
    app.quit();
  }
});

app.whenReady().then(async () => {
  // Load robotjs early
  loadRobotjs();

  store = new Store({
    name: 'slide-browser-preferences',
    template: {
      transparency: 0.95,
      adblockEnabled: true,
      'window-width': 600,
      themeColor: 'Default',
      darkMode: 'System',
      language: 'English',
      addressBar: 'Hidden',
      autoLaunch: false,
      translateEnabled: false,
      passwordManagerDuration: 0,
      passwordManagerEnabled: false,
      alwaysOnTop: true,
      autoCenter: false,
      defaultSnapSide: 'right',
      autoUpdate: true
    }
  } as any);
  
  passwordsStore = new Store({
    name: 'side-browser-passwords',
    template: {
      passwords: []
    }
  } as any);

  // Force autoCenter to false if not previously migrated to this version
  if (store.get('autoCenterFixed') === undefined) {
    store.set('autoCenter', false);
    store.set('autoCenterFixed', true);
  }

  // Initialize defaults if missing
  const defaults = {
    transparency: 0.95,
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
    autoCenter: false,
    defaultSnapSide: 'right',
    autoUpdate: true
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (store.get(key) === undefined) {
      store.set(key, value);
    }
  });

  // Migration: Replace ChatGPT with Gemini in existing shortcuts
  const currentShortcuts = store.get('shortcuts') || [];
  const migratedShortcuts = currentShortcuts.map((s: any) => {
    if (s.name === 'ChatGPT' || (s.url && s.url.includes('chat.openai.com'))) {
      return { ...s, name: 'Gemini', url: 'https://gemini.google.com' };
    }
    return s;
  });
  if (JSON.stringify(currentShortcuts) !== JSON.stringify(migratedShortcuts)) {
    store.set('shortcuts', migratedShortcuts);
    console.log('Migrated shortcuts: ChatGPT -> Gemini');
  }

  // Apply initial global states
  const firstState = Array.from(windowManager.values())[0];
  if (store.get('alwaysOnTop') && firstState && !firstState.win.isDestroyed()) {
    firstState.win.setAlwaysOnTop(true, 'screen-saver');
  }
  if (store.get('autoLaunch')) {
     app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: app.isPackaged ? [] : [app.getAppPath()]
    });
  }

  await setupAdblocker();
  
  try {
    const iconPath = path.join(process.env.VITE_PUBLIC || '', 'tray-icon.png');
    const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Show Side Browser', 
        click: () => { 
          const firstState = Array.from(windowManager.values())[0];
          if (firstState && !firstState.win.isDestroyed()) {
            firstState.win.show();
            firstState.win.focus();
          }
        } 
      },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('SideBrowser');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { 
      const firstState = Array.from(windowManager.values())[0];
      if (firstState && !firstState.win.isDestroyed()) { 
        firstState.win.show(); 
        firstState.win.focus(); 
      }
    });
  } catch (err) {
    console.warn("Failed to create Tray icon:", err);
  }

  createWindow();
  startEdgeCheck();
  registerGlobalShortcuts();

  // ═══════════════════════════════════════════════════
  // Auto Updater
  // ═══════════════════════════════════════════════════
  if (store.get('autoUpdate') !== false) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Failed to check for updates:', err);
    });
  }

  // ═══════════════════════════════════════════════════
  // Attempt 4: The Slide Browser Secret Session Configuration
  // ═══════════════════════════════════════════════════
  const ses = session.defaultSession;
  const targetChromeVersion = '134.0.0.0';
  const cleanUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${targetChromeVersion} Safari/537.36`;
  
  ses.setUserAgent(cleanUA);

  // Strip Electron/App tokens and apply Google-specific UA hacks
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;
    let ua = requestHeaders['User-Agent'] || cleanUA;
    
    // Slide Browser Hack: Replace ENTIRELY if it contains Electron
    if (ua.includes('Electron')) {
      ua = cleanUA;
    }

    // Slide Browser Hack: Prepend "Chrome " for Google Login
    if (details.url.includes('https://accounts.google.com/')) {
       ua = 'Chrome ' + ua;
    }
    
    requestHeaders['User-Agent'] = ua;

    // Clean Client Hints (sec-ch-ua)
    if (requestHeaders['sec-ch-ua']) {
      requestHeaders['sec-ch-ua'] = `"Not(A:Brand";v="99", "Google Chrome";v="134", "Chromium";v="134"`;
    }
    if (requestHeaders['sec-ch-ua-platform']) {
      requestHeaders['sec-ch-ua-platform'] = '"Windows"';
    }

    // Slide Browser Hack: Delete Referer for certain redirects if needed
    if (details.url.includes('googlepopupredirect')) {
        delete requestHeaders['Referer'];
    }

    callback({ requestHeaders });
  });

  // Slide Browser Hack: Strip security headers from HTML pages to prevent environment detection checks
  ses.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;
    const contentType = responseHeaders?.['content-type']?.[0] || '';
    
    if (contentType.includes('text/html')) {
        const headersToStrip = [
            'Content-Security-Policy',
            'content-security-policy',
            'X-Frame-Options',
            'x-frame-options',
            'cross-origin-resource-policy',
            'Cross-Origin-Resource-Policy'
        ];
        headersToStrip.forEach(h => {
           if (responseHeaders) delete responseHeaders[h];
        });
    }

    callback({ responseHeaders });
  });

  if (typeof (ses as any).registerPreloadScript !== 'function' && typeof (ses as any).setPreloads === 'function') {
    (ses as any).registerPreloadScript = (config: any) => {
      try {
        const filePath = typeof config === 'string' ? config : (config.filePath || config.scriptPath);
        if (!filePath) return;
        
        const current = (ses as any).getPreloads() || [];
        if (!current.includes(filePath)) {
          (ses as any).setPreloads([...current, filePath]);
        }
      } catch (e) {
        console.error('Failed to polyfill registerPreloadScript:', e);
      }
    };
  }

  if (store.get('adblockEnabled')) {
    if (blocker) {
      try {
        blocker.enableBlockingInSession(ses);
      } catch (e) {
        console.warn('Adblocker: Failed to enable blocking in session:', e);
      }
    }
  }
});

// ═══════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════

ipcMain.on('clear-passwords', () => {
    if (passwordsStore) passwordsStore.set('passwords', []);
});

ipcMain.on('hide-window', (event) => {
  const state = getWindowState(event.sender);
  if (state) {
    state.isPinned = false;
    state.win.blur();
    state.win.webContents.send('window-blur', state.currentSnapSide);
    startEdgeCheck();
  }
});
ipcMain.on('set-auto-hide', (event, enabled) => {
  const state = getWindowState(event.sender);
  if (state) state.isPinned = enabled;
});

// Updates Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.on('check-for-updates', (event) => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      event.sender.send('update-message', 'Error checking for updates', true);
    });
  } else {
    event.sender.send('update-message', 'Updates disabled in dev mode', true);
  }
});
function broadcastUpdateMessage(msg: string, isError: boolean) {
  windowManager.forEach(state => {
    state.win.webContents.send('update-message', msg, isError);
  });
}

ipcMain.on('open-external', (_event, url) => {
  shell.openExternal(url);
});

// AutoUpdater events routing
autoUpdater.on('checking-for-update', () => broadcastUpdateMessage('Checking for updates...', false));
autoUpdater.on('update-available', (info) => broadcastUpdateMessage(`Update v${info.version} available! Downloading...`, false));
autoUpdater.on('update-not-available', () => broadcastUpdateMessage('You are up to date', false));
autoUpdater.on('error', (err) => broadcastUpdateMessage('Error: ' + err.message, true));
autoUpdater.on('download-progress', (p) => broadcastUpdateMessage(`Downloading: ${Math.round(p.percent)}%`, false));
autoUpdater.on('update-downloaded', () => broadcastUpdateMessage('Update downloaded. Restart to install.', false));

ipcMain.on('set-auto-snap', (event, enabled) => {
  const state = getWindowState(event.sender);
  if (state) {
    state.isAutoSnap = enabled;
    if (enabled) {
      state.win.emit('moved'); 
    }
  }
});

ipcMain.on('window-resize', (event, { deltaX, deltaY }) => {
  const state = getWindowState(event.sender);
  if (!state || state.win.isDestroyed()) return;

  const { win, currentSnapSide } = state;
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

  // Vertical Resize
  newHeight = bounds.height + deltaY;
  
  // Apply Auto-Center if enabled
  if (store.get('autoCenter')) {
    newY = workArea.y + Math.floor((workArea.height - newHeight) / 2);
  }

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
  if (!store.get('autoCenter')) {
    store.set('window-y', newY);
  }
});

function centerWindowVertically(targetWin: BrowserWindow) {
  const bounds = targetWin.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const workArea = display.workArea;
  const newY = workArea.y + Math.floor((workArea.height - bounds.height) / 2);
  targetWin.setBounds({ x: bounds.x, y: newY, width: bounds.width, height: bounds.height });
}

ipcMain.on('set-auto-center', (_event, enabled: boolean) => {
  store.set('autoCenter', enabled);
  if (enabled) {
    windowManager.forEach(state => centerWindowVertically(state.win));
  }
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// Settings Handlers
ipcMain.on('set-auto-launch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe'),
    args: app.isPackaged ? [] : [app.getAppPath()]
  });
  if (store) store.set('autoLaunch', enabled);
});

ipcMain.on('set-always-on-top', (_event, enabled: boolean) => {
  windowManager.forEach(state => {
    state.win.setAlwaysOnTop(enabled, 'screen-saver');
  });
  if (store) store.set('alwaysOnTop', enabled);
});

ipcMain.handle('get-store-value', (_event, key) => {
  return store?.get(key);
});

ipcMain.on('set-store-value', (_event, key, value) => {
  if (store) {
    store.set(key, value);
    if (key === 'transparency') {
      windowManager.forEach(state => state.win.setOpacity(value));
    }
    if (key === 'shortcutShowHide' || key === 'shortcutAutoHide') {
      registerGlobalShortcuts();
    }
    if (key === 'adblockEnabled') {
      const ses = session.defaultSession;
      if (value && blocker) {
        blocker.enableBlockingInSession(ses);
      } else {
        blocker?.disableBlockingInSession(ses);
      }
    }
  }
});

ipcMain.handle('get-preload-path', () => path.join(__dirname, 'webview-preload.js'));

ipcMain.handle('get-passwords', () => {
  return passwordsStore?.get('passwords') || [];
});

ipcMain.on('save-passwords', (_event, passwords) => {
  if (passwordsStore) passwordsStore.set('passwords', passwords);
});
