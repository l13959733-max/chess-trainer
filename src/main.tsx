import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './theme-kids.css'
import { registerSW } from 'virtual:pwa-register'

// New versions take over right away: the page reloads itself once the new service worker is active,
// and an open app checks for updates every minute (phones keep home-screen apps open for long).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => reg.update().catch(() => {}), 60_000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
