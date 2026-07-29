// Signal to the HTML fallback overlay that the JS bundle loaded successfully
window.__DESKFLOW_LOADED = true;

import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { NumberMaskProvider } from './context/NumberMaskContext';
import { ErrorBoundary, triggerGlobalError } from './components/ErrorBoundary'
import App from './App.tsx'
import './index.css'
import './styles/lyceum-learn-features.css'

console.log('BUILD MARKER v4');

// Suppress the HTML fallback — route errors through React ErrorBoundary instead
window.onerror = function (_msg, _src, _line, _col, err) {
  if (err instanceof Error) {
    triggerGlobalError(err);
  } else if (typeof _msg === 'string') {
    triggerGlobalError(new Error(_msg));
  }
  return true;
};
window.onunhandledrejection = function (e: PromiseRejectionEvent) {
  if (e.reason instanceof Error) {
    triggerGlobalError(e.reason);
  } else {
    triggerGlobalError(new Error(String(e.reason)));
  }
  return true;
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <HashRouter>
      <NumberMaskProvider>
        <App />
      </NumberMaskProvider>
    </HashRouter>
  </ErrorBoundary>
)
