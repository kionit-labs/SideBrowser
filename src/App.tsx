import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, Settings as SettingsIcon, ArrowLeft, ArrowRight, ChevronsLeft, 
  Volume2, Monitor, RotateCw, ExternalLink, Copy, Layers, 
  Smartphone, Database, Trash2, Sidebar as SidebarIcon, MinusCircle, VolumeX,
  Globe, X
} from 'lucide-react';
import Browser, { type BrowserRef } from './Browser';
import Settings from './Settings';
import HomeView from './Home';
import { useSettings, useTranslation } from './contexts/SettingsContext';
import { getThemeVariables } from './utils/themes';

interface Tab {
  id: string;
  url: string;
  title: string;
  domain: string;
  color: string;
  isMuted: boolean;
  isMobile: boolean;
}

const TabIcon = ({ domain, title, className = "w-full h-full" }: { domain: string, title: string, className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!domain) {
      setError(true);
      return;
    }
    
    setLoaded(false);
    setError(false);

    // Fail-safe: if image hasn't loaded after 2 seconds, assume error/slow and show globe
    const timer = setTimeout(() => {
      if (!loaded) setError(true);
    }, 2000);

    // Immediate check for cached images
    if (imgRef.current?.complete) {
      setLoaded(true);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [domain]);

  // If no domain, just show the fallback immediately
  if (!domain) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-white overflow-hidden`}>
         <Globe size={18} strokeWidth={1.5} className="text-zinc-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className} flex items-center justify-center bg-white overflow-hidden`}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 bg-white z-10 animate-pulse">
          <Globe size={18} strokeWidth={1.5} />
        </div>
      )}
      <img 
        ref={imgRef}
        key={domain}
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
        alt={title} 
        className={`w-full h-full object-cover relative z-20 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 bg-white z-30">
          <Globe size={18} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isBlurred, setIsBlurred] = useState(false);
  const { settings, updateSetting, isLoading } = useSettings();
  const { t } = useTranslation();
  const [slideSide, setSlideSide] = useState(settings.defaultSnapSide || 'right');
  
  const isSecondary = new URLSearchParams(window.location.search).get('isSecondary') === 'true';
  
  const [view, setView] = useState<'home' | 'browser' | 'settings'>('home');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isAutoEdgeSnapping, setIsAutoEdgeSnapping] = useState(true);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [isAutoHideLossFocus, setIsAutoHideLossFocus] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartY = useRef(0);

  const [isHoveringAddressBarEdge, setIsHoveringAddressBarEdge] = useState(false);
  const [isTranslateUIOpen, setIsTranslateUIOpen] = useState(false);
  const browserRefs = useRef<Record<string, BrowserRef>>({});

  // Reset translate state on view changes or tab changes
  useEffect(() => {
    setIsTranslateUIOpen(false);
  }, [view, activeTabId]);

  // Lifecycle to sync slideSide with settings (important for startup initialization)
  useEffect(() => {
    if (settings.defaultSnapSide) {
      setSlideSide(settings.defaultSnapSide);
    }
  }, [settings.defaultSnapSide]);

  useEffect(() => {
    if ((window as any).electronAPI) {
      if ((window as any).electronAPI.setAutoHide) {
         // AutoHide active means NOT pinned.
         (window as any).electronAPI.setAutoHide(!isAutoHideLossFocus);
      }
      if ((window as any).electronAPI.setAutoSnap) {
         (window as any).electronAPI.setAutoSnap(isAutoEdgeSnapping);
      }
    }
  }, [isAutoHideLossFocus, isAutoEdgeSnapping]);

  useEffect(() => {
    Object.values(browserRefs.current).forEach(ref => {
      if (ref && (ref as any).setGlobalMute) {
        (ref as any).setGlobalMute(isGlobalMuted);
      }
    });
  }, [isGlobalMuted]);

  useEffect(() => {
    if ((window as any).electronAPI) {
      const blurHandler = (side: string) => {
        setSlideSide(side);
        setIsBlurred(true);
        setContextMenuTabId(null);
      };
      const focusHandler = () => {
        setIsBlurred(false);
      };
      const autoHideToggledHandler = (isPinned: boolean) => {
        setIsAutoHideLossFocus(!isPinned);
      };

      const windowShortcutHandler = (type: string, data?: any) => {
        const activeBrowser = activeTabId ? browserRefs.current[activeTabId] : null;
        
        switch (type) {
          case 'next-tab': {
            setTabs(prevTabs => {
              if (prevTabs.length > 1) {
                const currentIdx = prevTabs.findIndex(t => t.id === activeTabId);
                const nextIdx = (currentIdx + 1) % prevTabs.length;
                setActiveTabId(prevTabs[nextIdx].id);
                setView('browser');
              }
              return prevTabs;
            });
            break;
          }
          case 'prev-tab': {
            setTabs(prevTabs => {
              if (prevTabs.length > 1) {
                const currentIdx = prevTabs.findIndex(t => t.id === activeTabId);
                const prevIdx = (currentIdx - 1 + prevTabs.length) % prevTabs.length;
                setActiveTabId(prevTabs[prevIdx].id);
                setView('browser');
              }
              return prevTabs;
            });
            break;
          }
          case 'switch-tab': {
            setTabs(prevTabs => {
              if (prevTabs[data]) {
                setActiveTabId(prevTabs[data].id);
                setView('browser');
              }
              return prevTabs;
            });
            break;
          }
          case 'close-tab': {
            if (activeTabId) handleCloseTab(activeTabId);
            break;
          }
          case 'home':
            setView('home');
            break;
          case 'toggle-sidebar':
            setIsSidebarHidden(prev => !prev);
            break;
          case 'toggle-mute':
            setIsGlobalMuted(prev => !prev);
            break;
          case 'open-settings':
            setView('settings');
            break;
          case 'add-favorite': {
            setTabs(prevTabs => {
              const activeTab = prevTabs.find(t => t.id === activeTabId);
              if (activeTab) {
                const newShortcut = {
                  id: Date.now().toString(),
                  name: activeTab.title || activeTab.domain || 'Favorite',
                  url: activeTab.url
                };
                updateSetting('shortcuts', [...settings.shortcuts, newShortcut]);
              }
              return prevTabs;
            });
            break;
          }
          case 'reload': activeBrowser?.reload(); break;
          case 'zoom-in': activeBrowser?.zoomIn(); break;
          case 'zoom-out': activeBrowser?.zoomOut(); break;
          case 'zoom-reset': activeBrowser?.zoomReset(); break;
          case 'devtools': activeBrowser?.openDevTools(); break;
          case 'go-back': activeBrowser?.goBack(); break;
          case 'go-forward': activeBrowser?.goForward(); break;
        }
      };

      (window as any).electronAPI.onWindowBlur(blurHandler);
      (window as any).electronAPI.onWindowFocus(focusHandler);
      (window as any).electronAPI.onAutoHideToggled(autoHideToggledHandler);
      (window as any).electronAPI.onWindowShortcut(windowShortcutHandler);

      const handleMouseMove = (e: MouseEvent) => {
        if (isResizing) {
          const deltaX = e.screenX - resizeStartX.current;
          const deltaY = e.screenY - resizeStartY.current;
          resizeStartX.current = e.screenX;
          resizeStartY.current = e.screenY;
          if ((window as any).electronAPI.resizeWindow) {
            (window as any).electronAPI.resizeWindow({ deltaX, deltaY });
          }
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = 'default';
      };

      if (isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if ((window as any).electronAPI.removeAllListeners) {
          (window as any).electronAPI.removeAllListeners('window-blur');
          (window as any).electronAPI.removeAllListeners('window-focus');
          (window as any).electronAPI.removeAllListeners('auto-hide-toggled');
          (window as any).electronAPI.removeAllListeners('window-shortcut');
        }
      };
    }
  }, [isResizing, activeTabId, view, tabs, isAutoHideLossFocus, isAutoEdgeSnapping, isGlobalMuted, isSidebarHidden]);

  // Address Bar Auto-hide logic
  useEffect(() => {
    if (isHoveringAddressBarEdge && !Object.values(browserRefs.current).some(ref => (ref as any)?.isInputFocused)) {
      const timer = setTimeout(() => {
        setIsHoveringAddressBarEdge(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isHoveringAddressBarEdge]);

  const handleNavigate = (rawUrl: string) => {
    let url = rawUrl;
    if (!url.startsWith('http')) url = 'https://' + url;

    try {
      const domain = new URL(url).hostname.replace('www.', '');
      
      const newTab: Tab = {
        id: Date.now().toString(),
        url,
        title: domain,
        domain,
        color: 'bg-white',
        isMuted: false,
        isMobile: false
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setView('browser');
    } catch(e) {
      console.error("Invalid URL in navigate", e);
    }
  };

  const handleCloseTab = (id: string) => {
    const closingTabIdx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    
    setTabs(newTabs);
    
    if (activeTabId === id) {
      if (newTabs.length > 0) {
        // Switch to next available tab (at the same index or last)
        const nextIdx = Math.min(closingTabIdx, newTabs.length - 1);
        setActiveTabId(newTabs[nextIdx].id);
        // keep view as 'browser'
      } else {
        setActiveTabId(null);
        setView('home');
      }
    }
    setContextMenuTabId(null);
  };

  const slideWidth = window.innerWidth; // Hide 100% of the window
  const slideOffset = slideSide === 'left' ? -slideWidth : slideWidth;
  
  const isDark = settings.darkMode === 'Dark' || (settings.darkMode === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const themeVars = getThemeVariables(settings.themeColor, isDark) as React.CSSProperties;

  const rootStyle = {
    ...themeVars,
    '--transparency': settings.transparency
  } as React.CSSProperties;

  if (isLoading) return <div className="h-screen w-screen bg-transparent" />;

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: isBlurred ? slideOffset : 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`flex h-screen w-screen bg-transparent overflow-hidden border border-black/10 dark:border-white/5 relative rounded-[var(--app-radius)]`}
      style={rootStyle}
      onMouseEnter={() => {
        if (isBlurred && (window as any).electronAPI) {
          (window as any).electronAPI.sendMouseEnter();
        }
      }}
      onClick={() => {
        // Close context menu if clicked outside loosely
        if (contextMenuTabId) setContextMenuTabId(null);
      }}
    >
      {/* Moved Drag Handle to end - see below */}

      {/* Context Menu Backdrop - reliable click-away for everything including Webviews */}
      {contextMenuTabId && (
        <div 
          className="fixed inset-0 z-[9998] bg-transparent cursor-default" 
          onClick={() => setContextMenuTabId(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenuTabId(null);
          }}
        />
      )}

      {/* Resize Capture Overlay - Prevents webview from stealing events during resize */}
      {isResizing && (
        <div 
          className="fixed inset-0 z-[9999] bg-transparent cursor-ew-resize"
          style={{ cursor: document.body.style.cursor }} 
        />
      )}

      {/* Resize Hotspots */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {/* Main Edge Handle */}
        <div 
          className={`absolute top-0 bottom-0 w-2 pointer-events-auto cursor-ew-resize transition-colors ${slideSide === 'left' ? 'right-0' : 'left-0'}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            resizeStartX.current = e.screenX;
            resizeStartY.current = e.screenY;
            document.body.style.cursor = 'ew-resize';
          }}
        />

        {/* Bottom Edge Handle */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 pointer-events-auto cursor-ns-resize transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            resizeStartX.current = e.screenX;
            resizeStartY.current = e.screenY;
            document.body.style.cursor = 'ns-resize';
          }}
        />

        {/* Corner Handle (Inner Bottom Corner) */}
        <div 
          className={`absolute bottom-0 w-5 h-5 pointer-events-auto transition-colors ${slideSide === 'left' ? 'right-0 cursor-se-resize' : 'left-0 cursor-sw-resize'}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            resizeStartX.current = e.screenX;
            resizeStartY.current = e.screenY;
            document.body.style.cursor = slideSide === 'left' ? 'se-resize' : 'sw-resize';
          }}
        />

        {/* Corner Handle (Top Corner) */}
        <div 
          className={`absolute top-0 w-5 h-5 pointer-events-auto transition-colors ${slideSide === 'left' ? 'right-0 cursor-ne-resize' : 'left-0 cursor-nw-resize'}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            resizeStartX.current = e.screenX;
            resizeStartY.current = e.screenY;
            document.body.style.cursor = slideSide === 'left' ? 'ne-resize' : 'nw-resize';
          }}
        />
      </div>

      {/* Main Content Area (Left side) */}
      <div 
        className="flex-1 flex flex-col relative h-full overflow-hidden m-0 p-0 text-[var(--theme-text)]"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--theme-content-bg) calc(var(--transparency) * 100%), transparent)' 
        }}
      >
        {/* Sidebar Restorer Arrow (Absolute Overlay) */}
        {isSidebarHidden && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-8 z-50 flex items-center justify-end pr-0.5 opacity-0 hover:opacity-100 transition-opacity group cursor-pointer"
            onClick={() => setIsSidebarHidden(false)}
          >
            <div className="bg-[var(--theme-sidebar)] p-2 rounded-l-md text-[var(--theme-text)] shadow-xl border-y border-l border-black/30 backdrop-blur-md">
              <ChevronsLeft size={24} className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            </div>
          </div>
        )}
        {view === 'settings' && (
          <Settings />
        )}
        
        {view === 'home' && (
          <HomeView onNavigate={handleNavigate} />
        )}

        <div className={`flex-1 w-full h-full p-0 m-0 bg-transparent ${view === 'browser' ? 'block' : 'hidden'}`}>
          {tabs.map((tab) => (
             <div key={tab.id} className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}>
                <Browser 
                  ref={(el) => { if (el) browserRefs.current[tab.id] = el; }}
                  url={tab.url} 
                  isActive={activeTabId === tab.id && view === 'browser'} 
                  isAddressBarTriggered={isHoveringAddressBarEdge}
                  onTranslateAction={(active) => setIsTranslateUIOpen(active)}
                  onStateChange={(state) => {
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, url: state.url, title: state.title, domain: state.domain || t.domain } : t));
                  }} 
                />
             </div>
          ))}
        </div>
      </div>

      {/* Sidebar - Positioned on right, always rounded on the right edge */}
      {!isSidebarHidden && (
        <div 
          className={`w-[60px] h-full flex flex-col items-center py-3 border-l border-black/10 dark:border-white/5 relative z-40 shrink-0 rounded-r-[var(--app-radius)]`}
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--theme-sidebar) calc(var(--transparency) * 100%), transparent)',
            color: 'var(--theme-text)'
          }}
          onClick={(e) => e.stopPropagation()} 
        >
          {/* Top Group: Navigation & Home */}
          <div className="flex flex-col gap-3 w-full items-center shrink-0 mb-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {/* Back/Forward Arrows */}
            <div className="flex items-center justify-center gap-2">
              <button 
                onClick={() => {
                  if (activeTabId && browserRefs.current[activeTabId]) {
                    browserRefs.current[activeTabId].goBack();
                    setView('browser');
                  }
                }} 
                className="text-[var(--theme-text)] opacity-40 hover:opacity-100 transition-opacity p-1"
              >
                <ArrowLeft size={16} />
              </button>
              <button 
                onClick={() => {
                  if (activeTabId && browserRefs.current[activeTabId]) {
                    browserRefs.current[activeTabId].goForward();
                    setView('browser');
                  }
                }} 
                className="text-[var(--theme-text)] opacity-40 hover:opacity-100 transition-opacity p-1"
              >
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Home Icon */}
            <div className="w-full px-2 flex justify-center">
              <button 
                onClick={() => {
                  setView('home');
                  setContextMenuTabId(null);
                }} 
                className={`w-full aspect-square flex items-center justify-center rounded-lg transition-all duration-200 ${view === 'home' ? 'bg-[var(--theme-active)] text-white' : 'hover:bg-white/10'}`}
              >
                <Home size={28} />
              </button>
            </div>
          </div>

          {/* Middle Group: Scrollable Tabs */}
          <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-3 py-2 scroll-smooth" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {tabs.map(tab => (
              <div key={tab.id} className="relative w-full flex justify-center shrink-0">
                <button 
                  onClick={(e) => {
                     e.stopPropagation();
                     setView('browser');
                     const rect = e.currentTarget.getBoundingClientRect();
                     setMenuPos({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 4 });
                     
                     // Simple toggle: if not active, set active. If active, toggle menu.
                     if (activeTabId !== tab.id || view !== 'browser') {
                        setActiveTabId(tab.id);
                        setContextMenuTabId(null);
                     } else {
                        // Already active tab: toggle menu
                        setContextMenuTabId(contextMenuTabId === tab.id ? null : tab.id);
                     }
                  }} 
                  className={`w-10 h-10 flex items-center justify-center rounded-full bg-white transition-all duration-200 overflow-hidden ${activeTabId === tab.id && view === 'browser' ? 'scale-105 shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_0_0_1.5px_white,0_4px_12px_rgba(0,0,0,0.3)] z-20' : 'hover:scale-103 relative z-10'}`}
                >
                  <TabIcon domain={tab.domain} title={tab.title} className="w-full h-full" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Bottom Group: Fixed Grid */}
          <div className="w-full shrink-0 flex flex-col items-center mt-2 px-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="grid grid-cols-2 gap-1 w-full text-[var(--theme-text)] opacity-40">
              {isSecondary && (
                <button 
                  onClick={() => (window as any).electronAPI?.closeWindow()} 
                  title={t('app.sidebar.closeWindow')}
                  className="col-span-2 flex items-center justify-center p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all duration-200"
                >
                  <X size={21} />
                </button>
              )}
              <button 
                onClick={() => { if ((window as any).electronAPI) (window as any).electronAPI.hideWindow() }} 
                title={t('app.sidebar.hideWindow')}
                className="flex items-center justify-center hover:opacity-100 transition-opacity p-1"
              >
                <ChevronsLeft size={21} />
              </button>
              <button 
                onClick={() => setIsAutoHideLossFocus(!isAutoHideLossFocus)}
                title={t('app.sidebar.autoHideFocus')}
                className={`flex items-center justify-center transition-all p-1 ${isAutoHideLossFocus ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <MinusCircle size={21} />
              </button>
              <button 
                onClick={() => setIsGlobalMuted(!isGlobalMuted)}
                title={t('app.sidebar.muteAll')}
                className={`flex items-center justify-center transition-all p-1 ${isGlobalMuted ? 'text-red-500 opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                {isGlobalMuted ? <VolumeX size={21} /> : <Volume2 size={21} />}
              </button>
              <button 
                onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                title={t('app.sidebar.hideSidebar')}
                className={`flex items-center justify-center transition-all p-1 ${isSidebarHidden ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <SidebarIcon size={21} />
              </button>
              <button 
                onClick={() => setIsAutoEdgeSnapping(!isAutoEdgeSnapping)}
                title={t('app.sidebar.autoSnap')}
                className={`flex items-center justify-center transition-all p-1 ${isAutoEdgeSnapping ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <Monitor size={21} />
              </button>
              <button 
                onClick={() => {
                  setView('settings');
                  setContextMenuTabId(null);
                }}
                title={t('app.sidebar.settings')}
                className={`flex items-center justify-center transition-all p-1 rounded-lg ${view === 'settings' ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <SettingsIcon size={21} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Drag Handle - Excludes sidebar area (68px) so nav buttons remain clickable */}
      {!isTranslateUIOpen && (
        <div 
          className="absolute top-0 left-0 h-10 z-[9999] pointer-events-auto" 
          style={{ 
            WebkitAppRegion: 'drag', 
            right: isSidebarHidden ? '0px' : '60px' 
          } as any} 
        />
      )}

      {/* Address Bar Detection Zones - THIN STRIP to prevent click-blocking */}
      {settings.addressBar === 'Top' && !isTranslateUIOpen && (
        <div 
          className="absolute top-0 left-0 right-0 h-4 z-[10000] bg-transparent pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' } as any}
          onMouseEnter={() => {
            setIsHoveringAddressBarEdge(true);
          }}
          onMouseMove={() => {
            if (!isHoveringAddressBarEdge) setIsHoveringAddressBarEdge(true);
          }}
        />
      )}
      {settings.addressBar === 'Bottom' && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-4 z-[10000] bg-transparent pointer-events-auto"
          onMouseEnter={() => setIsHoveringAddressBarEdge(true)}
          onMouseMove={() => {
            if (!isHoveringAddressBarEdge) setIsHoveringAddressBarEdge(true);
          }}
        />
      )}
      {/* Tab Context Menu Overlay - Root Level for Z-Index */}
      {contextMenuTabId && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          className="fixed bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/5 p-4 min-w-[340px] flex flex-col gap-4 z-[10005] origin-right transition-shadow pointer-events-auto"
          style={{ 
            top: menuPos.top, 
            right: menuPos.right,
            transform: 'translateY(-50%)' 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Menu Content */}
          {tabs.find(t => t.id === contextMenuTabId) && (
            <>
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden shrink-0 border-2 border-white">
                  <TabIcon domain={tabs.find(t => t.id === contextMenuTabId)!.domain} title={tabs.find(t => t.id === contextMenuTabId)!.title} className="w-full h-full" />
                </div>
                <div className="flex flex-col overflow-hidden leading-tight justify-center py-1">
                  <span className="text-[var(--theme-text)] font-bold truncate text-base">{tabs.find(t => t.id === contextMenuTabId)!.title}</span>
                  <span className="text-[var(--theme-text)] opacity-40 text-xs truncate max-w-[240px] font-medium tracking-wide uppercase">{tabs.find(t => t.id === contextMenuTabId)!.domain}</span>
                </div>
              </div>
              
              <div className="h-px w-full bg-black/5 dark:bg-white/5" />

              {/* Actions Row */}
              <div className="flex items-center justify-between text-[var(--theme-text)] gap-1">
                <button onClick={() => browserRefs.current[contextMenuTabId!]?.goBack()} title={t('app.sidebar.back')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><ArrowLeft size={18} /></button>
                <button onClick={() => browserRefs.current[contextMenuTabId!]?.goForward()} title={t('app.sidebar.forward')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><ArrowRight size={18} /></button>
                <button onClick={() => browserRefs.current[contextMenuTabId!]?.reload()} title={t('app.sidebar.refresh')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><RotateCw size={18} /></button>
                <button onClick={() => window.open(tabs.find(t => t.id === contextMenuTabId)!.url, '_blank')} title={t('app.sidebar.openExternal')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><ExternalLink size={18} /></button>
                <button onClick={() => navigator.clipboard.writeText(tabs.find(t => t.id === contextMenuTabId)!.url)} title={t('app.sidebar.copyUrl')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><Copy size={18} /></button>
                <button title={t('app.sidebar.independentWindow')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><Layers size={18} /></button>
                
                <button 
                  onClick={() => {
                    const tab = tabs.find(t => t.id === contextMenuTabId)!;
                    const muted = browserRefs.current[tab.id]?.toggleMute();
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isMuted: !!muted } : t));
                  }} 
                  title={tabs.find(t => t.id === contextMenuTabId)!.isMuted ? t('app.sidebar.unmute') : t('app.sidebar.mute')} 
                  className={`p-2 rounded-xl transition-all ${tabs.find(t => t.id === contextMenuTabId)!.isMuted ? 'text-red-500 bg-red-400/10' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100'} hover:scale-110 active:scale-95`}
                >
                  {tabs.find(t => t.id === contextMenuTabId)!.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                
                <button 
                  onClick={() => {
                    const tab = tabs.find(t => t.id === contextMenuTabId)!;
                    const mobile = browserRefs.current[tab.id]?.toggleDevice();
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isMobile: !!mobile } : t));
                  }} 
                  title={t('app.sidebar.deviceEmulation')} 
                  className={`p-2 rounded-xl transition-all ${tabs.find(t => t.id === contextMenuTabId)!.isMobile ? 'text-blue-500 bg-blue-400/10' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100'} hover:scale-110 active:scale-95`}
                >
                  <Smartphone size={18} />
                </button>
                
                <button title={t('app.sidebar.clearData')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all opacity-70 hover:opacity-100 hover:scale-110 active:scale-95"><Database strokeWidth={1.5} size={18} /></button>
                <button onClick={() => handleCloseTab(contextMenuTabId!)} title={t('app.sidebar.deleteTab')} className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-all hover:scale-110 active:scale-95"><Trash2 size={18} /></button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
