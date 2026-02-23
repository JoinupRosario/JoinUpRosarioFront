import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // 20s para cubrir cold starts de Vercel serverless
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      // No redirigir si estamos procesando el callback SAML (SamlSuccess maneja su propio flujo)
      const isSamlCallback = window.location.hash.includes('/auth/saml-success');
      if (!isSamlCallback) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
