import api from './api';

export const stockService = {
  getEtat:          (params) => api.get('/stock/etat', { params }).then(r => r.data),
  getLots:          (params) => api.get('/stock/lots', { params }).then(r => r.data),
  createLot:        (data)   => api.post('/stock/lots', data).then(r => r.data),
  getMouvements:    (params) => api.get('/stock/mouvements', { params }).then(r => r.data),
  createMouvement:  (data)   => api.post('/stock/mouvements', data).then(r => r.data),
};
