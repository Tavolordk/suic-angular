export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
  errors?: Array<{ code?: string | null; message?: string | null }> | null;
  traceId?: string | null;
}

/** Respuesta del POST /api/search/{searchId}/save (no equivale a guardar tarjeta). */
export interface SavedSearchResponse {
  contractVersion: string;
  searchId: string;
  snapshotId: string;
  snapshotVersion: number;
  snapshotContractVersion: string;
  retainUntilUtc: string;
  repeated: boolean;
}

export interface SearchCriterionDto {
  field: string;
  value: string;
}

export interface SearchIdentifierDto {
  code: string;
  value: string;
}

export interface SearchOptionsDto {
  includeTrace: boolean;
  includeContextualCandidates: boolean;
}

export interface SearchRequest {
  entityType: string;
  criteria: SearchCriterionDto[];
  identifiers: SearchIdentifierDto[];
  options: SearchOptionsDto;
}

export interface SearchExecutionSummaryDto {
  status?: string | null;
  isPartial: boolean;
  consolidatedSearchStatus?: string | null;
}

export interface SearchResultCountsDto {
  totalItems: number;
  enriched: number;
  partial: number;
  contextual: number;
  /** Person v2: si no se envía, debe interpretarse como cero. */
  consolidated?: number | null;
}

export interface SearchResultPaginationDto {
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface SearchResultCardFieldDto {
  value?: string | null;
  valueCount: number;
  sources?: string[] | null;
}

export interface SearchResultCardDto {
  name: SearchResultCardFieldDto;
  alias?: SearchResultCardFieldDto;
  curp?: SearchResultCardFieldDto;
  rfc?: SearchResultCardFieldDto;
}

export interface SearchResultLinkSummaryDto {
  entityType?: string | null;
  count: number;
}

/** Sólo se envía en los resultados kind=ConsolidatedProfile. */
export interface ConsolidatedProfileSearchReferenceDto {
  profileId: string;
  profileVersionId: string;
  versionNumber: number;
  effectiveAtUtc: string;
}

export interface SearchResultItemDto {
  resultId: string;
  kind?: string | null;
  status?: string | null;
  consolidatedProfile?: ConsolidatedProfileSearchReferenceDto | null;
  card: SearchResultCardDto;
  sources?: string[] | null;
  links?: SearchResultLinkSummaryDto[] | null;
  hasConflicts: boolean;
}

export interface SearchResultsPageResponse {
  contractVersion?: string | null;
  searchId: string;
  entityType?: string | null;
  execution: SearchExecutionSummaryDto;
  counts: SearchResultCountsDto;
  pagination: SearchResultPaginationDto;
  items?: SearchResultItemDto[] | null;
  pivotOrigin?: PivotOriginDto | null;
}

/** GET /api/search/history: sólo búsquedas temporales vigentes de la cuenta autenticada. */
export interface SearchHistoryInputDto {
  type: 'Criterion' | 'Identifier' | string;
  code: string;
  value: string;
}

export interface SearchHistoryItemDto {
  searchId: string;
  entityType: 'Person' | 'Vehicle' | 'Weapon' | string;
  startedAtUtc: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  inputs: SearchHistoryInputDto[];
  options: SearchOptionsDto;
  counts: SearchResultCountsDto;
  execution: SearchExecutionSummaryDto;
  resultOrigin: string;
  /** Ruta relativa recibida del servidor, nunca una URL externa. */
  resultsUrl: string;
}

export interface SearchHistoryPageResponse {
  contractVersion: string;
  totalItems: number;
  pagination: SearchResultPaginationDto;
  items: SearchHistoryItemDto[];
}

export interface EvidenceOriginDto {
  sourceCode?: string | null;
  sourceName?: string | null;
  sourceRecordId?: string | null;
}

export interface SearchResultEvidenceDto {
  evidenceId: string;
  code?: string | null;
  value?: string | null;
  origins?: EvidenceOriginDto[] | null;
}

export interface SearchResultSourceRecordDto {
  sourceRecordId?: string | null;
  identifiers?: SearchResultEvidenceDto[] | null;
  attributes?: SearchResultEvidenceDto[] | null;
}

export interface SearchResultSourceGroupDto {
  sourceCode?: string | null;
  sourceName?: string | null;
  records?: SearchResultSourceRecordDto[] | null;
}

export interface SearchResultLinkOriginDto {
  sourceLinkId: string;
  sourceCode?: string | null;
  sourceName?: string | null;
  sourceRecordId?: string | null;
}

export interface SearchResultLinkItemDto {
  linkId: string;
  status?: string | null;
  relationshipCode?: string | null;
  // Compatibilidad con motores que exponen la placa a nivel del vínculo
  // en lugar de incluirla dentro de identifiers/attributes.
  placa?: string | null;
  plate?: string | null;
  licensePlate?: string | null;
  plateNumber?: string | null;
  identifiers?: SearchResultEvidenceDto[] | null;
  attributes?: SearchResultEvidenceDto[] | null;
  origins?: SearchResultLinkOriginDto[] | null;
}

export interface SearchResultLinkGroupDto {
  entityType?: string | null;
  count: number;
  items?: SearchResultLinkItemDto[] | null;
}

export interface SearchResultDetailResponse {
  contractVersion?: string | null;
  searchId: string;
  resultId: string;
  entityType?: string | null;
  kind?: string | null;
  status?: string | null;
  consolidatedProfile?: ConsolidatedProfileSearchReferenceDto | null;
  hasConflicts: boolean;
  sourceGroups?: SearchResultSourceGroupDto[] | null;
  linkGroups?: SearchResultLinkGroupDto[] | null;
  pivotOrigin?: PivotOriginDto | null;
}

/** Trazabilidad que entrega el motor al iniciar una búsqueda por pivoteo. */
export interface PivotOriginDto {
  parentSearchId: string;
  parentResultId: string;
  parentLinkId: string;
  origins?: SearchResultLinkOriginDto[] | null;
  snapshotVersion?: number | null;
  snapshotContractVersion?: string | null;
}

export interface PivotRequest {
  options: SearchOptionsDto;
}
