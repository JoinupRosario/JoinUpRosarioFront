import axios from 'axios';

// Configuración base de la API
// En producción, usar la URL del backend configurada en el workflow
let API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
if (!API_BASE_URL) {
  // Fallback a URL de producción si no hay variable de entorno
  API_BASE_URL = 'https://backend.rosario.mozartia.com/api';
}

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
  console.log('Environment vars:', {
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    MODE: import.meta.env.MODE
  });
}

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    // Acceso seguro a localStorage (iOS compatible)
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para obtener token:', e.message);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido - limpiar de forma segura (iOS compatible)
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (e) {
        console.warn('No se pudo limpiar localStorage:', e.message);
      }
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);

export default api;
