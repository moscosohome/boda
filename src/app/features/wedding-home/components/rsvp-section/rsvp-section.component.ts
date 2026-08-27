import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RsvpAttendance, RsvpSubmission } from '../../../../core/models/rsvp.model';
import { RsvpService } from '../../../../core/services/rsvp.service';

@Component({
  selector: 'app-rsvp-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './rsvp-section.component.html',
  styleUrl: './rsvp-section.component.scss',
})
export class RsvpSectionComponent {
  private readonly rsvpService = inject(RsvpService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');

  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    attending: new FormControl<RsvpAttendance | null>(null, {
      validators: [Validators.required],
    }),
    guests: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    allergies: new FormControl('', { nonNullable: true }),
    comments: new FormControl('', { nonNullable: true }),
  });

  protected submit(): void {
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const submission: RsvpSubmission = {
      fullName: value.fullName.trim(),
      attending: value.attending === 'yes',
      guests: value.guests,
      allergies: value.allergies.trim() || undefined,
      comments: value.comments.trim() || undefined,
      submittedAt: new Date().toISOString(),
    };

    this.isSubmitting.set(true);
    this.rsvpService
      .submitRsvp(submission)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.successMessage.set(result.message);
            this.form.reset({
              fullName: '',
              attending: null,
              guests: 0,
              allergies: '',
              comments: '',
            });
          }
          this.isSubmitting.set(false);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }

  protected hasError(controlName: keyof RsvpSectionComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
