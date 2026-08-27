import { Component } from '@angular/core';
import {
  FaqAccordionComponent,
  FaqItem,
} from '../../../../shared/components/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-gift-section',
  standalone: true,
  imports: [FaqAccordionComponent],
  templateUrl: './gift-section.component.html',
  styleUrl: './gift-section.component.scss',
})
export class GiftSectionComponent {
  protected readonly faqs: FaqItem[] = [
    {
      question: '¿A qué hora empieza la boda?',
      answer: 'La ceremonia está prevista para las 19:30.',
    },
    {
      question: '¿Dónde es la celebración?',
      answer: 'La boda se celebra en El Recreo San Luis.',
    },
    {
      question: '¿Hay aparcamiento?',
      answer: 'Añadiremos aquí las indicaciones definitivas sobre acceso y aparcamiento.',
    },
    {
      question: '¿Puedo llevar acompañante?',
      answer: 'Confírmalo en el formulario para que podamos organizar bien los espacios.',
    },
    {
      question: '¿Debo confirmar asistencia?',
      answer:
        'Sí. Para confirmar tu asistencia, envíanos el justificante de pago por WhatsApp a Antonio o a Cristina.',
    },
    {
      question: '¿Hay alguna indicación sobre vestimenta?',
      answer: 'Más adelante añadiremos cualquier detalle útil sobre vestimenta o clima.',
    },
  ];
}
