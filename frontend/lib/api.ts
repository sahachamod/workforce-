import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/v1/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response;
  },
  register: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: string;
  }) => api.post('/api/v1/auth/register', data),
  logout: async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  },
  getMe: async () => {
    const response = await api.get('/api/v1/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response;
  },
  changePassword: async (data: { current_password: string; new_password: string }) =>
    api.post('/api/v1/auth/change-password', data),
};

export const userApi = {
  getUsers: async (params?: { search?: string; department_id?: string; role?: string; is_active?: boolean }) => {
    return api.get('/api/v1/users', { params });
  },
  getUser: async (id: string) => api.get(`/api/v1/users/${id}`),
  // Backend expects query params, not JSON body
  createUser: async (data: any) => api.post('/api/v1/users', null, { params: data }),
  updateUser: async (id: string, data: any) => api.put(`/api/v1/users/${id}`, null, { params: data }),
  deleteUser: async (id: string) => api.delete(`/api/v1/users/${id}`),
  getMyProfile: async () => api.get('/api/v1/users/me'),
  updateProfile: async (data: any) => api.put('/api/v1/users/me', null, { params: data }),
  getDepartments: async () => api.get('/api/v1/users/departments/list'),
};

export const leaveApi = {
  getTypes: async () => api.get('/api/v1/leaves/types'),
  apply: async (data: any) => api.post('/api/v1/leaves/apply', data),
  getMyLeaves: async (params?: any) => api.get('/api/v1/leaves/my', { params }),
  getBalances: async (params?: any) => api.get('/api/v1/leaves/balances', { params }),
  getPending: async () => api.get('/api/v1/leaves/pending'),
  approve: async (id: string, data: { action: string; comments?: string }) => api.put(`/api/v1/leaves/${id}/approve`, data),
  cancel: async (id: string) => api.delete(`/api/v1/leaves/${id}`),
  getCalendar: async (params: any) => api.get('/api/v1/leaves/calendar', { params }),
  getAll: async (params?: any) => api.get('/api/v1/leaves', { params }),
};

export const rosterApi = {
  getShifts: async () => api.get('/api/v1/roster/shifts'),
  createShift: async (data: any) => api.post('/api/v1/roster/shifts', data),
  updateShift: async (id: string, data: any) => api.put(`/api/v1/roster/shifts/${id}`, data),
  deleteShift: async (id: string) => api.delete(`/api/v1/roster/shifts/${id}`),
  createAssignment: async (data: any) => api.post('/api/v1/roster/assignments', data),
  bulkAssignments: async (data: any) => api.post('/api/v1/roster/assignments/bulk', data),
  getCalendar: async (params: any) => api.get('/api/v1/roster/calendar', { params }),
  getSchedule: async (params?: any) => api.get('/api/v1/roster/schedule', { params }),
  requestSwap: async (data: any) => api.post('/api/v1/roster/swaps', data),
  approveSwap: async (id: string, action: string) => api.put(`/api/v1/roster/swaps/${id}/approve`, { action }),
  getAttendance: async (params?: any) => api.get('/api/v1/roster/attendance', { params }),
  checkIn: async (data: { shift_id: string }) => api.post('/api/v1/roster/attendance/checkin', data),
  checkOut: async (data: { shift_id: string }) => api.post('/api/v1/roster/attendance/checkout', data),
  getMyStats: async () => api.get('/api/v1/roster/my-stats'),
};

export const projectApi = {
  getProjects: async (params?: { status_filter?: string; my_projects?: boolean }) => api.get('/api/v1/projects', { params }),
  createProject: async (data: any) => api.post('/api/v1/projects', data),
  getProject: async (id: string) => api.get(`/api/v1/projects/${id}`),
  updateProject: async (id: string, data: any) => api.put(`/api/v1/projects/${id}`, data),
  deleteProject: async (id: string) => api.delete(`/api/v1/projects/${id}`),
  getTasks: async (projectId: string, params?: any) => api.get(`/api/v1/projects/${projectId}/tasks`, { params }),
  createTask: async (projectId: string, data: any) => api.post(`/api/v1/projects/${projectId}/tasks`, data),
  updateTask: async (projectId: string, taskId: string, data: any) => api.put(`/api/v1/projects/${projectId}/tasks/${taskId}`, data),
  deleteTask: async (projectId: string, taskId: string) => api.delete(`/api/v1/projects/${projectId}/tasks/${taskId}`),
  submitTaskWithEvidence: async (projectId: string, taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('evidence', file);
    return api.post(`/api/v1/projects/${projectId}/tasks/${taskId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  createTimeLog: async (data: any) => api.post('/api/v1/projects/time-logs', data),
  getMyStats: async () => api.get('/api/v1/projects/my-stats'),
};

export const monitoringApi = {
  getActivities: async (params?: any) => api.get('/api/v1/monitoring/activities', { params }),
  getSummary: async (params?: any) => api.get('/api/v1/monitoring/summary', { params }),
  getAppUsage: async (params?: any) => api.get('/api/v1/monitoring/app-usage', { params }),
  getEmployees: async () => api.get('/api/v1/monitoring/employees'),
  getScreenshots: async (params?: any) => api.get('/api/v1/monitoring/screenshots', { params }),
  getScreenshotImageUrl: (id: number) => `${API_BASE_URL}/api/v1/monitoring/screenshots/${id}/image`,
  deleteAllScreenshots: async () => api.delete('/api/v1/monitoring/screenshots'),
  deleteAllActivities: async () => api.delete('/api/v1/monitoring/activities'),
  deleteAllTrackingData: async () => api.delete('/api/v1/monitoring/all'),
  updateActivity: async (id: string, data: { is_productive: boolean }) => api.patch(`/api/v1/monitoring/activities/${id}`, data),
  updateActivitiesByApp: async (appName: string, data: { is_productive: boolean }) => 
    api.patch(`/api/v1/monitoring/activities/bulk-by-app?app_name=${encodeURIComponent(appName)}`, data),
};

export const analyticsApi = {
  getDashboard: async () => api.get('/api/v1/analytics/dashboard'),
  getProductivityTrend: async (params?: any) => api.get('/api/v1/analytics/productivity-trend', { params }),
  getLeaveTrends: async (params?: any) => api.get('/api/v1/analytics/leave-trends', { params }),
  getAttendanceInsights: async (params?: any) => api.get('/api/v1/analytics/attendance-insights', { params }),
  getDepartmentPerformance: async () => api.get('/api/v1/analytics/department-performance'),
};

export const notificationApi = {
  getNotifications: async (params?: any) => api.get('/api/v1/notifications', { params }),
  markAsRead: async (id: string) => api.put(`/api/v1/notifications/${id}/read`),
  markAllAsRead: async () => api.put('/api/v1/notifications/read-all'),
  getUnreadCount: async () => api.get('/api/v1/notifications/unread-count'),
};

export const payrollApi = {
  getAll: async (params?: any) => api.get('/api/v1/payroll', { params }),
  get: async (id: string) => api.get(`/api/v1/payroll/${id}`),
  create: async (data: any) => api.post('/api/v1/payroll', data),
  update: async (id: string, data: any) => api.put(`/api/v1/payroll/${id}`, data),
  delete: async (id: string) => api.delete(`/api/v1/payroll/${id}`),
};

export default api;