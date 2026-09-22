import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor de respuesta para manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error en petición API:', error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;
