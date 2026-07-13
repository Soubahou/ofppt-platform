import api from './axios'

export const academicApi = {

  listBranches:  (params) => api.get('/branches',     { params }).then(r => r.data),
  createBranch:  (data)   => api.post('/branches',    data).then(r => r.data),
  updateBranch:  (id, data) => api.put(`/branches/${id}`,  data).then(r => r.data),
  deleteBranch:  (id)     => api.delete(`/branches/${id}`).then(r => r.data),


  listGroups:  (params)   => api.get('/groups',       { params }).then(r => r.data),
  getGroup:    (id)       => api.get(`/groups/${id}`).then(r => r.data),
  createGroup: (data)     => api.post('/groups',      data).then(r => r.data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data).then(r => r.data),
  deleteGroup: (id)       => api.delete(`/groups/${id}`).then(r => r.data),
  getGroupStudents: (id, params) =>
    api.get(`/groups/${id}/students`, { params }).then(r => r.data),
  getGroupAbsences: (id, params) =>
    api.get(`/groups/${id}/absences`, { params }).then(r => r.data),


  listModules:   (params)   => api.get('/modules',        { params }).then(r => r.data),
  getModule:     (id)       => api.get(`/modules/${id}`).then(r => r.data),
  createModule:  (data)     => api.post('/modules',       data).then(r => r.data),
  updateModule:  (id, data) => api.put(`/modules/${id}`,  data).then(r => r.data),
  deleteModule:  (id)       => api.delete(`/modules/${id}`).then(r => r.data),
  getModuleTeachers: (id)   => api.get(`/modules/${id}/teachers`).then(r => r.data),
  assignTeacher: (moduleId, teacher_id) =>
    api.post(`/modules/${moduleId}/teachers`, { teacher_id }).then(r => r.data),
  removeTeacher: (moduleId, teacherId) =>
    api.delete(`/modules/${moduleId}/teachers/${teacherId}`).then(r => r.data),


  listRooms:   (params)   => api.get('/rooms',       { params }).then(r => r.data),
  createRoom:  (data)     => api.post('/rooms',       data).then(r => r.data),
  updateRoom:  (id, data) => api.put(`/rooms/${id}`, data).then(r => r.data),
  deleteRoom:  (id)       => api.delete(`/rooms/${id}`).then(r => r.data),


  listTeachers:  (params)   => api.get('/teachers',        { params }).then(r => r.data),
  getTeacher:    (id)       => api.get(`/teachers/${id}`).then(r => r.data),
  createTeacher: (data)     => api.post('/teachers',       data).then(r => r.data),
  updateTeacher: (id, data) => api.put(`/teachers/${id}`,  data).then(r => r.data),
  deleteTeacher: (id)       => api.delete(`/teachers/${id}`).then(r => r.data),


  listStudents:  (params)   => api.get('/students',        { params }).then(r => r.data),
  getStudent:    (id)       => api.get(`/students/${id}`).then(r => r.data),
  createStudent: (data)     => api.post('/students',       data).then(r => r.data),
  updateStudent: (id, data) => api.put(`/students/${id}`,  data).then(r => r.data),
  deleteStudent: (id)       => api.delete(`/students/${id}`).then(r => r.data),


  listMTG:                  (params) => api.get('/module-teacher-groups', { params }).then(r => r.data),
  upsertModuleTeacherGroup: (data) =>
    api.post('/module-teacher-groups', data).then(r => r.data),


  getDashboardStats: () => api.get('/dashboard/stats').then(r => r.data),

  getWeekSchedule: (params) => api.get('/schedule/week', { params }).then(r => r.data),
  getSessions: (params)     => api.get('/sessions', { params }).then(r => r.data),
  createSession: (data)     => api.post('/sessions', data).then(r => r.data),
  placeSession: (id, data)  => api.patch(`/sessions/${id}/place`, data).then(r => r.data),
  unplaceSession: (id)      => api.patch(`/sessions/${id}/unplace`).then(r => r.data),
  deleteSession: (id)       => api.delete(`/sessions/${id}`).then(r => r.data),



}
