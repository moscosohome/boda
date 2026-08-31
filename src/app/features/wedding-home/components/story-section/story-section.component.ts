import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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

@Component({
  selector: 'app-story-section',
  standalone: true,
  templateUrl: './story-section.component.html',
  styleUrl: './story-section.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class StorySectionComponent {
  protected readonly proposalInstagramUrl = 'https://www.instagram.com/p/DTn37xeDHpo/';
  protected readonly photos: StoryPhoto[] = [
    {
      label: 'Foto 01',
      moment: '2013',
      caption: 'Una de nuestras primeras fotos juntos. Sin imaginar todo lo que vendría después.',
      imageUrls: ['/images/primera_foto.png'],
      alt: 'Cristina & Antonio al comienzo de su historia',
    },
    {
      label: 'Foto 02',
      moment: '2015',
      imageUrls: ['/images/segunda_foto.png'],
      alt: 'Retrato en acuarela de Cristina & Antonio abrazados',
    },
    {
      label: 'Foto 03',
      moment: '2018',
      imageUrls: ['/images/tercera_foto.png'],
      alt: 'Retrato en acuarela de Antonio besando a Cristina en la mejilla',
    },
    {
      label: 'Foto 04',
      moment: '2021',
      imageUrls: ['/images/cuarta_foto.png'],
      alt: 'Las manos de Cristina & Antonio formando un corazón alrededor de las llaves de su hogar',
    },
    {
      label: 'Foto 05',
      moment: '2025',
      imageUrls: ['/images/quinta_foto.png'],
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
