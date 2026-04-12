import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        preload?: string;
        allowpopups?: boolean;
        webpreferences?: string;
        partition?: string;
      };
    }
  }

  interface Window {
    electronAPI: {
      onWindowBlur: (callback: (side: string) => void) => void;
      onWindowFocus: (callback: () => void) => void;
      onSnapSideChanged: (callback: (side: string) => void) => void;
      sendMouseEnter: () => void;
      getStoreValue: (key: string) => Promise<any>;
      setStoreValue: (key: string, value: any) => void;
    };
  }
}
