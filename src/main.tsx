import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DEV_MOCK } from './dev/env'

// Clean up any service worker a past prod build left registered — dev never
// registers one (the PWA plugin is gated to `vite build`).
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {import.meta.env.DEV && DEV_MOCK && (
      <div className="pointer-events-none fixed right-2 bottom-2 z-50 rounded bg-amber-500/90 px-2 py-1 text-[10px] font-bold tracking-wider text-black uppercase">
        Dev · Mock data
      </div>
    )}
  </StrictMode>,
)
