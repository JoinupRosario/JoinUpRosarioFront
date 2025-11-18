import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  
  // ⚠️ CRÍTICO PARA iOS: Safari no tiene 'global', necesita usar 'window'
  define: {
    global: 'window',
  },
  
  // Optimizaciones para producción
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
  },
})
