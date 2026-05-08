import api from './api';

export const userService = {
  getAll:        ()        => api.get('/users').then(r => r.data),
  getById:       (id)      => api.get(`/users/${id}`).then(r => r.data),
  create:        (data)    => api.post('/users', data).then(r => r.data),
  update:        (id, d)   => api.put(`/users/${id}`, d).then(r => r.data),
  toggleStatut:  (id)      => api.patch(`/users/${id}/statut`).then(r => r.data),
  remove:        (id)      => api.delete(`/users/${id}`).then(r => r.data),
};
