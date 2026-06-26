import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

type SearchEntity = 'personas' | 'vehiculo' | 'armas';
type PageSize = 10 | 18;
type ResultTagType = 'personas' | 'vehiculo' | 'armas';

interface EntityOption {
  key: SearchEntity;
  label: string;
}

interface ResultTag {
  type: ResultTagType;
  count: number;
}

interface SearchResult {
  id: number;
  entity: SearchEntity;
  name: string;
  alias?: string;
  curp?: string;
  rfc?: string;
  serie?: string;
  marca?: string;
  modelo?: string;
  placa?: string;
  calibre?: string;
  color?: string;
  tags: ResultTag[];
  saved: boolean;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private clockInterval?: ReturnType<typeof setInterval>;
  private searchTimeout?: ReturnType<typeof setTimeout>;

  readonly currentTime = signal(new Date());
  readonly selectedEntity = signal<SearchEntity>('personas');
  readonly profileOpen = signal(false);

  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly searchPanelExpanded = signal(true);

  readonly pageSize = signal<PageSize>(10);
  readonly pageIndex = signal(0);

  readonly entityOptions: EntityOption[] = [
    {
      key: 'personas',
      label: 'Personas'
    },
    {
      key: 'vehiculo',
      label: 'Vehículo'
    },
    {
      key: 'armas',
      label: 'Armas'
    }
  ];

  readonly personForm = this.fb.group({
    nombres: [''],
    apellidoPaterno: [''],
    apellidoMaterno: [''],
    alias: [''],
    curp: [''],
    rfc: [''],
    cuip: ['']
  });

  readonly vehicleForm = this.fb.group({
    niv: [''],
    placa: [''],
    noMotor: [''],
    marca: [''],
    modelo: [''],
    color: ['']
  });

  readonly weaponForm = this.fb.group({
    matricula: [''],
    marca: [''],
    modelo: [''],
    calibre: [''],
    tipoArma: [''],
    licencia: ['']
  });

  private readonly personResults = signal<SearchResult[]>(
    this.createMockResults('personas')
  );

  private readonly vehicleResults = signal<SearchResult[]>(
    this.createMockResults('vehiculo')
  );

  private readonly weaponResults = signal<SearchResult[]>(
    this.createMockResults('armas')
  );

  readonly activeForm = computed<FormGroup>(() => {
    switch (this.selectedEntity()) {
      case 'vehiculo':
        return this.vehicleForm;
      case 'armas':
        return this.weaponForm;
      default:
        return this.personForm;
    }
  });

  readonly activeResults = computed<SearchResult[]>(() => {
    if (!this.hasSearched()) {
      return [];
    }

    switch (this.selectedEntity()) {
      case 'vehiculo':
        return this.vehicleResults();
      case 'armas':
        return this.weaponResults();
      default:
        return this.personResults();
    }
  });

  readonly totalResults = computed(() => this.activeResults().length);

  readonly visibleResults = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();

    return this.activeResults().slice(start, end);
  });

  readonly canShowEmptyStates = computed(() => {
    return !this.hasSearched() && !this.isSearching();
  });

  readonly canShowSearching = computed(() => {
    return this.isSearching();
  });

  readonly canShowResults = computed(() => {
    return this.hasSearched() && !this.isSearching();
  });

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  selectEntity(entity: SearchEntity): void {
    this.selectedEntity.set(entity);
    this.pageIndex.set(0);
    this.hasSearched.set(false);
    this.isSearching.set(false);
    this.searchPanelExpanded.set(true);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  toggleSearchPanel(): void {
    this.searchPanelExpanded.update((expanded) => !expanded);
  }

  clearSearch(): void {
    this.activeForm().reset();
    this.hasSearched.set(false);
    this.isSearching.set(false);
    this.searchPanelExpanded.set(true);
    this.pageIndex.set(0);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  search(): void {
    if (this.isSearching()) {
      return;
    }

    this.profileOpen.set(false);
    this.hasSearched.set(false);
    this.isSearching.set(true);
    this.searchPanelExpanded.set(true);
    this.pageIndex.set(0);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.isSearching.set(false);
      this.hasSearched.set(true);
    }, 1800);
  }

  setPageSize(size: PageSize): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.closeProfile();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  goToMainSearch(): void {
    this.closeProfile();
  }

  goToHistory(): void {
    this.closeProfile();
  }

  goToSaved(): void {
    this.closeProfile();
  }

  toggleSave(result: SearchResult, event: MouseEvent): void {
    event.stopPropagation();

    const updater = (items: SearchResult[]) =>
      items.map((item) =>
        item.id === result.id
          ? {
            ...item,
            saved: !item.saved
          }
          : item
      );

    switch (result.entity) {
      case 'vehiculo':
        this.vehicleResults.update(updater);
        break;
      case 'armas':
        this.weaponResults.update(updater);
        break;
      default:
        this.personResults.update(updater);
        break;
    }
  }

  openResultDetail(result: SearchResult): void {
    if (result.entity === 'personas') {
      this.router.navigateByUrl('/perfil-consolidado');
      return;
    }

    this.router.navigateByUrl('/detalle-persona');
  }

  getTagLabel(tag: ResultTag): string {
    switch (tag.type) {
      case 'vehiculo':
        return 'Vehículos';
      case 'armas':
        return 'Armas';
      default:
        return 'Personas';
    }
  }

  getTagClass(tag: ResultTag): string {
    switch (tag.type) {
      case 'vehiculo':
        return 'search-result-tag--vehicle';
      case 'armas':
        return 'search-result-tag--weapon';
      default:
        return 'search-result-tag--person';
    }
  }

  private createMockResults(entity: SearchEntity): SearchResult[] {
    const personBase: Omit<SearchResult, 'id' | 'saved'>[] = [
      {
        entity: 'personas',
        name: 'Ana Sofía García Hernández',
        alias: 'La Güera',
        curp: 'AOGH880214MDFRNR05',
        rfc: 'GAHA880214QW2',
        tags: [
          { type: 'vehiculo', count: 1 },
          { type: 'personas', count: 2 }
        ]
      },
      {
        entity: 'personas',
        name: 'Juan Carlos Mendoza Rivera',
        alias: 'El Norteño',
        curp: 'MERJ790812HDFNVR08',
        rfc: 'MERJ790812PZ1',
        tags: [
          { type: 'personas', count: 3 },
          { type: 'armas', count: 1 }
        ]
      },
      {
        entity: 'personas',
        name: 'José Luis Martínez González',
        alias: 'El Coronel',
        curp: 'MAGL680423HDFRTY01',
        rfc: 'MAGL680423MM2',
        tags: [
          { type: 'armas', count: 3 }
        ]
      },
      {
        entity: 'personas',
        name: 'María Fernanda López Torres',
        alias: 'La Licenciada',
        curp: 'LOTF910302MDFPRS04',
        rfc: 'LOTF910302KD8',
        tags: [
          { type: 'personas', count: 1 },
          { type: 'vehiculo', count: 2 }
        ]
      },
      {
        entity: 'personas',
        name: 'Carlos Eduardo Ramírez Soto',
        alias: 'El Flaco',
        curp: 'RASC850924HDFMTR07',
        rfc: 'RASC850924TQ9',
        tags: [
          { type: 'vehiculo', count: 1 }
        ]
      },
      {
        entity: 'personas',
        name: 'Iván Roberto Salinas Cruz',
        alias: 'El Chino',
        curp: 'SACI900711HDFLVR06',
        rfc: 'SACI900711MN5',
        tags: [
          { type: 'personas', count: 2 },
          { type: 'armas', count: 2 }
        ]
      },
      {
        entity: 'personas',
        name: 'Luis Alberto Pérez Molina',
        alias: 'El Güero',
        curp: 'PEML830517HDFLRS03',
        rfc: 'PEML830517PU7',
        tags: [
          { type: 'vehiculo', count: 1 },
          { type: 'armas', count: 1 }
        ]
      },
      {
        entity: 'personas',
        name: 'Daniela Castro Jiménez',
        alias: 'Dany',
        curp: 'CAJD950109MDFSTM09',
        rfc: 'CAJD950109KA4',
        tags: [
          { type: 'personas', count: 4 }
        ]
      }
    ];

    const vehicleBase: Omit<SearchResult, 'id' | 'saved'>[] = [
      {
        entity: 'vehiculo',
        name: 'Nissan Versa 2020',
        serie: '3N1CN7AD2LL823450',
        placa: 'ABC-123-D',
        marca: 'Nissan',
        modelo: 'Versa',
        color: 'Blanco',
        tags: [
          { type: 'personas', count: 1 }
        ]
      },
      {
        entity: 'vehiculo',
        name: 'Volkswagen Jetta 2019',
        serie: '3VW2B7AJ9KM284112',
        placa: 'XYZ-982-A',
        marca: 'Volkswagen',
        modelo: 'Jetta',
        color: 'Gris',
        tags: [
          { type: 'personas', count: 2 },
          { type: 'armas', count: 1 }
        ]
      },
      {
        entity: 'vehiculo',
        name: 'Chevrolet Aveo 2021',
        serie: 'LSGHD52H0MD103928',
        placa: 'MNO-552-C',
        marca: 'Chevrolet',
        modelo: 'Aveo',
        color: 'Negro',
        tags: [
          { type: 'vehiculo', count: 1 }
        ]
      }
    ];

    const weaponBase: Omit<SearchResult, 'id' | 'saved'>[] = [
      {
        entity: 'armas',
        name: 'Arma corta 9mm',
        serie: 'GXR-90213',
        marca: 'Glock',
        modelo: '17',
        calibre: '9mm',
        tags: [
          { type: 'personas', count: 1 },
          { type: 'vehiculo', count: 1 }
        ]
      },
      {
        entity: 'armas',
        name: 'Rifle calibre .223',
        serie: 'RFL-88210',
        marca: 'Colt',
        modelo: 'M4',
        calibre: '.223',
        tags: [
          { type: 'personas', count: 2 }
        ]
      },
      {
        entity: 'armas',
        name: 'Escopeta calibre 12',
        serie: 'ESC-55310',
        marca: 'Mossberg',
        modelo: '500',
        calibre: '12',
        tags: [
          { type: 'armas', count: 1 }
        ]
      }
    ];

    const base =
      entity === 'vehiculo'
        ? vehicleBase
        : entity === 'armas'
          ? weaponBase
          : personBase;

    return Array.from({ length: 68 }, (_, index) => {
      const item = base[index % base.length];

      return {
        ...item,
        id: index + 1,
        saved: index % 7 === 0
      };
    });
  }
}