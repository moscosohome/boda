import { Component } from '@angular/core';

@Component({
  selector: 'app-timeline-section',
  standalone: true,
  templateUrl: './timeline-section.component.html',
  styleUrl: './timeline-section.component.scss',
})
export class TimelineSectionComponent {
  protected readonly milestones = [
    {
      title: 'Nos conocimos',
      text: 'Un primer encuentro que parecía pequeño y terminó cambiándolo todo.',
    },
    {
      title: 'Primer viaje',
      text: 'La primera escapada, las primeras fotos y la certeza de querer repetir.',
    },
    {
      title: 'La pedida',
      text: 'Una pregunta sencilla, una respuesta inmensa y una fecha marcada.',
    },
    {
      title: 'El gran día',
      text: 'El momento de celebrarlo con las personas que forman parte de nuestra historia.',
    },
  ];
}
