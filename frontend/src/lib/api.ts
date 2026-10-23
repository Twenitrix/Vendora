import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// In-memory + sessionStorage token management (never stores raw passwords in localStorage)
const TOKEN_KEY = 'vendora_session_jwt';

export const tokenStore = {
  get: (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('vendora:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'An unexpected error occurred'
    );
  }
  if (err instanceof Error) return err.message;
  return 'Operation failed';
}

export async function downloadProtectedFile(fileUrl: string, fallbackName = 'document.pdf') {
  const cleanPath = fileUrl.startsWith('/api/v1') ? fileUrl.replace('/api/v1', '') : fileUrl;
  const response = await apiClient.get(cleanPath, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  const filename = fileUrl.split('/').pop() || fallbackName;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
