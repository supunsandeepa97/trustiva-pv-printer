import axios, { type AxiosRequestConfig } from 'axios';
import { getToken, getRefreshToken, setTokens, clearTokens, setUser } from './auth';

const api = axios.create({ baseURL: '/api/v1' });

// Attach token to every request
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null, err?: unknown) => void> = [];

function drainQueue(token: string | null, err?: unknown) {
  refreshQueue.forEach(cb => cb(token, err));
  refreshQueue = [];
}

// 401 → refresh → retry
api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token, err) => {
            if (err || !token) return reject(err ?? error);
            originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        drainQueue(null, error);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        const { token, user } = data.data;
        setTokens(token, refreshToken);
        setUser(user);
        drainQueue(token);
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
        return api(originalRequest);
      } catch (refreshError) {
        drainQueue(null, refreshError);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────
export const AuthAPI = {
  login:           (email: string, password: string) => api.post('/auth/login', { email, password }),
  register:        (data: object)                    => api.post('/auth/register', data),
  refresh:         (refreshToken: string)            => api.post('/auth/refresh', { refreshToken }),
  forgotPassword:  (email: string)                   => api.post('/auth/forgot-password', { email }),
  resetPassword:   (data: object)                    => api.post('/auth/reset-password', data),
  me:              ()                                => api.get('/auth/me'),
  signupRequest:       (data: object) => axios.post('/api/v1/auth/signup-request', data),
  approveUser:         (id: string)   => api.patch(`/auth/approve/${id}`),
  rejectUser:          (id: string)   => api.patch(`/auth/reject/${id}`),
  getPendingRequests:  ()             => api.get('/auth/pending-requests'),
};

// ─── Company API ──────────────────────────────────────────────
export const CompanyAPI = {
  get:             ()                   => api.get('/company'),
  update:          (data: object)       => api.put('/company', data),
  uploadLogo:      (form: FormData)     => api.post('/company/logo', form),
  uploadWatermark: (form: FormData)     => api.post('/company/watermark', form),
  uploadSignature: (slot: string, form: FormData) => api.post(`/company/signature/${slot}`, form),
  getUsers:        ()                   => api.get('/company/users'),
  updateUser:      (id: string, data: object) => api.put(`/company/users/${id}`, data),
};

// ─── Import API ───────────────────────────────────────────────
export const ImportAPI = {
  upload:          (form: FormData, onProgress?: (pct: number) => void) =>
    api.post('/imports/upload', form, {
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))),
    }),
  confirm:         (data: object) => api.post('/imports/confirm', data),
  list:            (params?: object) => api.get('/imports', { params }),
  getById:         (id: string) => api.get(`/imports/${id}`),
  getMappingTemplates: () => api.get('/imports/mapping-templates'),
};

// ─── Payment API ──────────────────────────────────────────────
export const PaymentAPI = {
  list:        (params?: object) => api.get('/payments', { params }),
  getById:     (id: string)      => api.get(`/payments/${id}`),
  create:      (data: object)    => api.post('/payments', data),
  update:      (id: string, data: object) => api.put(`/payments/${id}`, data),
  delete:      (id: string)      => api.delete(`/payments/${id}`),
  bulkAction:  (ids: string[], action: string) => api.post('/payments/bulk-action', { ids, action }),
};

// ─── Print API ────────────────────────────────────────────────
export const PrintAPI = {
  preview:      (id: string)                => api.get(`/print/${id}/preview`),
  generatePDF:  (id: string, copies = 1)   => api.post(`/print/${id}/pdf`, null, {
    params: { copies }, responseType: 'blob',
  }),
  bulkPDF:      (ids: string[])             => api.post('/print/bulk-pdf', { ids }, { responseType: 'blob' }),
  markPrinted:  (id: string, copies = 1)   => api.post(`/print/${id}/mark-printed`, { copies }),
  getLogs:      (id: string)               => api.get(`/print/${id}/logs`),
};

// ─── Template API ─────────────────────────────────────────────
export const TemplateAPI = {
  list:         ()                          => api.get('/templates'),
  getById:      (id: string)               => api.get(`/templates/${id}`),
  create:       (data: object)             => api.post('/templates', data),
  update:       (id: string, data: object) => api.put(`/templates/${id}`, data),
  delete:       (id: string)               => api.delete(`/templates/${id}`),
  setDefault:   (id: string)               => api.post(`/templates/${id}/set-default`),
  duplicate:    (id: string)               => api.post(`/templates/${id}/duplicate`),
};

// ─── Dashboard API ────────────────────────────────────────────
export const DashboardAPI = {
  getStats: () => api.get('/dashboard'),
};

// ─── Settings API ─────────────────────────────────────────────
export const SettingsAPI = {
  get:    ()              => api.get('/settings'),
  update: (data: object) => api.put('/settings', data),
};

export default api;
