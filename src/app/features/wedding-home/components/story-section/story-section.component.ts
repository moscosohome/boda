import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface StoryPhoto {
  label: string;
  caption: string;
  imageUrls?: string[];
  instagramEmbedUrl?: SafeResourceUrl;
  instagramUrl?: string;
  alt?: string;
  currentImageIndex?: number;
  hasLoadError?: boolean;
}

@Component({
  selector: 'app-story-section',
  standalone: true,
  templateUrl: './story-section.component.html',
  styleUrl: './story-section.component.scss',
})
export class StorySectionComponent {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly photos: StoryPhoto[] = [
    {
      label: 'Foto 01',
      caption: 'Una de nuestras primeras fotos juntos. Sin imaginar todo lo que vendría después.',
      imageUrls: ['/images/primera_foto.png'],
      alt: 'Cristina & Antonio al comienzo de su historia',
    },
    {
      label: 'Foto 02',
      caption: 'Dos jovenés allá por 2015',
      imageUrls: ['/images/segunda_foto.png'],
      alt: 'Retrato en acuarela de Cristina & Antonio abrazados',
    },
    {
      label: 'Foto 03',
      caption: 'Siempre juntos. 2018',
      imageUrls: ['/images/tercera_foto.png'],
      alt: 'Retrato en acuarela de Antonio besando a Cristina en la mejilla',
    },
    {
      label: 'Foto 04',
      caption: 'Nueva meta juntos y nueva etapa por empezar. Noviembre 2021',
      imageUrls: ['/images/cuarta_foto.png'],
      alt: 'Las manos de Cristina & Antonio formando un corazón alrededor de las llaves de su hogar',
    },
    {
      label: 'Foto 05',
      caption: 'Siempre caminando juntos. 2025',
      imageUrls: ['/images/quinta_foto.png'],
      alt: 'Cristina & Antonio paseando de la mano junto al mar',
    },
    {
      label: 'Foto 06',
      caption:
        'Y llegó el día. Aquella tarde de diciembre, a las siete —porque el siete siempre ha sido nuestro número—, todo salió tal y como lo había imaginado. ' +
        'Solo tú y yo, los nervios, París ante nosotros… y, de repente, la torre empezó a parpadear. ' +
        'Era nuestro momento. 4 de diciembre de 2025',
      instagramEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
        'https://www.instagram.com/p/DTn37xeDHpo/embed/',
      ),
      instagramUrl: 'https://www.instagram.com/p/DTn37xeDHpo/',
      imageUrls: [
        '/images/pedida-paris.webp',
        '/images/pedida-paris.png',
        '/images/pedida-paris.jpg',
        '/images/pedida-paris.jpeg',
      ],
      alt: 'La pedida de Cristina & Antonio frente a la Torre Eiffel',
    },
  ];

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

  protected refreshScrollAnimations(): void {
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
}
