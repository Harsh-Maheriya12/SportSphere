import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This proxies API requests to your Express backend
    host: '0.0.0.0', 
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://server:5000', // Docker server's port
        changeOrigin: true,
        secure: false,
      },
    },
  },
})