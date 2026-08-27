import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private lastTouchEnd = 0;

  private readonly preventGesture = (event: Event): void => {
    event.preventDefault();
  };

  private readonly preventMultiTouch = (event: TouchEvent): void => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  private readonly preventDoubleTap = (event: TouchEvent): void => {
    const now = Date.now();

    if (now - this.lastTouchEnd <= 300) {
      event.preventDefault();
    }

    this.lastTouchEnd = now;
  };

  ngOnInit(): void {
    const listenerOptions: AddEventListenerOptions = { passive: false };

    this.document.addEventListener('gesturestart', this.preventGesture, listenerOptions);
    this.document.addEventListener('gesturechange', this.preventGesture, listenerOptions);
    this.document.addEventListener('gestureend', this.preventGesture, listenerOptions);
    this.document.addEventListener('touchmove', this.preventMultiTouch, listenerOptions);
    this.document.addEventListener('touchend', this.preventDoubleTap, listenerOptions);
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('gesturestart', this.preventGesture);
    this.document.removeEventListener('gesturechange', this.preventGesture);
    this.document.removeEventListener('gestureend', this.preventGesture);
    this.document.removeEventListener('touchmove', this.preventMultiTouch);
    this.document.removeEventListener('touchend', this.preventDoubleTap);
  }
}
