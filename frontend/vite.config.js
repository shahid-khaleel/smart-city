import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Enables React support in Vite
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 5173, // Standard Vite port
    strictPort: true, // Will fail if port 5173 is already in use, preventing confusion
    host: true, // Bind to 0.0.0.0 so other devices on the LAN can reach this dev server

    // Proxy configuration to connect smoothly with your Python FastAPI backend
    // Proxied server-side (from this machine to its own localhost:8000), so this
    // works correctly no matter which host/IP a browser used to load the page.
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Your FastAPI default port
        changeOrigin: true,
        secure: false,
      },
      '/complaints': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/department': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/worker': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})