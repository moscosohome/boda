import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-reveal',
  standalone: true,
  templateUrl: './reveal.component.html',
  styleUrl: './reveal.component.scss',
  host: {
    '[class.is-visible]': 'isVisible()',
    '[style.--reveal-delay.ms]': 'delay()',
  },
})
export class RevealComponent implements AfterViewInit, OnDestroy {
  readonly delay = input(0);
  protected readonly isVisible = signal(false);
  private observer?: IntersectionObserver;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (!('IntersectionObserver' in window)) {
      this.isVisible.set(true);
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.isVisible.set(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
