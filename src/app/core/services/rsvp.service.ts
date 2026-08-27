import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { RsvpResult, RsvpSubmission } from '../models/rsvp.model';

@Injectable({
  providedIn: 'root',
})
export class RsvpService {
  submitRsvp(_submission: RsvpSubmission): Observable<RsvpResult> {
    return of({
      success: true,
      message: 'Confirmación recibida. Gracias por responder con tanto cariño.',
    }).pipe(delay(700));
  }
}
