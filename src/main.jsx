/* oxlint-disable react/only-export-components -- this is the application entry module. */
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
const ConnectedApp = lazy(() => import('./ConnectedApp.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<main className="auth-shell"><p>Opening Plant Tracker…</p></main>}><ConnectedApp /></Suspense>
  </StrictMode>,
)

// A previously installed production PWA must never control the local Vite app.
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations()
    .then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()))
      if (navigator.serviceWorker.controller && !sessionStorage.getItem('plant-dev-sw-reset')) {
        sessionStorage.setItem('plant-dev-sw-reset', '1')
        window.location.reload()
      }
    })
    .catch(() => {})
}

// Keep PWA support small and predictable: cache only the built app shell.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    let reloadingForUpdate = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadingForUpdate) return
      reloadingForUpdate = true
      window.location.reload()
    })
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn('Plant Tracker service worker could not be registered.', error)
      })
  })
}
