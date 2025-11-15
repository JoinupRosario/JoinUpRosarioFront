import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

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
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error al acceder a localStorage en interceptor:', error);
      // Continuar sin token si hay error
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
      // Token expirado o inválido
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('modulo');
      } catch (storageError) {
        console.warn('Error al limpiar localStorage en interceptor:', storageError);
      }
      // Usar window.location para asegurar redirección incluso en móvil
      if (window.location.hash) {
        window.location.href = '/#/login';
      } else {
        window.location.href = window.location.origin + window.location.pathname + '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
