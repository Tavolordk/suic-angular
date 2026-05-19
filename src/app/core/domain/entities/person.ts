export interface Person {
    id: string;
    fullName: string;
    curp: string;
    birthDate: string;
    age: number;
    gender: string;
    nationality: string;
    status: PersonStatus;
    riskLevel: RiskLevel;
    avatarUrl?: string;
    lastKnownAddress: string;
    aliases: string[];
    identifiers: PersonIdentifier[];
}

export interface PersonIdentifier {
    label: string;
    value: string;
}

export type PersonStatus = 'active' | 'inactive' | 'wanted' | 'unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';