import api from './axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export const submissionsApi = {
  list: (params) => api.get('/submissions', { params }).then(r => r.data),
  get:  (id)     => api.get(`/submissions/${id}`).then(r => r.data),

  submit: (assignmentId, formData) => {
    formData.append('exercise_assignment_id', assignmentId)
    return api.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  grade: (id, data) => api.patch(`/submissions/${id}/grade`, data).then(r => r.data),

  download: (id, filename) =>
  api.get(`/submissions/${id}/download`, { responseType: 'blob' }).then((res) => {
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename || `submission-${id}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }),

  downloadUrl: (id) => `${BASE}/submissions/${id}/download`,
}