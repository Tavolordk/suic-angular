import { GraphLink } from '../../domain/entities/graph-link';
import { GraphNode } from '../../domain/entities/graph-node';

export interface PersonGraphMock {
    personId: string;
    nodes: GraphNode[];
    links: GraphLink[];
}

export const GRAPH_MOCK: PersonGraphMock[] = [
    {
        personId: '1',
        nodes: [
            {
                id: 'person-1',
                label: 'Miguel Ángel Hernández',
                type: 'person',
                risk: 'high',
                x: 460,
                y: 260,
                description: 'Persona principal consultada en SUIC.'
            },
            {
                id: 'person-2',
                label: 'Roberto Salinas',
                type: 'person',
                risk: 'high',
                x: 210,
                y: 160,
                description: 'Asociado por registros de movilidad y domicilio.'
            },
            {
                id: 'address-1',
                label: 'Chilpancingo',
                type: 'address',
                risk: 'medium',
                x: 700,
                y: 150,
                description: 'Último domicilio conocido.'
            },
            {
                id: 'vehicle-1',
                label: 'Vehículo gris',
                type: 'vehicle',
                risk: 'medium',
                x: 270,
                y: 410,
                description: 'Vehículo asociado a eventos de movilidad.'
            },
            {
                id: 'org-1',
                label: 'Grupo Operativo Sur',
                type: 'organization',
                risk: 'critical',
                x: 710,
                y: 410,
                description: 'Organización vinculada por relación indirecta.'
            },
            {
                id: 'phone-1',
                label: 'Teléfono asociado',
                type: 'phone',
                risk: 'low',
                x: 470,
                y: 80,
                description: 'Número telefónico relacionado con registros previos.'
            }
        ],
        links: [
            {
                id: 'l1',
                source: 'person-1',
                target: 'person-2',
                label: 'Asociación directa',
                strength: 'strong'
            },
            {
                id: 'l2',
                source: 'person-1',
                target: 'address-1',
                label: 'Domicilio',
                strength: 'strong'
            },
            {
                id: 'l3',
                source: 'person-1',
                target: 'vehicle-1',
                label: 'Movilidad',
                strength: 'medium'
            },
            {
                id: 'l4',
                source: 'person-1',
                target: 'org-1',
                label: 'Relación indirecta',
                strength: 'medium'
            },
            {
                id: 'l5',
                source: 'person-1',
                target: 'phone-1',
                label: 'Comunicación',
                strength: 'weak'
            },
            {
                id: 'l6',
                source: 'person-2',
                target: 'vehicle-1',
                label: 'Coincidencia',
                strength: 'weak'
            },
            {
                id: 'l7',
                source: 'address-1',
                target: 'org-1',
                label: 'Zona',
                strength: 'weak'
            }
        ]
    },
    {
        personId: '2',
        nodes: [
            {
                id: 'person-1',
                label: 'María Fernanda Salgado',
                type: 'person',
                risk: 'medium',
                x: 460,
                y: 260,
                description: 'Persona principal consultada en SUIC.'
            },
            {
                id: 'address-1',
                label: 'Acapulco',
                type: 'address',
                risk: 'medium',
                x: 700,
                y: 150,
                description: 'Domicilio registrado.'
            },
            {
                id: 'person-2',
                label: 'Claudia Ivonne Pérez',
                type: 'person',
                risk: 'medium',
                x: 240,
                y: 180,
                description: 'Relación familiar detectada.'
            },
            {
                id: 'phone-1',
                label: 'Línea móvil',
                type: 'phone',
                risk: 'low',
                x: 460,
                y: 80,
                description: 'Teléfono de contacto.'
            }
        ],
        links: [
            {
                id: 'l1',
                source: 'person-1',
                target: 'address-1',
                label: 'Domicilio',
                strength: 'strong'
            },
            {
                id: 'l2',
                source: 'person-1',
                target: 'person-2',
                label: 'Familiar',
                strength: 'medium'
            },
            {
                id: 'l3',
                source: 'person-1',
                target: 'phone-1',
                label: 'Comunicación',
                strength: 'weak'
            }
        ]
    },
    {
        personId: '3',
        nodes: [
            {
                id: 'person-1',
                label: 'José Alberto Ramírez',
                type: 'person',
                risk: 'critical',
                x: 460,
                y: 260,
                description: 'Persona con nivel de riesgo crítico.'
            },
            {
                id: 'org-1',
                label: 'Estructura Norte',
                type: 'organization',
                risk: 'critical',
                x: 700,
                y: 160,
                description: 'Organización asociada.'
            },
            {
                id: 'vehicle-1',
                label: 'Unidad blanca',
                type: 'vehicle',
                risk: 'high',
                x: 230,
                y: 390,
                description: 'Vehículo relacionado.'
            },
            {
                id: 'event-1',
                label: 'Evento operativo',
                type: 'event',
                risk: 'high',
                x: 720,
                y: 410,
                description: 'Evento con coincidencia de registros.'
            },
            {
                id: 'person-2',
                label: 'Operador vinculado',
                type: 'person',
                risk: 'high',
                x: 220,
                y: 150,
                description: 'Persona relacionada por investigación.'
            }
        ],
        links: [
            {
                id: 'l1',
                source: 'person-1',
                target: 'org-1',
                label: 'Vínculo operativo',
                strength: 'strong'
            },
            {
                id: 'l2',
                source: 'person-1',
                target: 'vehicle-1',
                label: 'Vehículo',
                strength: 'medium'
            },
            {
                id: 'l3',
                source: 'person-1',
                target: 'event-1',
                label: 'Evento',
                strength: 'strong'
            },
            {
                id: 'l4',
                source: 'person-1',
                target: 'person-2',
                label: 'Asociado',
                strength: 'medium'
            }
        ]
    },
    {
        personId: '4',
        nodes: [
            {
                id: 'person-1',
                label: 'Ana Sofía Martínez',
                type: 'person',
                risk: 'low',
                x: 460,
                y: 260,
                description: 'Persona principal consultada en SUIC.'
            },
            {
                id: 'address-1',
                label: 'Iguala',
                type: 'address',
                risk: 'low',
                x: 700,
                y: 160,
                description: 'Domicilio asociado.'
            },
            {
                id: 'phone-1',
                label: 'Teléfono',
                type: 'phone',
                risk: 'low',
                x: 260,
                y: 180,
                description: 'Contacto registrado.'
            }
        ],
        links: [
            {
                id: 'l1',
                source: 'person-1',
                target: 'address-1',
                label: 'Domicilio',
                strength: 'medium'
            },
            {
                id: 'l2',
                source: 'person-1',
                target: 'phone-1',
                label: 'Contacto',
                strength: 'weak'
            }
        ]
    }
];

export const DEFAULT_GRAPH_MOCK = GRAPH_MOCK[0];