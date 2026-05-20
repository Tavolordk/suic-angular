import { GraphLink } from '../../domain/entities/graph-link';
import { GraphNode } from '../../domain/entities/graph-node';
import {
    findSearchResultById,
    SearchResultMock
} from './search-results.mock';

export interface PersonGraphMock {
    personId: string;
    profileName: string;
    curp: string;
    summary: {
        people: number;
        vehicles: number;
        weapons: number;
        sources: number;
    };
    nodes: GraphNode[];
    links: GraphLink[];
}

export function createGraphByProfileId(profileId: string): PersonGraphMock {
    const profile = findSearchResultById(profileId);

    return {
        personId: String(profile.id),
        profileName: getShortName(profile),
        curp: profile.curp,
        summary: {
            people: profile.people,
            vehicles: profile.vehicles,
            weapons: profile.weapons,
            sources: 7
        },
        nodes: createNodes(profile),
        links: createLinks(profile)
    };
}

function createNodes(profile: SearchResultMock): GraphNode[] {
    const centerX = 560;
    const centerY = 380;

    const nodes: GraphNode[] = [
        {
            id: 'person-main',
            label: getShortName(profile),
            type: 'person',
            risk: 'high',
            x: centerX,
            y: centerY,
            description: `Perfil consolidado de ${profile.name}. CURP ${profile.curp}.`
        },
        {
            id: 'source-rnd',
            label: 'RND',
            type: 'organization',
            risk: 'low',
            x: centerX,
            y: 90,
            description: 'Registro Nacional de Detenciones.'
        },
        {
            id: 'source-repuve',
            label: 'REPUVE',
            type: 'organization',
            risk: 'low',
            x: centerX,
            y: 700,
            description: 'Registro Público Vehicular.'
        }
    ];

    if (profile.people > 0) {
        nodes.push({
            id: 'person-related',
            label: getRelatedPersonName(profile.id),
            type: 'person',
            risk: 'medium',
            x: 185,
            y: 190,
            description: 'Persona relacionada por coincidencia documental.'
        });
    }

    if (profile.people > 1) {
        nodes.push({
            id: 'person-related-2',
            label: getRelatedPersonName(profile.id + 2),
            type: 'person',
            risk: 'medium',
            x: 190,
            y: 570,
            description: 'Segunda persona relacionada por fuentes coincidentes.'
        });
    }

    if (profile.people > 2) {
        nodes.push({
            id: 'person-related-3',
            label: getRelatedPersonName(profile.id + 4),
            type: 'person',
            risk: 'medium',
            x: 80,
            y: 380,
            description: 'Tercera persona vinculada al perfil consolidado.'
        });
    }

    if (profile.vehicles > 0) {
        nodes.push({
            id: 'vehicle-1',
            label: getVehicleName(profile.id, 1),
            type: 'vehicle',
            risk: 'medium',
            x: 935,
            y: 190,
            description: 'Vehículo vinculado mediante REPUVE.'
        });
    }

    if (profile.vehicles > 1) {
        nodes.push({
            id: 'vehicle-2',
            label: getVehicleName(profile.id, 2),
            type: 'vehicle',
            risk: 'low',
            x: 940,
            y: 570,
            description: 'Vehículo adicional asociado al perfil consolidado.'
        });
    }

    if (profile.vehicles > 2) {
        nodes.push({
            id: 'vehicle-3',
            label: getVehicleName(profile.id + 1, 1),
            type: 'vehicle',
            risk: 'medium',
            x: 1040,
            y: 380,
            description: 'Tercer vehículo vinculado al perfil consolidado.'
        });
    }

    if (profile.weapons > 0) {
        nodes.push({
            id: 'weapon-1',
            label: getWeaponName(profile.id, 1),
            type: 'event',
            risk: 'critical',
            x: 330,
            y: 705,
            description: 'Arma relacionada con registros de fuente IPH.'
        });
    }

    if (profile.weapons > 1) {
        nodes.push({
            id: 'weapon-2',
            label: getWeaponName(profile.id, 2),
            type: 'event',
            risk: 'high',
            x: 330,
            y: 55,
            description: 'Segunda arma relacionada con el perfil consolidado.'
        });
    }

    if (profile.weapons > 2) {
        nodes.push({
            id: 'weapon-3',
            label: getWeaponName(profile.id, 3),
            type: 'event',
            risk: 'high',
            x: 790,
            y: 705,
            description: 'Tercera arma asociada al perfil consolidado.'
        });
    }

    if (profile.weapons > 3) {
        nodes.push({
            id: 'weapon-4',
            label: getWeaponName(profile.id + 1, 1),
            type: 'event',
            risk: 'critical',
            x: 790,
            y: 55,
            description: 'Cuarta arma asociada al perfil consolidado.'
        });
    }

    return nodes;
}

function createLinks(profile: SearchResultMock): GraphLink[] {
    const links: GraphLink[] = [
        {
            id: 'source-rnd-link',
            source: 'person-main',
            target: 'source-rnd',
            label: 'Fuente',
            strength: 'weak'
        },
        {
            id: 'source-repuve-link',
            source: 'person-main',
            target: 'source-repuve',
            label: 'Fuente',
            strength: 'weak'
        }
    ];

    if (profile.people > 0) {
        links.push({
            id: 'person-related-link',
            source: 'person-main',
            target: 'person-related',
            label: 'Persona vinculada',
            strength: 'medium'
        });
    }

    if (profile.people > 1) {
        links.push({
            id: 'person-related-2-link',
            source: 'person-main',
            target: 'person-related-2',
            label: 'Persona vinculada',
            strength: 'medium'
        });
    }

    if (profile.people > 2) {
        links.push({
            id: 'person-related-3-link',
            source: 'person-main',
            target: 'person-related-3',
            label: 'Persona vinculada',
            strength: 'weak'
        });
    }

    if (profile.vehicles > 0) {
        links.push({
            id: 'vehicle-1-link',
            source: 'person-main',
            target: 'vehicle-1',
            label: 'Vehículo',
            strength: 'strong'
        });
    }

    if (profile.vehicles > 1) {
        links.push({
            id: 'vehicle-2-link',
            source: 'person-main',
            target: 'vehicle-2',
            label: 'Vehículo',
            strength: 'medium'
        });
    }

    if (profile.vehicles > 2) {
        links.push({
            id: 'vehicle-3-link',
            source: 'person-main',
            target: 'vehicle-3',
            label: 'Vehículo',
            strength: 'medium'
        });
    }

    if (profile.weapons > 0) {
        links.push({
            id: 'weapon-1-link',
            source: 'person-main',
            target: 'weapon-1',
            label: 'Arma',
            strength: 'strong'
        });
    }

    if (profile.weapons > 1) {
        links.push({
            id: 'weapon-2-link',
            source: 'person-main',
            target: 'weapon-2',
            label: 'Arma',
            strength: 'medium'
        });
    }

    if (profile.weapons > 2) {
        links.push({
            id: 'weapon-3-link',
            source: 'person-main',
            target: 'weapon-3',
            label: 'Arma',
            strength: 'medium'
        });
    }

    if (profile.weapons > 3) {
        links.push({
            id: 'weapon-4-link',
            source: 'person-main',
            target: 'weapon-4',
            label: 'Arma',
            strength: 'medium'
        });
    }

    return links;
}

function getShortName(profile: SearchResultMock): string {
    const firstName = profile.firstName.split(' ')[0];
    const lastName = profile.paternalLastName;

    return `${firstName} ${lastName}`;
}

function getRelatedPersonName(profileId: number): string {
    const names = [
        'Carmen Villanueva',
        'Roberto Carlos',
        'María López',
        'Omar Hernández',
        'Lucía Fernández',
        'Ana Patricia',
        'Gloria Esperanza',
        'José Luis Martínez'
    ];

    return names[profileId % names.length];
}

function getVehicleName(profileId: number, index: number): string {
    const vehicles = [
        ['Honda Civic', 'Ford Focus'],
        ['Nissan Versa', 'Chevrolet Aveo'],
        ['Toyota Corolla', 'Volkswagen Jetta'],
        ['Mazda 3', 'Kia Rio'],
        ['Dodge Attitude', 'Hyundai Elantra'],
        ['Chevrolet Spark', 'Nissan Sentra'],
        ['Volkswagen Vento', 'Toyota Yaris']
    ];

    const group = vehicles[profileId % vehicles.length];

    return group[index - 1] ?? `Vehículo ${index}`;
}

function getWeaponName(profileId: number, index: number): string {
    const weapons = [
        ['GLOCK 17', 'Beretta 92', 'Colt M1911'],
        ['S&W M&P9', 'CZ P-10', 'SIG Sauer P320'],
        ['GLOCK 19', 'Walther PDP', 'Ruger Security-9'],
        ['Beretta APX', 'Taurus G3', 'Springfield XD'],
        ['CZ 75', 'HK VP9', 'Canik TP9'],
        ['GLOCK 26', 'Beretta PX4', 'FN 509'],
        ['CZ P-07', 'Walther P99', 'Ruger SR9']
    ];

    const group = weapons[profileId % weapons.length];

    return group[index - 1] ?? `Arma ${index}`;
}