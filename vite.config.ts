import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig((_) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,   // no source maps in production bundle
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-recharts': ['recharts'],
          'vendor-radix':    [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
          ],
          'vendor-ui':       ['sonner', 'lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  // Ensure VITE_* env vars are only read from correct files per mode
  envDir: '.',
}))
