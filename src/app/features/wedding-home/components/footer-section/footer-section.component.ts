import { Component } from '@angular/core';
import { WEDDING_EVENT } from '../../../../core/wedding.config';

@Component({
  selector: 'app-footer-section',
  standalone: true,
  templateUrl: './footer-section.component.html',
  styleUrl: './footer-section.component.scss',
})
export class FooterSectionComponent {
  protected readonly event = WEDDING_EVENT;
}
