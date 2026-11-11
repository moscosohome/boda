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
  remove?: (widgetId: string) => void;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

function createUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
  protected readonly turnstileError = signal('');
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
        this.validateSourceFile(file);
        const photo = await this.preparePhoto(file);
        if (photo.file.size > MAX_UPLOAD_BYTES) {
          URL.revokeObjectURL(photo.previewUrl);
          throw new Error('No hemos podido reducir esta foto por debajo de 8 MB. Prueba a recortarla antes de subirla.');
        }
        added.push(photo);
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

  private validateSourceFile(file: File): void {
    if (file.size > MAX_SOURCE_BYTES) {
      throw new Error('Esta foto es demasiado grande para prepararla en el móvil.');
    }
    const type = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const types = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    if ((!types.includes(type) && !extensions.includes(extension)) || type.startsWith('video/')) {
      throw new Error('Esta foto no tiene un formato compatible.');
    }
  }

  private async preparePhoto(original: File): Promise<SelectedPhoto> {
    const id = createUuid();
    let output = original;
    let bitmap: ImageBitmap | null = null;
    let image: HTMLImageElement | null = null;
    let imageUrl = '';
    try {
      if (typeof createImageBitmap === 'function') {
        try {
          bitmap = await createImageBitmap(original, { imageOrientation: 'from-image' });
        } catch {
          try {
            bitmap = await createImageBitmap(original);
          } catch {
            // Safari can display HEIC files even when createImageBitmap cannot decode them.
          }
        }
      }
      if (!bitmap) {
        imageUrl = URL.createObjectURL(original);
        image = await this.loadImage(imageUrl);
      }

      const width = bitmap?.width ?? image?.naturalWidth ?? 0;
      const height = bitmap?.height ?? image?.naturalHeight ?? 0;
      const longest = Math.max(width, height);
      if (longest > 2560 || original.size > 2.5 * 1024 * 1024) {
        const scale = Math.min(1, 2560 / longest);
        const canvas = this.document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(bitmap ?? image!, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.88),
        );
        if (blob && blob.size < original.size && blob.size <= MAX_UPLOAD_BYTES) {
          output = new File([blob], `${id}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
        }
      }
    } catch {
      // If the browser cannot decode the image, preserve the original when it already fits.
    } finally {
      bitmap?.close();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
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

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image unavailable'));
      image.src = url;
    });
  }

  private async setupTurnstile(): Promise<void> {
    const siteKey = this.config()?.turnstileSiteKey;
    if (!this.viewReady || !siteKey || this.turnstileWidgetId !== undefined) return;
    try {
      this.turnstileError.set('');
      const api = await this.loadTurnstileScript();
      this.turnstileWidgetId = api.render('#photo-turnstile', {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        action: 'photo-upload',
        callback: (token: string) => {
          this.turnstileToken = token;
          this.turnstileReady.set(true);
          this.turnstileError.set('');
        },
        'expired-callback': () => {
          this.turnstileToken = '';
          this.turnstileReady.set(false);
        },
        'error-callback': () => {
          this.turnstileToken = '';
          this.turnstileReady.set(false);
          this.turnstileError.set('No hemos podido completar la comprobación de seguridad.');
          return true;
        },
      });
    } catch {
      this.turnstileError.set('No hemos podido cargar la comprobación de seguridad. Revisa tu conexión.');
    }
  }

  protected retryTurnstile(): void {
    const view = this.document.defaultView as (Window & { turnstile?: TurnstileApi }) | null;
    if (this.turnstileWidgetId !== undefined) {
      view?.turnstile?.remove?.(this.turnstileWidgetId);
      this.turnstileWidgetId = undefined;
    }
    const container = this.document.querySelector('#photo-turnstile');
    if (container) container.textContent = '';
    if (!view?.turnstile) this.document.querySelector('script[data-photo-turnstile]')?.remove();
    this.turnstileError.set('');
    void this.setupTurnstile();
  }

  private loadTurnstileScript(): Promise<TurnstileApi> {
    const view = this.document.defaultView as (Window & { turnstile?: TurnstileApi }) | null;
    if (view?.turnstile) return Promise.resolve(view.turnstile);
    return new Promise((resolve, reject) => {
      const existing = this.document.querySelector<HTMLScriptElement>('script[data-photo-turnstile]');
      const script = existing ?? this.document.createElement('script');
      const timeout = window.setTimeout(() => reject(new Error()), 15_000);
      const done = (): void => {
        window.clearTimeout(timeout);
        if (view?.turnstile) resolve(view.turnstile);
        else reject(new Error());
      };
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error());
      }, { once: true });
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
    if (this.turnstileWidgetId !== undefined) view?.turnstile?.reset(this.turnstileWidgetId);
  }
}
