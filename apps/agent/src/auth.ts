import os from 'node:os';
import { apiRequest } from './apiClient.js';
import { saveLocalState } from './db.js';

interface AuthResponse {
  user: { id: string; email: string; displayName: string };
  device: { id: string; name: string };
  accessToken: string;
  refreshToken: string;
}

async function completeLogin(res: AuthResponse): Promise<void> {
  saveLocalState({
    userId: res.user.id,
    deviceId: res.device.id,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  });
}

export async function register(email: string, password: string, displayName: string, deviceName?: string) {
  const res = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
      displayName,
      deviceName: deviceName ?? os.hostname(),
      deviceType: 'DESKTOP',
    },
  });
  await completeLogin(res);
  return res;
}

export async function login(email: string, password: string, deviceName?: string) {
  const res = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
      deviceName: deviceName ?? os.hostname(),
      deviceType: 'DESKTOP',
    },
  });
  await completeLogin(res);
  return res;
}
