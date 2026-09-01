import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { WEDDING_EVENT } from '../../../../core/wedding.config';

@Component({
  selector: 'app-save-the-date-section',
  standalone: true,
  templateUrl: './save-the-date-section.component.html',
  styleUrl: './save-the-date-section.component.scss',
})
export class SaveTheDateSectionComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private previousBodyOverflow = '';

  protected readonly videoUrl =
    'https://media.cristinayantonio.com.es/lv_0_20260817170457.mp4';
  protected readonly event = WEDDING_EVENT;
  protected readonly isPlaying = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly hasPlaybackError = signal(false);

  protected playVideo(): void {
    this.hasPlaybackError.set(false);
    this.isLoading.set(true);
    this.isPlaying.set(true);
    this.lockPageScroll();
  }

  protected closeVideo(): void {
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.hasPlaybackError.set(false);
    this.unlockPageScroll();
  }

  protected videoReady(): void {
    this.isLoading.set(false);
  }

  protected videoFailed(): void {
    this.isLoading.set(false);
    this.hasPlaybackError.set(true);
  }

  protected retryVideo(): void {
    this.isPlaying.set(false);
    this.hasPlaybackError.set(false);
    this.isLoading.set(true);
    window.setTimeout(() => this.isPlaying.set(true));
  }

  @HostListener('document:keydown.escape')
  protected closeVideoWithEscape(): void {
    if (this.isPlaying()) {
      this.closeVideo();
    }
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  private lockPageScroll(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  private unlockPageScroll(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
  }
}
