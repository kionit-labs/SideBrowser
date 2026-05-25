import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, Settings as SettingsIcon, ArrowLeft, ArrowRight, ChevronsLeft, 
  Volume2, Monitor, RotateCw, ExternalLink, Copy, Layers, 
  Smartphone, Database, Trash2, Sidebar as SidebarIcon, MinusCircle, VolumeX,
  Globe, X, Sparkles
} from 'lucide-react';
import Browser, { type BrowserRef } from './Browser';
import Settings from './Settings';
import HomeView from './Home';
import Assistant from './Assistant';
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
    setLoaded(false);
    setError(false);

    // Immediate check for cached images
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [domain]);

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
  
  const [view, setView] = useState<'home' | 'browser' | 'settings' | 'assistant'>('home');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right?: number; left?: number }>({ top: 0, right: 0 });

  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isAutoEdgeSnapping, setIsAutoEdgeSnapping] = useState(true);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [isAutoHideLossFocus, setIsAutoHideLossFocus] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartY = useRef(0);

  const [isHoveringAddressBarEdge, setIsHoveringAddressBarEdge] = useState(false);
  const [isTranslateUIOpen, setIsTranslateUIOpen] = useState(false);
  const browserRefs = useRef<Record<string, BrowserRef | null>>({});

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

  // Use Refs for IPC handlers to avoid useEffect re-runs
  const stateRef = useRef({ 
    activeTabId, view, tabs, isAutoHideLossFocus, isAutoEdgeSnapping, isGlobalMuted, isSidebarHidden, settings 
  });
  
  useEffect(() => {
    stateRef.current = { 
      activeTabId, view, tabs, isAutoHideLossFocus, isAutoEdgeSnapping, isGlobalMuted, isSidebarHidden, settings 
    };
  }, [activeTabId, view, tabs, isAutoHideLossFocus, isAutoEdgeSnapping, isGlobalMuted, isSidebarHidden, settings]);

  // Separate robust useEffect for stable IPC events
  useEffect(() => {
    if ((window as any).electronAPI) {
      const blurHandler = (side: string) => {
        // Small delay to ignore "flicker" blurs during tab closing/renders
        setTimeout(() => {
          if (document.hasFocus()) return; // If we still have focus, ignore the blur
          setSlideSide(side);
          setIsBlurred(true);
          setContextMenuTabId(null);
        }, 50);
      };
      
      const focusHandler = () => {
        setIsBlurred(false);
      };
      
      const autoHideToggledHandler = (isPinned: boolean) => {
        setIsAutoHideLossFocus(!isPinned);
      };

      const windowShortcutHandler = (type: string, data?: any) => {
        const { activeTabId, tabs, isGlobalMuted, isSidebarHidden } = stateRef.current;
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
            setIsSidebarHidden(!isSidebarHidden);
            break;
          case 'toggle-mute':
            setIsGlobalMuted(!isGlobalMuted);
            break;
          case 'open-settings':
            setView('settings');
            break;
          case 'add-favorite': {
            const activeTab = tabs.find(t => t.id === activeTabId);
            if (activeTab) {
              const newShortcut = {
                id: Date.now().toString(),
                name: activeTab.title || activeTab.domain || 'Favorite',
                url: activeTab.url
              };
              updateSetting('shortcuts', [...stateRef.current.settings.shortcuts, newShortcut]);
            }
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
      
      if ((window as any).electronAPI.onSnapSideChanged) {
        (window as any).electronAPI.onSnapSideChanged((side: string) => {
          setSlideSide(side);
        });
      }

      return () => {
        if ((window as any).electronAPI.removeAllListeners) {
          (window as any).electronAPI.removeAllListeners('window-blur');
          (window as any).electronAPI.removeAllListeners('window-focus');
          (window as any).electronAPI.removeAllListeners('auto-hide-toggled');
          (window as any).electronAPI.removeAllListeners('window-shortcut');
          (window as any).electronAPI.removeAllListeners('snap-side-changed');
        }
      };
    }
  }, []);

  // Separate useEffect for Resize handling
  useEffect(() => {
    if ((window as any).electronAPI) {
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

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

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
    const { tabs, activeTabId } = stateRef.current;
    const closingTabIdx = tabs.findIndex(t => t.id === id);
    if (closingTabIdx === -1) return;

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    // Clean up stale ref
    if (browserRefs.current[id]) {
      delete browserRefs.current[id];
    }
    
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

  // Force cast to boolean in case electron-store returned a string "false" / "true" unexpectedly
  const isDynamicEnabled = String(settings.dynamicSidebar) === "true";
  
  // Decide sidebar position explicitly.
  // Original default behavior: Sidebar is on the RIGHT.
  let isDynamicReversed = false;
  if (isDynamicEnabled) {
     if (slideSide === 'right') {
        // Browser is on the right screen edge. Sidebar should face inner (LEFT).
        isDynamicReversed = true; 
     } else if (slideSide === 'left') {
        // Browser is on the left screen edge. Sidebar should face inner (RIGHT).
        isDynamicReversed = false;
     }
  } else {
     // Feature is OFF. Use classic default behavior (Sidebar on LEFT).
     isDynamicReversed = false; 
  }

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: isBlurred ? slideOffset : 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`flex h-screen w-screen bg-transparent overflow-hidden border border-black/10 dark:border-white/5 relative rounded-[var(--app-radius)] ${isDynamicReversed ? 'flex-row-reverse' : ''}`}
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
            className={`absolute top-0 bottom-0 w-8 z-50 flex items-center justify-end pr-0.5 opacity-0 hover:opacity-100 transition-opacity group cursor-pointer ${isDynamicReversed ? 'left-0 justify-start pl-0.5' : 'right-0'}`}
            onClick={() => setIsSidebarHidden(false)}
          >
            <div className={`bg-[var(--theme-sidebar)] p-2 text-[var(--theme-text)] shadow-xl border-y border-black/30 backdrop-blur-md ${isDynamicReversed ? 'rounded-r-md border-r' : 'rounded-l-md border-l'}`}>
              <ChevronsLeft size={24} className={`opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all ${isDynamicReversed ? 'rotate-180' : ''}`} />
            </div>
          </div>
        )}
        {view === 'settings' && (
          <Settings />
        )}
        
        {view === 'home' && (
          <HomeView onNavigate={handleNavigate} />
        )}

        {view === 'assistant' && (
          <Assistant onNavigate={(url) => {
            if (url) {
              let finalUrl = url;
              if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
              handleNavigate(finalUrl);
            }
          }} />
        )}

        <div className={`flex-1 w-full h-full p-0 m-0 bg-transparent ${view === 'browser' ? 'block' : 'hidden'}`}>
          {tabs.map((tab) => (
             <div key={tab.id} className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}>
                <Browser 
                  ref={(el) => { browserRefs.current[tab.id] = el; }}
                  url={tab.url} 
                  isActive={activeTabId === tab.id && view === 'browser'} 
                  isAddressBarTriggered={isHoveringAddressBarEdge && activeTabId === tab.id && view === 'browser'}
                  onTranslateAction={(active) => {
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isTranslated: active } : t));
                  }}
                  onStateChange={(state) => {
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, url: state.url, title: state.title, domain: state.domain || t.domain } : t));
                  }}
                  isReversed={isDynamicReversed}
                />
             </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      {!isSidebarHidden && (
        <div 
          className={`w-[60px] h-full flex flex-col items-center py-3 border-black/10 dark:border-white/5 relative z-40 shrink-0 ${isDynamicReversed ? 'border-r rounded-l-[var(--app-radius)]' : 'border-l rounded-r-[var(--app-radius)]'}`}
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
                     if (isDynamicReversed) {
                       setMenuPos({ top: rect.top + rect.height / 2, left: rect.right + 4 });
                     } else {
                       setMenuPos({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 4 });
                     }
                     
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
                  <TabIcon key={tab.id} domain={tab.domain} title={tab.title} className="w-full h-full" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Bottom Group: Fixed Grid */}
          <div className="w-full shrink-0 flex flex-col items-center mt-2 px-1 gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
            
            {/* AI Assistant Icon */}
            {settings.aiEnabled && (
              <div className="w-full px-2 flex justify-center mb-1">
                <button 
                  onClick={() => {
                    setView('assistant');
                    setContextMenuTabId(null);
                  }} 
                  title="AI Assistant"
                  className={`w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-200 ${view === 'assistant' ? 'bg-[var(--theme-active)] text-white shadow-md scale-[1.02]' : 'hover:bg-black/10 dark:hover:bg-white/10 text-[var(--theme-text)] opacity-70 hover:opacity-100'}`}
                >
                  <Sparkles size={22} strokeWidth={1.5} />
                </button>
              </div>
            )}

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
          className="absolute top-0 left-0 z-[9999] pointer-events-auto" 
          style={{ 
            WebkitAppRegion: 'drag', 
            height: `${settings.dragRegionHeight || 40}px`,
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
          initial={{ opacity: 0, x: isDynamicReversed ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`fixed bg-[var(--theme-sidebar)] rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] border border-white/10 p-4 w-[340px] max-w-[340px] flex flex-col gap-4 z-[10005] pointer-events-auto overflow-hidden ${isDynamicReversed ? 'origin-left' : 'origin-right'}`}
          style={{ 
            top: menuPos.top, 
            ...(menuPos.right !== undefined ? { right: menuPos.right } : {}),
            ...(menuPos.left !== undefined ? { left: menuPos.left } : {}),
            transform: 'translateY(-50%)' 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Menu Content */}
          {tabs.find(t => t.id === contextMenuTabId) && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                  <TabIcon key={contextMenuTabId} domain={tabs.find(t => t.id === contextMenuTabId)!.domain} title={tabs.find(t => t.id === contextMenuTabId)!.title} className="w-full h-full" />
                </div>
                <div className="flex flex-col overflow-hidden leading-tight justify-center min-w-0">
                  <span className="text-[var(--theme-text)] font-semibold truncate text-sm">{tabs.find(t => t.id === contextMenuTabId)!.title}</span>
                  <span className="text-[var(--theme-text)] opacity-50 text-xs truncate">{tabs.find(t => t.id === contextMenuTabId)!.url}</span>
                </div>
              </div>
              
              {/* Actions Row */}
              <div className="flex items-center justify-between text-[var(--theme-text)]">
                <button onClick={() => browserRefs.current[contextMenuTabId!]?.goBack()} title={t('app.sidebar.back')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><ArrowLeft size={18} /></button>
                <button onClick={() => browserRefs.current[contextMenuTabId!]?.goForward()} title={t('app.sidebar.forward')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><ArrowRight size={18} /></button>
                <button onClick={() => browserRefs.current[contextMenuTabId!]?.reload()} title={t('app.sidebar.refresh')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><RotateCw size={18} /></button>
                <button onClick={() => window.open(tabs.find(t => t.id === contextMenuTabId)!.url, '_blank')} title={t('app.sidebar.openExternal')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><ExternalLink size={18} /></button>
                <button onClick={() => navigator.clipboard.writeText(tabs.find(t => t.id === contextMenuTabId)!.url)} title={t('app.sidebar.copyUrl')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><Copy size={18} /></button>
                <button title={t('app.sidebar.independentWindow')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><Layers size={18} /></button>
                
                <button 
                  onClick={() => {
                    const tab = tabs.find(t => t.id === contextMenuTabId)!;
                    const muted = browserRefs.current[tab.id]?.toggleMute();
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isMuted: !!muted } : t));
                  }} 
                  title={tabs.find(t => t.id === contextMenuTabId)!.isMuted ? t('app.sidebar.unmute') : t('app.sidebar.mute')} 
                  className={`p-1.5 rounded-md transition-colors ${tabs.find(t => t.id === contextMenuTabId)!.isMuted ? 'text-red-500 bg-red-400/10 hover:bg-red-400/20' : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100'}`}
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
                  className={`p-1.5 rounded-md transition-colors ${tabs.find(t => t.id === contextMenuTabId)!.isMobile ? 'text-blue-500 bg-blue-400/10 hover:bg-blue-400/20' : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                >
                  <Smartphone size={18} />
                </button>
                
                <button title={t('app.sidebar.clearData')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><Database strokeWidth={1.5} size={18} /></button>
                <button onClick={() => handleCloseTab(contextMenuTabId!)} title={t('app.sidebar.deleteTab')} className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-md transition-colors"><Trash2 size={18} /></button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
