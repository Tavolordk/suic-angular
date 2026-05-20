import { Component, computed, signal } from '@angular/core';

type EntityType = 'personas' | 'vehiculo' | 'armas';

interface SearchField {
  key: string;
  placeholder: string;
}

interface SearchResult {
  id: number;
  name: string;
  alias: string;
  curp: string;
  rfc: string;
  vehicles: number;
  weapons: number;
  people: number;
  bookmarked: boolean;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage {
  readonly selectedEntity = signal<EntityType>('personas');
  readonly expanded = signal(true);
  readonly searched = signal(false);
  readonly pageSize = signal(10);

  readonly searchValues = signal<Record<string, string>>({});

  readonly results: SearchResult[] = [
    {
      id: 1,
      name: 'Benito Juárez García',
      alias: 'El Benny',
      curp: 'JDPS950728HDFABC',
      rfc: 'CVLT850901MDFMNS',
      vehicles: 1,
      weapons: 3,
      people: 0,
      bookmarked: true
    },
    {
      id: 2,
      name: 'María López Hernández',
      alias: 'La Sombra',
      curp: 'MLFH870315MMNRXZ',
      rfc: '—',
      vehicles: 1,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 3,
      name: 'Omar Hernández Reyes',
      alias: 'El Rojo',
      curp: 'OHRR920614HDFQWP',
      rfc: 'APGE910812MMNNKL',
      vehicles: 0,
      weapons: 0,
      people: 2,
      bookmarked: false
    },
    {
      id: 4,
      name: 'Carmen Villanueva Torres',
      alias: '—',
      curp: 'CVLT850901MDFMNS',
      rfc: 'RCDS750630HDFPML',
      vehicles: 1,
      weapons: 0,
      people: 2,
      bookmarked: false
    },
    {
      id: 5,
      name: 'José Luis Martínez',
      alias: 'El Coronel',
      curp: 'JLMG680423HDFRTY',
      rfc: 'LFRZ881120MMNDRT',
      vehicles: 0,
      weapons: 3,
      people: 0,
      bookmarked: false
    },
    {
      id: 6,
      name: 'Ana Patricia Gómez',
      alias: 'La Gata',
      curp: 'APGE910812MMNNKL',
      rfc: '—',
      vehicles: 1,
      weapons: 0,
      people: 0,
      bookmarked: false
    },
    {
      id: 7,
      name: 'Roberto Carlos Díaz',
      alias: 'El Tigre',
      curp: 'RCDS750630HDFPML',
      rfc: 'GEMM800710MMNSPL',
      vehicles: 0,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 8,
      name: 'Lucía Fernández Ruiz',
      alias: 'La Doctora',
      curp: 'LFRZ881120MMNDRT',
      rfc: 'FJPP721005HDFBCD',
      vehicles: 1,
      weapons: 0,
      people: 0,
      bookmarked: true
    },
    {
      id: 9,
      name: 'Miguel Ángel Sánchez',
      alias: 'El Chato',
      curp: 'MASV940225HDFQRT',
      rfc: 'SICF951230MMNASD',
      vehicles: 1,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 10,
      name: 'Gloria Esperanza Mora',
      alias: 'La Reina',
      curp: 'GEMM800710MMNSPL',
      rfc: '—',
      vehicles: 0,
      weapons: 0,
      people: 2,
      bookmarked: false
    },
    {
      id: 11,
      name: 'Miguel Antonio Rivera Cruz',
      alias: 'El Norteño',
      curp: 'RCCM890214HGRVZG04',
      rfc: 'RCCM890214A91',
      vehicles: 2,
      weapons: 1,
      people: 3,
      bookmarked: false
    },
    {
      id: 12,
      name: 'Miguel Eduardo Torres Silva',
      alias: 'El Flaco',
      curp: 'TOSM910503HDFRLG08',
      rfc: 'TOSM910503P20',
      vehicles: 0,
      weapons: 2,
      people: 1,
      bookmarked: true
    },
    {
      id: 13,
      name: 'Miguel Alejandro Vargas Ruiz',
      alias: 'El Güero',
      curp: 'VARM871126HGRRZG05',
      rfc: 'VARM871126L19',
      vehicles: 1,
      weapons: 0,
      people: 4,
      bookmarked: false
    },
    {
      id: 14,
      name: 'Miguel Francisco Pérez Luna',
      alias: 'El Padrino',
      curp: 'PELM800719HDFRNG01',
      rfc: 'PELM800719K33',
      vehicles: 3,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 15,
      name: 'Luis Miguel Hernández Soto',
      alias: 'El Rápido',
      curp: 'HESL930608HGRRZS02',
      rfc: 'HESL930608C18',
      vehicles: 1,
      weapons: 0,
      people: 1,
      bookmarked: false
    },
    {
      id: 16,
      name: 'Miguel Ángel Mendoza Castro',
      alias: 'El Mando',
      curp: 'MECM850312HDFNSG09',
      rfc: 'MECM850312R27',
      vehicles: 2,
      weapons: 2,
      people: 5,
      bookmarked: true
    },
    {
      id: 17,
      name: 'Miguel Ernesto Jiménez Rojas',
      alias: 'El Jefe',
      curp: 'JIRM780925HGRMJS06',
      rfc: 'JIRM780925N43',
      vehicles: 0,
      weapons: 1,
      people: 2,
      bookmarked: false
    },
    {
      id: 18,
      name: 'Miguel Adrián Salgado Méndez',
      alias: 'El Sur',
      curp: 'SAMM960221HGRLND07',
      rfc: 'SAMM960221T54',
      vehicles: 1,
      weapons: 1,
      people: 0,
      bookmarked: false
    },
    {
      id: 19,
      name: 'Miguel Mauricio Cano de la Cruz',
      alias: 'El Negro',
      curp: 'RAOM880430HGRMRG03',
      rfc: 'RAOM880430B62',
      vehicles: 4,
      weapons: 0,
      people: 3,
      bookmarked: false
    },
    {
      id: 20,
      name: 'Miguel Ángel Flores Medina',
      alias: 'El Contador',
      curp: 'FOMM900118HDFLDR05',
      rfc: 'FOMM900118M81',
      vehicles: 2,
      weapons: 3,
      people: 2,
      bookmarked: false
    }
  ];

  readonly filteredResults = computed(() => {
    if (!this.searched()) {
      return [];
    }

    const values = Object.values(this.searchValues())
      .map(value => this.normalize(value))
      .filter(Boolean);

    if (values.length === 0) {
      return this.results;
    }

    return this.results.filter(result => {
      const searchableText = this.normalize(
        `${result.name} ${result.alias} ${result.curp} ${result.rfc}`
      );

      return values.every(value => searchableText.includes(value));
    });
  });
  readonly visibleResults = computed(() => {
    return this.filteredResults().slice(0, this.pageSize());
  });

  readonly totalFilteredResults = computed(() => {
    return this.filteredResults().length;
  });
  get fields(): SearchField[] {
    if (this.selectedEntity() === 'vehiculo') {
      return [
        { key: 'niv', placeholder: 'NIV / VIN' },
        { key: 'placa', placeholder: 'Placa' },
        { key: 'motor', placeholder: 'No. de motor' },
        { key: 'marca', placeholder: 'Marca' },
        { key: 'submarca', placeholder: 'Submarca' },
        { key: 'modelo', placeholder: 'Modelo' }
      ];
    }

    if (this.selectedEntity() === 'armas') {
      return [
        { key: 'matricula', placeholder: 'Matrícula' },
        { key: 'serie', placeholder: 'No. de serie' },
        { key: 'marca', placeholder: 'Marca' },
        { key: 'modelo', placeholder: 'Modelo' },
        { key: 'calibre', placeholder: 'Calibre' }
      ];
    }

    return [
      { key: 'nombre', placeholder: 'Nombre (s)' },
      { key: 'apellidoPaterno', placeholder: 'Apellido Paterno' },
      { key: 'apellidoMaterno', placeholder: 'Apellido Materno' },
      { key: 'alias', placeholder: 'Alias' },
      { key: 'curp', placeholder: 'CURP' },
      { key: 'rfc', placeholder: 'RFC' },
      { key: 'cuip', placeholder: 'CUIP' }
    ];
  }

  selectEntity(entity: EntityType): void {
    this.selectedEntity.set(entity);
    this.searchValues.set({});
    this.searched.set(false);
  }

  updateValue(key: string, value: string): void {
    this.searchValues.update(current => ({
      ...current,
      [key]: value
    }));
  }

  search(event?: Event): void {
    event?.preventDefault();
    this.searched.set(true);
  }

  clear(): void {
    this.searchValues.set({});
    this.searched.set(false);
  }

  toggleExpanded(): void {
    this.expanded.update(value => !value);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}