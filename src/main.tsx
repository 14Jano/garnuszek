import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

// HashRouter keeps deep links working on static hosting (GitHub Pages has no
// server-side rewrites, so a refresh on /kalendarz would otherwise be a 404).
createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
