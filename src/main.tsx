import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { SettingsProvider } from './contexts/SettingsContext';

// Global rejection handler for renderer process
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection (Renderer):', event.reason);
  event.preventDefault(); // Stop default browser logging
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
);
