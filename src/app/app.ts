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
  protected readonly showPaperGrain = signal(false);
  protected readonly showTopFade = signal(false);
  protected readonly showBottomFade = signal(false);
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
    const hasEnteredContent = scrollTop > viewportHeight * 0.92;
    const isAtBottom = maxScroll - scrollTop <= 4;

    this.showPaperGrain.set(hasEnteredContent);
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

  ngOnInit(): void {
    const view = this.document.defaultView;

    if (view?.location.hostname === 'www.cristinayantonio.com.es') {
      const canonicalUrl = new URL(view.location.href);
      canonicalUrl.hostname = 'cristinayantonio.com.es';
      view.location.replace(canonicalUrl.toString());
      return;
    }

    view?.addEventListener('scroll', this.scheduleViewportFadeUpdate, { passive: true });
    view?.addEventListener('resize', this.scheduleViewportFadeUpdate, { passive: true });
    this.scheduleViewportFadeUpdate();
  }

  ngOnDestroy(): void {
    const view = this.document.defaultView;

    view?.removeEventListener('scroll', this.scheduleViewportFadeUpdate);
    view?.removeEventListener('resize', this.scheduleViewportFadeUpdate);

    if (view && this.viewportUpdateFrame !== undefined) {
      view.cancelAnimationFrame(this.viewportUpdateFrame);
    }
  }
}
