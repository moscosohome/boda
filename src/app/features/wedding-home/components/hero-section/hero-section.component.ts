import { Component } from '@angular/core';
import { WEDDING_EVENT } from '../../../../core/wedding.config';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
})
export class HeroSectionComponent {
  protected readonly event = WEDDING_EVENT;
}
