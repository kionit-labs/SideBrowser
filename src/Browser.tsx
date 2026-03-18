import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useSettings } from './contexts/SettingsContext';
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
  const addressBarPos = settings.addressBar;

  // Use a ref for onStateChange to avoid stale closures in webview listeners
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const syncParentState = (webview: any) => {
    const u = webview.getURL();
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
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      
      webviewRef.current.setUserAgent(isMobile ? desktopUA : mobileUA);
      webviewRef.current.reload();
      return !isMobile;
    },
    setGlobalMute: (muted: boolean) => {
      webviewRef.current?.setAudioMuted(muted);
    }
  }));

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onDidFinishLoad = () => {
      syncParentState(webview);
      setCurrentUrl(webview.getURL());
    };

    const onLoadCommit = (e: any) => {
       if (e.isMainFrame) {
         setCurrentUrl(e.url);
         syncParentState(webview);
       }
    };

    const onTitleUpdate = () => {
      syncParentState(webview);
    };

    webview.addEventListener('did-finish-load', onDidFinishLoad);
    webview.addEventListener('load-commit', onLoadCommit);
    webview.addEventListener('page-title-updated', onTitleUpdate);
    return () => {
      webview.removeEventListener('did-finish-load', onDidFinishLoad);
      webview.removeEventListener('load-commit', onLoadCommit);
      webview.removeEventListener('page-title-updated', onTitleUpdate);
    };
  }, []);

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

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    // Defensive: also set limit on the webContents if it attaches here
    const onDomReady = () => {
      const wc = webview.getWebContents();
      if (wc) wc.setMaxListeners(100);
    };

    webview.addEventListener('dom-ready', onDomReady);
    return () => {
      webview.removeEventListener('dom-ready', onDomReady);
    };
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
        borderRadius: 'var(--app-radius) 0 0 var(--app-radius)',
        clipPath: clipPathValue,
        WebkitClipPath: clipPathValue,
      }}
    >
      <webview
        ref={webviewRef}
        src={url}
        preload={preloadPath}
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
        <div 
          className={`absolute left-1/2 -translate-x-1/2 w-[80%] max-w-2xl backdrop-blur-md rounded-xl border border-black/5 dark:border-white/10 shadow-lg flex items-center px-4 py-2 gap-3 transition-all duration-300 z-[10005] ${addressBarPos === 'Top' ? 'top-4' : 'bottom-4'} ${showAddressBar ? 'opacity-100 translate-y-0 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'} ${!showAddressBar && addressBarPos === 'Top' ? '-translate-y-4' : ''} ${!showAddressBar && addressBarPos === 'Bottom' ? 'translate-y-4' : ''}`}
          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-sidebar) 95%, transparent)' }}
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
            placeholder="Search or enter URL"
          />
        </div>
      )}
    </div>
  );
});

export default Browser;
