import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminPhoto, PhotoAdminSummary } from '../../core/models/photo-upload.model';
import { PhotoUploadService } from '../../core/services/photo-upload.service';

@Component({
  selector: 'app-photo-admin',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './photo-admin.component.html',
  styleUrl: './photo-admin.component.scss',
})
export class PhotoAdminComponent {
  private readonly service = inject(PhotoUploadService);
  protected readonly summary = signal<PhotoAdminSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly changing = signal(false);
  protected readonly devToken = signal(this.service.getAdminDevToken());

  constructor() {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.error.set('');
    try {
      this.summary.set(await this.service.getAdminSummary());
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'No se ha podido cargar el álbum.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggleUploads(): Promise<void> {
    const current = this.summary();
    if (!current || this.changing()) return;
    this.changing.set(true);
    try {
      await this.service.setUploadsOpen(!current.settings.uploadsOpen);
      await this.refresh();
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'No se ha podido cambiar el estado.');
    } finally {
      this.changing.set(false);
    }
  }

  protected async deletePhoto(photo: AdminPhoto): Promise<void> {
    if (!confirm('¿Eliminar esta fotografía definitivamente?')) return;
    try {
      await this.service.deletePhoto(photo.id);
      await this.refresh();
    } catch (reason) {
      this.error.set(reason instanceof Error ? reason.message : 'No se ha podido eliminar la fotografía.');
    }
  }

  protected photoUrl(id: string): string {
    const token = this.devToken();
    return token
      ? `${this.service.adminPhotoUrl(id)}&dev_token=${encodeURIComponent(token)}`
      : this.service.adminPhotoUrl(id);
  }

  protected useDevToken(): void {
    const token = this.devToken().trim();
    if (!token) return;
    this.service.setAdminDevToken(token);
    this.loading.set(true);
    void this.refresh();
  }

  protected percentage(): number {
    const settings = this.summary()?.settings;
    return settings ? Math.min(100, (settings.usedBytes / settings.maxStorageBytes) * 100) : 0;
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
    if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
}
