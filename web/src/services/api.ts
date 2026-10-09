const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
export const API_BASE = (import.meta as any).env?.VITE_API_URL || (isLocal ? 'http://localhost:5000/api/v1' : 'https://spotify.sentinelofc.web.id/api/v1');

export const getAuthToken = (): string | null => {
  return localStorage.getItem('spotify_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('spotify_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('spotify_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_user');
};

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Terjadi kesalahan pada permintaan ke server');
  }

  return data;
}

export const getStreamUrl = (songId: string): string => {
  return `${API_BASE}/songs/${songId}/stream`;
};

export const getApkDownloadUrl = (): string => {
  return `${API_BASE}/download/apk`;
};
