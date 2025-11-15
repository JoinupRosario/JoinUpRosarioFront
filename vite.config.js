import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    global: 'window',
  },
  build: {
    // Optimizaciones para móviles
    target: 'es2015', // Compatibilidad con navegadores más antiguos
    minify: 'esbuild', // Minificación más rápida y compatible
    cssMinify: true,
    // Asegurar que los módulos se carguen correctamente en móviles
    modulePreload: {
      polyfill: true,
    },
    // Mejorar compatibilidad con navegadores móviles
    rollupOptions: {
      output: {
        // Formato de nombres de archivos más compatible
        manualChunks: undefined,
      },
    },
    // Asegurar que los assets se sirvan correctamente
    assetsInlineLimit: 4096,
  },
})
