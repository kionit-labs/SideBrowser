import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { useSettings, useTranslation } from './contexts/SettingsContext';
import { Globe, Lock, Languages } from 'lucide-react';

export interface BrowserRef {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  loadURL: (url: string) => void;
  toggleMute: () => boolean;
  toggleDevice: () => boolean;
  setGlobalMute: (muted: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  openDevTools: () => void;
  isInputFocused: boolean;
}

interface BrowserProps {
  url: string;
  isActive: boolean;
  isAddressBarTriggered: boolean;
  onTranslateAction?: (active: boolean) => void;
  onStateChange: (state: { url: string; title: string; domain?: string; canGoBack: boolean; canGoForward: boolean }) => void;
}

const Browser = forwardRef<BrowserRef, BrowserProps>(({ url, isActive, isAddressBarTriggered, onTranslateAction, onStateChange }, ref) => {
  const webviewRef = useRef<any>(null);
  const [preloadPath, setPreloadPath] = useState('');
  const [currentUrl, setCurrentUrl] = useState(url);
  const [inputValue, setInputValue] = useState(url);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { settings } = useSettings();
  const { t } = useTranslation();
  const addressBarPos = settings.addressBar;
  const [isTranslateActive, setIsTranslateActive] = useState(false);

  // Track initial URL so we only set 'src' once.
  // This prevents ERR_ABORTED errors when the parent state syncs.
  const [initialUrl] = useState(url);

  // Use a ref for onStateChange to avoid stale closures in webview listeners
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const lastReportedUrlRef = useRef<string>('');
  const domainChangeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const syncParentState = (webview: any, forceUrl?: string) => {
    if (!webview) return;
    const u = forceUrl || webview.getURL();
    const t = webview.getTitle();
    
    let d = '';
    try {
      const urlObj = new URL(u);
      d = urlObj.hostname.replace('www.', '');
    } catch (e) {}

    // 1. Filter out known "ghost" intermediate URLs immediately
    if (u.includes('google.') && u.includes('/url?')) {
      // Don't report Google redirector URLs at all to avoid flicker
      return; 
    }

    // 2. Target the YouTube ghosting specifically
    // If we're on Google and it briefly hits YouTube, it's a ghost.
    const isGhostYouTube = d === 'youtube.com' && !lastReportedUrlRef.current.includes('youtube.com');

    const updateParent = (finalDomain?: string) => {
      lastReportedUrlRef.current = u;
      onStateChangeRef.current({
        url: u,
        title: t,
        domain: finalDomain,
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward()
      });
    };

    if (isGhostYouTube) {
      // Ghost navs are usually < 100ms. Wait 250ms to be sure.
      if (domainChangeTimerRef.current) clearTimeout(domainChangeTimerRef.current);
      domainChangeTimerRef.current = setTimeout(() => {
        updateParent(d);
      }, 250);
      return;
    }

    // Default: Small debounce for all domain changes to skip blips
    if (domainChangeTimerRef.current) clearTimeout(domainChangeTimerRef.current);
    domainChangeTimerRef.current = setTimeout(() => {
      updateParent(d);
    }, 150);

    // Still update URL/Title immediately for UX, but keep domain stable
    if (u !== lastReportedUrlRef.current) {
      onStateChangeRef.current({
        url: u,
        title: t,
        domain: undefined, // Freeze current domain
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward()
      });
    }
  };

  useImperativeHandle(ref, () => ({
    goBack: () => webviewRef.current?.goBack(),
    goForward: () => webviewRef.current?.goForward(),
    reload: () => webviewRef.current?.reload(),
    loadURL: (newUrl: string) => webviewRef.current?.loadURL(newUrl),
    toggleMute: () => {
      if (!webviewRef.current) return false;
      const isMuted = webviewRef.current.isAudioMuted();
      webviewRef.current.setAudioMuted(!isMuted);
      return !isMuted;
    },
    toggleDevice: () => {
      if (!webviewRef.current) return false;
      const currentUA = webviewRef.current.getUserAgent();
      const isMobile = currentUA.includes('Mobile');
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0';
      
      webviewRef.current.setUserAgent(isMobile ? desktopUA : mobileUA);
      webviewRef.current.reload();
      return !isMobile;
    },
    setGlobalMute: (muted: boolean) => {
      webviewRef.current?.setAudioMuted(muted);
    },
    zoomIn: () => {
      if (!webviewRef.current) return;
      const currentLevel = webviewRef.current.getZoomLevel();
      webviewRef.current.setZoomLevel(currentLevel + 0.5);
    },
    zoomOut: () => {
      if (!webviewRef.current) return;
      const currentLevel = webviewRef.current.getZoomLevel();
      webviewRef.current.setZoomLevel(currentLevel - 0.5);
    },
    zoomReset: () => {
      webviewRef.current?.setZoomLevel(0);
    },
    openDevTools: () => {
      webviewRef.current?.openDevTools();
    },
    isInputFocused
  }));

  // Consolidated Listener Attachment logic
  const attachListeners = (webview: any) => {
    if (!webview) return;

    const handleStateUpdate = (e?: any) => {
      const u = e?.url || webview.getURL();
      setCurrentUrl(u);
      syncParentState(webview, u);
    };

    const handleNewNavigation = () => {
      setIsTranslateActive(false);
      if (onTranslateAction) onTranslateAction(false);
    };

    const listeners = [
      ['did-finish-load', handleStateUpdate],
      ['did-stop-loading', handleStateUpdate],
      ['load-commit', handleStateUpdate],
      ['did-navigate', (e: any) => {
        handleStateUpdate(e);
        handleNewNavigation();
      }],
      ['did-navigate-in-page', handleStateUpdate],
      ['did-frame-finish-load', handleStateUpdate],
      ['page-title-updated', handleStateUpdate],
      ['page-favicon-updated', handleStateUpdate],
      ['dom-ready', () => {
        const wc = webview.getWebContents();
        if (wc) wc.setMaxListeners(100);
      }]
    ];

    listeners.forEach(([event, handler]) => webview.addEventListener(event, handler));

    return () => {
      listeners.forEach(([event, handler]) => webview.removeEventListener(event, handler));
    };
  };

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    return attachListeners(webview);
  }, [webviewRef.current, preloadPath]); // Re-attach if webview ref changes or preloadPath is finally set

  // Sync Input Value when URL changes, but only if NOT focused
  useEffect(() => {
    if (!isInputFocused) {
      setInputValue(currentUrl);
    }
  }, [currentUrl, isInputFocused]);

  const handleNavigate = () => {
    let target = inputValue.trim();
    if (!target) return;

    // Basic URL detection
    const isUrl = target.match(/^https?:\/\//) || 
                  (target.includes('.') && !target.includes(' '));
    
    if (!isUrl) {
      target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    } else if (!target.startsWith('http')) {
      target = `https://${target}`;
    }

    // Update local state immediately to avoid "jump-back" to previous URL
    setCurrentUrl(target);
    setInputValue(target);
    
    // Also notify parent immediately so UI (sidebar/context menu) feels snappy
    let d = '';
    try {
      d = new URL(target).hostname.replace('www.', '');
    } catch (e) {}

    onStateChangeRef.current({
        url: target,
        title: d, // Temporary title until page loads
        domain: d,
        canGoBack: webviewRef.current?.canGoBack() || false,
        canGoForward: webviewRef.current?.canGoForward() || false
    });
    
    webviewRef.current?.loadURL(target);
    webviewRef.current?.focus();
    setIsInputFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
      (e.target as HTMLInputElement).blur();
    }
  };

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.getPreloadPath()
        .then((p: string) => {
          setPreloadPath(`file://${p.replace(/\\/g, '/')}`);
        })
        .catch((err: any) => {
          console.error("Failed to get preload path:", err);
        });
    }
  }, []);

  if (!preloadPath) return null;

  // Absolute Transparency for Pixel Perfection:
  const clipPathValue = `inset(0 0 0 0 round var(--app-radius) 0 0 var(--app-radius))`;

  // Show bar if triggered by App (hover edge), OR if input is focused
  const showAddressBar = addressBarPos !== 'Hidden' && (isAddressBarTriggered || isInputFocused);

  return (
    <div 
      className={`w-full h-full transition-opacity duration-300 relative ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute inset-0'}`}
      style={{ 
        backgroundColor: 'transparent',
      }}
    >
      <webview
        ref={(node) => {
          if (node) {
            webviewRef.current = node;
          }
        }}
        src={initialUrl}
        preload={preloadPath}
        allowpopups
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
        className="w-full h-full overflow-hidden"
        style={{ 
          backgroundColor: 'transparent',
          clipPath: clipPathValue,
          WebkitClipPath: clipPathValue,
          borderRadius: 'var(--app-radius) 0 0 var(--app-radius)'
        } as any}
      />

      {/* Translate Button */}
      {settings.translateEnabled && (
        <button
          onClick={() => {
            if (webviewRef.current) {
              if (isTranslateActive) {
                // Remove Translation
                const removeCode = `
                  (function() {
                    const elements = [
                      'google_translate_element',
                      'sidebrowser-translate-script',
                      'goog-gt-tt'
                    ];
                    elements.forEach(id => {
                      const el = document.getElementById(id);
                      if (el) el.remove();
                    });
                    const frames = document.querySelectorAll('.skiptranslate');
                    frames.forEach(f => f.remove());
                    document.body.style.top = '0px';
                  })();
                `;
                webviewRef.current.executeJavaScript(removeCode);
                setIsTranslateActive(false);
                if (onTranslateAction) onTranslateAction(false);
              } else {
                // Add Translation
                const addCode = `
                  (function() {
                    if (document.getElementById('sidebrowser-translate-script')) return;
                    
                    const div = document.createElement('div');
                    div.id = 'google_translate_element';
                    div.style.cssText = 'position:fixed; top:35px; right:80px; z-index:2147483647; background:white; padding:5px; border-radius:8px; border:1px solid #ccc; box-shadow:0 2px 15px rgba(0,0,0,0.3);';
                    document.body.appendChild(div);

                    window.googleTranslateElementInit = function() {
                      new google.translate.TranslateElement({
                        pageLanguage: 'auto',
                        layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL
                      }, 'google_translate_element');
                    };

                    const script = document.createElement('script');
                    script.id = 'sidebrowser-translate-script';
                    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                    document.head.appendChild(script);
                  })();
                `;
                webviewRef.current.executeJavaScript(addCode);
                setIsTranslateActive(true);
                if (onTranslateAction) onTranslateAction(true);
              }
            }
          }}
          className={`absolute top-4 right-4 z-[10006] p-2.5 rounded-full backdrop-blur-md border border-black/5 dark:border-white/10 shadow-lg transition-all duration-200 ${isTranslateActive ? 'bg-[var(--theme-active)] text-white scale-110 shadow-[0_0_15px_rgba(110,160,211,0.5)]' : 'text-[var(--theme-text)] hover:scale-110 active:scale-95'}`}
          style={!isTranslateActive ? { backgroundColor: 'color-mix(in srgb, var(--theme-sidebar) 80%, transparent)' } : {}}
          title={t('general.translate')}
        >
          <Languages size={18} />
        </button>
      )}

      {/* The Address Bar */}
      {(addressBarPos === 'Top' || addressBarPos === 'Bottom') && (
        <motion.div 
          initial={false}
          animate={{ 
            y: showAddressBar ? 0 : (addressBarPos === 'Top' ? -100 : 100),
            opacity: showAddressBar ? 1 : 0
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`absolute left-1/2 -translate-x-1/2 w-[80%] max-w-2xl backdrop-blur-md rounded-xl border border-black/5 dark:border-white/10 shadow-lg flex items-center px-4 py-2 gap-3 z-[10005] ${addressBarPos === 'Top' ? 'top-4' : 'bottom-4'}`}
          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-sidebar) 95%, transparent)' }}
          onMouseEnter={() => {
             // If we are in the bar, we should probably keep it open
          }}
        >
          <div className="flex items-center justify-center p-1.5 rounded-md bg-black/5 dark:bg-white/5 text-[var(--theme-text)] opacity-60">
            {currentUrl.startsWith('https') ? <Lock size={14} className="text-green-400" /> : <Globe size={14} />}
          </div>
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none w-full"
            placeholder={t('browser.search.placeholder')}
          />
        </motion.div>
      )}
    </div>
  );
});

export default Browser;
