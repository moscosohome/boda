import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import confetti from 'canvas-confetti';
import gsap from 'gsap';
import { PhotoUploadConfig } from '../../core/models/photo-upload.model';
import { PhotoUploadService } from '../../core/services/photo-upload.service';

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  previewAvailable: boolean;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly service = inject(PhotoUploadService);
  protected readonly config = signal<PhotoUploadConfig | null>(null);
  protected readonly selected = signal<SelectedPhoto[]>([]);
  protected readonly loading = signal(true);
  protected readonly preparing = signal(false);
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);
  protected readonly error = signal('');
  protected readonly turnstileReady = signal(false);
  protected readonly turnstileError = signal('');
  private turnstileToken = '';
  private turnstileWidgetId?: string;
  private viewReady = false;
  private reducedMotion = false;
  private celebratedFirstUpload = false;
  private entranceContext?: gsap.Context;
  private shutterTimeline?: gsap.core.Timeline;

  constructor() {
    void this.loadConfig();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.reducedMotion =
      this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
    this.setupEntranceAnimation();
    void this.setupTurnstile();
  }

  ngOnDestroy(): void {
    this.selected().forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    this.shutterTimeline?.kill();
    this.entranceContext?.revert();
    gsap.killTweensOf(this.host.nativeElement.querySelectorAll('*'));
    confetti.reset();
  }

  protected async chooseFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.uploading()) return;

    this.error.set('');
    const current = this.selected();
    this.preparing.set(true);
    const added: SelectedPhoto[] = [];
    for (const file of files.slice(0, 1)) {
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
    this.document.defaultView?.requestAnimationFrame(() => {
      this.animateNewPhotos(added.map((photo) => photo.id));
    });
    void this.uploadPending();
  }

  protected markPreviewUnavailable(id: string): void {
    this.selected.update((photos) =>
      photos.map((photo) => (photo.id === id ? { ...photo, previewAvailable: false } : photo)),
    );
  }

  protected retryPhoto(id: string): void {
    this.error.set('');
    this.selected.update((photos) =>
      photos.map((photo) =>
        photo.id === id ? { ...photo, status: 'queued', progress: 0 } : photo,
      ),
    );
    void this.uploadPending(id);
  }

  private async uploadPending(preferredId?: string): Promise<void> {
    if (this.uploading() || !this.turnstileToken) return;
    const photo =
      (preferredId
        ? this.selected().find((item) => item.id === preferredId && item.status === 'queued')
        : undefined) ?? this.selected().find((item) => item.status === 'queued');
    if (!photo) return;

    this.error.set('');
    this.uploading.set(true);
    this.progress.set(0);
    this.selected.update((photos) =>
      photos.map((item) =>
        item.id === photo.id ? { ...item, status: 'uploading', progress: 0 } : item,
      ),
    );
    this.document.defaultView?.requestAnimationFrame(() => this.animateUploadStart(photo.id));

    try {
      const result = await this.service.upload(
        [photo.file],
        this.turnstileToken,
        (value) => {
          this.progress.set(value);
          this.selected.update((photos) =>
            photos.map((item) => (item.id === photo.id ? { ...item, progress: value } : item)),
          );
        },
      );
      const succeeded = result.results.some(
        (item) => item.success && item.clientName === photo.file.name,
      );
      if (succeeded) {
        this.progress.set(100);
        this.selected.update((photos) =>
          photos.map((item) =>
            item.id === photo.id ? { ...item, status: 'uploaded', progress: 100 } : item,
          ),
        );
        this.document.defaultView?.requestAnimationFrame(() => this.animateUploadedPhoto(photo.id));
        if (!this.celebratedFirstUpload) {
          this.celebratedFirstUpload = true;
          this.celebrateFirstUpload();
        }
      } else {
        this.markUploadFailed(photo.id);
      }
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'Ha habido un problema durante la subida.');
      this.markUploadFailed(photo.id);
    } finally {
      this.uploading.set(false);
      this.resetTurnstile();
    }
  }

  private markUploadFailed(id: string): void {
    this.selected.update((photos) =>
      photos.map((photo) =>
        photo.id === id ? { ...photo, status: 'failed', progress: 0 } : photo,
      ),
    );
    this.error.set('No hemos podido subir esa foto. Tócala para volver a intentarlo.');
  }

  protected animateShutter(): void {
    if (this.reducedMotion) return;
    const icon = this.host.nativeElement.querySelector<HTMLElement>('.picker-icon');
    const flash = this.host.nativeElement.querySelector<HTMLElement>('.picker-flash');
    if (!icon || !flash) return;

    this.shutterTimeline?.kill();
    this.shutterTimeline = gsap
      .timeline()
      .to(icon, { scale: 0.82, rotation: -7, duration: 0.08, ease: 'power2.in' })
      .fromTo(
        flash,
        { autoAlpha: 0 },
        { autoAlpha: 0.72, duration: 0.06, ease: 'power1.out' },
        '<',
      )
      .to(flash, { autoAlpha: 0, duration: 0.28, ease: 'power2.out' })
      .to(icon, { scale: 1, rotation: 0, duration: 0.28, ease: 'back.out(2.2)' }, '<');
  }

  private async loadConfig(): Promise<void> {
    try {
      this.config.set(await this.service.getConfig());
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'No podemos abrir la subida ahora mismo.');
    } finally {
      this.loading.set(false);
      this.document.defaultView?.requestAnimationFrame(() => this.animatePickerReveal());
      void this.setupTurnstile();
    }
  }

  protected retryConfig(): void {
    this.error.set('');
    this.loading.set(true);
    void this.loadConfig();
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
      status: 'queued',
      progress: 0,
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

  private setupEntranceAnimation(): void {
    if (this.reducedMotion) return;
    this.entranceContext = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .from('.photo-header > *', {
          y: -12,
          opacity: 0,
          duration: 0.58,
          stagger: 0.08,
          clearProps: 'transform,opacity',
        })
        .from(
          '.upload-card',
          {
            y: 24,
            scale: 0.985,
            opacity: 0,
            duration: 0.68,
            clearProps: 'transform,opacity',
          },
          '-=0.34',
        )
        .from(
          '.upload-card > .eyebrow',
          {
            y: 10,
            opacity: 0,
            duration: 0.42,
            clearProps: 'transform,opacity',
          },
          '-=0.34',
        )
        .from(
          '.upload-title .title-line > span',
          {
            yPercent: 115,
            rotation: 1.5,
            duration: 0.62,
            stagger: 0.09,
            ease: 'power4.out',
            clearProps: 'transform',
          },
          '-=0.25',
        )
        .from(
          '.upload-card > .intro',
          {
            y: 10,
            opacity: 0,
            duration: 0.42,
            clearProps: 'transform,opacity',
          },
          '-=0.34',
        );
    }, this.host.nativeElement);
  }

  private animatePickerReveal(): void {
    if (this.reducedMotion) return;
    const picker = this.host.nativeElement.querySelector<HTMLElement>('.picker');
    const camera = picker?.querySelector<HTMLElement>('.camera-stage');
    if (!picker || !camera) return;

    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .from(picker, {
        y: 18,
        scale: 0.985,
        opacity: 0,
        duration: 0.55,
        clearProps: 'transform,opacity',
      })
      .from(
        camera,
        {
          scale: 0.65,
          rotation: -12,
          opacity: 0,
          duration: 0.5,
          ease: 'back.out(1.8)',
          clearProps: 'transform,opacity',
        },
        '-=0.28',
      )
      .from(
        picker.querySelectorAll('.picker-title, .picker-invitation, .picker-hint'),
        {
          y: 7,
          opacity: 0,
          duration: 0.32,
          stagger: 0.06,
          clearProps: 'transform,opacity',
        },
        '-=0.25',
      );
  }

  private animateNewPhotos(ids: string[]): void {
    if (this.reducedMotion || !ids.length) return;
    const cards = [...this.host.nativeElement.querySelectorAll<HTMLElement>('.photo-card')].filter(
      (card) => ids.includes(card.dataset['photoId'] ?? ''),
    );
    if (!cards.length) return;

    const stack = this.host.nativeElement.querySelector<HTMLElement>('.preview-stack');
    stack?.scrollTo({ left: stack.scrollWidth, behavior: 'smooth' });

    gsap.from(cards, {
      y: 34,
      scale: 0.84,
      rotation: (index) => [-7, 6, -4][index % 3],
      opacity: 0,
      duration: 0.62,
      stagger: 0.1,
      ease: 'back.out(1.55)',
      clearProps: 'transform,opacity',
    });
    gsap.from(
      cards
        .map((card) => card.querySelector('img'))
        .filter((image): image is HTMLImageElement => image instanceof HTMLImageElement),
      {
        filter: 'sepia(.85) saturate(.3) contrast(.82) brightness(1.12)',
        duration: 1.25,
        stagger: 0.1,
        ease: 'power2.out',
        clearProps: 'filter',
      },
    );
  }

  private animateUploadStart(id: string): void {
    if (this.reducedMotion) return;
    const card = [...this.host.nativeElement.querySelectorAll<HTMLElement>('.photo-card')].find(
      (item) => item.dataset['photoId'] === id,
    );
    if (!card) return;
    gsap.fromTo(
      card,
      { scale: 1 },
      { scale: 0.975, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' },
    );
  }

  private animateUploadedPhoto(id: string): void {
    if (this.reducedMotion) return;
    const card = [...this.host.nativeElement.querySelectorAll<HTMLElement>('.photo-card')].find(
      (item) => item.dataset['photoId'] === id,
    );
    if (!card) return;
    gsap.fromTo(
      card,
      { scale: 0.96 },
      { scale: 1, duration: 0.42, ease: 'back.out(2)', clearProps: 'scale' },
    );
  }

  private celebrateFirstUpload(): void {
    if (this.reducedMotion) return;

    const petalShape = confetti.shapeFromPath(
      'M12 1C20 3 25 10 22 17C19 24 10 25 4 20C-2 14 1 5 8 2C9 1 11 1 12 1Z',
    );
    const petals = {
      particleCount: 12,
      spread: 58,
      startVelocity: 24,
      gravity: 0.72,
      scalar: 0.72,
      ticks: 180,
      colors: ['#e6b8b7', '#c17e82', '#d8c59b', '#fffaf2'],
      shapes: [petalShape],
      disableForReducedMotion: true,
    } satisfies confetti.Options;
    void confetti({ ...petals, angle: 62, origin: { x: 0.08, y: 0.62 } });
    void confetti({ ...petals, angle: 118, origin: { x: 0.92, y: 0.62 } });
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
        appearance: 'interaction-only',
        action: 'photo-upload',
        callback: (token: string) => {
          this.turnstileToken = token;
          this.turnstileReady.set(true);
          this.turnstileError.set('');
          void this.uploadPending();
        },
        'expired-callback': () => {
          this.turnstileToken = '';
          this.turnstileReady.set(false);
        },
        'error-callback': () => {
          this.turnstileToken = '';
          this.turnstileReady.set(false);
          this.turnstileError.set(
            'No hemos podido completar la comprobación de seguridad. Si has abierto el enlace desde WhatsApp o Instagram, ábrelo en Safari o Chrome.',
          );
          return true;
        },
      });
    } catch {
      this.turnstileError.set(
        'No hemos podido cargar la comprobación de seguridad. Si has abierto el enlace desde WhatsApp o Instagram, ábrelo en Safari o Chrome.',
      );
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
