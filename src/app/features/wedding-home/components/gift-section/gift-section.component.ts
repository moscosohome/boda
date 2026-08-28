import { Component } from '@angular/core';
import {
  FaqAccordionComponent,
  FaqItem,
} from '../../../../shared/components/faq-accordion/faq-accordion.component';
import { GuestMessageSectionComponent } from '../guest-message-section/guest-message-section.component';

@Component({
  selector: 'app-gift-section',
  standalone: true,
  imports: [FaqAccordionComponent, GuestMessageSectionComponent],
  templateUrl: './gift-section.component.html',
  styleUrl: './gift-section.component.scss',
})
export class GiftSectionComponent {
  protected readonly faqs: FaqItem[] = [
    {
      question: '¿A qué hora empieza la boda?',
      answer: 'La hora está pendiente de confirmar, pero será aproximadamente a las 19:30.',
    },
    {
      question: '¿Dónde es la celebración?',
      answer: 'La boda se celebra en el Recreo San Luis.',
    },
    {
      question: '¿Hay aparcamiento?',
      answer: '¡Si! Hay más de 50 plazas y en los alrededores también se puede aparcar facilmente.',
    },
    {
      question: '¿Que precio tiene el cubierto?',
      answer:
        'No lo sabemos todavía, tenemos que decidir aún el menú, aproximádamente unos 100€. Te informaremos cuando te demos la invitación y además lo indicaremos por aquí',
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
