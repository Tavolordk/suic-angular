export interface SearchResultMock {
    id: number;
    name: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
    alias: string;
    curp: string;
    rfc: string;
    vehicles: number;
    weapons: number;
    people: number;
    bookmarked: boolean;
}

const baseResults: Omit<SearchResultMock, 'id'>[] = [
    {
        name: 'Benito Juárez García',
        firstName: 'Benito',
        paternalLastName: 'Juárez',
        maternalLastName: 'García',
        alias: 'El Benny',
        curp: 'JDPS950728HDFABC',
        rfc: 'CVLT850901MDFMNS',
        vehicles: 1,
        weapons: 3,
        people: 0,
        bookmarked: true
    },
    {
        name: 'María López Hernández',
        firstName: 'María',
        paternalLastName: 'López',
        maternalLastName: 'Hernández',
        alias: 'La Sombra',
        curp: 'MLFH870315MMNRXZ',
        rfc: 'MLFH870315A91',
        vehicles: 1,
        weapons: 3,
        people: 2,
        bookmarked: false
    },
    {
        name: 'Omar Hernández Reyes',
        firstName: 'Omar',
        paternalLastName: 'Hernández',
        maternalLastName: 'Reyes',
        alias: 'El Rojo',
        curp: 'OHRR920614HDFQWP',
        rfc: 'OHRR920614P20',
        vehicles: 0,
        weapons: 0,
        people: 2,
        bookmarked: false
    },
    {
        name: 'Carmen Villanueva Torres',
        firstName: 'Carmen',
        paternalLastName: 'Villanueva',
        maternalLastName: 'Torres',
        alias: 'La Jefa',
        curp: 'CVLT850901MDFMNS',
        rfc: 'RCDS750630HDFPML',
        vehicles: 1,
        weapons: 0,
        people: 2,
        bookmarked: false
    },
    {
        name: 'José Luis Martínez',
        firstName: 'José Luis',
        paternalLastName: 'Martínez',
        maternalLastName: '',
        alias: 'El Coronel',
        curp: 'JLMG680423HDFRTY',
        rfc: 'LFRZ881120MMNDRT',
        vehicles: 0,
        weapons: 3,
        people: 0,
        bookmarked: false
    },
    {
        name: 'Miguel Ángel Sánchez',
        firstName: 'Miguel Ángel',
        paternalLastName: 'Sánchez',
        maternalLastName: '',
        alias: 'El Chato',
        curp: 'MASV940225HDFQRT',
        rfc: 'SICF951230MMNASD',
        vehicles: 1,
        weapons: 3,
        people: 2,
        bookmarked: false
    },
    {
        name: 'Miguel Antonio Rivera Cruz',
        firstName: 'Miguel Antonio',
        paternalLastName: 'Rivera',
        maternalLastName: 'Cruz',
        alias: 'El Norteño',
        curp: 'RCCM890214HGRVZG04',
        rfc: 'RCCM890214A91',
        vehicles: 2,
        weapons: 1,
        people: 3,
        bookmarked: false
    },
    {
        name: 'Miguel Eduardo Torres Silva',
        firstName: 'Miguel Eduardo',
        paternalLastName: 'Torres',
        maternalLastName: 'Silva',
        alias: 'El Flaco',
        curp: 'TOSM910503HDFRLG08',
        rfc: 'TOSM910503P20',
        vehicles: 0,
        weapons: 2,
        people: 1,
        bookmarked: true
    },
    {
        name: 'Miguel Alejandro Vargas Ruiz',
        firstName: 'Miguel Alejandro',
        paternalLastName: 'Vargas',
        maternalLastName: 'Ruiz',
        alias: 'El Güero',
        curp: 'VARM871126HGRRZG05',
        rfc: 'VARM871126L19',
        vehicles: 1,
        weapons: 0,
        people: 4,
        bookmarked: false
    },
    {
        name: 'Miguel Francisco Pérez Luna',
        firstName: 'Miguel Francisco',
        paternalLastName: 'Pérez',
        maternalLastName: 'Luna',
        alias: 'El Padrino',
        curp: 'PELM800719HDFRNG01',
        rfc: 'PELM800719K33',
        vehicles: 3,
        weapons: 3,
        people: 2,
        bookmarked: false
    }
];

export const SEARCH_RESULTS_MOCK: SearchResultMock[] = Array.from(
    { length: 80 },
    (_, index) => {
        const base = baseResults[index % baseResults.length];
        const sequence = index + 1;

        return {
            ...base,
            id: sequence,
            name: index % 2 === 0 ? base.name : `${base.name} ${sequence}`,
            curp: `${base.curp.slice(0, 14)}${String(sequence).padStart(4, '0')}`,
            rfc:
                base.rfc === '—'
                    ? '—'
                    : `${base.rfc.slice(0, 9)}${String(sequence).padStart(3, '0')}`,
            vehicles: sequence % 4,
            weapons: sequence % 5,
            people: sequence % 6,
            bookmarked: sequence % 7 === 0
        };
    }
);

export function findSearchResultById(id: string): SearchResultMock {
    return (
        SEARCH_RESULTS_MOCK.find(result => result.id === Number(id)) ??
        SEARCH_RESULTS_MOCK[0]
    );
}