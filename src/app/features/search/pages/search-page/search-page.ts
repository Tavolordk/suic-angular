import {
  CommonModule,
  DatePipe,
  isPlatformBrowser
} from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  SearchResultItemDto,
  SearchResultsPageResponse
} from '../../../../core/infrastructure/search-api/search-api.models';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';
import { SearchStateService } from '../../data-access/search-state.service';
import { PersonSearchFormValue } from '../../domain/person-search.models';
import {
  buildPersonSearchRequest,
  hasSearchTerms
} from '../../domain/search-request.mapper';

type SearchEntity = 'personas' | 'vehiculo' | 'armas';
type PageSize = 10 | 18;
type ResultTagType = 'personas' | 'vehiculo' | 'armas';
type SidebarPanel = 'history' | 'bookmarks' | null;
type QuickSearchIcon = 'person' | 'curp';
type UppercasePersonField =
  | 'nombres'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'alias'
  | 'curp'
  | 'rfc';

interface EntityOption {
  key: SearchEntity;
  label: string;
  disabled?: boolean;
}

interface ResultTag {
  type: ResultTagType;
  count: number;
}

interface SearchResult {
  id: string;
  entity: 'personas';
  name: string;
  alias?: string;
  curp?: string;
  rfc?: string;
  tags: ResultTag[];
  saved: boolean;
  status?: string;
  kind?: string;
  hasConflicts: boolean;
  sources: string[];
}

interface QuickSearchItem {
  id: number;
  label: string;
  type: 'personas';
  icon: QuickSearchIcon;
  values: Partial<PersonSearchFormValue>;
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
  private readonly searchApi = inject(SearchApiService);
  private readonly searchState = inject(SearchStateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly restoredPage = this.searchState.page();

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;

  readonly activeSidebarPanel = signal<SidebarPanel>(null);
  readonly currentTime = signal(new Date());
  readonly selectedEntity = signal<SearchEntity>('personas');
  readonly profileOpen = signal(false);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(Boolean(this.restoredPage));
  readonly searchPanelExpanded = signal(!this.restoredPage);
  readonly errorMessage = signal<string | null>(null);
  readonly pageSize = signal<PageSize>(this.searchState.pageSize());
  readonly searchId = signal<string | null>(this.restoredPage?.searchId ?? null);
  readonly currentPage = signal(this.restoredPage?.pagination.page ?? 1);
  readonly totalPages = signal(this.restoredPage?.pagination.totalPages ?? 0);
  readonly hasPreviousPage = signal(
    this.restoredPage?.pagination.hasPreviousPage ?? false
  );
  readonly hasNextPage = signal(
    this.restoredPage?.pagination.hasNextPage ?? false
  );
  readonly totalResultsCount = signal(
    this.restoredPage?.counts.totalItems ?? 0
  );
  readonly executionStatus = signal(
    this.restoredPage?.execution.status?.trim() ?? ''
  );
  readonly isPartialResult = signal(
    this.restoredPage?.execution.isPartial ?? false
  );

  readonly entityOptions: EntityOption[] = [
    { key: 'personas', label: 'Personas' },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      disabled: true
    },
    {
      key: 'armas',
      label: 'Armas',
      disabled: true
    }
  ];

  readonly recentSearches: QuickSearchItem[] = [
    {
      id: 1,
      label: 'HEGM880202HMCRDG02',
      type: 'personas',
      icon: 'curp',
      values: { curp: 'HEGM880202HMCRDG02' }
    },
    {
      id: 2,
      label: 'Miguel Angel Hernández',
      type: 'personas',
      icon: 'person',
      values: {
        nombres: 'MIGUEL ANGEL',
        apellidoPaterno: 'HERNANDEZ'
      }
    }
  ];

  readonly savedSearches: QuickSearchItem[] = [
    {
      id: 1,
      label: 'RFC HEMM7709295Z9',
      type: 'personas',
      icon: 'person',
      values: {
        nombres: 'MIGUEL ANGEL',
        apellidoPaterno: 'HERNANDEZ',
        rfc: 'HEMM7709295Z9'
      }
    },
    {
      id: 2,
      label: 'Miguel Hernández · 1977-09-29',
      type: 'personas',
      icon: 'person',
      values: {
        nombres: 'MIGUEL ANGEL',
        apellidoPaterno: 'HERNANDEZ',
        fechaNacimiento: '1977-09-29'
      }
    }
  ];

  readonly personForm = this.fb.nonNullable.group({
    nombres: [this.searchState.formValue()?.nombres ?? ''],
    apellidoPaterno: [
      this.searchState.formValue()?.apellidoPaterno ?? ''
    ],
    apellidoMaterno: [
      this.searchState.formValue()?.apellidoMaterno ?? ''
    ],
    alias: [this.searchState.formValue()?.alias ?? ''],
    fechaNacimiento: [
      this.searchState.formValue()?.fechaNacimiento ?? ''
    ],
    curp: [this.searchState.formValue()?.curp ?? ''],
    rfc: [this.searchState.formValue()?.rfc ?? '']
  });

  readonly vehicleForm = this.fb.nonNullable.group({
    niv: [''],
    placa: [''],
    noMotor: [''],
    marca: [''],
    modelo: [''],
    color: ['']
  });

  readonly weaponForm = this.fb.nonNullable.group({
    matricula: [''],
    marca: [''],
    modelo: [''],
    calibre: [''],
    tipoArma: [''],
    licencia: ['']
  });

  private readonly results = signal<SearchResult[]>(
    this.mapResults(this.restoredPage?.items ?? [])
  );
  private clockInterval?: ReturnType<typeof setInterval>;

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

  readonly visibleResults = computed(() => this.results());
  readonly totalResults = computed(() => this.totalResultsCount());

  readonly canShowEmptyStates = computed(
    () => !this.hasSearched() && !this.isSearching() && !this.errorMessage()
  );
  readonly canShowSearching = computed(() => this.isSearching());
  readonly canShowResults = computed(
    () =>
      this.hasSearched() &&
      !this.isSearching() &&
      !this.errorMessage() &&
      this.results().length > 0
  );
  readonly canShowNoResults = computed(
    () =>
      this.hasSearched() &&
      !this.isSearching() &&
      !this.errorMessage() &&
      this.results().length === 0
  );
  readonly canShowError = computed(
    () => !this.isSearching() && Boolean(this.errorMessage())
  );

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
  }

  selectEntity(entity: SearchEntity): void {
    const option = this.entityOptions.find((item) => item.key === entity);
    if (option?.disabled) {
      this.errorMessage.set(
        `El contrato recibido todavía no define la búsqueda de ${option.label.toLowerCase()}.`
      );
      return;
    }

    this.selectedEntity.set(entity);
    this.resetResultState();
    this.searchPanelExpanded.set(true);
  }

  toggleSearchPanel(): void {
    this.searchPanelExpanded.update((expanded) => !expanded);
  }

  clearSearch(): void {
    this.personForm.reset(this.emptyPersonFormValue());
    this.vehicleForm.reset();
    this.weaponForm.reset();
    this.searchState.clear();
    this.resetResultState();
    this.searchPanelExpanded.set(true);
  }

  search(): void {
    if (this.isSearching()) {
      return;
    }

    if (this.selectedEntity() !== 'personas') {
      this.errorMessage.set(
        'La integración disponible corresponde a entityType Person.'
      );
      return;
    }

    const formValue = this.normalizePersonForm();
    const request = buildPersonSearchRequest(formValue);

    if (!hasSearchTerms(request)) {
      this.errorMessage.set(
        'Captura al menos un nombre, apellido, fecha de nacimiento o identificador.'
      );
      return;
    }

    this.profileOpen.set(false);
    this.errorMessage.set(null);
    this.hasSearched.set(false);
    this.isSearching.set(true);
    this.results.set([]);
    this.totalResultsCount.set(0);
    this.currentPage.set(1);

    this.searchApi
      .executeSearch(request, this.pageSize())
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (page) => {
          this.applyPage(page);
          this.hasSearched.set(true);
          this.searchPanelExpanded.set(false);
          this.searchState.saveSearch(
            request,
            page,
            this.pageSize(),
            formValue
          );
        },
        error: (error: unknown) => {
          this.hasSearched.set(false);
          this.errorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  setPageSize(size: PageSize): void {
    if (size === this.pageSize()) {
      return;
    }

    this.pageSize.set(size);
    const currentSearchId = this.searchId();
    if (currentSearchId) {
      this.loadPage(1);
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.loadPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.loadPage(this.currentPage() + 1);
    }
  }

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    this.searchState.clear();
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  goToMainSearch(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
  }

  goToHistory(): void {
    this.closeProfile();
    this.activeSidebarPanel.set('history');
  }

  goToSaved(): void {
    this.closeProfile();
    this.activeSidebarPanel.set('bookmarks');
  }

  closeSidebarPanel(): void {
    this.activeSidebarPanel.set(null);
  }

  runQuickSearch(item: QuickSearchItem): void {
    this.selectedEntity.set('personas');
    this.activeSidebarPanel.set(null);
    this.profileOpen.set(false);
    this.searchPanelExpanded.set(true);
    this.personForm.reset(this.emptyPersonFormValue());
    this.personForm.patchValue(item.values);
    this.search();
  }

  getQuickSearchIcon(item: QuickSearchItem): QuickSearchIcon {
    return item.icon;
  }

  uppercasePersonField(
    event: Event,
    field: UppercasePersonField
  ): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const uppercaseValue = input.value.toLocaleUpperCase('es-MX');
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    if (input.value !== uppercaseValue) {
      input.value = uppercaseValue;
    }

    if (this.personForm.controls[field].value !== uppercaseValue) {
      this.personForm.controls[field].setValue(uppercaseValue, {
        emitEvent: false
      });
    }

    if (selectionStart !== null && selectionEnd !== null) {
      queueMicrotask(() => {
        input.setSelectionRange(selectionStart, selectionEnd);
      });
    }
  }

  toggleSave(result: SearchResult, event: MouseEvent): void {
    event.stopPropagation();
    this.searchState.toggleSavedResult(result.id);
    this.results.update((items) =>
      items.map((item) =>
        item.id === result.id ? { ...item, saved: !item.saved } : item
      )
    );
  }

  openResultDetail(result: SearchResult): void {
    const currentSearchId = this.searchId();
    if (!currentSearchId) {
      this.errorMessage.set(
        'No se encontró el identificador de la búsqueda para abrir el perfil.'
      );
      return;
    }

    void this.router.navigate(['/perfil-consolidado'], {
      queryParams: {
        searchId: currentSearchId,
        resultId: result.id
      }
    });
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

  private loadPage(pageNumber: number): void {
    const currentSearchId = this.searchId();
    if (!currentSearchId || this.isSearching()) {
      return;
    }

    this.errorMessage.set(null);
    this.isSearching.set(true);

    this.searchApi
      .getResults(currentSearchId, pageNumber, this.pageSize())
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (page) => {
          this.applyPage(page);
          this.hasSearched.set(true);
          this.searchState.updatePage(page, this.pageSize());
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  private applyPage(page: SearchResultsPageResponse): void {
    this.searchId.set(page.searchId);
    this.results.set(this.mapResults(page.items ?? []));
    this.totalResultsCount.set(page.counts.totalItems);
    this.currentPage.set(page.pagination.page);
    this.totalPages.set(page.pagination.totalPages);
    this.hasPreviousPage.set(page.pagination.hasPreviousPage);
    this.hasNextPage.set(page.pagination.hasNextPage);
    this.executionStatus.set(page.execution.status?.trim() ?? '');
    this.isPartialResult.set(page.execution.isPartial);
  }

  private mapResults(items: SearchResultItemDto[]): SearchResult[] {
    const savedIds = this.searchState.savedResultIds();

    return items.map((item) => ({
      id: item.resultId,
      entity: 'personas',
      name: item.card?.name?.value?.trim() || 'Sin nombre disponible',
      alias: item.card?.alias?.value?.trim() || undefined,
      curp: item.card?.curp?.value?.trim() || undefined,
      rfc: item.card?.rfc?.value?.trim() || undefined,
      tags: this.mapTags(item),
      saved: savedIds.has(item.resultId),
      status: item.status?.trim() || undefined,
      kind: item.kind?.trim() || undefined,
      hasConflicts: item.hasConflicts,
      sources: item.sources?.filter(Boolean) ?? []
    }));
  }

  private mapTags(item: SearchResultItemDto): ResultTag[] {
    const totals = new Map<ResultTagType, number>();

    for (const link of item.links ?? []) {
      const type = this.resolveTagType(link.entityType);
      totals.set(type, (totals.get(type) ?? 0) + Math.max(link.count, 0));
    }

    return Array.from(totals, ([type, count]) => ({ type, count }));
  }

  private resolveTagType(entityType?: string | null): ResultTagType {
    const normalized = entityType?.trim().toLowerCase() ?? '';
    if (normalized.includes('vehicle') || normalized.includes('veh')) {
      return 'vehiculo';
    }
    if (
      normalized.includes('weapon') ||
      normalized.includes('firearm') ||
      normalized.includes('arma')
    ) {
      return 'armas';
    }
    return 'personas';
  }

  private resetResultState(): void {
    this.hasSearched.set(false);
    this.isSearching.set(false);
    this.errorMessage.set(null);
    this.searchId.set(null);
    this.results.set([]);
    this.totalResultsCount.set(0);
    this.currentPage.set(1);
    this.totalPages.set(0);
    this.hasPreviousPage.set(false);
    this.hasNextPage.set(false);
    this.executionStatus.set('');
    this.isPartialResult.set(false);
  }


  private normalizePersonForm(): PersonSearchFormValue {
    const current = this.personForm.getRawValue();
    const normalized: PersonSearchFormValue = {
      ...current,
      nombres: normalizeUppercaseSearchText(current.nombres),
      apellidoPaterno: normalizeUppercaseSearchText(current.apellidoPaterno),
      apellidoMaterno: normalizeUppercaseSearchText(current.apellidoMaterno),
      alias: normalizeUppercaseSearchText(current.alias),
      curp: normalizeUppercaseSearchText(current.curp),
      rfc: normalizeUppercaseSearchText(current.rfc)
    };

    this.personForm.patchValue(normalized, { emitEvent: false });
    return normalized;
  }

  private emptyPersonFormValue(): PersonSearchFormValue {
    return {
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      alias: '',
      fechaNacimiento: '',
      curp: '',
      rfc: ''
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.readApiErrorMessage(error.error);
      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No fue posible conectar con el servicio de búsquedas.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'Tu sesión no tiene autorización para consultar búsquedas.';
      }

      return `El servicio de búsquedas respondió con código ${error.status}.`;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'Ocurrió un error inesperado al consultar la búsqueda.';
  }

  private readApiErrorMessage(response: unknown): string | null {
    if (typeof response === 'string' && response.trim()) {
      return response.trim();
    }

    if (!response || typeof response !== 'object') {
      return null;
    }

    const candidate = response as {
      message?: unknown;
      title?: unknown;
      errors?: unknown;
    };

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim();
    }

    if (typeof candidate.title === 'string' && candidate.title.trim()) {
      return candidate.title.trim();
    }

    if (Array.isArray(candidate.errors)) {
      const message = candidate.errors.find(
        (item): item is string => typeof item === 'string' && Boolean(item.trim())
      );
      return message?.trim() ?? null;
    }

    return null;
  }
}

function normalizeUppercaseSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-MX');
}
