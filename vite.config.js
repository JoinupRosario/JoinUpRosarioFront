import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    // Asegurar compatibilidad con iOS Safari
    target: 'es2015',
    // Generar source maps para debugging en iOS
    sourcemap: false,
    // Optimizar el tamaño de chunks
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    host: true
  }
})
