import api from './api';

export const alertService = {
  getAll:   (params) => api.get('/alerts', { params }).then(r => r.data),
  getCount: ()       => api.get('/alerts/count').then(r => r.data.count),
  traiter:  (id)     => api.patch(`/alerts/${id}/traiter`).then(r => r.data),
  ignorer:  (id)     => api.patch(`/alerts/${id}/ignorer`).then(r => r.data),
};
