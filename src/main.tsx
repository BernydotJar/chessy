import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeManager } from './design/ThemeManager.tsx'
import { applyVisualThemeToDocument, readVisualTheme } from './design/themes.ts'
import './i18n'
import './index.css'

applyVisualThemeToDocument(readVisualTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeManager><App /></ThemeManager>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => console.warn('Chessy offline worker unavailable', error));
  });
}
