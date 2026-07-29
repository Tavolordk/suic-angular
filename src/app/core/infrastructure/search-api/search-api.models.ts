export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
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
}

export interface SearchResultCountsDto {
  totalItems: number;
  enriched: number;
  partial: number;
  contextual: number;
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
  alias: SearchResultCardFieldDto;
  curp: SearchResultCardFieldDto;
  rfc: SearchResultCardFieldDto;
}

export interface SearchResultLinkSummaryDto {
  entityType?: string | null;
  count: number;
}

export interface SearchResultItemDto {
  resultId: string;
  kind?: string | null;
  status?: string | null;
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
  hasConflicts: boolean;
  sourceGroups?: SearchResultSourceGroupDto[] | null;
  linkGroups?: SearchResultLinkGroupDto[] | null;
}
