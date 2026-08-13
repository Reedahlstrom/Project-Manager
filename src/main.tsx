import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { registerSW } from 'virtual:pwa-register'

import App from '@/App'
import { AuthProvider } from '@/contexts/AuthProvider'
import '@/index.css'

// A new build reloads the page as soon as the service worker takes over.
// Safe here because nothing lives in unsaved local state — capture writes
// immediately and every mutation is optimistic against the server.
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload()
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
