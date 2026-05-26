import axios from 'axios';

const LOCAL_API_FALLBACK = 'http://localhost:5500/api';

const getApiBaseUrl = () => {
  const isLocalFrontend = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const useRemoteApiInLocal = process.env.REACT_APP_USE_REMOTE_API_IN_LOCAL === 'true';

  const rawUrl = (isLocalFrontend && !useRemoteApiInLocal)
    ? (process.env.REACT_APP_LOCAL_API_URL || LOCAL_API_FALLBACK)
    : (process.env.REACT_APP_API_URL || LOCAL_API_FALLBACK);

  return rawUrl.includes('/api') ? rawUrl : `${rawUrl.replace(/\/$/, '')}/api`;
};

const getBackendOrigin = () => getApiBaseUrl().replace(/\/api\/?$/, '');

export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_ORIGIN = getBackendOrigin();

const API = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

export const apiClient = API;

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  register: (userData) => API.post('/auth/register', userData),
  me: ({ bustCache = true } = {}) => API.get('/auth/me', {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    },
    params: bustCache ? { _t: Date.now() } : undefined
  }),
  verify: ({ bustCache = true } = {}) => API.get('/auth/verify', {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    },
    params: bustCache ? { _t: Date.now() } : undefined
  }),
  socialLogin: (payload) => API.post('/auth/social', payload),
  getOAuthProviders: () => API.get('/auth/oauth/providers')
};

// Task endpoints
export const taskAPI = {
  getAll: () => API.get('/tasks'),
  getUserTasks: (userId, role, status) =>
    API.get('/tasks', { params: { user_id: userId, role, status } }),
  getById: (id) => API.get(`/tasks/${id}`),
  create: (taskData) => API.post('/tasks', taskData),
  quote: (payload) => API.post('/tasks/quote', payload),
  updateLocation: (id, updates) => API.put(`/tasks/${id}/location`, updates),
  updateUpcomingTrip: (id, updates) => API.put(`/trips/${id}`, updates),
  cancel: (id, reason) => API.post(`/tasks/${id}/cancel`, { reason }),
  approve: (id, note) => API.post(`/tasks/${id}/approve`, { note }),
  assign: (id, walkerId) => API.post(`/tasks/${id}/assign`, { task_id: id, walker_id: walkerId }),
  start: (id, walkerLocation) => API.post(`/tasks/${id}/start`, { walker_location: walkerLocation }),
  complete: (id, walkerLocation, walkeeRating) =>
    API.post(`/tasks/${id}/complete`, { walker_location: walkerLocation, walkee_rating: walkeeRating }),
  getTracking: (id) => API.get(`/tasks/${id}/track`),
  submitFeedback: (id, payload) => API.post(`/tasks/${id}/feedback`, payload),
  rateTrip: (id, payload) => API.post(`/trips/${id}/rate`, payload),
  delete: (id) => API.delete(`/tasks/${id}`),
  nearBy: (lat, lng, radius) =>
    API.get('/tasks/nearby', { params: { lat, lng, radius } })
};

export const userAPI = {
  getAll: (params) => API.get('/users', { params }),
  getById: (id) => API.get(`/users/${id}`),
  create: (userData) => API.post('/users', userData),
  update: (id, updates) => API.put(`/users/${id}`, updates),
  delete: (id) => API.delete(`/users/${id}`)
};

export const profileAPI = {
  getById: (id) => API.get(`/profile/${id}`),
  update: (id, updates) => API.put(`/profile/${id}`, updates),
  deleteProfileImage: (id) => API.delete(`/profile/${id}/image`),
  uploadCertificate: (id, file, name) => {
    const formData = new FormData();
    formData.append('certificate', file);
    if (name) {
      formData.append('name', name);
    }
    return API.post(`/profile/${id}/certifications`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  certify: (id, isCertified) => API.put(`/profile/${id}/certify`, { is_certified: isCertified }),
  uploadGalleryImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return API.post(`/profile/${id}/gallery/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteCertificate: (id, certId) => API.delete(`/profile/${id}/certifications/${encodeURIComponent(certId)}`),
  deleteGalleryImage: (id, imageUrl) => API.post(`/profile/${id}/gallery/delete`, { imageUrl })
};

// Public guide directory endpoints
export const guideAPI = {
  list: (params) => API.get('/guides', { params }),
  getById: (id) => API.get(`/guides/${id}`)
};

// Payment endpoints
export const paymentAPI = {
  createIntent: (amount) => API.post('/payments/create-intent', { amount }),
  confirm: (paymentData) => API.post('/payments/confirm', paymentData),
  createPayPalOrder: (payload) => API.post('/payments/paypal/create-order', payload),
  capturePayPalOrder: (payload) => API.post('/payments/paypal/capture', payload),
  createFlutterwaveMobileMoney: (payload) => API.post('/payments/flutterwave/mobile-money', payload),
  createFlutterwaveTransfer: (payload) => API.post('/payments/flutterwave/transfer', payload),
  createFlutterwaveCheckout: (payload) => API.post('/payments/flutterwave/checkout', payload),
  confirmFlutterwaveCheckout: (payload) => API.post('/payments/flutterwave/confirm', payload),
  listFlutterwaveBanks: (country) => API.get(`/payments/flutterwave/banks/${country}`),
  getBalance: (userId) => API.get(`/payments/balance/${userId}`),
  getCoinWalletBalance: (userId) => API.get(`/payments/wallet/coin-balance/${userId}`),
  getCoinWalletTransactions: (userId, params) => API.get(`/payments/wallet/coin-transactions/${userId}`, { params }),
  requestWithdrawal: (payload) => API.post('/payments/wallet/withdraw', payload),
  getHistory: (userId, params) => API.get(`/payments/history/${userId}`, { params }),
  getWalletTransactions: (userId, params) => API.get(`/payments/wallet/transactions/${userId}`, { params }),
  listWithdrawals: (params) => API.get('/payments/admin/withdrawals', { params }),
  listAdminPayments: (params) => API.get('/payments/admin/all', { params }),
  listAdminPayouts: (params) => API.get('/payments/admin/payouts', { params }),
  listAdminTransactions: (params) => API.get('/payments/admin/transactions', { params }),
  listPayPalWebhooks: (params) => API.get('/payments/admin/paypal/webhooks', { params }),
  markWithdrawalPaid: (paymentId, payload) =>
    API.put(`/payments/admin/withdrawals/${paymentId}/pay`, payload),
  verifyAdminTaskPayment: (paymentId, payload) =>
    API.put(`/payments/admin/transactions/${paymentId}/verify`, payload),
  adminPayGuide: (payload) => API.post('/payments/admin/pay-guide', payload),
  adminRefundTraveler: (paymentId, payload) => API.post(`/payments/admin/refund/${paymentId}`, payload)
};

export const payoutAPI = {
  requestWithdrawal: (payload) => API.post('/payouts/withdraw', payload),
  getHistory: () => API.get('/payouts/history'),
  getAll: (params) => API.get('/payouts/admin/payouts', { params }),
  process: (requestId, payload) => API.post(`/payouts/admin/payout/${requestId}`, payload)
};

// Messaging endpoints
export const messageAPI = {
  getConversations: () => API.get('/messages/conversations'),
  getMessages: (conversationId) => API.get(`/messages/${conversationId}`),
  sendMessage: (messageData) => API.post('/messages', messageData),
  getNotifications: (params) => API.get('/messages/notifications/feed', { params }),
  markAllNotificationsRead: () => API.put('/messages/notifications/read-all'),
  markMessageRead: (messageId) => API.put(`/messages/${messageId}/read`),
  deleteMessage: (messageId) => API.delete(`/messages/${messageId}`)
};


// Rating endpoints
export const ratingAPI = {
  getWalkerRatings: (walkerId) => API.get(`/ratings/walker/${walkerId}`),
  submitRating: (ratingData) => API.post('/ratings', ratingData),
  getReviews: (walkerId) => API.get(`/ratings/walker/${walkerId}/reviews`)
};

// Schedule endpoints
export const scheduleAPI = {
  getUserSchedules: (userId, date) =>
    API.get(`/schedules/user/${userId}?date=${date.toISOString()}`),
  create: (scheduleData) => API.post('/schedules', scheduleData),
  update: (id, updates) => API.put(`/schedules/${id}`, updates),
  delete: (id) => API.delete(`/schedules/${id}`)
};

// Analytics endpoints
export const analyticsAPI = {
  getUserAnalytics: (userId, range) =>
    API.get(`/analytics/user/${userId}?range=${range}`),
  getWalkerAnalytics: (walkerId, range) =>
    API.get(`/analytics/walker/${walkerId}?range=${range}`),
  getTravellerAnalytics: () => API.get('/traveller/analytics')
};

// Social endpoints
export const socialAPI = {
  getFeed: (userId) => API.get(`/social/feed/${userId}`),
  createPost: (postData) => API.post('/social/posts', postData),
  likePost: (postId, userId) => API.post(`/social/posts/${postId}/like`, { userId }),
  addComment: (postId, commentData) => API.post(`/social/posts/${postId}/comment`, commentData),
  sharePost: (postId, userId) => API.post(`/social/posts/${postId}/share`, { userId }),
  followUser: (targetUserId, userId) => API.post(`/social/follow/${targetUserId}`, { userId }),
  unfollowUser: (targetUserId, userId) => API.delete(`/social/follow/${targetUserId}`, { data: { userId } })
};

export const complaintAPI = {
  create: (payload) => API.post('/complaints', payload)
};

export const adminAPI = {
  getLogs: () => API.get('/dashboard/admin/logs'),
  backupDatabase: () => API.get('/dashboard/admin/backup', { responseType: 'blob' }),
  createAnnouncement: (data) => API.post('/dashboard/admin/announcements', data),
  getAnnouncements: () => API.get('/dashboard/admin/announcements'),
  getUserAnnouncements: () => API.get('/dashboard/announcements'),
  getStats: () => API.get('/dashboard/admin'),
  verifyGuide: (id) => API.patch(`/admin/verify-guide/${id}`)
};

// Certificate endpoints
export const certificateAPI = {
  uploadCertificate: (file, name) => {
    const formData = new FormData();
    formData.append('certificate', file);
    if (name) {
      formData.append('name', name);
    }
    return API.post('/certificates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getMyCertificates: () => API.get('/certificates/my'),
  getCertificateById: (id) => API.get(`/certificates/${id}`),
  // Admin endpoints
  getAllCertificates: (params) => API.get('/certificates', { params }),
  getPendingCount: () => API.get('/certificates/pending/count'),
  verifyCertificate: (id, data) => API.put(`/certificates/${id}/verify`, data),
  deleteCertificate: (id) => API.delete(`/certificates/${id}`)
};

export default apiClient;
