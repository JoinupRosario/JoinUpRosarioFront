import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Función de inicialización con manejo de errores para iOS
function initApp() {
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
    console.error('Error al inicializar la aplicación:', error);
    
    // Mostrar mensaje de error en la página
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center; color: #c41e3a;">
          <h1>⚠️ Error al cargar la aplicación</h1>
          <p>Por favor, recarga la página o contacta al soporte técnico.</p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

// Esperar a que el DOM esté completamente cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM ya está listo
  initApp();
}
