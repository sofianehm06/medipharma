import api from './api';

export const reportService = {
  dashboard:    ()       => api.get('/reports/dashboard').then(r => r.data),
  inventaire:   ()       => api.get('/reports/inventaire').then(r => r.data),
  consommation: (params) => api.get('/reports/consommation', { params }).then(r => r.data),
  perimes:      ()       => api.get('/reports/perimes').then(r => r.data),
};
