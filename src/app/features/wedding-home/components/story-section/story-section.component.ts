import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { register } from 'swiper/element/bundle';

if (typeof customElements !== 'undefined' && !customElements.get('swiper-container')) {
  register();
}

interface StoryPhoto {
  label: string;
  moment: string;
  caption?: string;
  imageUrls?: string[];
  alt?: string;
  currentImageIndex?: number;
  hasLoadError?: boolean;
}

interface StorySwiperInstance {
  activeIndex: number;
  destroyed: boolean;
  progress: number;
  size: number;
  translate: number;
  touchEventsData: {
    currentTranslate?: number;
    isTouched: boolean;
    startTranslate?: number;
  };
  maxTranslate: () => number;
  minTranslate: () => number;
  setTransition: (duration: number) => void;
  setTranslate: (translate: number) => void;
  slideTo: (index: number, speed?: number, runCallbacks?: boolean) => boolean;
  updateActiveIndex: () => void;
  updateProgress: (translate?: number) => void;
  updateSlidesClasses: () => void;
}

interface StorySwiperElement extends HTMLElement {
  swiper?: StorySwiperInstance;
}

@Component({
  selector: 'app-story-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './story-section.component.html',
  styleUrl: './story-section.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class StorySectionComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private swiperElement?: StorySwiperElement;
  private swipeCueObserver?: IntersectionObserver;
  private swipeCueStartTimer?: number;
  private swipeCueReturnTimer?: number;
  private swipeCueResumeTimer?: number;
  private swipeCueAnimationFrame?: number;
  private swipeCueDismissed = false;
  private swipeCueArmed = true;
  private carouselIsCentered = false;
  private interactionStart?: { x: number; y: number };
  private activeCueSwiper?: StorySwiperInstance;
  private activeCueOrigin?: number;
  private readonly cancelSwipeCueOnInteraction = (event: PointerEvent): void => {
    this.interactionStart = { x: event.clientX, y: event.clientY };
    this.swipeCueDismissed = true;
    this.cancelSwipeCue();
  };
  private readonly resumeSwipeCueAfterInteraction = (event: PointerEvent): void => {
    const start = this.interactionStart;
    this.interactionStart = undefined;

    if (!start) {
      return;
    }

    const horizontalDistance = Math.abs(event.clientX - start.x);
    const verticalDistance = Math.abs(event.clientY - start.y);

    if (horizontalDistance > verticalDistance) {
      return;
    }

    window.clearTimeout(this.swipeCueResumeTimer);
    this.swipeCueResumeTimer = window.setTimeout(() => {
      this.swipeCueDismissed = false;

      if (this.carouselIsCentered && this.swiperElement) {
        this.playSwipeCue(this.swiperElement);
      }
    }, 450);
  };
  protected readonly proposalInstagramUrl = 'https://www.instagram.com/p/DTn37xeDHpo/';
  protected readonly photos: StoryPhoto[] = [
    {
      label: 'Foto 01',
      moment: '2013',
      caption: 'Una de nuestras primeras fotos juntos. Sin imaginar todo lo que vendría después.',
      imageUrls: ['/images/primera_foto.webp', '/images/primera_foto.png'],
      alt: 'Cristina & Antonio al comienzo de su historia',
    },
    {
      label: 'Foto 02',
      moment: '2015',
      imageUrls: ['/images/segunda_foto.webp', '/images/segunda_foto.png'],
      alt: 'Retrato en acuarela de Cristina & Antonio abrazados',
    },
    {
      label: 'Foto 03',
      moment: '2018',
      imageUrls: ['/images/tercera_foto.webp', '/images/tercera_foto.png'],
      alt: 'Retrato en acuarela de Antonio besando a Cristina en la mejilla',
    },
    {
      label: 'Foto 04',
      moment: '2021',
      imageUrls: ['/images/cuarta_foto.webp', '/images/cuarta_foto.png'],
      alt: 'Las manos de Cristina & Antonio formando un corazón alrededor de las llaves de su hogar',
    },
    {
      label: 'Foto 05',
      moment: '2025',
      imageUrls: ['/images/quinta_foto.webp', '/images/quinta_foto.png'],
      alt: 'Cristina & Antonio paseando de la mano junto al mar',
    },
    {
      label: 'Foto 06',
      moment: '4 de diciembre · 2025',
      caption:
        'Y llegó el día. Aquella tarde de diciembre, a las siete —porque el siete siempre ha sido nuestro número—, todo salió tal y como lo había imaginado. ' +
        'Solo tú y yo, los nervios, París ante nosotros… y, de repente, la Torre empezó a parpadear. ' +
        'Era nuestro momento.',
      imageUrls: [
        '/images/pedida-paris.webp',
        '/images/pedida-paris.png',
        '/images/pedida-paris.jpg',
        '/images/pedida-paris.jpeg',
      ],
      alt: 'La pedida de Cristina & Antonio frente a la Torre Eiffel',
    },
  ];

  ngAfterViewInit(): void {
    const swiper =
      this.elementRef.nativeElement.querySelector<StorySwiperElement>('.story-swiper');

    if (!swiper || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.swiperElement = swiper;

    this.ngZone.runOutsideAngular(() => {
      swiper.addEventListener('pointerdown', this.cancelSwipeCueOnInteraction, {
        capture: true,
        passive: true,
      });
      swiper.addEventListener('pointerup', this.resumeSwipeCueAfterInteraction, {
        capture: true,
        passive: true,
      });
      swiper.addEventListener('pointercancel', this.resumeSwipeCueAfterInteraction, {
        capture: true,
        passive: true,
      });

      this.swipeCueObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry) {
            return;
          }

          if (!entry.isIntersecting || entry.intersectionRatio <= 0.08) {
            this.carouselIsCentered = false;
            this.cancelSwipeCue(true);
            this.swipeCueDismissed = false;
            this.swipeCueArmed = true;
            return;
          }

          this.carouselIsCentered = entry.intersectionRatio >= 0.32;

          if (entry.intersectionRatio >= 0.32 && this.swipeCueArmed) {
            this.swipeCueArmed = false;
            this.playSwipeCue(swiper);
          }
        },
        {
          rootMargin: '-18% 0px -18% 0px',
          threshold: [0.08, 0.32],
        },
      );

      this.swipeCueObserver.observe(swiper);
    });
  }

  ngOnDestroy(): void {
    this.swipeCueObserver?.disconnect();
    this.swiperElement?.removeEventListener('pointerdown', this.cancelSwipeCueOnInteraction, true);
    this.swiperElement?.removeEventListener(
      'pointerup',
      this.resumeSwipeCueAfterInteraction,
      true,
    );
    this.swiperElement?.removeEventListener(
      'pointercancel',
      this.resumeSwipeCueAfterInteraction,
      true,
    );
    window.clearTimeout(this.swipeCueStartTimer);
    window.clearTimeout(this.swipeCueReturnTimer);
    window.clearTimeout(this.swipeCueResumeTimer);
    window.cancelAnimationFrame(this.swipeCueAnimationFrame ?? 0);
  }

  private playSwipeCue(swiperElement: StorySwiperElement): void {
    this.swipeCueStartTimer = window.setTimeout(() => {
      const swiper = swiperElement.swiper;

      if (this.swipeCueDismissed || !swiper || swiper.destroyed) {
        return;
      }

      const originalIndex = swiper.activeIndex;
      const originalTranslate = swiper.translate;
      const direction = swiper.progress > 0.96 ? 1 : -1;
      const dragDistance = swiper.size * 0.30;
      const previewTranslate = Math.min(
        Math.max(originalTranslate + dragDistance * direction, swiper.maxTranslate()),
        swiper.minTranslate(),
      );

      this.activeCueSwiper = swiper;
      this.activeCueOrigin = originalIndex;
      swiper.setTransition(0);
      swiper.touchEventsData.isTouched = true;
      swiper.touchEventsData.startTranslate = originalTranslate;
      swiper.touchEventsData.currentTranslate = originalTranslate;

      this.animateSwiperTouchDrag(swiper, originalTranslate, previewTranslate, 850);

      this.swipeCueReturnTimer = window.setTimeout(() => {
        if (this.swipeCueDismissed || swiper.destroyed) {
          return;
        }

        swiper.touchEventsData.isTouched = false;
        swiper.slideTo(originalIndex, 820, false);
        this.activeCueSwiper = undefined;
        this.activeCueOrigin = undefined;
      }, 1050);
    }, 650);
  }

  private animateSwiperTouchDrag(
    swiper: StorySwiperInstance,
    from: number,
    to: number,
    duration: number,
  ): void {
    window.cancelAnimationFrame(this.swipeCueAnimationFrame ?? 0);
    const startedAt = performance.now();

    const renderFrame = (now: number): void => {
      if (this.swipeCueDismissed || swiper.destroyed) {
        return;
      }

      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
      const currentTranslate = from + (to - from) * easedProgress;

      swiper.touchEventsData.currentTranslate = currentTranslate;
      swiper.updateProgress(currentTranslate);
      swiper.updateActiveIndex();
      swiper.updateSlidesClasses();
      swiper.setTranslate(currentTranslate);

      if (progress < 1) {
        this.swipeCueAnimationFrame = window.requestAnimationFrame(renderFrame);
        return;
      }

      this.swipeCueAnimationFrame = undefined;
    };

    this.swipeCueAnimationFrame = window.requestAnimationFrame(renderFrame);
  }

  private cancelSwipeCue(restorePosition = false): void {
    window.clearTimeout(this.swipeCueStartTimer);
    window.clearTimeout(this.swipeCueReturnTimer);
    window.cancelAnimationFrame(this.swipeCueAnimationFrame ?? 0);
    this.swipeCueAnimationFrame = undefined;

    if (this.activeCueSwiper && !this.activeCueSwiper.destroyed) {
      this.activeCueSwiper.touchEventsData.isTouched = false;
    }

    if (
      restorePosition &&
      this.activeCueSwiper &&
      !this.activeCueSwiper.destroyed &&
      this.activeCueOrigin !== undefined
    ) {
      this.activeCueSwiper.slideTo(this.activeCueOrigin, 0, false);
    }

    this.activeCueSwiper = undefined;
    this.activeCueOrigin = undefined;
  }

  protected getImageUrl(photo: StoryPhoto): string | null {
    if (photo.hasLoadError) {
      return null;
    }

    return photo.imageUrls?.[photo.currentImageIndex ?? 0] ?? null;
  }

  protected markImageAsUnavailable(photo: StoryPhoto): void {
    const nextIndex = (photo.currentImageIndex ?? 0) + 1;

    if (photo.imageUrls?.[nextIndex]) {
      photo.currentImageIndex = nextIndex;
      return;
    }

    photo.hasLoadError = true;
  }
}
