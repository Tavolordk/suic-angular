export type IntelligenceEvidenceKind = 'profile' | 'data' | 'address' | 'origin' | 'node' | 'relation';

export interface IntelligenceEvidence {
  kind: IntelligenceEvidenceKind;
  id: string;
  label: string;
  value: string;
  sourceCodes: string[];
}

export interface IntelligenceConflict {
  field: string;
  values: string[];
  evidence: IntelligenceEvidence[];
}

export interface IntelligenceMetrics {
  populatedData: number;
  uniqueFields: number;
  addresses: number;
  sources: number;
  conflicts: number;
}

export interface ProfileIntelligenceSnapshot {
  profileId: string;
  title: string;
  summary: string;
  metrics: IntelligenceMetrics;
  facts: IntelligenceEvidence[];
  conflicts: IntelligenceConflict[];
  recommendations: string[];
}

export interface IntelligenceNodeContext {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
}

export interface IntelligenceGraphLinkContext {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface IntelligenceGraphContext {
  nodes: IntelligenceNodeContext[];
  links: IntelligenceGraphLinkContext[];
  selectedNodeId?: string | null;
}

export interface IntelligenceAnswer {
  text: string;
  evidence: IntelligenceEvidence[];
  disclaimer?: string;
}
