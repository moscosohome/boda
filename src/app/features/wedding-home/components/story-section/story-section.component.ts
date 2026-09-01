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

interface StorySwiperElement extends HTMLElement {
  swiper?: {
    activeIndex: number;
    destroyed: boolean;
    progress: number;
    setProgress: (progress: number, speed?: number) => void;
  };
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
  private swipeCueDismissed = false;
  private swipeCueArmed = true;
  private readonly cancelSwipeCueOnInteraction = (): void => {
    this.swipeCueDismissed = true;
    this.cancelSwipeCue();
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
      swiper.addEventListener('pointerdown', this.cancelSwipeCueOnInteraction, { passive: true });

      this.swipeCueObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry) {
            return;
          }

          if (!entry.isIntersecting || entry.intersectionRatio <= 0.08) {
            this.cancelSwipeCue();
            this.swipeCueDismissed = false;
            this.swipeCueArmed = true;
            return;
          }

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
    this.swiperElement?.removeEventListener('pointerdown', this.cancelSwipeCueOnInteraction);
    window.clearTimeout(this.swipeCueStartTimer);
    window.clearTimeout(this.swipeCueReturnTimer);
  }

  private playSwipeCue(swiperElement: StorySwiperElement): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.swipeCueStartTimer = window.setTimeout(() => {
      const swiper = swiperElement.swiper;

      if (this.swipeCueDismissed || !swiper || swiper.destroyed) {
        return;
      }

      const originalProgress = swiper.progress;
      const direction = originalProgress > 0.96 ? -1 : 1;
      const previewProgress = Math.min(Math.max(originalProgress + 0.03 * direction, 0), 1);

      swiper.setProgress(previewProgress, 420);

      this.swipeCueReturnTimer = window.setTimeout(() => {
        if (!this.swipeCueDismissed && !swiper.destroyed) {
          swiper.setProgress(originalProgress, 560);
        }
      }, 520);
    }, 650);
  }

  private cancelSwipeCue(): void {
    window.clearTimeout(this.swipeCueStartTimer);
    window.clearTimeout(this.swipeCueReturnTimer);
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
