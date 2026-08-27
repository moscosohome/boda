import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  protected readonly showTopFade = signal(false);
  protected readonly showBottomFade = signal(false);
  private lastTouchEnd = 0;
  private viewportUpdateFrame?: number;

  private readonly updateViewportFades = (): void => {
    const view = this.document.defaultView;
    const scrollingElement = this.document.scrollingElement;

    if (!view || !scrollingElement) {
      return;
    }

    const scrollTop = Math.max(view.scrollY, 0);
    const viewportHeight = view.innerHeight;
    const maxScroll = Math.max(scrollingElement.scrollHeight - viewportHeight, 0);
    const hasLeftHero = scrollTop > viewportHeight * 0.72;
    const isAtBottom = maxScroll - scrollTop <= 4;

    this.showTopFade.set(hasLeftHero);
    this.showBottomFade.set(hasLeftHero && !isAtBottom);
  };

  private readonly scheduleViewportFadeUpdate = (): void => {
    const view = this.document.defaultView;

    if (!view || this.viewportUpdateFrame !== undefined) {
      return;
    }

    this.viewportUpdateFrame = view.requestAnimationFrame(() => {
      this.viewportUpdateFrame = undefined;
      this.updateViewportFades();
    });
  };

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
    const view = this.document.defaultView;

    this.document.addEventListener('gesturestart', this.preventGesture, listenerOptions);
    this.document.addEventListener('gesturechange', this.preventGesture, listenerOptions);
    this.document.addEventListener('gestureend', this.preventGesture, listenerOptions);
    this.document.addEventListener('touchmove', this.preventMultiTouch, listenerOptions);
    this.document.addEventListener('touchend', this.preventDoubleTap, listenerOptions);
    view?.addEventListener('scroll', this.scheduleViewportFadeUpdate, { passive: true });
    view?.addEventListener('resize', this.scheduleViewportFadeUpdate, { passive: true });
    this.scheduleViewportFadeUpdate();
  }

  ngOnDestroy(): void {
    const view = this.document.defaultView;

    this.document.removeEventListener('gesturestart', this.preventGesture);
    this.document.removeEventListener('gesturechange', this.preventGesture);
    this.document.removeEventListener('gestureend', this.preventGesture);
    this.document.removeEventListener('touchmove', this.preventMultiTouch);
    this.document.removeEventListener('touchend', this.preventDoubleTap);
    view?.removeEventListener('scroll', this.scheduleViewportFadeUpdate);
    view?.removeEventListener('resize', this.scheduleViewportFadeUpdate);

    if (view && this.viewportUpdateFrame !== undefined) {
      view.cancelAnimationFrame(this.viewportUpdateFrame);
    }
  }
}
