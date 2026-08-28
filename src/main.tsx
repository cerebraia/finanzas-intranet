import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './styles/globals.css'
import App from './App'
import { STORAGE_KEYS, STORAGE_VERSION } from '@/lib/storage'

// Migrar keys legacy de sidebar (sin prefijo finanzas:) → nuevas keys
function migrateStorage() {
  const version = localStorage.getItem(STORAGE_KEYS.storageVersion)
  if (version === STORAGE_VERSION) return

  const oldCollapsed = localStorage.getItem('sidebar-collapsed')
  const oldSections  = localStorage.getItem('sidebar-sections')
  if (oldCollapsed !== null) {
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, oldCollapsed)
    localStorage.removeItem('sidebar-collapsed')
  }
  if (oldSections !== null) {
    localStorage.setItem(STORAGE_KEYS.sidebarSections, oldSections)
    localStorage.removeItem('sidebar-sections')
  }

  localStorage.setItem(STORAGE_KEYS.storageVersion, STORAGE_VERSION)
}

migrateStorage()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#13101E',
            border: '1px solid #1E1A2E',
            color: '#F0EDFF',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
)
