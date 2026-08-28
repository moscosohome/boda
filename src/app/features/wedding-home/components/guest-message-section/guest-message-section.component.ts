import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

type SubmissionStatus = 'idle' | 'sending' | 'success' | 'error';

@Component({
  selector: 'app-guest-message-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './guest-message-section.component.html',
  styleUrl: './guest-message-section.component.scss',
})
export class GuestMessageSectionComponent {
  protected readonly messageLimit = 800;
  protected readonly isOpen = signal(false);
  protected readonly status = signal<SubmissionStatus>('idle');
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(800)],
    }),
    website: new FormControl('', { nonNullable: true }),
  });

  private formOpenedAt = Date.now();

  protected toggleMessageForm(): void {
    this.isOpen.update((isOpen) => {
      if (!isOpen) {
        this.formOpenedAt = Date.now();
      }

      return !isOpen;
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.status() === 'sending') {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('sending');

    try {
      const response = await fetch('/api/guest-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.form.controls.name.value.trim(),
          message: this.form.controls.message.value.trim(),
          website: this.form.controls.website.value,
          startedAt: this.formOpenedAt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Message delivery failed with status ${response.status}`);
      }

      this.form.reset();
      this.formOpenedAt = Date.now();
      this.status.set('success');
    } catch {
      this.status.set('error');
    }
  }

  protected editAgain(): void {
    if (this.status() !== 'sending') {
      this.status.set('idle');
    }
  }
}
