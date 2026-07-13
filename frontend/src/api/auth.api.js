import api from "./axios";

export const authApi = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),

  logout: (refreshToken) =>
    api
      .post("/auth/logout", { refreshToken })
      .then((r) => r.data)
      .catch(() => {}),

  refresh: (refreshToken) =>
    api.post("/auth/refresh", { refreshToken }).then((r) => r.data),

  me: () => api.get("/auth/me").then((r) => r.data),

  changePassword: (currentPassword, newPassword) =>
    api
      .post("/auth/change-password", {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data),
};
