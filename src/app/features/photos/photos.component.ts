import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, inject, signal } from '@angular/core';
import { PhotoUploadConfig } from '../../core/models/photo-upload.model';
import { PhotoUploadService } from '../../core/services/photo-upload.service';

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  previewAvailable: boolean;
  failed: boolean;
}

interface TurnstileApi {
  render: (element: string | HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
}

@Component({
  selector: 'app-photos',
  standalone: true,
  templateUrl: './photos.component.html',
  styleUrl: './photos.component.scss',
})
export class PhotosComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly service = inject(PhotoUploadService);
  protected readonly config = signal<PhotoUploadConfig | null>(null);
  protected readonly selected = signal<SelectedPhoto[]>([]);
  protected readonly loading = signal(true);
  protected readonly preparing = signal(false);
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);
  protected readonly error = signal('');
  protected readonly complete = signal(false);
  protected readonly turnstileReady = signal(false);
  private turnstileToken = '';
  private turnstileWidgetId?: string;
  private viewReady = false;

  constructor() {
    void this.loadConfig();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.setupTurnstile();
  }

  ngOnDestroy(): void {
    this.selected().forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }

  protected async chooseFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.uploading()) return;

    this.error.set('');
    const current = this.selected();
    const available = Math.max(0, 3 - current.length);
    if (available === 0) {
      this.error.set('Puedes seleccionar un máximo de 3 recuerdos por tanda.');
      return;
    }

    if (files.length > available) {
      this.error.set(`Solo hemos añadido ${available} ${available === 1 ? 'foto' : 'fotos'} para respetar el límite.`);
    }
    this.preparing.set(true);
    const added: SelectedPhoto[] = [];
    for (const file of files.slice(0, available)) {
      try {
        this.validateFile(file);
        added.push(await this.preparePhoto(file));
      } catch (reason) {
        this.error.set(reason instanceof Error ? reason.message : 'No hemos podido preparar una foto.');
      }
    }
    this.selected.set([...current, ...added]);
    this.preparing.set(false);
  }

  protected removePhoto(id: string): void {
    if (this.uploading()) return;
    const photo = this.selected().find((item) => item.id === id);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    this.selected.update((photos) => photos.filter((item) => item.id !== id));
  }

  protected markPreviewUnavailable(id: string): void {
    this.selected.update((photos) =>
      photos.map((photo) => (photo.id === id ? { ...photo, previewAvailable: false } : photo)),
    );
  }

  protected async upload(): Promise<void> {
    if (this.uploading() || !this.selected().length) return;
    if (!this.turnstileToken) {
      this.error.set('Espera un instante mientras verificamos que la subida es segura.');
      return;
    }
    this.error.set('');
    this.uploading.set(true);
    this.progress.set(0);
    this.selected.update((photos) => photos.map((photo) => ({ ...photo, failed: false })));

    try {
      const result = await this.service.upload(
        this.selected().map((photo) => photo.file),
        this.turnstileToken,
        (value) => this.progress.set(value),
      );
      const succeededNames = new Set(
        result.results.filter((item) => item.success).map((item) => item.clientName),
      );
      const remaining = this.selected()
        .filter((photo) => !succeededNames.has(photo.file.name))
        .map((photo) => ({ ...photo, failed: true }));
      this.selected()
        .filter((photo) => succeededNames.has(photo.file.name))
        .forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      this.selected.set(remaining);
      this.progress.set(100);
      if (remaining.length) {
        this.error.set('Ha habido un problema al subir algunas fotos. Puedes volver a intentarlo.');
      } else {
        this.complete.set(true);
      }
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'Ha habido un problema durante la subida.');
      this.selected.update((photos) => photos.map((photo) => ({ ...photo, failed: true })));
    } finally {
      this.uploading.set(false);
      this.resetTurnstile();
    }
  }

  protected shareMore(): void {
    this.complete.set(false);
    this.progress.set(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private async loadConfig(): Promise<void> {
    try {
      this.config.set(await this.service.getConfig());
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'No podemos abrir la subida ahora mismo.');
    } finally {
      this.loading.set(false);
      void this.setupTurnstile();
    }
  }

  private validateFile(file: File): void {
    if (file.size > 8 * 1024 * 1024) throw new Error('Esta foto pesa demasiado. El máximo es 8 MB.');
    const type = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const types = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    if ((!types.includes(type) && !extensions.includes(extension)) || type.startsWith('video/')) {
      throw new Error('Esta foto no tiene un formato compatible.');
    }
  }

  private async preparePhoto(original: File): Promise<SelectedPhoto> {
    const id = crypto.randomUUID();
    let output = original;
    try {
      const bitmap = await createImageBitmap(original, { imageOrientation: 'from-image' });
      const longest = Math.max(bitmap.width, bitmap.height);
      if (longest > 2560 || original.size > 2.5 * 1024 * 1024) {
        const scale = Math.min(1, 2560 / longest);
        const canvas = this.document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.88),
        );
        if (blob && blob.size < original.size && blob.size <= 8 * 1024 * 1024) {
          output = new File([blob], `${id}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
        }
      }
      bitmap.close();
    } catch {
      // HEIC cannot be decoded by every browser; the original remains valid and is checked by the API.
    }
    if (output === original) {
      const extension = original.name.split('.').pop()?.toLowerCase() || 'jpg';
      output = new File([original], `${id}.${extension}`, {
        type: original.type || 'application/octet-stream',
        lastModified: original.lastModified,
      });
    }
    return {
      id,
      file: output,
      previewUrl: URL.createObjectURL(output),
      previewAvailable: true,
      failed: false,
    };
  }

  private async setupTurnstile(): Promise<void> {
    const siteKey = this.config()?.turnstileSiteKey;
    if (!this.viewReady || !siteKey || this.turnstileWidgetId) return;
    try {
      const api = await this.loadTurnstileScript();
      this.turnstileWidgetId = api.render('#photo-turnstile', {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        action: 'photo-upload',
        callback: (token: string) => {
          this.turnstileToken = token;
          this.turnstileReady.set(true);
        },
        'expired-callback': () => {
          this.turnstileToken = '';
          this.turnstileReady.set(false);
        },
        'error-callback': () => {
          this.turnstileToken = '';
          this.turnstileReady.set(false);
        },
      });
    } catch {
      this.error.set('No hemos podido cargar la verificación de seguridad. Revisa tu conexión.');
    }
  }

  private loadTurnstileScript(): Promise<TurnstileApi> {
    const view = this.document.defaultView as (Window & { turnstile?: TurnstileApi }) | null;
    if (view?.turnstile) return Promise.resolve(view.turnstile);
    return new Promise((resolve, reject) => {
      const existing = this.document.querySelector<HTMLScriptElement>('script[data-photo-turnstile]');
      const script = existing ?? this.document.createElement('script');
      const done = (): void => (view?.turnstile ? resolve(view.turnstile) : reject(new Error()));
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', () => reject(new Error()), { once: true });
      if (!existing) {
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset['photoTurnstile'] = 'true';
        this.document.head.append(script);
      }
    });
  }

  private resetTurnstile(): void {
    this.turnstileToken = '';
    this.turnstileReady.set(false);
    const view = this.document.defaultView as (Window & { turnstile?: TurnstileApi }) | null;
    if (this.turnstileWidgetId) view?.turnstile?.reset(this.turnstileWidgetId);
  }
}
