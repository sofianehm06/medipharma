import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// Injecter le token sur chaque requête
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Gestion globale des erreurs
api.interceptors.response.use(
  r => r,
  err => {
    const status = err.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (status === 429) {
      toast.error('Trop de requêtes. Veuillez patienter quelques instants.', {
        id: 'rate-limit',
        duration: 4000,
      });
    }
    return Promise.reject(err);
  }
);

export default api;
