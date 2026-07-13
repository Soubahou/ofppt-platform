import api from './axios'
export const assignmentsApi = {
  list: (params) => api.get('/assignments', { params }).then(r => r.data),
  get: (id) => api.get(`/assignments/${id}`).then(r => r.data),
  create: (data) => api.post('/assignments', data).then(r => r.data),
  update: (id, data) => api.patch(`/assignments/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/assignments/${id}`).then(r => r.data),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`).then(r => r.data),
}
