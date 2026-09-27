import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Diagnostic error tracking
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global Error Diagnostic]:', { message, source, lineno, colno, error });
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
