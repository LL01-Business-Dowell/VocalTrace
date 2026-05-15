/**
 * MediScan Data Models
 * NOTE: In production, all patient data must comply with HIPAA/Privacy regulations.
 * PII and PHI must be encrypted at rest and in transit.
 */

export interface User {
  id?: string;
  // success?: boolean;
  mobile: string;
  facilityName: string;
  address: string;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface Medicine {
  medId: string;
  name: string;
  dosage: string;
  notes: string;
  audioUrl?: string;
  imageUrl?: string;
  audioBlob?: Blob;
  imageBlob?: Blob;
  audioBuffer?: string; // base64
  imageBuffer?: string; // base64
  audioType?: string;
  imageType?: string;
}

export type PrescriptionStatus = 'DRAFT' | 'FINALIZED';
export type transcriptReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Prescription {
  id?: string;
  patientId: string;
  status: PrescriptionStatus;
  createdAt: string;
  medicines: Medicine[];
}

export interface RegisterFacilityData {
  facilityId: string;
  facilityName: string;
  address: string;
  mobile: string;
}
