export type ProfileLinkKind = 'person' | 'vehicle' | 'weapon' | 'other';

export interface ProfileFieldViewModel {
  id: string;
  code: string;
  label: string;
  value: string;
  selected: boolean;
  isIdentifier: boolean;
  isFile: boolean;
}

export interface ProfileSourceViewModel {
  id: string;
  code: string;
  title: string;
  description: string;
  color: string;
  recordCount: number;
  fields: ProfileFieldViewModel[];
}

export interface SelectedProfileFieldViewModel extends ProfileFieldViewModel {
  sourceId: string;
  sourceTitle: string;
  sourceColor: string;
}

export interface ProfileLinkGroupViewModel {
  id: string;
  entityType: string;
  label: string;
  count: number;
  kind: ProfileLinkKind;
}

export interface ProfilePhotoViewModel {
  id: string;
  src: string;
  alt: string;
  sourceTitle: string;
}

export interface ProfileDetailViewModel {
  searchId: string;
  resultId: string;
  entityType: string;
  kind: string;
  status: string;
  hasConflicts: boolean;
  profileName: string;
  profileSubtitle: string;
  sources: ProfileSourceViewModel[];
  links: ProfileLinkGroupViewModel[];
  photos: ProfilePhotoViewModel[];
  relatedFileCount: number;
  additionalObjectCount: number;
}
