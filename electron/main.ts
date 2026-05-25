import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage, shell, globalShortcut, dialog, desktopCapturer } from 'electron';
import type { WebContents, Session } from 'electron';
import { Store } from 'electron-datastore';
import { Ollama } from 'ollama';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
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
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Removed AutomationControlled and enable-automation flags as they are often detected by Google

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const firstState = Array.from(windowManager.values())[0];
    if (firstState) {
      if (firstState.win.isMinimized()) firstState.win.restore();
      triggerFocus(firstState);
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
    const enginePath = path.join(app.getPath('userData'), 'adblocker-engine.bin');
    blocker = await ElectronBlocker.fromLists(fetch, [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt',
      'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
      'https://secure.fanboy.co.nz/fanboy-annoyance.txt'
    ], {
      enableCompression: true
    }, {
      path: enginePath,
      read: async (...args) => fs.readFileSync(...args),
      write: async (...args) => fs.writeFileSync(...args)
    });
    console.log('Adblocker initialized with LATEST dynamic filters from the web');
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

  // Explicitly trigger expansion in the renderer
  win.webContents.send('window-focus');

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
  state.isWindowOpen = false;

  win.setAlwaysOnTop(true, 'floating');
  win.setIgnoreMouseEvents(true, { forward: true });

  win.webContents.send('window-blur', side);

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
    isWindowOpen: true, // Window starts shown
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
      if (!isSecondary) {
         const oldSnapSide = store.get('defaultSnapSide');
         store.set('defaultSnapSide', state.currentSnapSide);
         if (oldSnapSide !== state.currentSnapSide) {
             win.webContents.send('snap-side-changed', state.currentSnapSide);
         }
      }
    }
  });

  win.on('blur', () => {
    if (win.isDestroyed()) return;
    retractWindow(state);
  });

  win.on('focus', () => {
    if (win.isDestroyed()) return;
    // When window gets focus, ensure it's on top and interactive IF it's supposed to be open
    if (state.isWindowOpen) {
      win.setIgnoreMouseEvents(false);
      win.moveTop();
      win.setAlwaysOnTop(true, 'pop-up-menu');
      win.webContents.send('window-focus');
    }
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
  
  // Get the engine's real User-Agent and strip Electron/SideBrowser strings.
  // This ensures that the User-Agent version ALWAYS matches the native Client Hints (sec-ch-ua).
  // This is the definitive fix for Gemini "Error 13" bot detection.
  const nativeUA = session.defaultSession.getUserAgent();
  const cleanNativeUA = nativeUA.replace(/\s*(SideBrowser|Electron)\/[\d.]+/g, '').trim();
  const cleanLoginUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36`;
  
  app.userAgentFallback = cleanNativeUA;

  const applySessionHacks = (ses: Session, enableAdblock: boolean) => {
    ses.setUserAgent(cleanNativeUA, 'en-US,en;q=0.9');
    // Slide Browser Hack: Google Login Security Fix
    // We use a FILTER so these listeners NEVER execute for Gemini or ChatGPT, ensuring 100% native performance.
    ses.webRequest.onBeforeSendHeaders({ urls: ['https://accounts.google.com/*'] }, (details: any, callback: any) => {
      const { requestHeaders } = details;
      requestHeaders['User-Agent'] = 'Chrome ' + cleanLoginUA;
      callback({ requestHeaders });
    });

    ses.webRequest.onHeadersReceived({ urls: ['https://accounts.google.com/*'] }, (details: any, callback: any) => {
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

  if (enableAdblock && store.get('adblockEnabled') && blocker) {
    try {
      // Re-enabled Ghostery preload script for 100/100 score. 
      // Whitelisting in onBeforeRequest should now prevent the previous crashes.

      // 2. Monkey-patch onBeforeRequest to whitelist Gemini and ChatGPT
      const originalOnBeforeRequest = ses.webRequest.onBeforeRequest.bind(ses.webRequest);
      (ses.webRequest as any).onBeforeRequest = (filter: any, listener?: any) => {
        if (typeof filter === 'function') {
          listener = filter;
          filter = null;
        }
        const wrappedListener = (details: any, callback: any) => {
          const url = details.url || '';
          const isAiDomain = url.includes('chatgpt.com') || 
                             url.includes('chat.openai.com') || 
                             url.includes('google.com') || 
                             url.includes('googleapis.com') ||
                             url.includes('gstatic.com') ||
                             url.includes('googleusercontent.com');

          // Bypass for AI and Service Workers (crucial for Gemini streaming)
          if (isAiDomain || details.resourceType === 'serviceWorker') {
            return callback({ cancel: false });
          }
          return listener(details, callback);
        };
        originalOnBeforeRequest(filter || { urls: ['<all_urls>'] }, wrappedListener);
      };

      // 3. Monkey-patch onHeadersReceived to bypass Ghostery for AI domains (CRITICAL for Gemini guest mode)
      const originalOnHeadersReceived = ses.webRequest.onHeadersReceived.bind(ses.webRequest);
      (ses.webRequest as any).onHeadersReceived = (filter: any, listener?: any) => {
        if (typeof filter === 'function') {
          listener = filter;
          filter = null;
        }
        const wrappedListener = (details: any, callback: any) => {
          const url = details.url || '';
          const isAiDomain = url.includes('chatgpt.com') || 
                             url.includes('chat.openai.com') || 
                             url.includes('google.com') || 
                             url.includes('googleapis.com') || 
                             url.includes('gstatic.com') ||
                             url.includes('googleusercontent.com');

          if (isAiDomain || details.resourceType === 'serviceWorker') {
            return callback({ responseHeaders: details.responseHeaders });
          }
          return listener(details, callback);
        };
        originalOnHeadersReceived(filter || { urls: ['<all_urls>'] }, wrappedListener);
      };

      blocker.enableBlockingInSession(ses);
    } catch (e) {
      console.warn('Adblocker: Failed to enable blocking in session:', e);
    }
  }
};

// Apply hacks
applySessionHacks(session.defaultSession, false);
applySessionHacks(session.fromPartition('persist:sidebrowser'), true);

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
            triggerFocus(firstState);
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
        triggerFocus(firstState);
      }
    });
  } catch (err) {
    console.warn("Failed to create Tray icon:", err);
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Automatically allow media (microphone/camera) for the app
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

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
      const ses = session.fromPartition('persist:sidebrowser');
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

ipcMain.handle('select-directory', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// ═══════════════════════════════════════════════════
// AI Assistant IPC Handlers
// ═══════════════════════════════════════════════════

ipcMain.handle('ai:query-llm', async (_event, prompt: string, threadId: string, _imageBase64?: string) => {
  console.log('Received AI query:', prompt, 'thread:', threadId);
  return `Echo from backend: ${prompt}`;
});

ipcMain.on('ai:query-llm-stream', async (event, { prompt, threadId, provider, model, endpoint, apiKey, imagesBase64, modelStyle }) => {
  try {
    let temperature = 0.7;
    let systemPrompt = '';
    if (modelStyle === 'Low') {
      temperature = 0.2;
      systemPrompt = 'You are a helpful assistant. Be extremely concise and answer immediately without verbose explanations.';
    } else if (modelStyle === 'High') {
      temperature = 0.9;
      systemPrompt = 'You are an expert analytical assistant. Think step-by-step and explore all possibilities deeply before answering. Provide comprehensive reasoning.';
    }

    if (provider === 'Ollama') {
       const ollama = new Ollama({ host: endpoint || 'http://localhost:11434' });
       const messages: any[] = [];
       if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
       messages.push({ role: 'user', content: prompt });
       if (imagesBase64 && imagesBase64.length > 0) {
          const base64DataList = imagesBase64.map((img: string) => img.replace(/^data:image\/\w+;base64,/, ''));
          messages[messages.length - 1].images = base64DataList;
       }
       const response = await ollama.chat({
          model: model || 'llama3',
          messages: messages,
          stream: true,
          options: { temperature }
       });
       for await (const part of response) {
          event.reply('ai:query-llm-chunk', { threadId, chunk: part.message.content });
       }
       event.reply('ai:query-llm-done', { threadId });
    } else if (provider === 'LM Studio' || provider === 'OpenAI' || provider === 'Custom') {
       let baseURL = endpoint;
       if (baseURL && !baseURL.endsWith('/v1') && !baseURL.includes('openai.com')) {
         baseURL = baseURL.replace(/\/$/, '') + '/v1';
       }
       const openai = new OpenAI({ baseURL: baseURL, apiKey: apiKey || 'not-needed' });
       const messages: any[] = [];
       if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
       messages.push({ role: 'user', content: prompt });
       if (imagesBase64 && imagesBase64.length > 0) {
          messages[messages.length - 1].content = [
            { type: "text", text: prompt },
            ...imagesBase64.map((img: string) => ({ type: "image_url", image_url: { url: img } }))
          ];
       }
       const stream = await openai.chat.completions.create({
          model: model || 'local-model',
          messages: messages,
          temperature: temperature,
          stream: true,
       });
       for await (const part of stream) {
          event.reply('ai:query-llm-chunk', { threadId, chunk: part.choices[0]?.delta?.content || '' });
       }
       event.reply('ai:query-llm-done', { threadId });
    } else if (provider === 'Gemini') {
       const genAI = new GoogleGenerativeAI(apiKey);
       const genModel = genAI.getGenerativeModel({ 
         model: model || 'gemini-1.5-flash',
         systemInstruction: systemPrompt || undefined,
         generationConfig: { temperature }
       });
       const reqContent: any[] = [prompt];
       if (imagesBase64 && imagesBase64.length > 0) {
          imagesBase64.forEach((img: string) => {
            const mimeType = img.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
            const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
            reqContent.push({
              inlineData: { data: base64Data, mimeType }
            });
          });
       }
       const result = await genModel.generateContentStream(reqContent);
       for await (const chunk of result.stream) {
         event.reply('ai:query-llm-chunk', { threadId, chunk: chunk.text() });
       }
       event.reply('ai:query-llm-done', { threadId });
    } else {
       event.reply('ai:query-llm-error', { threadId, error: 'Unsupported Provider' });
    }
  } catch (err: any) {
    event.reply('ai:query-llm-error', { threadId, error: err.message });
  }
});

ipcMain.handle('ai:capture-screen-region', async (event) => {
  return new Promise(async (resolve) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const targetDisplay = win ? screen.getDisplayNearestPoint(win.getBounds()) : screen.getPrimaryDisplay();
      const { width, height } = targetDisplay.size;
      const { scaleFactor } = targetDisplay; // For high DPI displays
      
      const sources = await desktopCapturer.getSources({ 
        types: ['screen'], 
        thumbnailSize: { 
          width: Math.floor(width * scaleFactor), 
          height: Math.floor(height * scaleFactor) 
        } 
      });
      const source = sources.find(s => s.display_id === targetDisplay.id.toString()) || sources[0];
      const screenImage = source.thumbnail.toDataURL();
      
      const captureWin = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width, height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        fullscreen: true,
        webPreferences: { 
          nodeIntegration: true, 
          contextIsolation: false 
        }
      });
      
      const html = `
        <html>
          <head>
            <style>
              body { margin: 0; overflow: hidden; cursor: crosshair; user-select: none; }
              #bg { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: fill; }
              #overlay { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); }
              #selection { position: absolute; border: 1.5px solid white; background: rgba(255, 255, 255, 0.1); box-shadow: 0 0 0 9999px rgba(0,0,0,0.4); display: none; }
            </style>
          </head>
          <body>
            <img id="bg" draggable="false" />
            <div id="selection"></div>
            <script>
              const { ipcRenderer } = require('electron');
              let startX, startY, isDragging = false;
              const selection = document.getElementById('selection');
              const bg = document.getElementById('bg');
              
              ipcRenderer.on('capture-image-data', (event, imageSrc) => {
                bg.src = imageSrc;
              });

              document.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                bg.style.display = 'none'; // We use box-shadow trick for the unselected area now
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                selection.style.left = startX + 'px';
                selection.style.top = startY + 'px';
                selection.style.width = '0px';
                selection.style.height = '0px';
                selection.style.display = 'block';
              });
              
              document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const width = Math.abs(e.clientX - startX);
                const height = Math.abs(e.clientY - startY);
                const left = Math.min(e.clientX, startX);
                const top = Math.min(e.clientY, startY);
                selection.style.left = left + 'px';
                selection.style.top = top + 'px';
                selection.style.width = width + 'px';
                selection.style.height = height + 'px';
              });
              
              document.addEventListener('mouseup', (e) => {
                if (!isDragging) return;
                isDragging = false;
                const width = Math.abs(e.clientX - startX);
                const height = Math.abs(e.clientY - startY);
                const left = Math.min(e.clientX, startX);
                const top = Math.min(e.clientY, startY);
                
                if (width > 10 && height > 10) {
                  ipcRenderer.send('capture-done', { left, top, width, height });
                } else {
                  ipcRenderer.send('capture-done', null);
                }
              });
              
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') ipcRenderer.send('capture-done', null);
              });
            </script>
          </body>
        </html>
      `;
      
      const tempPath = path.join(app.getPath('temp'), 'sidebrowser-capture.html');
      fs.writeFileSync(tempPath, html);
      
      captureWin.webContents.once('did-finish-load', () => {
        captureWin.webContents.send('capture-image-data', screenImage);
      });
      
      await captureWin.loadFile(tempPath);
      
      ipcMain.once('capture-done', (_e, cropRect) => {
         if (!cropRect) {
           captureWin.destroy();
           resolve(null);
           return;
         }
         
         const image = nativeImage.createFromDataURL(screenImage);
         const cropped = image.crop({
           x: Math.round(cropRect.left * scaleFactor),
           y: Math.round(cropRect.top * scaleFactor),
           width: Math.round(cropRect.width * scaleFactor),
           height: Math.round(cropRect.height * scaleFactor)
         });
         captureWin.destroy();
         resolve(cropped.toDataURL());
      });
      
    } catch (e) {
      console.error('Screen capture failed', e);
      resolve(null);
    }
  });
});

ipcMain.handle('ai:attach-file', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select a File to Attach',
      properties: ['openFile'],
      filters: [
        { name: 'All Supported', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg', 'pdf', 'txt', 'md', 'js', 'ts', 'json', 'csv'] },
        { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] },
        { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'js', 'ts', 'json', 'csv'] }
      ]
    });
    
    if (canceled || filePaths.length === 0) return null;
    
    const fs = require('fs');
    const path = require('path');
    const filePath = filePaths[0];
    const ext = path.extname(filePath).replace('.', '').toLowerCase() || 'png';
    const fileName = path.basename(filePath);
    
    if (['jpg', 'png', 'gif', 'webp', 'jpeg'].includes(ext)) {
      const fileBuffer = fs.readFileSync(filePath);
      return { type: 'image', data: `data:image/${ext};base64,${fileBuffer.toString('base64')}`, name: fileName };
    } else if (ext === 'pdf') {
      try {
        const pdf = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return { type: 'text', data: data.text, name: fileName };
      } catch (err) {
        console.error('PDF parsing error', err);
        return null;
      }
    } else {
      // Treat as plain text
      try {
        const text = fs.readFileSync(filePath, 'utf-8');
        return { type: 'text', data: text, name: fileName };
      } catch (err) {
        console.error('Text parsing error', err);
        return null;
      }
    }
  } catch (err) {
    console.error('Attach file failed:', err);
    return null;
  }
});

ipcMain.handle('ai:capture-app', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const image = await win.webContents.capturePage();
    return image.toDataURL();
  } catch (err) {
    console.error('Capture app failed:', err);
    return null;
  }
});

ipcMain.handle('ai:get-open-windows', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['window'], fetchWindowIcons: true });
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
      icon: s.appIcon ? s.appIcon.toDataURL() : null
    }));
  } catch (err) {
    console.error('Failed to get open windows', err);
    return [];
  }
});

ipcMain.handle('ai:trigger-dictation', async () => {
  try {
    const robot = require('robotjs');
    if (process.platform === 'win32') {
      // Windows Dictation shortcut is Win + H
      robot.keyTap('h', ['command']);
      return true;
    } else {
      console.log('Dictation trigger not natively supported on this OS via this shortcut');
      return false;
    }
  } catch (err) {
    console.error('Robotjs failed to trigger dictation:', err);
    return false;
  }
});

ipcMain.handle('ai:file-operation', async (_event, action: string, targetPath: string, _content?: string) => {
  console.log('AI File operation:', action, targetPath);
  return { success: true, message: 'Simulated success' };
});

ipcMain.handle('ai:execute-automation', async (_event, command: any) => {
  console.log('AI Automation command:', command);
  return { success: true, message: 'Simulated automation' };
});
