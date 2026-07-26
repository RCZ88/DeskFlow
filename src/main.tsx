// Signal to the HTML fallback overlay that the JS bundle loaded successfully
window.__DESKFLOW_LOADED = true;
window.addEventListener('error', function () { /* captured by HTML fallback already */ });
window.addEventListener('unhandledrejection', function () { /* captured by HTML fallback already */ });

import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { NumberMaskProvider } from './context/NumberMaskContext';
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'
import './index.css'
import './styles/lyceum-learn-features.css'

console.log('BUILD MARKER v4');

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <HashRouter>
      <NumberMaskProvider>
        <App />
      </NumberMaskProvider>
    </HashRouter>
  </ErrorBoundary>
)
