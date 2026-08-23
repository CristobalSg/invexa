import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { withReactQuery } from './lib/react-query';
import { applyCursorPreference, applyTheme, getStoredShowCursor, getStoredTheme } from './services/themeService';

const root = document.getElementById('root')!

applyTheme(getStoredTheme());
applyCursorPreference(getStoredShowCursor());

createRoot(root).render(
  withReactQuery(
    <StrictMode>
        <App />
    </StrictMode>
  )
)
