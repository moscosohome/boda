import { Injectable } from '@angular/core';
import {
  PhotoAdminSummary,
  PhotoUploadConfig,
  PhotoUploadResult,
} from '../models/photo-upload.model';

const DEVICE_KEY = 'ca-photo-device-id';

@Injectable({ providedIn: 'root' })
export class PhotoUploadService {
  readonly deviceId = this.getDeviceId();

  async getConfig(): Promise<PhotoUploadConfig> {
    return this.request<PhotoUploadConfig>('/api/photos/config', {
      headers: { 'X-Device-Id': this.deviceId },
    });
  }

  upload(
    files: File[],
    turnstileToken: string,
    onProgress: (percentage: number) => void,
  ): Promise<PhotoUploadResult> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      files.forEach((file) => form.append('photos', file, file.name));
      form.set('turnstileToken', turnstileToken);

      const request = new XMLHttpRequest();
      request.open('POST', '/api/photos/upload');
      request.setRequestHeader('X-Device-Id', this.deviceId);
      request.setRequestHeader('Idempotency-Key', crypto.randomUUID());
      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      });
      request.addEventListener('load', () => {
        let body: unknown;
        try {
          body = JSON.parse(request.responseText) as unknown;
        } catch {
          reject(new Error('El servidor no ha devuelto una respuesta válida.'));
          return;
        }
        if (request.status >= 200 && request.status < 300) {
          resolve(body as PhotoUploadResult);
        } else {
          reject(new Error(this.errorMessage(body)));
        }
      });
      request.addEventListener('error', () =>
        reject(new Error('Se ha perdido la conexión. Tus fotos siguen seleccionadas para reintentarlo.')),
      );
      request.addEventListener('timeout', () =>
        reject(new Error('La subida está tardando demasiado. Comprueba tu conexión y vuelve a intentarlo.')),
      );
      request.timeout = 120_000;
      request.send(form);
    });
  }

  getAdminSummary(): Promise<PhotoAdminSummary> {
    return this.request<PhotoAdminSummary>('/api/admin/summary');
  }

  async setUploadsOpen(uploadsOpen: boolean): Promise<void> {
    await this.request('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadsOpen }),
    });
  }

  async deletePhoto(id: string): Promise<void> {
    await this.request(`/api/admin/photo?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  adminPhotoUrl(id: string): string {
    return `/api/admin/photo?id=${encodeURIComponent(id)}`;
  }

  setAdminDevToken(token: string): void {
    sessionStorage.setItem('ca-admin-dev-token', token);
  }

  getAdminDevToken(): string {
    return sessionStorage.getItem('ca-admin-dev-token') ?? '';
  }

  private async request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (url.startsWith('/api/admin/')) {
      const devToken = sessionStorage.getItem('ca-admin-dev-token');
      if (devToken) headers.set('Authorization', `Bearer ${devToken}`);
    }
    const response = await fetch(url, { credentials: 'same-origin', ...init, headers });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Image and empty responses are not requested through this helper.
    }
    if (!response.ok) throw new Error(this.errorMessage(body));
    return body as T;
  }

  private errorMessage(body: unknown): string {
    if (body && typeof body === 'object' && 'error' in body) {
      const error = (body as { error: unknown }).error;
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
      }
    }
    return 'El servidor no está disponible ahora mismo. Vuelve a intentarlo en unos minutos.';
  }

  private getDeviceId(): string {
    try {
      const existing = localStorage.getItem(DEVICE_KEY);
      if (existing) return existing;
      const id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    } catch {
      return crypto.randomUUID();
    }
  }
}
