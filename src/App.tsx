import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, Settings as SettingsIcon, ArrowLeft, ArrowRight, ChevronsLeft, 
  Volume2, Monitor, RotateCw, ExternalLink, Copy, Layers, 
  Smartphone, Database, Trash2, Sidebar as SidebarIcon, MinusCircle, VolumeX
} from 'lucide-react';
import Browser, { type BrowserRef } from './Browser';
import Settings from './Settings';
import HomeView from './Home';
import { useSettings } from './contexts/SettingsContext';
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

export default function App() {
  const [isBlurred, setIsBlurred] = useState(false);
  const { settings, isLoading } = useSettings();
  const [slideSide, setSlideSide] = useState(settings.defaultSnapSide || 'right');
  
  const [view, setView] = useState<'home' | 'browser' | 'settings'>('home');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);

  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isAutoEdgeSnapping, setIsAutoEdgeSnapping] = useState(true);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [isAutoHideLossFocus, setIsAutoHideLossFocus] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartY = useRef(0);

  const [isHoveringAddressBarEdge, setIsHoveringAddressBarEdge] = useState(false);
  const browserRefs = useRef<Record<string, BrowserRef>>({});

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

      (window as any).electronAPI.onWindowBlur(blurHandler);
      (window as any).electronAPI.onWindowFocus(focusHandler);

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
        }
      };
    }
  }, [isResizing]);

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
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(null);
      setView('home');
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
          className={`w-[68px] flex flex-col justify-between items-center py-3 border-l border-black/10 dark:border-white/5 relative z-40 shrink-0 rounded-r-[var(--app-radius)]`}
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--theme-sidebar) calc(var(--transparency) * 100%), transparent)',
            color: 'var(--theme-text)'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent clicking sidebar from closing context menu immediately
        >
          {/* Top Group */}
          <div className="flex flex-col gap-3 w-full items-center relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {/* Back/Forward Arrows */}
            <div className="flex items-center justify-center gap-2 mb-1">
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
                <Home size={22} />
              </button>
            </div>

            {/* Dynamic Site Icons */}
            <div className="flex flex-col gap-3 mt-2 w-full items-center relative">
              {tabs.map(tab => (
                <div key={tab.id} className="relative w-full flex justify-center group">
                  <button 
                    onClick={() => {
                       setView('browser');
                       if (contextMenuTabId === tab.id) {
                          setContextMenuTabId(null);
                       } else if (activeTabId === tab.id && view === 'browser') {
                          setContextMenuTabId(tab.id);
                       } else {
                          setActiveTabId(tab.id);
                          setContextMenuTabId(null);
                       }
                    }} 
                    className={`w-10 h-10 flex items-center justify-center rounded-full bg-white transition-all duration-200 overflow-hidden ${activeTabId === tab.id && view === 'browser' ? 'border-2 border-[#6ea0d3] scale-105 shadow-md' : 'border-0 hover:scale-105'}`}
                  >
                    <img src={`https://www.google.com/s2/favicons?domain=${tab.domain}&sz=64`} alt={tab.title} className="w-full h-full object-cover scale-100" onError={(e) => { (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>'; }} />
                  </button>

                  {/* Tab Context Menu Overlay */}
                  {contextMenuTabId === tab.id && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-[72px] bg-[var(--theme-sidebar)] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 p-4 min-w-[340px] flex flex-col gap-4 z-50 origin-right transition-all">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                          <img src={`https://www.google.com/s2/favicons?domain=${tab.domain}&sz=64`} alt={tab.title} className="w-full h-full object-cover scale-100" onError={(e) => { (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>'; }} />
                        </div>
                        <div className="flex flex-col overflow-hidden leading-tight justify-center">
                          <span className="text-[var(--theme-text)] font-semibold truncate text-sm">{tab.title}</span>
                          <span className="text-[var(--theme-text)] opacity-50 text-xs truncate max-w-[240px]">{tab.url}</span>
                        </div>
                      </div>
                      
                      {/* Actions Row */}
                      <div className="flex items-center justify-between text-[var(--theme-text)]">
                        <button onClick={() => browserRefs.current[tab.id]?.goBack()} title="Back" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><ArrowLeft size={18} /></button>
                        <button onClick={() => browserRefs.current[tab.id]?.goForward()} title="Forward" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><ArrowRight size={18} /></button>
                        <button onClick={() => browserRefs.current[tab.id]?.reload()} title="Refresh" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><RotateCw size={18} /></button>
                        <button onClick={() => window.open(tab.url, '_blank')} title="Open in default browser" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><ExternalLink size={18} /></button>
                        <button onClick={() => navigator.clipboard.writeText(tab.url)} title="Copy URL" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><Copy size={18} /></button>
                        <button title="Independent window" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><Layers size={18} /></button>
                        
                        <button 
                          onClick={() => {
                            const muted = browserRefs.current[tab.id]?.toggleMute();
                            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isMuted: !!muted } : t));
                          }} 
                          title={tab.isMuted ? "Unmute" : "Mute"} 
                          className={`p-1.5 rounded-md transition-colors ${tab.isMuted ? 'text-red-500 bg-red-400/10 hover:bg-red-400/20' : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                        >
                          <Volume2 size={18} className={tab.isMuted ? 'opacity-100' : ''} />
                        </button>
                        
                        <button 
                          onClick={() => {
                            const mobile = browserRefs.current[tab.id]?.toggleDevice();
                            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isMobile: !!mobile } : t));
                          }} 
                          title="Device Emulation" 
                          className={`p-1.5 rounded-md transition-colors ${tab.isMobile ? 'text-blue-500 bg-blue-400/10 hover:bg-blue-400/20' : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                        >
                          <Smartphone size={18} />
                        </button>
                        
                        <button title="Remove website data" className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors opacity-70 hover:opacity-100"><Database strokeWidth={1.5} size={18} /></button>
                        <button onClick={() => handleCloseTab(tab.id)} title="Delete tab" className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-md transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Group */}
          <div className="flex flex-col gap-2 w-full items-center mb-2 px-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="grid grid-cols-2 gap-1.5 w-full text-[var(--theme-text)] opacity-40">
              <button 
                onClick={() => { if ((window as any).electronAPI) (window as any).electronAPI.hideWindow() }} 
                title="Hide Window"
                className="flex items-center justify-center hover:opacity-100 transition-opacity p-1"
              >
                <ChevronsLeft size={18} />
              </button>
              <button 
                onClick={() => setIsAutoHideLossFocus(!isAutoHideLossFocus)}
                title="Auto hide window focus"
                className={`flex items-center justify-center transition-all p-1 ${isAutoHideLossFocus ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <MinusCircle size={18} />
              </button>
              <button 
                onClick={() => setIsGlobalMuted(!isGlobalMuted)}
                title="Mute all pages"
                className={`flex items-center justify-center transition-all p-1 ${isGlobalMuted ? 'text-red-500 opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                {isGlobalMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button 
                onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                title="Hide Sidebar"
                className={`flex items-center justify-center transition-all p-1 ${isSidebarHidden ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <SidebarIcon size={18} />
              </button>
              <button 
                onClick={() => setIsAutoEdgeSnapping(!isAutoEdgeSnapping)}
                title="Auto edge snapping"
                className={`flex items-center justify-center transition-all p-1 ${isAutoEdgeSnapping ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <Monitor size={18} />
              </button>
              <button 
                onClick={() => {
                  setView('settings');
                  setContextMenuTabId(null);
                }}
                title="Settings"
                className={`flex items-center justify-center transition-all p-1 ${view === 'settings' ? 'text-[var(--theme-active)] opacity-100 scale-110' : 'hover:opacity-100'}`}
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Drag Handle - TOP LEVEL OVERLAY */}
      <div 
        className="absolute top-0 left-0 right-0 h-10 z-[9999] pointer-events-auto" 
        style={{ WebkitAppRegion: 'drag' } as any} 
      />

      {/* Address Bar Detection Zones - THIN STRIP to prevent click-blocking */}
      {settings.addressBar === 'Top' && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 z-[10000] bg-transparent pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' } as any}
          onMouseEnter={() => {
            setIsHoveringAddressBarEdge(true);
            // Keep it open for a bit so the user can move the mouse into the actual bar
            setTimeout(() => setIsHoveringAddressBarEdge(false), 2000);
          }}
        />
      )}
      {settings.addressBar === 'Bottom' && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 z-[10000] bg-transparent pointer-events-auto"
          onMouseEnter={() => {
            setIsHoveringAddressBarEdge(true);
            setTimeout(() => setIsHoveringAddressBarEdge(false), 2000);
          }}
        />
      )}
    </motion.div>
  );
}
