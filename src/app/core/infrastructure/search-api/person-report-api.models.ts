/** Contratos REP-02/03/04 del Motor SPM para búsquedas temporales Person. */
export interface PersonReportReceipt {
  reportJobId: string;
  datasetId: string;
  reportId?: string | null;
  status?: string | null;
  requestedAtUtc?: string | null;
  datasetExpiresAtUtc?: string | null;
  reused?: boolean;
}

export interface PersonReportProgress {
  stage?: string | null;
  processedRecords?: number;
  totalRecords?: number | null;
  generatedPages?: number;
  estimatedPages?: number | null;
  bytesWritten?: number;
  percentage?: number;
}

export interface PersonReportFileInfo {
  fileName?: string | null;
  sizeBytes?: number;
  pageCount?: number;
  sha256?: string | null;
  available: boolean;
  availableUntilUtc?: string | null;
}

export interface PersonReportPublicError {
  code?: string | null;
  message?: string | null;
  retryable?: boolean;
}

export interface PersonReportStatusResponse {
  reportJobId: string;
  searchId: string;
  reportId?: string | null;
  status?: string | null;
  deliveryStatus?: string | null;
  requestedAtUtc?: string | null;
  accessExpiresAtUtc?: string | null;
  progress?: PersonReportProgress | null;
  file?: PersonReportFileInfo | null;
  error?: PersonReportPublicError | null;
}
