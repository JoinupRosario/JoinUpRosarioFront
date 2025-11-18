import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Función para mostrar errores de inicialización
function showInitError(error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center; background-color: #f5f5f5;">
        <div style="max-width: 500px; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #c41e3a; margin-bottom: 20px; font-size: 24px;">⚠️ Error al cargar la aplicación</h1>
          <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
            Ha ocurrido un error durante la inicialización de la aplicación.
          </p>
          <div style="margin-top: 20px; padding: 15px; background-color: #fff5f5; border: 1px solid #feb2b2; border-radius: 4px; text-align: left; font-size: 12px; max-height: 300px; overflow: auto;">
            <p style="font-weight: bold; margin-bottom: 10px; color: #c41e3a; font-size: 14px;">⚠️ Detalles del error:</p>
            <pre style="white-space: pre-wrap; word-break: break-word; font-size: 11px; line-height: 1.4; margin: 0; color: #2d3748;">${error.toString()}\n\n${error.stack || 'No hay stack trace disponible'}</pre>
          </div>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background-color: #c41e3a; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">
            Recargar página
          </button>
        </div>
      </div>
    `;
  }
}

// Capturar errores globales no manejados
window.addEventListener('error', (event) => {
  console.error('Error global capturado:', event.error);
  showInitError(event.error || new Error(event.message));
});

// Capturar promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada no manejada:', event.reason);
  showInitError(event.reason || new Error('Error en promesa rechazada'));
});

// Intentar inicializar la aplicación
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('No se encontró el elemento root');
  }

  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('Error al inicializar React:', error);
  showInitError(error);
}
