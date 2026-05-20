export interface GraphLink {
    id: string;
    source: string;
    target: string;
    label: string;
    strength: 'weak' | 'medium' | 'strong';
}