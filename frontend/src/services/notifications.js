/**
 * Notification API layer. Theo pattern services/api.js.
 */
import { api } from "./api";

export const notificationService = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.put(`/notifications/${id}/read`, {}),
  markAllRead: () => api.put("/notifications/read-all", {}),
  remove: (id) => api.delete(`/notifications/${id}`),
  // Admin gửi thông báo. payload: { target, userId?, role?, title, body, type? }
  adminSend: (payload) => api.post("/notifications/admin/send", payload),
};
