import axios from 'axios';

/**
 * Cliente API sin redirección en 401 (pantallas públicas: firma de acuerdo, etc.).
 */
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

const apiPublic = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

apiPublic.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers;
    if (h?.delete) {
      h.delete('Content-Type');
      h.delete('content-type');
    } else if (h) {
      delete h['Content-Type'];
      delete h['content-type'];
    }
  }
  return config;
});

export default apiPublic;
