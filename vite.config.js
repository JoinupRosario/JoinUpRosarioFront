import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configuración de Babel para mejor compatibilidad con iOS
      babel: {
        presets: [
          ['@babel/preset-react', { runtime: 'automatic' }]
        ],
      },
    })
  ],
  base: './',
  build: {
    // Target compatible con iOS Safari 11+ (iOS 11+)
    target: ['es2015', 'safari11'],
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Mantener console para debugging en producción
        passes: 2, // Optimización adicional
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        // Asegurar nombres de archivo compatibles
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Asegurar compatibilidad de formato
        format: 'es',
      },
    },
    // Aumentar el límite de tamaño de advertencia para chunks grandes
    chunkSizeWarningLimit: 1000,
  },
  // Configuración para desarrollo
  server: {
    host: true,
    port: 5173,
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
