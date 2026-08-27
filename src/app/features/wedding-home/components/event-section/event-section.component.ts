import { Component } from '@angular/core';
import { WEDDING_EVENT } from '../../../../core/wedding.config';
import { CountdownComponent } from '../../../../shared/components/countdown/countdown.component';

@Component({
  selector: 'app-event-section',
  standalone: true,
  imports: [CountdownComponent],
  templateUrl: './event-section.component.html',
  styleUrl: './event-section.component.scss',
})
export class EventSectionComponent {
  protected readonly event = WEDDING_EVENT;
  protected readonly targetDate = new Date(WEDDING_EVENT.startsAt);
}
