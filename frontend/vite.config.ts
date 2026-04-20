import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Keep warning threshold above known stylesheet size while still catching oversized JS chunks.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react'
          }

          if (id.includes('/recharts/')) {
            return 'vendor-charts'
          }

          if (
            id.includes('/react-tournament-brackets/') ||
            id.includes('/react-svg-pan-zoom/') ||
            id.includes('/styled-components/')
          ) {
            return 'vendor-visualization'
          }

          if (
            id.includes('/i18next/') ||
            id.includes('/react-i18next/') ||
            id.includes('/i18next-browser-languagedetector/')
          ) {
            return 'vendor-i18n'
          }

          if (id.includes('/@react-oauth/google/')) {
            return 'vendor-auth'
          }

          return 'vendor-misc'
        },
      },
    },
  },
})
