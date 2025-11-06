import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // This proxies API requests to your Express backend
    host: '0.0.0.0', 
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Have to change this
        changeOrigin: true,
        secure: false,
      },
    },
  },
})