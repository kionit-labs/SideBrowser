import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

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
  onStateChange: (state: { url: string; title: string; canGoBack: boolean; canGoForward: boolean }) => void;
}

const Browser = forwardRef<BrowserRef, BrowserProps>(({ url, isActive, onStateChange }, ref) => {
  const webviewRef = useRef<any>(null);
  const [preloadPath, setPreloadPath] = useState('');

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
    };

    webview.addEventListener('did-finish-load', onDidFinishLoad);
    return () => {
      webview.removeEventListener('did-finish-load', onDidFinishLoad);
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

  return (
    <div className={`w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl transition-opacity duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
      <webview
        ref={webviewRef}
        src={url}
        preload={preloadPath}
        className="w-full h-full rounded-xl overflow-hidden bg-white"
        style={{ borderRadius: '16px' } as any}
      />
    </div>
  );
});

export default Browser;
