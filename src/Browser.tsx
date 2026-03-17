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
}

interface BrowserProps {
  url: string;
  isActive: boolean;
  isAddressBarTriggered: boolean;
  onStateChange: (state: { url: string; title: string; canGoBack: boolean; canGoForward: boolean }) => void;
}

const Browser = forwardRef<BrowserRef, BrowserProps>(({ url, isActive, isAddressBarTriggered, onStateChange }, ref) => {
  const webviewRef = useRef<any>(null);
  const [preloadPath, setPreloadPath] = useState('');
  const [currentUrl, setCurrentUrl] = useState(url);
  const { settings } = useSettings();
  const addressBarPos = settings.addressBar;

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
    }
  }));

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onDidFinishLoad = () => {
      onStateChange({
        url: webview.getURL(),
        title: webview.getTitle(),
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward()
      });
      setCurrentUrl(webview.getURL());
    };

    const onLoadCommit = (e: any) => {
       if (e.isMainFrame) {
         setCurrentUrl(e.url);
       }
    };

    webview.addEventListener('did-finish-load', onDidFinishLoad);
    webview.addEventListener('load-commit', onLoadCommit);
    return () => {
      webview.removeEventListener('did-finish-load', onDidFinishLoad);
      webview.removeEventListener('load-commit', onLoadCommit);
    };
  }, []);

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.getPreloadPath().then((p: string) => {
        setPreloadPath(`file://${p.replace(/\\/g, '/')}`);
      });
    }
  }, []);

  if (!preloadPath) return null;

  const showAddressBar = addressBarPos !== 'Hidden' && (isAddressBarTriggered);

  return (
    <div 
      className={`w-full h-full rounded-xl overflow-hidden shadow-2xl transition-opacity duration-300 relative ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute inset-0'}`}
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-content-bg) 100%, transparent)',
        borderRadius: '16px' 
      }}
    >
      <webview
        ref={webviewRef}
        src={url}
        preload={preloadPath}
        className="w-full h-full overflow-hidden"
        style={{ 
          backgroundColor: 'transparent',
          borderRadius: '16px' 
        } as any}
      />

      {/* The Address Bar */}
      {(addressBarPos === 'Top' || addressBarPos === 'Bottom') && (
        <div 
          className={`absolute left-1/2 -translate-x-1/2 w-[80%] max-w-2xl bg-zinc-800/95 backdrop-blur-md rounded-xl border border-white/10 shadow-lg flex items-center px-4 py-2 gap-3 transition-all duration-300 z-50 ${addressBarPos === 'Top' ? 'top-4' : 'bottom-4'} ${showAddressBar ? 'opacity-100 translate-y-0 visible' : 'opacity-0 invisible pointer-events-none'} ${!showAddressBar && addressBarPos === 'Top' ? '-translate-y-4' : ''} ${!showAddressBar && addressBarPos === 'Bottom' ? 'translate-y-4' : ''}`}
        >
          <div className="flex items-center justify-center p-1.5 rounded-md bg-white/5 text-zinc-400">
            {currentUrl.startsWith('https') ? <Lock size={14} className="text-green-400" /> : <Globe size={14} />}
          </div>
          <input 
            type="text" 
            value={currentUrl} 
            readOnly
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none w-full cursor-default"
          />
        </div>
      )}
    </div>
  );
});

export default Browser;
