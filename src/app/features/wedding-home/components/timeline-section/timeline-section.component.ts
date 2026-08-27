import { Component } from '@angular/core';

@Component({
  selector: 'app-timeline-section',
  standalone: true,
  templateUrl: './timeline-section.component.html',
  styleUrl: './timeline-section.component.scss',
})
export class TimelineSectionComponent {
  protected readonly schedule = [
    {
      title: 'La ceremonia',
      text: 'El momento de decir «sí, quiero».',
    },
    {
      title: 'El cóctel',
      text: 'Brindaremos, picaremos algo y nos haremos muchas fotos.',
    },
    {
      title: 'La cena',
      text: 'Nos sentaremos juntos para celebrar como se merece.',
    },
    {
      title: 'La fiesta',
      text: 'Bailaremos hasta que el cuerpo aguante.',
    },
  ];
}
