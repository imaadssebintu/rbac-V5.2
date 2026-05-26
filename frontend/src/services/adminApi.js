
// Admin endpoints
export const adminAPI = {
  getLogs: () => API.get('/dashboard/admin/logs'),
  createAnnouncement: (data) => API.post('/dashboard/admin/announcements', data),
  getAnnouncements: () => API.get('/dashboard/admin/announcements'),
  getUserAnnouncements: () => API.get('/dashboard/announcements'),
  getStats: () => API.get('/dashboard/admin')
};
