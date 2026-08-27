import { Component } from '@angular/core';

@Component({
  selector: 'app-intro-section',
  standalone: true,
  templateUrl: './intro-section.component.html',
  styleUrl: './intro-section.component.scss',
})
export class IntroSectionComponent {
  protected readonly lines = [
    'Después de tantos momentos juntos,',
    'queremos celebrar este día',
    'con vosotros.',
  ];
}
