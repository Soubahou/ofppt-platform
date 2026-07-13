import api from './axios'
export const documentsApi = {
  list: (params) => api.get('/documents', { params }).then(r => r.data),
  get: (id) => api.get(`/documents/${id}`).then(r => r.data),
  create: (data) => api.post('/documents', data).then(r => r.data),
  delete: (id) => api.delete(`/documents/${id}`).then(r => r.data),
  download: (id, filename) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || `document-${id}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }),
}