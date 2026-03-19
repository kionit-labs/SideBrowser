import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { useSettings, useTranslation } from './contexts/SettingsContext';
import { Globe, Lock } from 'lucide-react';

export interface BrowserRef {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  loadURL: (url: string) => void;
  toggleMute: () => boolean;
  toggleDevice: () => boolean;
  setGlobalMute: (muted: boolean) => void;
}

interface BrowserProps {
  url: string;
  isActive: boolean;
  isAddressBarTriggered: boolean;
  onStateChange: (state: { url: string; title: string; domain?: string; canGoBack: boolean; canGoForward: boolean }) => void;
}

const Browser = forwardRef<BrowserRef, BrowserProps>(({ url, isActive, isAddressBarTriggered, onStateChange }, ref) => {
  const webviewRef = useRef<any>(null);
  const [preloadPath, setPreloadPath] = useState('');
  const [currentUrl, setCurrentUrl] = useState(url);
  const [inputValue, setInputValue] = useState(url);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { settings } = useSettings();
  const { t } = useTranslation();
  const addressBarPos = settings.addressBar;

  // Track initial URL so we only set 'src' once.
  // This prevents ERR_ABORTED errors when the parent state syncs.
  const [initialUrl] = useState(url);

  // Use a ref for onStateChange to avoid stale closures in webview listeners
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const syncParentState = (webview: any, forceUrl?: string) => {
    if (!webview) return;
    const u = forceUrl || webview.getURL();
    const t = webview.getTitle();
    let d = '';
    try {
      d = new URL(u).hostname.replace('www.', '');
    } catch (e) {}

    onStateChangeRef.current({
      url: u,
      title: t,
      domain: d,
      canGoBack: webview.canGoBack(),
      canGoForward: webview.canGoForward()
    });
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

    const listeners = [
      ['did-finish-load', handleStateUpdate],
      ['did-stop-loading', handleStateUpdate],
      ['load-commit', handleStateUpdate],
      ['did-navigate', handleStateUpdate],
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
  // We remove all insets and background fills. The webview now meets the container edge exactly at 0px.
  // We use the global --app-radius (24px) for perfect synchronization with the window edges.
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
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
        className="w-full h-full overflow-hidden"
        style={{ 
          backgroundColor: 'transparent',
          clipPath: clipPathValue,
          WebkitClipPath: clipPathValue,
          borderRadius: 'var(--app-radius) 0 0 var(--app-radius)'
        } as any}
      />

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
