import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register service worker — auto-updates when a new version is available
registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
