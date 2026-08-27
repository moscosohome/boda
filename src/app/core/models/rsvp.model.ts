export type RsvpAttendance = 'yes' | 'no';

export interface RsvpSubmission {
  fullName: string;
  attending: boolean;
  guests: number;
  allergies?: string;
  comments?: string;
  submittedAt: string;
}

export interface RsvpResult {
  success: boolean;
  message: string;
}
