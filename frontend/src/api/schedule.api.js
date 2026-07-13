import api from './axios'

export const scheduleApi = {

  getSessions: (params) =>
    api.get('/sessions', { params }).then(r => r.data),

  getSession: (id) =>
    api.get(`/sessions/${id}`).then(r => r.data),

  createSession: (data) =>
    api.post('/sessions', data).then(r => r.data),

  updateSession: (id, data) =>
    api.patch(`/sessions/${id}`, data).then(r => r.data),

  deleteSession: (id) =>
    api.delete(`/sessions/${id}`).then(r => r.data),

  placeSession: (id, { day_of_week, start_slot }) =>
    api.patch(`/sessions/${id}/place`, { day_of_week, start_slot }).then(r => r.data),

  unplaceSession: (id) =>
    api.patch(`/sessions/${id}/unplace`).then(r => r.data),


  getWeekSchedule: (params) =>
    api.get('/schedule/week', { params }).then(r => r.data),


  getInstances: (params) =>
    api.get('/schedule/instances', { params }).then(r => r.data),

  generateWeekInstances: (data) =>
  api.post('/schedule/generate-week', data).then(r => r.data),

  markAttendance: (instanceId, data) =>
    api.post(`/schedule/instances/${instanceId}/attendance`, data).then(r => r.data),
}
