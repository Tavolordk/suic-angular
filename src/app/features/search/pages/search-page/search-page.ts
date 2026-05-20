import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SEARCH_RESULTS_MOCK } from '../../../../core/infrastructure/data/search-results.mock';
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
  imports: [RouterLink],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage {
  readonly selectedEntity = signal<EntityType>('personas');
  readonly expanded = signal(true);
  readonly searched = signal(false);
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly searchValues = signal<Record<string, string>>({});

  private readonly baseResults: SearchResult[] = [
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
      rfc: 'MLFH870315A91',
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
      rfc: 'OHRR920614P20',
      vehicles: 0,
      weapons: 0,
      people: 2,
      bookmarked: false
    },
    {
      id: 4,
      name: 'Carmen Villanueva Torres',
      alias: 'La Jefa',
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
      id: 7,
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
      id: 8,
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
      id: 9,
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
      id: 10,
      name: 'Miguel Francisco Pérez Luna',
      alias: 'El Padrino',
      curp: 'PELM800719HDFRNG01',
      rfc: 'PELM800719K33',
      vehicles: 3,
      weapons: 3,
      people: 2,
      bookmarked: false
    }
  ];

  readonly results: SearchResult[] = SEARCH_RESULTS_MOCK;

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
  readonly totalFilteredResults = computed(() => {
    return this.filteredResults().length;
  });

  readonly totalPages = computed(() => {
    const total = this.totalFilteredResults();
    const size = this.pageSize();

    return Math.max(1, Math.ceil(total / size));
  });

  readonly pages = computed(() => {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
  });

  readonly visibleResults = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();

    const start = (page - 1) * size;
    const end = start + size;

    return this.filteredResults().slice(start, end);
  });
  readonly firstVisibleResult = computed(() => {
    if (this.totalFilteredResults() === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly lastVisibleResult = computed(() => {
    return Math.min(
      this.currentPage() * this.pageSize(),
      this.totalFilteredResults()
    );
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
    this.currentPage.set(1);
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
    this.currentPage.set(1);
    this.searched.set(true);
  }

  clear(): void {
    this.searchValues.set({});
    this.currentPage.set(1);
    this.searched.set(false);
  }

  toggleExpanded(): void {
    this.expanded.update(value => !value);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }
  goToPage(page: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }

  previousPage(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.goToPage(this.currentPage() - 1);
  }

  nextPage(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.goToPage(this.currentPage() + 1);
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}