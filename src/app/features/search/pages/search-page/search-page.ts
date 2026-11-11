import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { concatMap, finalize, from, map, reduce, Subscription } from 'rxjs';
import { SimplePdfExportService } from '../../../../shared/services/simple-pdf-export.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  SearchHistoryItemDto,
  SearchResultItemDto,
  SearchResultsPageResponse
} from '../../../../core/infrastructure/search-api/search-api.models';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';
import { PersonReportApiService } from '../../../../core/infrastructure/search-api/person-report-api.service';
import { PersonReportStatusResponse } from '../../../../core/infrastructure/search-api/person-report-api.models';
import { SearchStateService } from '../../data-access/search-state.service';
import { SearchHistoryService } from '../../data-access/search-history.service';
import { historyDate, historyEntityLabel, historyInputsLabel, historyTitle } from '../../domain/search-history.mapper';
import { SavedSearchReferencesService } from '../../data-access/saved-search-references.service';
import {
  InvestigationLinkedSearch,
  InvestigationWorkspaceService
} from '../../../investigations/data-access/investigation-workspace.service';
import { PersonSearchFormValue } from '../../domain/person-search.models';
import { orderResultPage } from '../../domain/search-result-order';
import { VehicleSearchFormValue } from '../../domain/vehicle-search.models';
import { WeaponSearchFormValue } from '../../domain/weapon-search.models';
import { buildWeaponSearchRequest, normalizeWeaponSearch } from '../../domain/weapon-search-request.mapper';
import { buildVehicleSearchRequest, normalizeVehicleSearch } from '../../domain/vehicle-search-request.mapper';
import {
  buildPersonSearchRequest,
  hasSearchTerms
} from '../../domain/search-request.mapper';

import { Topbar } from '../../../../shared/layout/topbar/topbar';
type SearchEntity = 'personas' | 'vehiculo' | 'armas';
type PageSize = 10 | 18;
type ResultTagType = 'personas' | 'vehiculo' | 'armas';
type SidebarPanel = 'history' | 'bookmarks' | null;
type QuickSearchIcon = 'person' | 'curp';
type LinkFilter = 'all' | 'linked' | 'unlinked';
type PaginationItem = number | 'ellipsis';
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
  entity: SearchEntity;
  name: string;
  vin?: string;
  placa?: string;
  matricula?: string;
  alias?: string;
  curp?: string;
  rfc?: string;
  tags: ResultTag[];
  status?: string;
  kind?: string;
  hasConflicts: boolean;
  sources: string[];
  consolidatedProfileId?: string;
  consolidatedVersionNumber?: number;
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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Topbar],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly searchApi = inject(SearchApiService);
  private readonly pdfExport = inject(SimplePdfExportService);
  private readonly personReportApi = inject(PersonReportApiService);
  private readonly searchState = inject(SearchStateService);
  readonly searchHistory = inject(SearchHistoryService);
  readonly historyOpenError = signal<string | null>(null);
  readonly historyOpeningId = signal<string | null>(null);
  readonly historyTitle = historyTitle;
  readonly historyDate = historyDate;
  readonly historyEntityLabel = historyEntityLabel;
  readonly historyInputsLabel = historyInputsLabel;
  private readonly savedReferences = inject(SavedSearchReferencesService);
  private readonly investigationWorkspace = inject(InvestigationWorkspaceService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly restoredPage = this.searchState.page();

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;
  readonly investigationContext = this.investigationWorkspace.activeContext;
  readonly pivotContext = this.searchState.pivotContext;
  readonly historicalPivotParent = this.searchState.historicalPivotParent;
  readonly historicalSearchId = this.searchState.historicalSearchId;
  readonly recentResultsUrl = this.searchState.recentResultsUrl;
  readonly savedSearchRecords = this.savedReferences.records;
  readonly isSavingSearch = signal(false);
  readonly saveSearchFeedback = signal<string | null>(null);
  readonly saveSearchError = signal<string | null>(null);
  readonly isCurrentSearchSaved = computed(() => this.savedReferences.isSaved(this.searchId()));

  readonly activeSidebarPanel = signal<SidebarPanel>(null);
  readonly currentTime = signal(new Date());
  readonly currentDateLabel = computed(() => formatSpanishDate(this.currentTime()));
  readonly selectedEntity = signal<SearchEntity>(resolveSearchEntity(
    this.restoredPage?.entityType ||
    this.searchState.pivotContext()?.nodeType ||
    this.searchState.request()?.entityType
  ));
  readonly profileOpen = signal(false);
  readonly isSearching = signal(false);
  readonly isExportingReport = signal(false);
  readonly reportError = signal<string | null>(null);
  readonly isRequestingPersonReport = signal(false);
  readonly isPollingPersonReport = signal(false);
  readonly isDownloadingPersonReport = signal(false);
  readonly reportJobId = signal<string | null>(null);
  readonly personReportStatus = signal<string | null>(null);
  readonly personReportNotice = signal<string | null>(null);
  readonly personReportProgress = signal<number | null>(null);
  readonly personReportFileName = signal<string | null>(null);
  readonly personReportFileAvailable = signal(false);
  readonly personReportAccessExpiresAtUtc = signal<string | null>(null);
  readonly personReportFileExpiresAtUtc = signal<string | null>(null);
  readonly personReportStatusLabel = computed(() => ({
    Queued: 'En cola', Accepted: 'Aceptado', Delivering: 'Enviando',
    RetryScheduled: 'Reintento programado', Processing: 'Procesando',
    Completed: 'Completado', Failed: 'Fallido', Expired: 'Vencido'
  } as Record<string, string>)[this.personReportStatus() || ''] || this.personReportStatus() || 'Solicitado');
  readonly useMotorPersonReport = computed(() =>
    this.selectedEntity() === 'personas' && this.historicalSearchId() !== this.searchId()
  );
  readonly searchTipIndex = signal(0);
  readonly searchTips = [
    'Consultando coincidencias en las fuentes disponibles.',
    'Al finalizar podrás abrir un resultado para revisar su perfil y vínculos.',
    'Si alguna fuente responde de forma parcial, el estado se mostrará junto al total de resultados.'
  ] as const;
  readonly activeSearchTip = computed(
    () => this.searchTips[this.searchTipIndex() % this.searchTips.length]
  );
  readonly searchAttempted = signal(false);
  readonly hasSearched = signal(Boolean(this.restoredPage));
  readonly searchPanelExpanded = signal(
    !this.restoredPage || (this.restoredPage.items?.length ?? 0) === 0
  );
  readonly errorMessage = signal<string | null>(null);
  readonly pageSize = signal<PageSize>(this.searchState.pageSize());
  readonly linkFilter = signal<LinkFilter>('all');
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
  readonly consolidatedResultsCount = signal(this.restoredPage?.counts.consolidated ?? 0);
  readonly executionStatus = signal(
    translateExecutionStatus(this.restoredPage?.execution.status)
  );
  readonly isPartialResult = signal(
    this.restoredPage?.execution.isPartial ?? false
  );

  readonly entityOptions: EntityOption[] = [
    { key: 'personas', label: 'Personas' },
    { key: 'vehiculo', label: 'Vehículo' },
    { key: 'armas', label: 'Armas' }
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

  readonly personForm = this.fb.nonNullable.group({
    nombres: [this.searchState.formValue()?.nombres ?? ''],
    apellidoPaterno: [
      this.searchState.formValue()?.apellidoPaterno ?? ''
    ],
    apellidoMaterno: [
      this.searchState.formValue()?.apellidoMaterno ?? ''
    ],
    alias: [''],
    fechaNacimiento: [
      ''
    ],
    curp: [this.searchState.formValue()?.curp ?? '', [curpSearchValidator]],
    rfc: [this.searchState.formValue()?.rfc ?? ''],
    contacto: [
      '',
      [Validators.maxLength(120), contactValidator]
    ]
  });

  readonly vehicleForm = this.fb.nonNullable.group({
    vin: [this.searchState.vehicleFormValue()?.vin ?? ''],
    placa: [this.searchState.vehicleFormValue()?.placa ?? '']
  });

  readonly weaponForm = this.fb.nonNullable.group({
    matricula: [this.searchState.weaponFormValue()?.matricula ?? '', Validators.required]
  });

  private readonly results = signal<SearchResult[]>(
    this.mapResults(this.restoredPage?.items ?? [])
  );
  private clockInterval?: ReturnType<typeof setInterval>;
  private querySubscription?: Subscription;
  private searchTipInterval?: ReturnType<typeof setInterval>;
  private personReportPollTimer?: ReturnType<typeof setTimeout>;
  private personReportRequestSub?: Subscription;
  private personReportStatusSub?: Subscription;
  private personReportDownloadSub?: Subscription;
  private personReportPolls = 0;
  private personReportTransientErrors = 0;
  private reportOwnerAccount: string | null = null;

  constructor() {
    // Al cambiar la identidad de la sesión, detener las consultas del reporte anterior.
    effect(() => {
      const currentAccount = this.authService.accountNumber();
      if (this.reportOwnerAccount !== null && this.reportOwnerAccount !== currentAccount) {
        this.resetPersonReportState();
      }
      this.reportOwnerAccount = currentAccount;
    });
  }

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

  readonly pageResultsCount = computed(() => this.results().length);
  readonly linkedResultsOnPage = computed(
    () => this.results().filter((result) => result.tags.length > 0).length
  );
  readonly unlinkedResultsOnPage = computed(
    () => this.results().length - this.linkedResultsOnPage()
  );
  readonly visibleResults = computed(() => {
    const filter = this.linkFilter();
    if (filter === 'linked') {
      return this.results().filter((result) => result.tags.length > 0);
    }
    if (filter === 'unlinked') {
      return this.results().filter((result) => result.tags.length === 0);
    }
    return this.results();
  });
  readonly totalResults = computed(() => this.totalResultsCount());
  readonly paginationItems = computed<PaginationItem[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 1) {
      return [];
    }

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const pages = new Set<number>([
      1,
      total,
      Math.ceil(total / 2),
      current - 1,
      current,
      current + 1
    ]);

    const ordered = Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b);

    const items: PaginationItem[] = [];
    ordered.forEach((page, index) => {
      const previous = ordered[index - 1];
      if (index > 0 && page - previous > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  });

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
    this.restoreInvestigationContextFromRoute();
    const restoredRecent = this.searchState.recentHistoryItem();
    if (restoredRecent && this.searchState.page()?.searchId === restoredRecent.searchId) {
      this.applyHistoryCriteria(restoredRecent);
    }

    if (!this.isBrowser) {
      return;
    }

    // Manejar también navegación a la misma ruta /busqueda con otro searchId.
    this.querySubscription = this.route.queryParamMap.subscribe((params) => {
      const recentId = params.get('recentSearchId')?.trim();
      if (recentId && this.searchState.recentResultsUrl() && this.searchState.page()?.searchId === recentId) {
        const restored = this.searchState.page()!;
        const historyItem = this.searchState.recentHistoryItem();
        if (historyItem?.searchId === recentId) this.applyHistoryCriteria(historyItem);
        this.pageSize.set(18);
        this.applyPage(restored);
        this.hasSearched.set(true);
        this.errorMessage.set(null);
        this.searchPanelExpanded.set((restored.items?.length ?? 0) === 0);
        this.activeSidebarPanel.set(null);
        void this.router.navigate([], { relativeTo: this.route,
          queryParams: { recentSearchId: null }, queryParamsHandling: 'merge', replaceUrl: true });
        return;
      }
      const id = params.get('savedSearchId')?.trim();
      if (id) {
        if (this.historicalSearchId() !== id || this.searchId() !== id) this.openSavedById(id);
      } else {
        this.applyQuickPresetFromRoute();
      }
    });

    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    this.resetPersonReportState();
    this.querySubscription?.unsubscribe();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    this.stopSearchTipRotation();
  }

  private applyQuickPresetFromRoute(): void {
    const preset = this.route.snapshot.queryParamMap.get('quickPreset')?.trim();
    if (!preset) {
      return;
    }

    const presets: Record<string, QuickSearchItem | undefined> = {
      'recent-curp': this.recentSearches[0],
      'recent-miguel': this.recentSearches[1]
    };

    const item = presets[preset];
    if (!item) {
      return;
    }

    this.investigationWorkspace.clearContext();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { quickPreset: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.runQuickSearch(item);
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
    this.vehicleForm.reset({ vin: '', placa: '' });
    this.weaponForm.reset({ matricula: '' });
    this.searchState.clear();
    this.saveSearchFeedback.set(null);
    this.saveSearchError.set(null);
    this.removeHistoricalQueryParam();
    this.searchAttempted.set(false);
    this.resetResultState();
    this.searchPanelExpanded.set(true);
  }

  search(): void {
    if (this.isSearching()) {
      return;
    }

    const isVehicle = this.selectedEntity() === 'vehiculo';
    const isWeapon = this.selectedEntity() === 'armas';
    this.saveSearchFeedback.set(null);
    this.saveSearchError.set(null);
    this.removeHistoricalQueryParam();
    this.searchAttempted.set(true);
    this.reportError.set(null);
    this.errorMessage.set(null);
    const activeForm = isVehicle ? this.vehicleForm : isWeapon ? this.weaponForm : this.personForm;
    activeForm.markAllAsTouched();
    if (activeForm.invalid) {
      this.searchPanelExpanded.set(true);
      return;
    }

    const vehicleValue = isVehicle ? normalizeVehicleSearch(this.vehicleForm.getRawValue()) : null;
    const weaponValue = isWeapon ? normalizeWeaponSearch(this.weaponForm.getRawValue()) : null;
    const formValue = !isVehicle && !isWeapon ? this.normalizePersonForm() : null;
    if (vehicleValue) this.vehicleForm.patchValue(vehicleValue, { emitEvent: false });
    if (weaponValue) this.weaponForm.patchValue(weaponValue, { emitEvent: false });
    const request = vehicleValue ? buildVehicleSearchRequest(vehicleValue)
      : weaponValue ? buildWeaponSearchRequest(weaponValue)
      : buildPersonSearchRequest(formValue!);

    if (!hasSearchTerms(request)) {
      this.errorMessage.set(isVehicle
        ? 'Captura al menos el VIN/NIV o la placa del vehículo.'
        : isWeapon ? 'Captura la matrícula del arma.'
        : 'Captura al menos un criterio de búsqueda.');
      this.searchPanelExpanded.set(true);
      return;
    }

    this.resetPersonReportState();
    this.profileOpen.set(false);
    this.searchState.clearPivotContext();
    this.linkFilter.set('all');
    this.errorMessage.set(null);
    this.hasSearched.set(false);
    this.beginSearching();
    this.results.set([]);
    this.totalResultsCount.set(0);
    this.consolidatedResultsCount.set(0);
    this.currentPage.set(1);

    this.searchApi
      .executeSearch(request, this.pageSize())
      .pipe(finalize(() => this.endSearching()))
      .subscribe({
        next: (page) => {
          this.applyPage(page);
          if (this.activeSidebarPanel() === 'history') this.searchHistory.load(1);
          this.hasSearched.set(true);
          this.searchPanelExpanded.set((page.items?.length ?? 0) === 0);
          if (vehicleValue) {
            this.searchState.saveVehicleSearch(request, page, this.pageSize(), vehicleValue);
            this.investigationWorkspace.recordSuccessfulSearch(vehicleValue, page, 'vehiculo');
          } else if (weaponValue) {
            this.searchState.saveWeaponSearch(request, page, this.pageSize(), weaponValue);
            this.investigationWorkspace.recordSuccessfulSearch(weaponValue, page, 'armas');
          } else {
            this.searchState.saveSearch(request, page, this.pageSize(), formValue!);
            this.investigationWorkspace.recordSuccessfulSearch(formValue!, page);
          }
        },
        error: (error: unknown) => {
          this.hasSearched.set(false);
          this.searchPanelExpanded.set(true);
          this.errorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  /**
   * Person temporal: el Motor prepara todas las tarjetas, incluso de otras páginas.
   * Las otras entidades y las búsquedas históricas mantienen la exportación local anterior.
   */
  exportGeneralReport(): void {
    if (this.useMotorPersonReport()) {
      this.requestPersonReport();
      return;
    }
    this.exportLegacyGeneralReport();
  }

  private exportLegacyGeneralReport(): void {
    const id = this.searchId();
    if (!id || !this.totalResults() || this.isExportingReport()) return;
    const pageSize = this.pageSize();
    const maxResults = 500; // límite seguro para consultas muy grandes
    const pageCount = Math.ceil(Math.min(this.totalResults(), maxResults) / pageSize);
    this.reportError.set(null);
    this.isExportingReport.set(true);
    from(Array.from({length: pageCount}, (_, index) => index + 1)).pipe(
      concatMap(page => this.historicalSearchId() === id
        ? this.searchApi.getSavedResults(id, page, pageSize)
        : this.recentResultsUrl()
          ? this.searchApi.getHistoryResults(this.recentResultsUrl()!, id, page, pageSize)
          : this.searchApi.getResults(id, page, pageSize)),
      map(response => response.items ?? []),
      reduce((all, page) => [...all, ...page], [] as SearchResultItemDto[]),
      finalize(() => this.isExportingReport.set(false))
    ).subscribe({
      next: items => {
        if (!items.length) {
          this.reportError.set('No se recuperaron datos para el reporte.');
          return;
        }
        const results = this.mapResults(items.slice(0, maxResults));
        const incomplete = this.totalResults() > maxResults || items.length < this.totalResults();
        this.pdfExport.exportCards(
          `reporte-general-${id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`,
          'Reporte general de búsqueda',
          `${this.selectedEntity() === 'vehiculo' ? 'Vehículos' : this.selectedEntity() === 'armas' ? 'Armas' : 'Personas'} · ${results.length} de ${this.totalResults()} resultados`,
          [
            { title: 'RESUMEN DE LA BÚSQUEDA',
              subtitle: incomplete ? 'Reporte parcial: límite de 500 resultados o páginas no recibidas' : 'Resultados recuperados de todas las páginas',
              lines: [
                `Resultados reportados: ${results.length}`, `Resultados indicados por el servicio: ${this.totalResults()}`,
                `Estado: ${this.executionStatus() || 'No informado'}`,
                this.isPartialResult() ? 'Algunas fuentes devolvieron información parcial.' : 'Sin aviso de respuesta parcial.'
              ] },
            ...results.map((result, index) => ({
              title: `RESULTADO ${index + 1}`, subtitle: result.entity === 'vehiculo' ? 'Vehículo' : result.entity === 'armas' ? 'Arma' : 'Persona',
              lines: [
                `Nombre o identificación: ${result.name}`,
                ...(result.curp ? [`CURP: ${result.curp}`] : []),
                ...(result.rfc ? [`RFC: ${result.rfc}`] : []),
                ...(result.alias ? [`Alias: ${result.alias}`] : []),
                ...(result.vin ? [`NIV: ${result.vin}`] : []),
                ...(result.placa ? [`Placa: ${result.placa}`] : []),
                ...(result.matricula ? [`Matrícula: ${result.matricula}`] : []),
                `Vínculos: ${result.tags.map(tag => `${this.getTagLabel(tag)} ${tag.count}`).join(', ') || 'Ninguno informado'}`,
                `Fuentes: ${result.sources.join(', ') || 'No informadas'}`
              ]
            }))
          ]
        );
      },
      error: error => { this.reportError.set(this.extractErrorMessage(error)); }
    });
  }


  /** Inicia sólo una orden REP-02 por interacción del usuario; el 202 no equivale a PDF listo. */
  requestPersonReport(): void {
    const id = this.searchId();
    if (!this.isBrowser || !id || this.totalResults() <= 0 || !this.useMotorPersonReport() ||
        this.isRequestingPersonReport() || this.isPollingPersonReport() || this.personReportFileAvailable() ||
        this.isDownloadingPersonReport()) return;

    // Si ya existe el trabajo, nunca repetir POST sólo para averiguar su estado.
    if (this.reportJobId()) {
      this.resumePersonReportStatus();
      return;
    }

    this.reportError.set(null);
    this.personReportNotice.set(null);
    this.isRequestingPersonReport.set(true);
    this.personReportRequestSub = this.personReportApi.requestReport(id)
      .pipe(finalize(() => this.isRequestingPersonReport.set(false)))
      .subscribe({
        next: receipt => {
          if (this.searchId() !== id) return;
          if (!receipt.reportJobId?.trim()) {
            this.reportError.set('El Motor no devolvió el identificador del trabajo de reporte.');
            return;
          }
          this.reportJobId.set(receipt.reportJobId);
          this.personReportStatus.set(receipt.status?.trim() || 'Queued');
          this.personReportNotice.set(receipt.reused
            ? 'Se reutilizó una solicitud anterior. Consultando el estado del PDF.'
            : 'Reporte solicitado. El Motor está preparando el archivo completo.');
          this.resumePersonReportStatus();
        },
        error: error => {
          if (this.searchId() === id) {
            this.reportError.set(this.personReportRequestError(error));
          }
        }
      });
  }

  /** REP-03: consulta secuencial con espera, sin solicitudes simultáneas. */
  resumePersonReportStatus(): void {
    const jobId = this.reportJobId();
    if (!this.isBrowser || !jobId || !this.useMotorPersonReport() || this.isPollingPersonReport()) return;
    this.reportError.set(null);
    this.personReportPolls = 0;
    this.personReportTransientErrors = 0;
    this.isPollingPersonReport.set(true);
    this.checkPersonReportStatus(jobId);
  }

  private checkPersonReportStatus(jobId: string): void {
    if (!this.isBrowser || this.reportJobId() !== jobId) return;
    if (!this.authService.isAuthenticated()) {
      this.pausePersonReportPolling('La sesión ya no está activa. Inicia sesión para consultar el reporte.');
      return;
    }
    if (this.personReportPolls >= 120) {
      this.pausePersonReportPolling('La generación está tardando más de lo esperado. Puedes consultar el estado sin solicitar otro reporte.');
      return;
    }
    if (this.personReportAccessExpiresAtUtc()) {
      const expiry = Date.parse(this.personReportAccessExpiresAtUtc()!);
      if (Number.isFinite(expiry) && expiry <= Date.now()) {
        this.personReportStatus.set('Expired');
        this.pausePersonReportPolling('El acceso al trabajo PDF ha vencido.');
        return;
      }
    }
    this.personReportPolls++;
    this.personReportStatusSub = this.personReportApi.getStatus(jobId).subscribe({
      next: data => {
        if (this.reportJobId() !== jobId) return;
        if (data.reportJobId !== jobId || data.searchId !== this.searchId()) {
          this.pausePersonReportPolling('El Motor devolvió identificadores que no corresponden a la búsqueda actual.');
          return;
        }
        this.personReportTransientErrors = 0;
        this.applyPersonReportStatus(data);
        if (data.status === 'Completed') {
          if (data.file?.available) {
            this.personReportFileAvailable.set(true);
            this.personReportNotice.set('Tu reporte está listo para descargar.');
            this.isPollingPersonReport.set(false);
          } else {
            this.pausePersonReportPolling('La generación finalizó, pero el archivo PDF no está disponible.');
          }
          return;
        }
        if (data.status === 'Failed' || data.status === 'Expired') {
          this.pausePersonReportPolling(data.error?.message ||
            (data.status === 'Expired' ? 'El reporte ha vencido.' : 'No fue posible generar el reporte.'));
          return;
        }
        if (!['Queued', 'Delivering', 'RetryScheduled', 'Accepted', 'Processing'].includes(data.status || '')) {
          this.pausePersonReportPolling('El Motor devolvió un estado no reconocido. Consulta el estado más tarde.');
          return;
        }
        this.schedulePersonReportPoll(jobId, 3000);
      },
      error: error => {
        if (this.reportJobId() !== jobId) return;
        if (error instanceof HttpErrorResponse && (error.status === 502 || error.status === 503 || error.status === 504 || error.status === 0)) {
          this.personReportTransientErrors++;
          if (this.personReportTransientErrors <= 4) {
            this.personReportNotice.set('El servicio de reportes no está disponible temporalmente. Reintentando la consulta...');
            this.schedulePersonReportPoll(jobId, Math.min(this.personReportTransientErrors * 3000, 15000));
            return;
          }
        }
        this.pausePersonReportPolling(this.extractErrorMessage(error));
      }
    });
  }

  private applyPersonReportStatus(data: PersonReportStatusResponse): void {
    this.personReportStatus.set(data.status || 'Sin estado');
    this.personReportProgress.set(typeof data.progress?.percentage === 'number'
      ? Math.max(0, Math.min(100, data.progress.percentage)) : null);
    this.personReportFileName.set(data.file?.fileName?.trim() || null);
    this.personReportAccessExpiresAtUtc.set(data.accessExpiresAtUtc || null);
    this.personReportFileExpiresAtUtc.set(data.file?.availableUntilUtc || null);
    this.personReportFileAvailable.set(false);
    if (data.status !== 'Completed') {
      this.personReportNotice.set('Preparando el PDF completo de la búsqueda.');
    }
  }

  private schedulePersonReportPoll(jobId: string, delay: number): void {
    this.clearPersonReportPollTimer();
    if (this.reportJobId() !== jobId || !this.isPollingPersonReport()) return;
    this.personReportPollTimer = setTimeout(() => {
      this.personReportPollTimer = undefined;
      this.checkPersonReportStatus(jobId);
    }, delay);
  }

  private pausePersonReportPolling(message: string): void {
    this.clearPersonReportPollTimer();
    this.isPollingPersonReport.set(false);
    this.personReportNotice.set(null);
    this.reportError.set(message);
  }

  /** REP-04: descarga el Blob autenticado sólo si REP-03 confirmó disponibilidad. */
  downloadPersonReport(): void {
    const jobId = this.reportJobId();
    if (!this.isBrowser || !jobId || !this.personReportFileAvailable() || this.isDownloadingPersonReport()) return;
    const expirations = [this.personReportAccessExpiresAtUtc(), this.personReportFileExpiresAtUtc()];
    if (expirations.some(value => value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now())) {
      this.personReportFileAvailable.set(false);
      this.personReportStatus.set('Expired');
      this.reportError.set('El acceso al reporte venció.');
      return;
    }
    this.isDownloadingPersonReport.set(true);
    this.reportError.set(null);
    this.personReportDownloadSub = this.personReportApi.downloadReport(jobId)
      .pipe(finalize(() => this.isDownloadingPersonReport.set(false)))
      .subscribe({
        next: response => { void this.savePersonReportFile(jobId, response.body, response.headers.get('Content-Type')); },
        error: error => { void this.handlePersonReportDownloadError(jobId, error); }
      });
  }

  private async savePersonReportFile(jobId: string, blob: Blob | null, contentType: string | null): Promise<void> {
    if (this.reportJobId() !== jobId) return;
    if (!contentType?.toLowerCase().includes('application/pdf') || !blob || blob.size === 0 ||
        await blob.slice(0, 5).text() !== '%PDF-') {
      this.reportError.set('La descarga no devolvió un archivo PDF válido.');
      return;
    }
    if (this.reportJobId() !== jobId) return;
    const requestedName = this.personReportFileName() || `reporte-general-${jobId}.pdf`;
    const fileName = requestedName.replace(/[\/\\:*?"<>|\x00-\x1f]/g, '_').trim();
    const cleanName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  private async handlePersonReportDownloadError(jobId: string, error: unknown): Promise<void> {
    if (this.reportJobId() !== jobId) return;
    let code: string | null = null;
    let message: string | null = null;
    if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
      try {
        const json = JSON.parse(await error.error.text()) as {
          message?: string; errors?: Array<{ code?: string; message?: string }>;
        };
        code = json.errors?.[0]?.code || null;
        message = json.errors?.[0]?.message || json.message || null;
      } catch { /* cuerpo de error no JSON */ }
    }
    if (this.reportJobId() !== jobId) return;
    if (code === 'REPORT_FILE_NOT_READY' || (error instanceof HttpErrorResponse && error.status === 409)) {
      this.personReportFileAvailable.set(false);
      this.personReportNotice.set('El archivo aún no está listo. Consultando nuevamente el estado.');
      this.resumePersonReportStatus();
      return;
    }
    if (code === 'REPORT_FILE_EXPIRED' || (error instanceof HttpErrorResponse && error.status === 410)) {
      this.personReportFileAvailable.set(false);
      this.personReportStatus.set('Expired');
      this.reportError.set('El archivo PDF ha vencido y ya no se puede descargar.');
      return;
    }
    this.reportError.set(message || this.extractErrorMessage(error));
  }

  private personReportRequestError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404 || error.status === 410) {
        this.searchHistory.reload();
        return 'La búsqueda temporal ya no está disponible. Puedes actualizar el historial o ejecutar una nueva búsqueda.';
      }
      if (error.status === 409) return 'La búsqueda no tiene resultados o presenta un conflicto para generar el reporte.';
      if (error.status === 422) return 'El generador PDF sólo admite búsquedas de personas.';
    }
    return this.extractErrorMessage(error);
  }

  private clearPersonReportPollTimer(): void {
    if (this.personReportPollTimer) {
      clearTimeout(this.personReportPollTimer);
      this.personReportPollTimer = undefined;
    }
  }

  private resetPersonReportState(): void {
    this.clearPersonReportPollTimer();
    this.personReportRequestSub?.unsubscribe();
    this.personReportStatusSub?.unsubscribe();
    this.personReportDownloadSub?.unsubscribe();
    this.reportJobId.set(null);
    this.personReportStatus.set(null);
    this.personReportNotice.set(null);
    this.personReportProgress.set(null);
    this.personReportFileName.set(null);
    this.personReportAccessExpiresAtUtc.set(null);
    this.personReportFileExpiresAtUtc.set(null);
    this.personReportFileAvailable.set(false);
    this.isRequestingPersonReport.set(false);
    this.isPollingPersonReport.set(false);
    this.isDownloadingPersonReport.set(false);
    this.personReportPolls = 0;
    this.personReportTransientErrors = 0;
  }

  /** Coincidencias observables en datos resumidos; no equivalen al criterio interno del buscador. */
  matchedSearchFields(result: SearchResult): string[] {
    if (result.entity !== 'personas') return [];
    const form = this.personForm.getRawValue();
    const same = (actual: string | undefined, expected: string) =>
      Boolean(actual && expected?.trim() && actual.toUpperCase().trim() === expected.trim().toUpperCase());
    const fields: string[] = [];
    if (same(result.curp, form.curp)) fields.push('CURP');
    if (same(result.rfc, form.rfc)) fields.push('RFC');
    const resultName = result.name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
    for (const [label, value] of [
      ['Nombre', form.nombres], ['Apellido paterno', form.apellidoPaterno],
      ['Apellido materno', form.apellidoMaterno]
    ] as const) {
      const norm = value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm && resultName.includes(norm)) fields.push(label);
    }
    return fields;
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

  setLinkFilter(filter: LinkFilter): void {
    this.linkFilter.set(filter);
  }

  goToPage(pageNumber: number): void {
    if (
      pageNumber < 1 ||
      pageNumber > this.totalPages() ||
      pageNumber === this.currentPage() ||
      this.isSearching()
    ) {
      return;
    }

    this.loadPage(pageNumber);
  }

  firstPage(): void {
    this.goToPage(1);
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

  lastPage(): void {
    this.goToPage(this.totalPages());
  }

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
  }

  @HostListener('document:click')
  closeProfileOnOutsideClick(): void {
    this.closeProfile();
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    this.resetPersonReportState();
    this.searchState.clear();
    this.searchHistory.clear();
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
    this.historyOpenError.set(null);
    this.searchHistory.load(1);
  }

  goToSaved(): void {
    this.closeProfile();
    this.activeSidebarPanel.set('bookmarks');
  }

  /** Recuperar un resultado temporal ya ejecutado sin repetir POST /api/search. */
  openRecentSearch(item: SearchHistoryItemDto): void {
    if (this.isSearching() || this.historyOpeningId()) return;
    this.historyOpenError.set(null);
    this.historyOpeningId.set(item.searchId);
    this.searchApi.getHistoryResults(item.resultsUrl, item.searchId, 1, 18).pipe(
      finalize(() => this.historyOpeningId.set(null))
    ).subscribe({
      next: response => {
        if (response.searchId && response.searchId !== item.searchId) {
          this.historyOpenError.set('El servicio devolvió una búsqueda distinta a la seleccionada.');
          return;
        }
        const page: SearchResultsPageResponse = {
          ...response, searchId: item.searchId, entityType: response.entityType || item.entityType
        };
        this.investigationWorkspace.clearContext();
        this.removeHistoricalQueryParam();
        this.pageSize.set(18);
        this.applyHistoryCriteria(item);
        this.resetPersonReportState();
        this.searchState.saveRecentResults(item, page, 18);
        this.applyPage(page);
        this.hasSearched.set(true);
        this.searchAttempted.set(false);
        this.linkFilter.set('all');
        this.errorMessage.set(null);
        this.reportError.set(null);
        this.saveSearchError.set(null);
        this.saveSearchFeedback.set(null);
        this.searchPanelExpanded.set((page.items?.length ?? 0) === 0);
        this.activeSidebarPanel.set(null);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 410)) {
          this.historyOpenError.set('La búsqueda temporal venció o ya no existe. Actualizamos la lista; ejecuta una búsqueda nueva sólo si lo deseas.');
          this.searchHistory.load(1);
        } else {
          this.historyOpenError.set(this.extractErrorMessage(error));
        }
      }
    });
  }

  /** Rellena criterios conocidos únicamente para mostrarlos, sin ejecutar otra búsqueda. */
  private applyHistoryCriteria(item: SearchHistoryItemDto): void {
    const type = resolveSearchEntity(item.entityType);
    this.selectedEntity.set(type);
    const values = new Map((item.inputs ?? []).map(entry => [entry.code.toLowerCase(), entry.value]));
    this.personForm.reset(this.emptyPersonFormValue());
    this.vehicleForm.reset({ vin: '', placa: '' });
    this.weaponForm.reset({ matricula: '' });
    if (type === 'vehiculo') {
      this.vehicleForm.patchValue({ vin: values.get('vin') ?? values.get('niv') ?? '', placa: values.get('placa') ?? '' });
    } else if (type === 'armas') {
      this.weaponForm.patchValue({ matricula: values.get('matricula') ?? '' });
    } else {
      this.personForm.patchValue({
        nombres: values.get('nombre') ?? values.get('nombres') ?? '',
        apellidoPaterno: values.get('apellidopaterno') ?? '',
        apellidoMaterno: values.get('apellidomaterno') ?? '',
        curp: values.get('curp') ?? '', rfc: values.get('rfc') ?? ''
      });
    }
  }

  /** Conservar la búsqueda COMPLETA, no el resultado individual ni un perfil. */
  saveCurrentSearch(): void {
    const id = this.searchId();
    if (!id || this.isSavingSearch() || this.isSearching()) return;
    if (this.historicalSearchId() === id) {
      this.saveSearchFeedback.set('Ya estás consultando la búsqueda conservada.');
      return;
    }
    this.saveSearchError.set(null);
    this.saveSearchFeedback.set(null);
    this.isSavingSearch.set(true);
    this.searchApi.saveSearch(id).pipe(finalize(() => this.isSavingSearch.set(false)))
      .subscribe({
        next: (saved) => {
          this.savedReferences.remember(saved, this.selectedEntity());
          const until = new Date(saved.retainUntilUtc);
          const retainLabel = Number.isNaN(until.valueOf()) ? saved.retainUntilUtc :
            until.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
          this.saveSearchFeedback.set(
            `${saved.repeated ? 'La búsqueda ya estaba guardada' : 'Búsqueda guardada correctamente'}. Conservación hasta: ${retainLabel}.`
          );
        },
        error: (error: unknown) => this.saveSearchError.set(this.extractErrorMessage(error))
      });
  }

  /** Apertura por referencia local o ID explícito. La autorización siempre la valida backend. */
  openSavedById(rawId: string): void {
    const id = rawId.trim();
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      const message = 'Introduce un identificador UUID válido de una búsqueda guardada.';
      this.saveSearchError.set(message);
      this.errorMessage.set(message);
      return;
    }
    if (this.isSearching()) return;
    this.activeSidebarPanel.set(null);
    this.saveSearchError.set(null);
    this.saveSearchFeedback.set(null);
    this.resetPersonReportState();
    this.reportError.set(null);
    this.errorMessage.set(null);
    this.hasSearched.set(false);
    this.results.set([]);
    this.pageSize.set(18); // contrato de lectura histórica: tamaño por defecto
    this.beginSearching();
    this.searchApi.getSavedResults(id, 1, 18)
      .pipe(finalize(() => this.endSearching()))
      .subscribe({
        next: (page) => {
          this.applyPage(page);
          this.hasSearched.set(true);
          this.searchPanelExpanded.set((page.items?.length ?? 0) === 0);
          this.searchState.saveHistoricalResults(page, 18);
          void this.router.navigate([], { relativeTo: this.route,
            queryParams: { savedSearchId: id }, queryParamsHandling: 'merge', replaceUrl: true });
        },
        error: (error: unknown) => {
          this.searchPanelExpanded.set(true);
          this.errorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  returnToHistoricalParent(): void {
    const parent = this.historicalPivotParent();
    if (!parent) return;
    void this.router.navigate(['/perfil-consolidado'], { queryParams: {
      searchId: parent.searchId, resultId: parent.resultId,
      entityType: parent.entityType, historical: 'true'
    } });
  }

  private removeHistoricalQueryParam(): void {
    if (!this.route.snapshot.queryParamMap.has('savedSearchId')) return;
    void this.router.navigate([], { relativeTo: this.route,
      queryParams: { savedSearchId: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  goToInvestigationLines(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    void this.router.navigateByUrl('/lineas-investigacion');
  }

  goToInvestigations(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    this.backToInvestigation();
  }

  goToUsers(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    void this.router.navigate(['/investigaciones'], {
      queryParams: { screen: 'users' }
    });
  }

  backToInvestigation(): void {
    const context = this.investigationContext();
    if (!context) {
      void this.router.navigateByUrl('/investigaciones');
      return;
    }

    void this.router.navigate(['/investigaciones'], {
      queryParams: {
        investigationId: context.investigationId,
        tab: 'searches'
      }
    });
  }

  detachInvestigationContext(): void {
    this.investigationWorkspace.clearContext();
    void this.router.navigate(['/busqueda']);
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
    this.searchAttempted.set(false);
    this.search();
  }


  formatSavedRetention(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }

  getQuickSearchTypeLabel(item: QuickSearchItem): string {
    return item.icon === 'curp' ? 'CURP' : 'Persona';
  }

  getQuickSearchDescription(item: QuickSearchItem): string {
    const labels: Partial<Record<keyof PersonSearchFormValue, string>> = {
      nombres: 'Nombre',
      apellidoPaterno: 'A. paterno',
      apellidoMaterno: 'A. materno',
      alias: 'Alias',
      fechaNacimiento: 'Nacimiento',
      curp: 'CURP',
      rfc: 'RFC',
      contacto: 'Contacto'
    };

    const parts = Object.entries(item.values)
      .filter(([, value]) => String(value ?? '').trim())
      .slice(0, 2)
      .map(([key, value]) => `${labels[key as keyof PersonSearchFormValue] ?? key}: ${String(value).trim()}`);

    return parts.join(' · ') || 'Búsqueda de persona';
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

  uppercaseWeaponField(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const normalized = normalizeWeaponSearch({ matricula: input.value }).matricula;
    if (input.value !== normalized) input.value = normalized;
    if (this.weaponForm.controls.matricula.value !== normalized) {
      this.weaponForm.controls.matricula.setValue(normalized, { emitEvent: false });
    }
  }

  uppercaseVehicleField(event: Event, field: string): void {
    if (field !== 'vin' && field !== 'placa') return;
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const normalized = input.value.replace(/\s+/g, '').toLocaleUpperCase('es-MX');
    if (input.value !== normalized) input.value = normalized;
    const control = this.vehicleForm.controls[field];
    if (control.value !== normalized) control.setValue(normalized, { emitEvent: false });
  }

  shouldShowContactError(): boolean {
    const control = this.personForm.controls.contacto;
    return control.invalid && (control.touched || this.searchAttempted());
  }

  backToPivotGraph(): void {
    const context = this.pivotContext();
    if (!context?.graphProfileId) {
      return;
    }
    void this.router.navigate(['/grafo'], {
      queryParams: { profileId: context.graphProfileId, pivotLinkId: context.parentLinkId,
        ...(context.graphRootType ? { entityType: context.graphRootType } : {}) }
    });
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
        resultId: result.id,
        entityType: result.entity === 'vehiculo' ? 'Vehicle' : result.entity === 'armas' ? 'Weapon' : 'Person',
        kind: result.kind,
        ...(result.kind === 'ConsolidatedProfile' && result.consolidatedProfileId
          ? { profileId: result.consolidatedProfileId, versionNumber: result.consolidatedVersionNumber }
          : {}),
        ...(this.historicalSearchId() === currentSearchId ? { historical: 'true' } : {})
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

  private restoreInvestigationContextFromRoute(): void {
    const params = this.route.snapshot.queryParamMap;
    const investigationId = params.get('investigationId');
    const linkedSearchId = params.get('linkedSearchId');

    if (!investigationId && !linkedSearchId) {
      this.investigationWorkspace.clearContext();
    }

    if (investigationId) {
      this.investigationWorkspace.beginSearch({
        investigationId,
        investigationFolio: params.get('investigationFolio') || this.investigationContext()?.investigationFolio || 'Investigación',
        investigationName: params.get('investigationName') || this.investigationContext()?.investigationName || 'Investigación',
        lineId: params.get('lineId') || undefined,
        lineTitle: params.get('lineTitle') || undefined,
        pivotNode: params.get('pivotNode') || undefined
      });

      if (!linkedSearchId) {
        this.clearSearch();
      }
    }

    if (!linkedSearchId) {
      return;
    }

    const linkedSearch = this.investigationWorkspace.findSearch(linkedSearchId);
    if (!linkedSearch) {
      this.errorMessage.set('No se encontró la búsqueda vinculada a la investigación.');
      return;
    }

    this.restoreLinkedSearch(linkedSearch);
  }

  private restoreLinkedSearch(search: InvestigationLinkedSearch): void {
    this.investigationWorkspace.resumeSearch(search);
    const isVehicle = search.entity === 'vehiculo';
    const isWeapon = search.entity === 'armas';
    this.selectedEntity.set(search.entity);
    if (isVehicle) {
      this.vehicleForm.reset({ vin: '', placa: '' });
      this.vehicleForm.patchValue(search.criteria as VehicleSearchFormValue);
    } else if (isWeapon) {
      this.weaponForm.reset({ matricula: '' });
      this.weaponForm.patchValue(search.criteria as WeaponSearchFormValue);
    } else {
      this.personForm.reset(this.emptyPersonFormValue());
      this.personForm.patchValue(search.criteria as PersonSearchFormValue);
    }
    this.searchPanelExpanded.set(false);
    this.errorMessage.set(null);

    if (!search.backendSearchId) {
      this.searchPanelExpanded.set(true);
      return;
    }

    this.beginSearching();
    this.searchApi
      .getResults(search.backendSearchId, 1, this.pageSize())
      .pipe(finalize(() => this.endSearching()))
      .subscribe({
        next: (page) => {
          this.applyPage(page);
          this.hasSearched.set(true);
          if (isVehicle) {
            const form = normalizeVehicleSearch(search.criteria as VehicleSearchFormValue);
            this.searchState.saveVehicleSearch(buildVehicleSearchRequest(form), page, this.pageSize(), form);
          } else if (isWeapon) {
            const form = normalizeWeaponSearch(search.criteria as WeaponSearchFormValue);
            this.searchState.saveWeaponSearch(buildWeaponSearchRequest(form), page, this.pageSize(), form);
          } else {
            const form = search.criteria as PersonSearchFormValue;
            this.searchState.saveSearch(buildPersonSearchRequest(form), page, this.pageSize(), form);
          }
        },
        error: () => {
          this.hasSearched.set(false);
          this.searchPanelExpanded.set(true);
          this.errorMessage.set(
            'Los criterios de la búsqueda fueron recuperados. El resultado anterior ya no está disponible; puedes ejecutarla nuevamente.'
          );
        }
      });
  }

  private beginSearching(): void {
    this.isSearching.set(true);
    this.searchTipIndex.set(0);
    this.stopSearchTipRotation();

    if (!this.isBrowser || this.searchTips.length <= 1) {
      return;
    }

    this.searchTipInterval = setInterval(() => {
      this.searchTipIndex.update(
        (index) => (index + 1) % this.searchTips.length
      );
    }, 3200);
  }

  private endSearching(): void {
    this.isSearching.set(false);
    this.stopSearchTipRotation();
  }

  private stopSearchTipRotation(): void {
    if (this.searchTipInterval) {
      clearInterval(this.searchTipInterval);
      this.searchTipInterval = undefined;
    }
  }

  private loadPage(pageNumber: number): void {
    const currentSearchId = this.searchId();
    if (!currentSearchId || this.isSearching()) {
      return;
    }

    this.errorMessage.set(null);
    this.beginSearching();

    (this.historicalSearchId() === currentSearchId
      ? this.searchApi.getSavedResults(currentSearchId, pageNumber, this.pageSize())
      : this.recentResultsUrl()
        ? this.searchApi.getHistoryResults(this.recentResultsUrl()!, currentSearchId, pageNumber, this.pageSize())
        : this.searchApi.getResults(currentSearchId, pageNumber, this.pageSize()))
      .pipe(finalize(() => this.endSearching()))
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
    if (this.searchId() !== page.searchId) this.resetPersonReportState();
    this.searchId.set(page.searchId);
    // Algunas respuestas paginadas omiten entityType. En tal caso preservar la selección.
    if (page.entityType?.toLowerCase() === 'vehicle') this.selectedEntity.set('vehiculo');
    else if (page.entityType?.toLowerCase() === 'weapon') this.selectedEntity.set('armas');
    else if (page.entityType?.toLowerCase() === 'person') this.selectedEntity.set('personas');
    this.results.set(this.mapResults(page.items ?? []));
    this.totalResultsCount.set(page.counts.totalItems);
    this.consolidatedResultsCount.set(page.counts.consolidated ?? 0);
    this.currentPage.set(page.pagination.page);
    this.totalPages.set(page.pagination.totalPages);
    this.hasPreviousPage.set(page.pagination.hasPreviousPage);
    this.hasNextPage.set(page.pagination.hasNextPage);
    this.executionStatus.set(translateExecutionStatus(page.execution.status));
    this.isPartialResult.set(page.execution.isPartial);
  }

  private mapResults(items: SearchResultItemDto[]): SearchResult[] {
    const vehicle = this.selectedEntity() === 'vehiculo';
    const weapon = this.selectedEntity() === 'armas';
    // El servicio debe ordenar el conjunto completo antes de paginar. Dentro
    // de la página recibida mostramos primero los consolidados sin generar
    // otra paginación ni fusionar personas que compartan el mismo nombre.
    return orderResultPage(items).map((item, index) => ({
      id: item.resultId,
      entity: vehicle ? 'vehiculo' : weapon ? 'armas' : 'personas',
      name: vehicle
        ? (readCardField(item.card, ['name', 'marca', 'make', 'modelo', 'model']) || `Vehículo · resultado ${index + 1}`)
        : weapon
          ? (readCardField(item.card, ['name', 'tipoArma', 'weaponType', 'marca', 'make']) || `Arma · resultado ${index + 1}`)
          : (item.card?.name?.value?.trim() || 'Nombre no informado'),
      vin: vehicle ? readCardField(item.card, ['vin', 'niv', 'vehicleIdentificationNumber']) : undefined,
      placa: vehicle ? readCardField(item.card, ['placa', 'plate', 'licensePlate', 'plateNumber']) : undefined,
      matricula: weapon ? readCardField(item.card, ['matricula', 'MATRICULA', 'registrationNumber']) : undefined,
      alias: !vehicle && !weapon ? item.card?.alias?.value?.trim() || undefined : undefined,
      curp: !vehicle && !weapon ? item.card?.curp?.value?.trim() || undefined : undefined,
      rfc: !vehicle && !weapon ? item.card?.rfc?.value?.trim() || undefined : undefined,
      tags: this.mapTags(item),
      status: item.status?.trim() || undefined,
      kind: item.kind?.trim() || undefined,
      hasConflicts: item.hasConflicts,
      sources: item.sources?.filter(Boolean) ?? [],
      consolidatedProfileId: item.kind === 'ConsolidatedProfile'
        ? item.consolidatedProfile?.profileId : undefined,
      consolidatedVersionNumber: item.kind === 'ConsolidatedProfile'
        ? item.consolidatedProfile?.versionNumber : undefined
    }));
  }

  private mapTags(item: SearchResultItemDto): ResultTag[] {
    const totals = new Map<ResultTagType, number>();

    for (const link of item.links ?? []) {
      const count = Math.max(link.count, 0);
      if (count === 0) {
        continue;
      }

      const type = this.resolveTagType(link.entityType);
      totals.set(type, (totals.get(type) ?? 0) + count);
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
    this.resetPersonReportState();
    this.stopSearchTipRotation();
    this.hasSearched.set(false);
    this.isSearching.set(false);
    this.errorMessage.set(null);
    this.reportError.set(null);
    this.saveSearchFeedback.set(null);
    this.saveSearchError.set(null);
    this.searchId.set(null);
    this.results.set([]);
    this.linkFilter.set('all');
    this.totalResultsCount.set(0);
    this.consolidatedResultsCount.set(0);
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
      alias: '',
      curp: normalizeUppercaseSearchText(current.curp),
      rfc: normalizeUppercaseSearchText(current.rfc),
      contacto: '',
      fechaNacimiento: ''
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
      rfc: '',
      contacto: ''
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      // No exponer mensajes del servicio sobre access/refresh token al usuario.
      if (error.status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
      if (error.status === 403) return 'No tienes permisos para realizar esta operación.';
      if (error.status === 410) return 'La búsqueda temporal o la búsqueda guardada ha vencido.';
      const apiMessage = this.readApiErrorMessage(error.error);
      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No fue posible conectar con el servicio de búsquedas.';
      }
      if (error.status === 404) return 'La búsqueda, el resultado o el vínculo solicitado no está disponible.';
      if (error.status === 409) return 'La operación presenta un conflicto con el estado actual de la búsqueda.';
      if (error.status === 422) return 'El guardado o el vínculo solicitado no cumple los requisitos del servicio.';
      if (error.status === 503) return 'El servicio de búsquedas guardadas está temporalmente indisponible en este ambiente.';

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

    if (Array.isArray(candidate.errors)) {
      const coded = candidate.errors.find((entry): entry is { code: string; message?: string } =>
        !!entry && typeof entry === 'object' && typeof entry.code === 'string');
      if (coded) {
        const labels: Record<string, string> = {
          SAVED_SEARCH_ACTIONS_UNAVAILABLE: 'El pivoteo de búsquedas guardadas no está habilitado en este ambiente.',
          PIVOT_INSUFFICIENT_DATA: 'El vínculo no contiene datos suficientes para una búsqueda nueva.',
          PIVOT_DATA_AMBIGUOUS: 'Los datos del vínculo son ambiguos para realizar el pivoteo.',
          PIVOT_ENTITY_NOT_SUPPORTED: 'Este tipo de vínculo no admite pivoteo.',
          AUTH_PROVIDER_RATE_LIMITED: 'El proveedor de autenticación está limitando las solicitudes. Inténtalo más tarde.'
        };
        return labels[coded.code] || coded.message || coded.code;
      }
    }
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

/** Conserva el tipo del nodo de pivoteo cuando la API omite entityType. */
function resolveSearchEntity(entityType?: string | null): SearchEntity {
  switch (entityType?.trim().toLowerCase()) {
    case 'vehicle': return 'vehiculo';
    case 'weapon': return 'armas';
    default: return 'personas';
  }
}

/** Las tarjetas resumen no garantizan atributos específicos de Vehicle/Weapon.
 * Mostrar únicamente los campos realmente devueltos por el backend. */
function readCardField(card: SearchResultItemDto['card'] | null | undefined, codes: string[]): string | undefined {
  if (!card) return undefined;
  const record = card as unknown as Record<string, unknown>;
  for (const code of codes) {
    const entry = record[code];
    const value = typeof entry === 'string' ? entry :
      entry && typeof entry === 'object' ? (entry as { value?: unknown }).value : null;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeUppercaseSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-MX');
}

function contactValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }

  if (isValidEmail(value) || normalizeMexicanCellphone(value) !== null) {
    return null;
  }

  return { contactFormat: true };
}

function normalizeContactValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (isValidEmail(trimmed)) {
    return trimmed.toLocaleLowerCase('es-MX');
  }

  return normalizeMexicanCellphone(trimmed) ?? trimmed;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function normalizeMexicanCellphone(value: string): string | null {
  return /^\d{10}$/.test(value) ? value : null;
}

function formatSpanishDate(date: Date): string {
  const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic'
  ];

  return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function translateExecutionStatus(value?: string | null): string {
  const normalized = value?.trim().toLocaleUpperCase('es-MX') ?? '';

  switch (normalized) {
    case 'COMPLETED':
    case 'COMPLETE':
    case 'SUCCESS':
    case 'SUCCEEDED':
      return 'Completada';
    case 'PROCESSING':
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'RUNNING':
      return 'En proceso';
    case 'PARTIAL':
    case 'PARTIALLY_COMPLETED':
      return 'Parcial';
    case 'PENDING':
    case 'QUEUED':
      return 'Pendiente';
    case 'FAILED':
    case 'ERROR':
      return 'Fallida';
    case 'CANCELLED':
    case 'CANCELED':
      return 'Cancelada';
    default:
      return value?.trim() ?? '';
  }
}

/** La CURP se permite vacía, pero si se utiliza debe ser completa y con forma válida. */
function curpSearchValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim().toUpperCase();
  if (!value) return null;
  return /^[A-ZÑ&]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(value)
    ? null
    : { curpFormato: true };
}
