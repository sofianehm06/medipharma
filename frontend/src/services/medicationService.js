import api from './api';

export const medicationService = {
  getAll:   (params) => api.get('/medications', { params }).then(r => r.data),
  getById:  (id)     => api.get(`/medications/${id}`).then(r => r.data),
  create:   (data)   => api.post('/medications', data).then(r => r.data),
  update:   (id, d)  => api.put(`/medications/${id}`, d).then(r => r.data),
  remove:   (id)     => api.delete(`/medications/${id}`).then(r => r.data),
};
