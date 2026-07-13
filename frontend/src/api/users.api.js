import api from './axios'

export const usersApi = {
  list: (params) =>
    api.get('/users', { params }).then(r => r.data),

  get: (id) =>
    api.get(`/users/${id}`).then(r => r.data),

  create: (data) =>
    api.post('/users', data).then(r => r.data),

  update: (id, data) =>
    api.patch(`/users/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/users/${id}`).then(r => r.data),

  resetPassword: (id, newPassword) =>
    api.post(`/users/${id}/reset-password`, { newPassword }).then(r => r.data),

  avatarUrl: (id) =>
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/users/${id}/avatar`,

  uploadAvatar: (id, file) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post(`/users/${id}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
}
