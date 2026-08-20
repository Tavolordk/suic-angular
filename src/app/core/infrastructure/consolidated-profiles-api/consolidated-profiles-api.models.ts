export interface ConsolidatedProfileOriginDto {
  originId: string;
  sourceCode?: string | null;
  sourceRecordId?: string | null;
}

export interface ConsolidatedProfileDataDto {
  dataId: string;
  dataType?: string | null;
  code?: string | null;
  value?: string | null;
  origins?: ConsolidatedProfileOriginDto[] | null;
}

export interface ConsolidatedProfileAddressDto {
  addressId: string;
  type?: string | null;
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  stateId?: string | null;
  state?: string | null;
  municipalityId?: string | null;
  municipality?: string | null;
  origins?: ConsolidatedProfileOriginDto[] | null;
}

export interface ConsolidatedProfileResponse {
  contractVersion?: string | null;
  profileId: string;
  profileVersionId: string;
  versionNumber: number;
  searchId: string;
  preconsolidatedResultId: string;
  effectiveAtUtc: string;
  data?: ConsolidatedProfileDataDto[] | null;
  addresses?: ConsolidatedProfileAddressDto[] | null;
}

export interface ConsolidatedProfilesPageResponse {
  contractVersion?: string | null;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  items?: ConsolidatedProfileResponse[] | null;
}

export interface ConsolidateProfileRequest {
  selectedEvidenceIds: string[];
}

export interface ConsolidateProfileResult {
  profile: ConsolidatedProfileResponse;
  message: string;
}
