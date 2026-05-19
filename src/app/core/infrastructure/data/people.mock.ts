import { Person } from '../../domain/entities/person';

export const PEOPLE_MOCK: Person[] = [
    {
        id: '1',
        fullName: 'Miguel Ángel Hernández López',
        curp: 'HELM850214HGRRPG09',
        birthDate: '1985-02-14',
        age: 41,
        gender: 'Masculino',
        nationality: 'Mexicana',
        status: 'active',
        riskLevel: 'high',
        lastKnownAddress: 'Chilpancingo de los Bravo, Guerrero',
        aliases: ['El Migue', 'Ángel H.'],
        identifiers: [
            {
                label: 'RFC',
                value: 'HELM8502149Q2'
            },
            {
                label: 'NSS',
                value: '84930291822'
            }
        ]
    },
    {
        id: '2',
        fullName: 'María Fernanda Salgado Ruiz',
        curp: 'SARM920701MGRLZR03',
        birthDate: '1992-07-01',
        age: 33,
        gender: 'Femenino',
        nationality: 'Mexicana',
        status: 'unknown',
        riskLevel: 'medium',
        lastKnownAddress: 'Acapulco de Juárez, Guerrero',
        aliases: ['Fer Salgado'],
        identifiers: [
            {
                label: 'RFC',
                value: 'SARM920701E41'
            }
        ]
    },
    {
        id: '3',
        fullName: 'José Alberto Ramírez Castro',
        curp: 'RACJ780922HDFMSS08',
        birthDate: '1978-09-22',
        age: 47,
        gender: 'Masculino',
        nationality: 'Mexicana',
        status: 'wanted',
        riskLevel: 'critical',
        lastKnownAddress: 'Cuauhtémoc, Ciudad de México',
        aliases: ['El Beto', 'J. Ramírez'],
        identifiers: [
            {
                label: 'RFC',
                value: 'RACJ780922A12'
            },
            {
                label: 'Pasaporte',
                value: 'G20394812'
            }
        ]
    },
    {
        id: '4',
        fullName: 'Ana Sofía Martínez Torres',
        curp: 'MATA990304MGRRNN06',
        birthDate: '1999-03-04',
        age: 27,
        gender: 'Femenino',
        nationality: 'Mexicana',
        status: 'active',
        riskLevel: 'low',
        lastKnownAddress: 'Iguala de la Independencia, Guerrero',
        aliases: [],
        identifiers: [
            {
                label: 'RFC',
                value: 'MATA990304G18'
            }
        ]
    }
];