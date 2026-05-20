export interface GraphNode {
    id: string;
    label: string;
    type: GraphNodeType;
    risk: GraphRiskLevel;
    x: number;
    y: number;
    description: string;
}

export type GraphNodeType =
    | 'person'
    | 'vehicle'
    | 'address'
    | 'organization'
    | 'phone'
    | 'event';

export type GraphRiskLevel = 'low' | 'medium' | 'high' | 'critical';