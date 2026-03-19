import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage, shell } from 'electron';
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
  const lastSnapSide = store.get('defaultSnapSide') || 'right';
  currentSnapSide = lastSnapSide.toLowerCase() as 'left' | 'right';

  win = new BrowserWindow({
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

  // Set listener limit specifically for WebContents to prevent did-stop-loading warnings
  win.webContents.setMaxListeners(100);

  // Apply high listener limits to EVERY webview that attaches
  win.webContents.on('did-attach-webview', (_event, webContents) => {
     webContents.setMaxListeners(100);
  });

  // Attempt 4: Handle OAuth Popups (Matching Slide Browser's SECRET)
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        const oauthDomains = [
            "https://accounts.google.com", 
            "googlepopupredirect", 
            "https://appleid.apple.com/auth/authorize",
            "https://login.microsoftonline.com/",
            "https://login.live.com/oauth20_authorize"
        ];
        
        if (oauthDomains.some(d => url.includes(d))) {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              width: 800,
              height: 600,
              alwaysOnTop: true,
              autoHideMenuBar: true,
              webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true
              }
            }
          };
        }
        return { action: 'deny' };
      });
    }
  });

  // Sync initial opacity from store
  const savedOpacity = store.get('transparency') ?? 0.95;
  win.setOpacity(savedOpacity);

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Position window based on last snap side
  const initialX = currentSnapSide === 'left' 
    ? workArea.x 
    : workArea.x + workArea.width - initialWidth;

  win.setBounds({
    x: initialX,
    y: workArea.y + Math.floor((workArea.height - 600) / 2),
    width: initialWidth,
    height: 600
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'));
  }

  win.once('ready-to-show', () => {
    if (win) {
      const savedOpacity = store.get('transparency') ?? 0.95;
      win.setOpacity(savedOpacity);
    }
  });

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
      
      // Persist the new snap side
      store.set('defaultSnapSide', currentSnapSide);
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
    if (blocker) {
      blocker.disableBlockingInSession(session.defaultSession);
    }
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
      autoCenter: true,
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
    autoCenter: true,
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
  if (store.get('alwaysOnTop') && win) win.setAlwaysOnTop(true, 'screen-saver');
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
      { label: 'Show Side Browser', click: () => { win?.show(); win?.focus(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('SideBrowser');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { win?.show(); win?.focus(); });
  } catch (err) {
    console.warn("Failed to create Tray icon:", err);
  }

  createWindow();
  startEdgeCheck();

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

ipcMain.handle('get-preload-path', () => path.join(__dirname, 'webview-preload.js'));
ipcMain.handle('get-store-val', (_event, key) => store ? store.get(key) : undefined);
ipcMain.on('set-store-val', (_event, key, val) => {
  if (store) store.set(key, val);
  if (key === 'transparency' && win) {
    win.setOpacity(val);
  }
  if (key === 'adblockEnabled') {
    const ses = session.defaultSession;
    if (val && blocker) {
      blocker.enableBlockingInSession(ses);
    } else {
      blocker?.disableBlockingInSession(ses);
    }
  }
});

// Passwords IPC (storage only, no auto-fill)
ipcMain.handle('get-passwords', () => passwordsStore?.get('passwords') || []);

ipcMain.on('save-passwords', (_event, passwords) => {
  passwordsStore?.set('passwords', passwords);
});
ipcMain.on('clear-passwords', () => {
    passwordsStore?.set('passwords', []);
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

// Updates Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      win?.webContents.send('update-message', 'Error checking for updates', true);
    });
  } else {
    win?.webContents.send('update-message', 'Updates disabled in dev mode', true);
  }
});
ipcMain.on('open-external', (_event, url) => {
  shell.openExternal(url);
});

// AutoUpdater events routing to renderer
autoUpdater.on('checking-for-update', () => {
  win?.webContents.send('update-message', 'Checking for updates...', false);
});
autoUpdater.on('update-available', (info) => {
  win?.webContents.send('update-message', `Update v${info.version} available! Downloading...`, false);
});
autoUpdater.on('update-not-available', () => {
  win?.webContents.send('update-message', 'You are up to date', false);
});
autoUpdater.on('error', (err) => {
  win?.webContents.send('update-message', 'Error: ' + err.message, true);
});
autoUpdater.on('download-progress', (progressObj) => {
  win?.webContents.send('update-message', `Downloading: ${Math.round(progressObj.percent)}%`, false);
});
autoUpdater.on('update-downloaded', () => {
  win?.webContents.send('update-message', 'Update downloaded. Restart to install.', false);
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
    args: app.isPackaged ? [] : [app.getAppPath()]
  });
  if (store) store.set('autoLaunch', enabled);
});

ipcMain.on('set-always-on-top', (_event, enabled: boolean) => {
  if (win) {
    win.setAlwaysOnTop(enabled, 'screen-saver');
  }
  if (store) store.set('alwaysOnTop', enabled);
});
