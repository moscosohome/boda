import { Component } from '@angular/core';

interface StoryPhoto {
  label: string;
  caption: string;
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
})
export class StorySectionComponent {
  protected readonly photos: StoryPhoto[] = [
    {
      label: 'Foto 01',
      caption: 'Un comienzo tranquilo',
      imageUrls: ['/images/primera_foto.png'],
      alt: 'Cristina & Antonio al comienzo de su historia',
    },
    {
      label: 'Foto 02',
      caption: 'Un viaje para recordar',
      imageUrls: ['/images/segunda_foto.png'],
      alt: 'Retrato en acuarela de Cristina & Antonio abrazados',
    },
    {
      label: 'Foto 03',
      caption: 'Siempre juntos',
      imageUrls: ['/images/tercera_foto.png'],
      alt: 'Retrato en acuarela de Antonio besando a Cristina en la mejilla',
    },
    {
      label: 'Foto 04',
      caption: 'Nuestro hogar',
      imageUrls: ['/images/cuarta_foto.png'],
      alt: 'Las manos de Cristina & Antonio formando un corazón alrededor de las llaves de su hogar',
    },
    {
      label: 'Foto 05',
      caption: 'Cada aventura, juntos',
      imageUrls: ['/images/quinta_foto.png'],
      alt: 'Cristina & Antonio paseando de la mano junto al mar',
    },
    {
      label: 'Foto 06',
      caption: 'La pedida',
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
