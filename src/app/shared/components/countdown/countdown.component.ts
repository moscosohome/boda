import { Component, OnDestroy, OnInit, computed, input, signal } from '@angular/core';

interface CountdownPart {
  label: string;
  value: string;
}

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

@Component({
  selector: 'app-countdown',
  standalone: true,
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.scss',
})
export class CountdownComponent implements OnInit, OnDestroy {
  readonly targetDate = input.required<Date>();
  protected readonly now = signal(Date.now());
  private intervalId?: ReturnType<typeof setInterval>;

  protected readonly remainingMs = computed(() =>
    Math.max(this.targetDate().getTime() - this.now(), 0),
  );

  protected readonly hasFinished = computed(() => this.remainingMs() <= 0);

  protected readonly parts = computed<CountdownPart[]>(() => {
    const total = this.remainingMs();
    const days = Math.floor(total / DAY);
    const hours = Math.floor((total % DAY) / HOUR);
    const minutes = Math.floor((total % HOUR) / MINUTE);
    const seconds = Math.floor((total % MINUTE) / SECOND);

    return [
      { label: 'Días', value: String(days).padStart(2, '0') },
      { label: 'Horas', value: String(hours).padStart(2, '0') },
      { label: 'Minutos', value: String(minutes).padStart(2, '0') },
      { label: 'Segundos', value: String(seconds).padStart(2, '0') },
    ];
  });

  ngOnInit(): void {
    this.intervalId = setInterval(() => this.now.set(Date.now()), SECOND);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
