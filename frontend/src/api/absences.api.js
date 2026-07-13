import api from "./axios";

export const absencesApi = {
  list: (params) => api.get("/absences", { params }).then((r) => r.data),

  get: (id) => api.get(`/absences/${id}`).then((r) => r.data),

  stats: () => api.get("/absences/stats").then((r) => r.data),

  getWeekSchedule: (params) =>
    api.get("/schedule/week", { params }).then((r) => r.data),

  submit: ({ instance_ids, reason }) =>
    api.post("/absences", { instance_ids, reason }).then((r) => r.data),

  justify: (id, justification) =>
    api.patch(`/absences/${id}/justify`, { justification }).then((r) => r.data),

  approve: (id) => api.patch(`/absences/${id}/approve`).then((r) => r.data),

  reject: (id) => api.patch(`/absences/${id}/reject`).then((r) => r.data),
};
