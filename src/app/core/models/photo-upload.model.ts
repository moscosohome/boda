export interface PhotoUploadConfig {
  turnstileSiteKey: string;
  uploadsOpen: boolean;
  maxBatchFiles: number;
  maxFileBytes: number;
}

export interface PhotoUploadResult {
  ok: boolean;
  uploaded: number;
  failed: number;
  results: Array<{ clientName: string; success: boolean }>;
}

export interface AdminPhoto {
  id: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface PhotoAdminSummary {
  settings: {
    uploadsOpen: boolean;
    maxStorageBytes: number;
    totalPhotos: number;
    usedBytes: number;
    reservedBytes: number;
    updatedAt: string;
  };
  photos: AdminPhoto[];
}
