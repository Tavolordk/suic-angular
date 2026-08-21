import {
  IntelligenceAnswer,
  IntelligenceEvidence,
  IntelligenceGraphContext,
  IntelligenceNodeContext,
  ProfileIntelligenceSnapshot
} from './profile-intelligence.models';
import {
  ConsolidatedProfileAddressDto,
  ConsolidatedProfileDataDto
} from '../infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';

export interface IntelligenceProfilePayload {
  profileId: string;
  data?: ConsolidatedProfileDataDto[] | null;
  addresses?: ConsolidatedProfileAddressDto[] | null;
}

export interface ProfileAnalysisApiResponse extends ProfileIntelligenceSnapshot {
  guardrails: string[];
}

export interface IntelligenceGraphNode extends IntelligenceNodeContext {}

export interface IntelligenceGraphLink {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface IntelligenceGraphPayload extends IntelligenceGraphContext {
  nodes: IntelligenceGraphNode[];
  links: IntelligenceGraphLink[];
}

export interface GraphAnalysisApiResponse {
  nodeCount: number;
  linkCount: number;
  componentCount: number;
  selectedNodeId: string | null;
  selectedDegree: number;
  connectedNodeIds: string[];
  description: string;
}

export interface IntelligenceAnswerRequest {
  profile: IntelligenceProfilePayload;
  question: string;
  selectedNode?: IntelligenceNodeContext | null;
  graph?: IntelligenceGraphPayload | null;
}

export type IntelligenceAnswerApiResponse = IntelligenceAnswer;

export type IntelligenceChatRole = 'user' | 'assistant';

export interface IntelligenceChatHistoryMessage {
  role: IntelligenceChatRole;
  content: string;
}

export interface IntelligenceChatRequest {
  profile: IntelligenceProfilePayload;
  question: string;
  selectedNode?: IntelligenceNodeContext | null;
  graph?: IntelligenceGraphPayload | null;
  history: IntelligenceChatHistoryMessage[];
}

export type IntelligenceChatStreamEvent =
  | {
      type: 'meta';
      mode: 'local-llm' | 'deterministic-fallback';
      model?: string | null;
    }
  | {
      type: 'delta';
      text: string;
    }
  | {
      type: 'replace';
      text: string;
      mode: 'local-llm' | 'deterministic-fallback';
      model?: string | null;
    }
  | {
      type: 'done';
      mode: 'local-llm' | 'deterministic-fallback';
      model?: string | null;
      evidence: IntelligenceEvidence[];
      disclaimer?: string | null;
    };

export interface IntelligenceLlmHealthResponse {
  status: 'ok' | 'degraded';
  runtimeReachable: boolean;
  modelAvailable: boolean;
  model: string;
  detail: string;
}
