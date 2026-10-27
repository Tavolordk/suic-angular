import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, retry, switchMap, throwError, timer } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';
import { SearchStateService } from '../../../search/data-access/search-state.service';
import { PivotConsolidationRegistryService } from '../../../graph/data-access/pivot-consolidation-registry.service';
import { ConsolidatedProfilesApiService } from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.service';
import { ConsolidateProfileRequest } from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { SimplePdfExportService } from '../../../../shared/services/simple-pdf-export.service';
import {
  ProfileFieldViewModel,
  ProfileLinkGroupViewModel,
  ProfileLinkItemViewModel,
  ProfilePhotoViewModel,
  ProfileSourceViewModel,
  SelectedProfileFieldViewModel
} from '../../domain/profile-consolidation.models';
import { mapSearchResultDetail } from '../../domain/profile-detail.mapper';

import { Topbar } from '../../../../shared/layout/topbar/topbar';
import { SearchQuickPanelService } from '../../../../shared/search-quick-panel/search-quick-panel.service';
type SidebarPanel = 'history' | 'bookmarks' | null;
type QuickSearchIcon = 'person' | 'curp' | 'vehicle' | 'weapon';

interface QuickSearchItem {
  id: number;
  label: string;
  type: string;
  icon: QuickSearchIcon;
}

const SOURCES_PER_PAGE = 5;
const FIELDS_PER_PAGE = 5;
const CONSOLIDATED_FIELDS_PER_PAGE = 3;
const ADDRESSES_PER_PAGE = 1;
const PHOTOS_PER_PAGE = 3;
const LINK_ITEMS_PER_PAGE = 2;

interface ConsolidatedAddressViewModel {
  id: string;
  title: string;
  sourceCode: string;
  sourceTitle: string;
  sourceColor: string;
  fields: SelectedProfileFieldViewModel[];
}

const ADDRESS_FIELD_CODES = new Set([
  'DOMICILIO',
  'DIRECCION',
  'ADDRESS',
  'FULLADDRESS',
  'DIRECCIONCOMPLETA',
  'CALLE',
  'STREET',
  'VIALIDAD',
  'NUMEROEXTERIOR',
  'EXTERIORNUMBER',
  'NUMEXT',
  'NOEXTERIOR',
  'NUMEROINTERIOR',
  'INTERIORNUMBER',
  'NUMINT',
  'NOINTERIOR',
  'COLONIA',
  'ASENTAMIENTO',
  'LOCALIDAD',
  'MUNICIPIO',
  'CITY',
  'ALCALDIA',
  'DELEGACION',
  'ENTIDAD',
  'ESTADO',
  'COUNTRY',
  'PAIS',
  'CODIGOPOSTAL',
  'CP',
  'ZIPCODE',
  'POSTALCODE',
  'STATE',
  'PROVINCE',
  'MUNICIPALITY',
  'TOWN',
  'NEIGHBORHOOD',
  'SUBURB',
  'SETTLEMENT',
  'ADDRESSLINE',
  'ADDRESSLINE1',
  'ADDRESSLINE2',
  'STREETNAME',
  'HOUSENUMBER',
  'BUILDINGNUMBER',
  'APARTMENTNUMBER',
  'BETWEENSTREETS',
  'ENTRECALLES',
  'REFERENCIADOMICILIO',
  'DOMICILIOREFERENCIA',
  'TIPODOMICILIO',
  'ADDRESSTYPE',
  'LATITUD',
  'LATITUDE',
  'LONGITUD',
  'LONGITUDE'
]);

@Component({
  selector: 'app-profile-consolidation-page',
  standalone: true,
  imports: [CommonModule, RouterLink, Topbar],
  templateUrl: './profile-consolidation-page.html',
  styleUrls: [
    './profile-consolidation-page.scss',
    './profile-consolidation-carousel.scss',
    // Va al final a proposito: necesita sobrescribir reglas del carrusel.
    './profile-consolidation-responsive.scss',
    './profile-consolidation-ux.scss'
  ]
})
export class ProfileConsolidationPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly searchApi = inject(SearchApiService);
  private readonly searchState = inject(SearchStateService);
  private readonly pivotRegistry = inject(PivotConsolidationRegistryService);
  private readonly consolidatedProfilesApi = inject(ConsolidatedProfilesApiService);
  private readonly pdfExport = inject(SimplePdfExportService);
  private readonly searchQuickPanel = inject(SearchQuickPanelService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly searchId =
    this.route.snapshot.queryParamMap.get('searchId')?.trim() ?? '';
  readonly resultId =
    this.route.snapshot.queryParamMap.get('resultId')?.trim() ?? '';
  readonly routeEntityType = this.route.snapshot.queryParamMap.get('entityType')?.trim() || ''; 

  readonly currentTime = signal(new Date());
  readonly currentDateLabel = computed(() => formatSpanishDate(this.currentTime()));
  readonly profileOpen = signal(false);
  readonly activeSidebarPanel = signal<SidebarPanel>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveErrorMessage = signal<string | null>(null);
  readonly saveSuccessMessage = signal<string | null>(null);
  readonly showCreateConfirmation = signal(false);
  @ViewChild('confirmCreateButton') private confirmCreateButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('createProfileDialog') private createProfileDialog?: ElementRef<HTMLElement>;
  readonly accepted = signal(false);
  readonly consolidatedProfileId = signal('');
  readonly originGraphProfileId = computed(() => {
    const context = this.searchState.pivotContext();
    return context && this.searchId === this.searchState.page()?.searchId ? context.graphProfileId : null;
  });
  readonly originGraphLinkId = computed(() => this.searchState.pivotContext()?.parentLinkId ?? null);
  readonly selectedSourceId = signal('');
  readonly sources = signal<ProfileSourceViewModel[]>([]);
  readonly links = signal<ProfileLinkGroupViewModel[]>([]);
  readonly activeLinkGroupId = signal<string | null>(null);
  readonly photos = signal<ProfilePhotoViewModel[]>([]);
  readonly profileName = signal('Cargando perfil...');
  readonly profileSubtitle = signal('Perfil de persona');
  readonly profileEntity = signal<'Person' | 'Vehicle' | 'Weapon'>('Person');
  readonly selectedDataLabel = computed(() => this.profileEntity() === 'Vehicle' ? 'Datos del vehículo'
    : this.profileEntity() === 'Weapon' ? 'Datos del arma' : 'Datos personales');
  readonly profileStatus = signal('');
  readonly hasConflicts = signal(false);
  readonly relatedFileCount = signal(0);
  readonly additionalObjectCount = signal(0);

  readonly sourcePageIndex = signal(0);
  readonly sourceFieldPageIndex = signal(0);
  readonly sourceRecordIndex = signal(-1); // -1 representa todos los registros
  readonly sourceFieldQuery = signal('');
  readonly consolidatedFieldPageIndex = signal(0);
  readonly addressPageIndex = signal(0);
  readonly photoPageIndex = signal(0);
  readonly linkItemPageIndex = signal(0);

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;
  readonly displayName = computed(
    () => this.accountNumber()?.trim() || 'Usuario'
  );
  readonly canExportPdf = computed(
    () => !this.isLoading() && !this.errorMessage() && this.sources().length > 0
  );

  readonly recentSearches: QuickSearchItem[] = [
    {
      id: 1,
      label: 'Búsqueda por persona',
      type: 'Personas',
      icon: 'person'
    },
    {
      id: 2,
      label: 'Búsqueda por CURP',
      type: 'Personas',
      icon: 'curp'
    }
  ];

  readonly savedSearches: QuickSearchItem[] = [
    {
      id: 1,
      label: 'Consulta guardada',
      type: 'Personas',
      icon: 'person'
    }
  ];

  readonly selectedSource = computed<ProfileSourceViewModel | null>(() => {
    const items = this.sources();
    if (!items.length) {
      return null;
    }

    return (
      items.find((source) => source.id === this.selectedSourceId()) ?? items[0]
    );
  });

  readonly selectedFields = computed<SelectedProfileFieldViewModel[]>(() =>
    this.sources().flatMap((source) =>
      source.fields
        .filter((field) => field.selected)
        .map((field) => ({
          ...field,
          sourceId: source.id,
          sourceCode: source.code,
          sourceTitle: source.title,
          sourceColor: source.color
        }))
    )
  );

  readonly selectedPersonalFields = computed(() =>
    this.selectedFields().filter((field) => !isAddressField(field))
  );

  readonly selectedAddressFields = computed(() =>
    this.selectedFields().filter(isAddressField)
  );

  readonly selectedAddresses = computed<ConsolidatedAddressViewModel[]>(() =>
    buildAddressGroups(this.selectedAddressFields())
  );

  readonly totalAvailable = computed(() =>
    this.sources().reduce((total, source) => total + countSelectableSlots(source.fields), 0)
  );

  // Dos fuentes que acreditan el mismo código y valor constituyen un solo dato,
  // pero mantienen ambas procedencias y sus evidenceIds para auditoría.
  readonly uniqueSelectedData = computed(() => {
    const grouped = new Map<string, { label: string; value: string; sources: string[] }>();
    for (const field of this.selectedFields()) {
      const key = `${getConsolidationDatumKey(field)}|${field.value.trim().toUpperCase()}`;
      const current = grouped.get(key);
      if (current) {
        if (!current.sources.includes(field.sourceTitle)) current.sources.push(field.sourceTitle);
      } else {
        grouped.set(key, { label: field.label.replace(/ · Registro \d+$/i, ''), value: field.value, sources: [field.sourceTitle] });
      }
    }
    return [...grouped.values()];
  });
  readonly totalSelected = computed(() => this.uniqueSelectedData().length);
  readonly selectedEvidenceCount = computed(() => this.selectedFields().length);
  readonly selectedSlotCount = computed(() => this.sources().reduce((total, source) => total + countSelectedSlots(source.fields), 0));
  readonly remainingRequired = computed(() => this.totalAvailable() - this.selectedSlotCount());
  readonly canCreateProfile = computed(() =>
    !this.isLoading() && !this.isSaving() && !this.accepted() &&
    this.sources().length > 0 && this.selectedPersonalFields().length > 0 &&
    this.remainingRequired() === 0
  );
  readonly completedLabel = computed(() => `${this.totalSelected()} datos únicos · ${this.selectedEvidenceCount()} evidencias`);
  readonly completionPercent = computed(() => this.totalAvailable() > 0
    ? Math.round((this.selectedSlotCount() / this.totalAvailable()) * 100) : 0);

  readonly totalLinks = computed(() =>
    this.links().reduce((total, link) => total + link.count, 0)
  );

  readonly activeLinkGroup = computed<ProfileLinkGroupViewModel | null>(() => {
    const activeId = this.activeLinkGroupId();
    if (!activeId) {
      return null;
    }

    return this.links().find((link) => link.id === activeId) ?? null;
  });

  readonly linkItemPages = computed(() =>
    chunkItems(this.activeLinkGroup()?.items ?? [], LINK_ITEMS_PER_PAGE)
  );
  readonly linkItemPageCount = computed(() => this.linkItemPages().length);
  readonly normalizedLinkItemPageIndex = computed(() =>
    normalizePageIndex(this.linkItemPageIndex(), this.linkItemPageCount())
  );
  readonly visibleLinkItems = computed<ProfileLinkItemViewModel[]>(() =>
    pageAt(this.linkItemPages(), this.normalizedLinkItemPageIndex())
  );
  readonly linkItemPageLabel = computed(() =>
    createPageLabel(
      this.normalizedLinkItemPageIndex(),
      this.linkItemPageCount()
    )
  );

  readonly sourcePages = computed(() =>
    chunkItems(this.sources(), SOURCES_PER_PAGE)
  );
  readonly sourcePageCount = computed(() => this.sourcePages().length);
  readonly normalizedSourcePageIndex = computed(() =>
    normalizePageIndex(this.sourcePageIndex(), this.sourcePageCount())
  );
  readonly visibleSources = computed(() =>
    pageAt(this.sourcePages(), this.normalizedSourcePageIndex())
  );
  readonly sourcePageLabel = computed(() =>
    createPageLabel(this.normalizedSourcePageIndex(), this.sourcePageCount())
  );

  readonly availableSourceFields = computed<ProfileFieldViewModel[]>(() => {
    const fields = this.selectedSource()?.fields ?? [];
    const selectedKeys = new Set(fields.filter(field => field.selected).map(fieldSlotKey));
    const query = this.sourceFieldQuery().trim().toLocaleLowerCase('es-MX');
    const recordIndex = this.sourceRecordIndex();
    return fields.filter(field =>
      !selectedKeys.has(fieldSlotKey(field)) &&
      (recordIndex === -1 || field.recordIndex === recordIndex) &&
      (!query || `${field.label} ${field.value} ${field.code} registro ${field.recordIndex + 1}`.toLocaleLowerCase('es-MX').includes(query))
    );
  });
  readonly sourceRecordOptions = computed(() => Array.from(
    { length: this.selectedSource()?.recordCount ?? 0 }, (_, index) => index
  ));
  readonly remainingSourceFields = computed(() => this.selectedSource()
    ? countSelectableSlots(this.selectedSource()!.fields) - countSelectedSlots(this.selectedSource()!.fields)
    : 0);
  changeSourceRecord(value: string): void {
    const number = Number(value);
    this.sourceRecordIndex.set(Number.isInteger(number) ? number : -1);
    this.sourceFieldPageIndex.set(0);
  }
  changeSourceFieldQuery(value: string): void {
    this.sourceFieldQuery.set(value);
    this.sourceFieldPageIndex.set(0);
  }

  readonly sourceFieldPages = computed(() =>
    chunkItems(this.availableSourceFields(), FIELDS_PER_PAGE)
  );
  readonly sourceFieldPageCount = computed(
    () => this.sourceFieldPages().length
  );
  readonly normalizedSourceFieldPageIndex = computed(() =>
    normalizePageIndex(
      this.sourceFieldPageIndex(),
      this.sourceFieldPageCount()
    )
  );
  readonly visibleSourceFields = computed<ProfileFieldViewModel[]>(() =>
    pageAt(
      this.sourceFieldPages(),
      this.normalizedSourceFieldPageIndex()
    )
  );
  readonly sourceFieldPageLabel = computed(() =>
    createPageLabel(
      this.normalizedSourceFieldPageIndex(),
      this.sourceFieldPageCount()
    )
  );

  // Una sola tarjeta por valor único, con todas las evidencias/procedencias.
  readonly selectedPersonalGroups = computed(() => {
    const grouped = new Map<string, { label: string; value: string; evidences: SelectedProfileFieldViewModel[] }>();
    for (const field of this.selectedPersonalFields()) {
      const key = `${getConsolidationDatumKey(field)}|${field.value.trim().toUpperCase()}`;
      const current = grouped.get(key);
      if (current) {
        current.evidences.push(field);
      } else {
        grouped.set(key, {label: field.label.replace(/ · Registro \d+$/i, ''), value: field.value, evidences: [field]});
      }
    }
    return [...grouped.values()];
  });
  readonly consolidatedFieldPages = computed(() =>
    chunkItems(this.selectedPersonalGroups(), CONSOLIDATED_FIELDS_PER_PAGE)
  );
  readonly consolidatedFieldPageCount = computed(
    () => this.consolidatedFieldPages().length
  );
  readonly normalizedConsolidatedFieldPageIndex = computed(() =>
    normalizePageIndex(
      this.consolidatedFieldPageIndex(),
      this.consolidatedFieldPageCount()
    )
  );
  readonly visibleSelectedGroups = computed(() =>
    pageAt(this.consolidatedFieldPages(), this.normalizedConsolidatedFieldPageIndex())
  );
  readonly consolidatedFieldPageLabel = computed(() =>
    createPageLabel(
      this.normalizedConsolidatedFieldPageIndex(),
      this.consolidatedFieldPageCount()
    )
  );

  readonly addressPages = computed(() =>
    chunkItems(this.selectedAddresses(), ADDRESSES_PER_PAGE)
  );
  readonly addressPageCount = computed(() => this.addressPages().length);
  readonly normalizedAddressPageIndex = computed(() =>
    normalizePageIndex(this.addressPageIndex(), this.addressPageCount())
  );
  readonly visibleAddresses = computed<ConsolidatedAddressViewModel[]>(() =>
    pageAt(this.addressPages(), this.normalizedAddressPageIndex())
  );
  readonly addressPageLabel = computed(() =>
    createPageLabel(this.normalizedAddressPageIndex(), this.addressPageCount())
  );

  readonly photoPages = computed(() =>
    chunkItems(this.photos(), PHOTOS_PER_PAGE)
  );
  readonly photoPageCount = computed(() => this.photoPages().length);
  readonly normalizedPhotoPageIndex = computed(() =>
    normalizePageIndex(this.photoPageIndex(), this.photoPageCount())
  );
  readonly visiblePhotos = computed(() =>
    pageAt(this.photoPages(), this.normalizedPhotoPageIndex())
  );
  readonly photoPageLabel = computed(() =>
    createPageLabel(this.normalizedPhotoPageIndex(), this.photoPageCount())
  );

  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.clockInterval = setInterval(() => this.currentTime.set(new Date()), 1000);
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  loadProfile(): void {
    if (!this.searchId || !this.resultId) {
      this.clearProfileData();
      this.errorMessage.set(
        'No se recibieron los identificadores de búsqueda y resultado para consultar el perfil consolidado.'
      );
      return;
    }

    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.saveErrorMessage.set(null);
    this.saveSuccessMessage.set(null);
    this.showCreateConfirmation.set(false);
    this.consolidatedProfileId.set('');
    this.accepted.set(false);

    this.searchApi
      .getResultDetail(this.searchId, this.resultId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (detail) => {
          // Algunas respuestas de detalle no incluyen entityType. Mantener el contexto
          // de la tarjeta para rotular correctamente vehículos y armas sin inventar evidencias.
          const normalizedDetail = {
            ...detail,
            entityType: detail.entityType || this.routeEntityType ||
              (this.searchState.page()?.searchId === this.searchId ? this.searchState.page()?.entityType : null)
          };
          const viewModel = mapSearchResultDetail(normalizedDetail);

          this.sources.set(viewModel.sources);
          this.selectedSourceId.set(viewModel.sources[0]?.id ?? '');
          this.links.set(viewModel.links);
          this.activeLinkGroupId.set(null);
          this.photos.set(viewModel.photos);
          const entityType = normalizedDetail.entityType?.toLowerCase();
          this.profileEntity.set(entityType === 'vehicle' ? 'Vehicle'
            : entityType === 'weapon' ? 'Weapon' : 'Person');
          this.profileName.set(viewModel.profileName);
          this.profileSubtitle.set(viewModel.profileSubtitle);
          this.profileStatus.set(viewModel.status);
          this.hasConflicts.set(viewModel.hasConflicts);
          this.relatedFileCount.set(viewModel.relatedFileCount);
          this.additionalObjectCount.set(viewModel.additionalObjectCount);
          this.resetCarouselPages();
        },
        error: (error: unknown) => {
          this.clearProfileData();
          this.errorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  selectSource(sourceId: string): void {
    const sourceIndex = this.sources().findIndex(
      (source) => source.id === sourceId
    );

    if (sourceIndex < 0) {
      return;
    }

    this.selectedSourceId.set(sourceId);
    this.sourceRecordIndex.set(-1);
    this.sourceFieldQuery.set('');
    this.sourcePageIndex.set(Math.floor(sourceIndex / SOURCES_PER_PAGE));
    this.sourceFieldPageIndex.set(0);
  }

  previousSourcePage(): void {
    this.moveSourcePage(-1);
  }

  nextSourcePage(): void {
    this.moveSourcePage(1);
  }

  previousSourceFieldPage(): void {
    this.sourceFieldPageIndex.set(
      movePageIndex(
        this.normalizedSourceFieldPageIndex(),
        this.sourceFieldPageCount(),
        -1
      )
    );
  }

  nextSourceFieldPage(): void {
    this.sourceFieldPageIndex.set(
      movePageIndex(
        this.normalizedSourceFieldPageIndex(),
        this.sourceFieldPageCount(),
        1
      )
    );
  }

  previousConsolidatedFieldPage(): void {
    this.consolidatedFieldPageIndex.set(
      movePageIndex(
        this.normalizedConsolidatedFieldPageIndex(),
        this.consolidatedFieldPageCount(),
        -1
      )
    );
  }

  nextConsolidatedFieldPage(): void {
    this.consolidatedFieldPageIndex.set(
      movePageIndex(
        this.normalizedConsolidatedFieldPageIndex(),
        this.consolidatedFieldPageCount(),
        1
      )
    );
  }

  previousAddressPage(): void {
    this.addressPageIndex.set(
      movePageIndex(
        this.normalizedAddressPageIndex(),
        this.addressPageCount(),
        -1
      )
    );
  }

  nextAddressPage(): void {
    this.addressPageIndex.set(
      movePageIndex(
        this.normalizedAddressPageIndex(),
        this.addressPageCount(),
        1
      )
    );
  }

  previousPhotoPage(): void {
    this.photoPageIndex.set(
      movePageIndex(
        this.normalizedPhotoPageIndex(),
        this.photoPageCount(),
        -1
      )
    );
  }

  nextPhotoPage(): void {
    this.photoPageIndex.set(
      movePageIndex(
        this.normalizedPhotoPageIndex(),
        this.photoPageCount(),
        1
      )
    );
  }

  selectLinkGroup(linkId: string): void {
    const exists = this.links().some((link) => link.id === linkId);
    if (!exists) {
      return;
    }

    this.activeLinkGroupId.update((current) =>
      current === linkId ? null : linkId
    );
    this.linkItemPageIndex.set(0);
  }

  previousLinkItemPage(): void {
    this.linkItemPageIndex.set(
      movePageIndex(
        this.normalizedLinkItemPageIndex(),
        this.linkItemPageCount(),
        -1
      )
    );
  }

  nextLinkItemPage(): void {
    this.linkItemPageIndex.set(
      movePageIndex(
        this.normalizedLinkItemPageIndex(),
        this.linkItemPageCount(),
        1
      )
    );
  }

  getSelectedSourceCount(source: ProfileSourceViewModel): number {
    return countSelectedSlots(source.fields);
  }

  getRemainingSourceCount(source: ProfileSourceViewModel): number {
    return countSelectableSlots(source.fields) - countSelectedSlots(source.fields);
  }

  getDisplayableSourceCount(source: ProfileSourceViewModel): number {
    return countSelectableSlots(source.fields);
  }

  toggleField(fieldId: string): void {
    const currentSourceId = this.selectedSource()?.id;
    if (!currentSourceId) {
      return;
    }

    this.sources.update((sources) =>
      sources.map((source) => {
        if (source.id !== currentSourceId) {
          return source;
        }

        const target = source.fields.find((field) => field.id === fieldId);
        if (!target) {
          return source;
        }

        const selecting = !target.selected;
        const targetKey = getConsolidationDatumKey(target);
        const targetIsAddress = isAddressField(target);

        return {
          ...source,
          fields: source.fields.map((field) => {
            if (field.id === fieldId) {
              return { ...field, selected: selecting };
            }

            // El backend solo admite una evidencia por fuente para el mismo
            // dato personal. Al elegir otra variante/registro del mismo dato,
            // reemplazamos la selección anterior en lugar de enviar ambas.
            if (
              selecting &&
              !targetIsAddress &&
              !isAddressField(field) &&
              getConsolidationDatumKey(field) === targetKey
            ) {
              return { ...field, selected: false };
            }

            return field;
          })
        };
      })
    );

    this.focusConsolidatedField(currentSourceId, fieldId);
    this.saveErrorMessage.set(null);
    this.accepted.set(false);
  }

  removeSelectedField(sourceId: string, fieldId: string): void {
    this.sources.update((sources) =>
      sources.map((source) =>
        source.id !== sourceId
          ? source
          : {
              ...source,
              fields: source.fields.map((field) =>
                field.id === fieldId ? { ...field, selected: false } : field
              )
            }
      )
    );

    this.focusAvailableField(sourceId, fieldId);
    this.accepted.set(false);
  }

  removeAddress(address: ConsolidatedAddressViewModel): void {
    const fieldIdsBySource = new Map<string, Set<string>>();

    address.fields.forEach((field) => {
      const ids = fieldIdsBySource.get(field.sourceId) ?? new Set<string>();
      ids.add(field.id);
      fieldIdsBySource.set(field.sourceId, ids);
    });

    this.sources.update((sources) =>
      sources.map((source) => {
        const fieldIds = fieldIdsBySource.get(source.id);
        if (!fieldIds) {
          return source;
        }

        return {
          ...source,
          fields: source.fields.map((field) =>
            fieldIds.has(field.id) ? { ...field, selected: false } : field
          )
        };
      })
    );

    const firstReturnedField = address.fields[0];
    if (firstReturnedField) {
      this.focusAvailableField(firstReturnedField.sourceId, firstReturnedField.id);
    }
    this.saveErrorMessage.set(null);
    this.accepted.set(false);
  }

  selectAll(): void {
    const selectedSource = this.selectedSource();
    if (!selectedSource || !this.getRemainingSourceCount(selectedSource)) {
      return;
    }

    this.sources.update((sources) =>
      sources.map((source) => {
        if (source.id !== selectedSource.id) {
          return source;
        }

        const chosenKeys = new Set<string>();
        // Respetar la variante elegida previamente, y completar las restantes.
        const selectedFields = source.fields.filter(field => field.selected);
        const prioritized = [...selectedFields, ...source.fields.filter(field => !field.selected)];
        const chosenIds = new Set<string>();
        for (const field of prioritized) {
          const key = fieldSlotKey(field);
          if (!chosenKeys.has(key)) {
            chosenKeys.add(key);
            chosenIds.add(field.id);
          }
        }
        return {
          ...source,
          fields: source.fields.map(field => ({ ...field, selected: chosenIds.has(field.id) }))
        };
      })
    );

    this.sourceFieldPageIndex.set(0);
    this.consolidatedFieldPageIndex.set(0);
    this.addressPageIndex.set(0);
    this.accepted.set(false);
  }

  selectAllSources(): void {
    if (!this.sources().length || this.isSaving() || this.accepted()) return;
    this.sources.update(sources => sources.map(source => {
      const chosen = new Set<string>();
      const chosenIds = new Set<string>();
      // Preservar la evidencia que el operador ya eligió frente a otras variantes.
      for (const field of [...source.fields.filter(field => field.selected), ...source.fields.filter(field => !field.selected)]) {
        const key = fieldSlotKey(field);
        if (chosen.has(key)) continue;
        chosen.add(key);
        chosenIds.add(field.id);
      }
      return { ...source, fields: source.fields.map(field => ({ ...field, selected: chosenIds.has(field.id) })) };
    }));
    this.sourceFieldPageIndex.set(0);
    this.saveErrorMessage.set(null);
    this.accepted.set(false);
  }

  clearAllSelected(): void {
    if (!this.totalSelected()) {
      return;
    }

    this.sources.update((sources) =>
      sources.map((source) => ({
        ...source,
        fields: source.fields.map((field) => ({ ...field, selected: false }))
      }))
    );

    this.sourceFieldPageIndex.set(0);
    this.consolidatedFieldPageIndex.set(0);
    this.addressPageIndex.set(0);
    this.accepted.set(false);
  }

  exportProfilePdf(): void {
    if (!this.isBrowser || !this.canExportPdf()) {
      return;
    }

    const selectedSource = this.selectedSource();
    const sourceLines = this.sources().flatMap((source, index) => [
      `${index + 1}. ${source.title} - ${source.description}`,
      `Campos disponibles: ${source.fields.length}. Campos incluidos: ${this.getSelectedSourceCount(source)}.`
    ]);

    const selectionLines = selectedSource
      ? selectedSource.fields.map((field) =>
          `${field.label.toLocaleUpperCase('es-MX')}: ${field.value}${field.selected ? ' [SELECCIONADO]' : ''}`
        )
      : ['No hay una fuente seleccionada.'];

    const consolidatedLines = this.selectedFields().length
      ? this.selectedFields().map((field) =>
          `${field.label.toLocaleUpperCase('es-MX')}: ${field.value} (FUENTE: ${field.sourceTitle})`
        )
      : ['No hay campos seleccionados para el perfil consolidado.'];

    const linkLines = this.links().flatMap((link) => {
      const header = `${link.label.toLocaleUpperCase('es-MX')}: ${link.count}`;
      const details = link.items.flatMap((item, index) => [
        `${link.label} ${index + 1}`,
        ...item.fields.map((field) =>
          `${field.label.toLocaleUpperCase('es-MX')}: ${field.value}`
        ),
        ...(item.sources.length
          ? [`FUENTES: ${item.sources.map((source) => source.label).join(', ')}`]
          : [])
      ]);
      return [header, ...details];
    });

    this.pdfExport.exportCards(
      createPdfFileName(this.profileName()),
      'Perfil consolidado',
      `${this.profileName()} - ${this.profileSubtitle()}`,
      [
        {
          title: '1. FUENTES DETECTADAS',
          subtitle: 'Fuentes disponibles para conformar el perfil.',
          lines: sourceLines
        },
        {
          title: '2. SELECCIÓN DE DATOS',
          subtitle: selectedSource
            ? `${selectedSource.title} - ${selectedSource.description}`
            : 'Sin fuente seleccionada.',
          lines: selectionLines
        },
        {
          title: '3. PERFIL CONSOLIDADO',
          subtitle: `${this.completedLabel()} campos completados.`,
          lines: [...consolidatedLines, ...linkLines]
        }
      ]
    );
  }

  accept(): void {
    if (!this.searchId || !this.resultId || !this.canCreateProfile()) {
      this.saveErrorMessage.set(this.remainingRequired() > 0
        ? `Falta seleccionar ${this.remainingRequired()} ${this.remainingRequired() === 1 ? 'dato' : 'datos'} de las fuentes antes de crear el perfil.`
        : 'Selecciona los datos personales requeridos antes de crear el perfil.');
      return;
    }

    const selectedEvidenceIds = buildConsolidationEvidenceIds(
      this.selectedPersonalFields()
    );

    if (!selectedEvidenceIds.length) {
      this.saveErrorMessage.set('No hay evidencias seleccionadas para guardar el perfil.');
      return;
    }

    this.saveErrorMessage.set(null);
    this.showCreateConfirmation.set(true);
    // Al abrir el diálogo, llevar el foco a una acción segura (Cancelar).
    if (this.isBrowser) {
      setTimeout(() => this.confirmCreateButton?.nativeElement.focus(), 0);
    }
  }

  cancelCreateConfirmation(): void {
    this.showCreateConfirmation.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showCreateConfirmation()) this.cancelCreateConfirmation();
  }

  @HostListener('document:keydown.tab', ['$event'])
  trapCreateConfirmationFocus(event: Event): void {
    if (!this.showCreateConfirmation() || !(event instanceof KeyboardEvent)) return;
    const buttons = this.createProfileDialog?.nativeElement.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  confirmCreateProfile(): void {
    // Volver a validar en el momento de confirmar evita envíos duplicados
    // o datos desactualizados si cambió la selección.
    if (!this.showCreateConfirmation() || !this.searchId || !this.resultId || !this.canCreateProfile()) {
      return;
    }
    const selectedEvidenceIds = buildConsolidationEvidenceIds(this.selectedPersonalFields());
    if (!selectedEvidenceIds.length) {
      this.cancelCreateConfirmation();
      this.saveErrorMessage.set('No hay evidencias seleccionadas para guardar el perfil.');
      return;
    }
    this.cancelCreateConfirmation();
    const request: ConsolidateProfileRequest = { selectedEvidenceIds };

    this.isSaving.set(true);
    this.saveErrorMessage.set(null);
    this.saveSuccessMessage.set(null);

    this.authService
      .prepareSessionForConsolidation()
      .pipe(
        // Esperar el refresh/validación ANTES del primer POST. El reintento por
        // HTTP 500 debe abarcar solo el guardado, nunca el refresh de sesión.
        switchMap(() => this.consolidatedProfilesApi
          .consolidateProfile(this.searchId, this.resultId, request)
          .pipe(
            retry({
              count: 1,
              delay: (error: unknown) =>
                error instanceof HttpErrorResponse && error.status === 500
                  ? timer(0)
                  : throwError(() => error)
            })
          )
        ),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: ({ profile, message }) => {
          this.consolidatedProfileId.set(profile.profileId);
          if (this.searchState.page()?.searchId === this.searchId) {
            this.pivotRegistry.recordConsolidation(this.searchState.pivotContext(), this.searchId, this.resultId, profile);
          }
          this.accepted.set(true);
          this.saveSuccessMessage.set(message);
        },
        error: (error: unknown) => {
          this.accepted.set(false);
          this.saveSuccessMessage.set(null);
          this.saveErrorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  closeSaveSuccessModal(): void {
    this.saveSuccessMessage.set(null);
  }

  toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  @HostListener('document:click')
  closeProfileOnOutsideClick(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  backToOriginalPivotGraph(): void {
    const profileId = this.originGraphProfileId();
    if (!profileId) return;
    void this.router.navigate(['/grafo'], {
      queryParams: { profileId, pivotLinkId: this.originGraphLinkId() }
    });
  }

  goToResults(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    void this.router.navigateByUrl('/busqueda');
  }

  goToHistory(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    this.searchQuickPanel.openHistory();
  }

  goToSaved(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    this.searchQuickPanel.openSaved();
  }

  goToInvestigationLines(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    void this.router.navigateByUrl('/lineas-investigacion');
  }

  goToInvestigations(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    void this.router.navigateByUrl('/investigaciones');
  }

  goToUsers(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    void this.router.navigate(['/investigaciones'], {
      queryParams: { screen: 'users' }
    });
  }

  closeSidebarPanel(): void {
    this.activeSidebarPanel.set(null);
  }

  runQuickSearch(_item: QuickSearchItem): void {
    this.goToResults();
  }

  getQuickSearchIcon(item: QuickSearchItem): QuickSearchIcon {
    return item.icon;
  }

  getLinkChipClass(link: ProfileLinkGroupViewModel): string {
    return `links-card__chip links-card__chip--${link.kind}`;
  }

  getLinkDetailCardClass(link: ProfileLinkGroupViewModel): string {
    return `link-detail-card link-detail-card--${link.kind}`;
  }

  getLinkIconClass(link: ProfileLinkGroupViewModel): string {
    switch (link.kind) {
      case 'vehicle':
        return 'fa-solid fa-car-side';
      case 'weapon':
        return 'fa-solid fa-gun';
      case 'person':
        return 'fa-regular fa-user';
      default:
        return 'fa-solid fa-link';
    }
  }

  private focusAvailableField(sourceId: string, fieldId: string): void {
    const sourceIndex = this.sources().findIndex((source) => source.id === sourceId);
    if (sourceIndex < 0) {
      return;
    }

    this.selectedSourceId.set(sourceId);
    this.sourceRecordIndex.set(-1);
    this.sourceFieldQuery.set('');
    this.sourcePageIndex.set(Math.floor(sourceIndex / SOURCES_PER_PAGE));

    const source = this.sources()[sourceIndex];
    const availableFields = getDisplayableSourceFields(source.fields).filter(
      (field) => !field.selected
    );
    const fieldIndex = availableFields.findIndex((field) => field.id === fieldId);
    this.sourceFieldPageIndex.set(
      fieldIndex >= 0 ? Math.floor(fieldIndex / FIELDS_PER_PAGE) : 0
    );
  }

  private focusConsolidatedField(sourceId: string, fieldId: string): void {
    const field = this.selectedFields().find(
      (item) => item.sourceId === sourceId && item.id === fieldId
    );
    if (!field) {
      return;
    }

    if (isAddressField(field)) {
      const addressIndex = this.selectedAddresses().findIndex((address) =>
        address.fields.some(
          (item) => item.sourceId === sourceId && item.id === fieldId
        )
      );
      this.addressPageIndex.set(
        addressIndex >= 0 ? Math.floor(addressIndex / ADDRESSES_PER_PAGE) : 0
      );
      return;
    }

    const fieldIndex = this.selectedPersonalFields().findIndex(
      (item) => item.sourceId === sourceId && item.id === fieldId
    );
    this.consolidatedFieldPageIndex.set(
      fieldIndex >= 0
        ? Math.floor(fieldIndex / CONSOLIDATED_FIELDS_PER_PAGE)
        : 0
    );
  }

  private moveSourcePage(direction: number): void {
    const nextIndex = movePageIndex(
      this.normalizedSourcePageIndex(),
      this.sourcePageCount(),
      direction
    );

    this.sourcePageIndex.set(nextIndex);

    const firstSource = pageAt(this.sourcePages(), nextIndex)[0];
    if (firstSource) {
      this.selectedSourceId.set(firstSource.id);
      this.sourceFieldPageIndex.set(0);
    }
  }

  private resetCarouselPages(): void {
    this.sourcePageIndex.set(0);
    this.sourceFieldPageIndex.set(0);
    this.sourceRecordIndex.set(-1);
    this.sourceFieldQuery.set('');
    this.consolidatedFieldPageIndex.set(0);
    this.addressPageIndex.set(0);
    this.photoPageIndex.set(0);
    this.linkItemPageIndex.set(0);
  }

  private clearProfileData(): void {
    this.sources.set([]);
    this.selectedSourceId.set('');
    this.links.set([]);
    this.activeLinkGroupId.set(null);
    this.photos.set([]);
    this.relatedFileCount.set(0);
    this.additionalObjectCount.set(0);
    this.profileEntity.set('Person');
    this.profileName.set('Perfil no disponible');
    this.profileSubtitle.set('Perfil de persona');
    this.profileStatus.set('');
    this.hasConflicts.set(false);
    this.accepted.set(false);
    this.resetCarouselPages();
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      // No exponer mensajes del servicio sobre access/refresh token al usuario.
      if (error.status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
      if (error.status === 403) return 'No tienes permisos para realizar esta operación.';
      const apiMessage = this.readApiErrorMessage(error.error);
      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No fue posible conectar con el servicio de detalle del perfil.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'Tu sesión no tiene autorización para consultar este perfil.';
      }

      if (error.status === 404) {
        return 'El resultado seleccionado ya no está disponible.';
      }

      return `El servicio de detalle respondió con código ${error.status}.`;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'Ocurrió un error inesperado al consultar el perfil consolidado.';
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
        (item): item is string =>
          typeof item === 'string' && Boolean(item.trim())
      );
      return message?.trim() ?? null;
    }

    return null;
  }
}

function isAddressField(
  field: Pick<ProfileFieldViewModel, 'code' | 'label'>
): boolean {
  const segments = normalizeFieldPathSegments(field.code);

  if (segments.some((segment) => ADDRESS_FIELD_CODES.has(segment))) {
    return true;
  }

  // Variantes comunes que llegan como STREET_NAME, addressLine_1, etc.
  // Se validan por segmento para no confundir, por ejemplo, ESTADO_CIVIL
  // con el ESTADO de un domicilio.
  const addressPattern = /^(?:DOMICILIO|DIRECCION|ADDRESS|STREET|CALLE|VIALIDAD|COLONIA|NEIGHBORHOOD|POSTAL|ZIP|HOUSE|BUILDING|APARTMENT|NUMEXT|NUMINT|EXTERIORNUMBER|INTERIORNUMBER|BETWEENSTREETS|ENTRECALLES|LATITUD|LATITUDE|LONGITUD|LONGITUDE)/;
  if (segments.some((segment) => addressPattern.test(segment))) {
    return true;
  }

  const normalizedLabel = normalizeFieldCode(
    field.label.replace(/ · Registro \d+$/i, '')
  );
  return ADDRESS_FIELD_CODES.has(normalizedLabel);
}

function normalizeFieldPathSegments(value: string): string[] {
  const normalizedPath = value.replace(
    /\[(?:'|")?([^'"\]]+)(?:'|")?\]/g,
    '.$1'
  );

  return normalizedPath
    .split(/[./\\:]+/)
    .map((part) => normalizeFieldCode(part))
    .filter(Boolean);
}

function normalizeFieldCode(value: string): string {
  const leaf = value
    .replace(/\[(?:'|")?([^'"\]]+)(?:'|")?\]/g, '.$1')
    .split(/[./\\:]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) ?? value;

  return leaf
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function getConsolidationDatumKey(
  field: Pick<ProfileFieldViewModel, 'code' | 'label'>
): string {
  const code = normalizeFieldCode(field.code);
  if (code) {
    return code;
  }

  return normalizeFieldCode(field.label.replace(/ · Registro \d+$/i, ''));
}

/** Conserva todas las alternativas por registro. Seleccionar una variante reemplaza
 * las del mismo dato y fuente, sin perder opciones para la comparación. */
function getDisplayableSourceFields(fields: readonly ProfileFieldViewModel[]): ProfileFieldViewModel[] {
  return [...fields];
}

function fieldSlotKey(field: ProfileFieldViewModel): string {
  if (isAddressField(field)) return `${getConsolidationDatumKey(field)}|${field.recordIndex}|${field.value.trim().toUpperCase()}`;
  return getConsolidationDatumKey(field);
}

function countSelectableSlots(fields: readonly ProfileFieldViewModel[]): number {
  return new Set(fields.map(fieldSlotKey)).size;
}

function countSelectedSlots(fields: readonly ProfileFieldViewModel[]): number {
  return new Set(fields.filter(field => field.selected).map(fieldSlotKey)).size;
}

function buildConsolidationEvidenceIds(
  fields: readonly SelectedProfileFieldViewModel[]
): string[] {
  const evidenceIds: string[] = [];
  const seenEvidenceIds = new Set<string>();
  const seenSourceData = new Set<string>();

  fields.forEach((field) => {
    // Defensa final: aunque una variante de dirección haya quedado seleccionada
    // visualmente, nunca debe salir en selectedEvidenceIds.
    if (isAddressField(field)) {
      return;
    }

    const evidenceId = field.id.trim();
    if (!evidenceId || seenEvidenceIds.has(evidenceId)) {
      return;
    }

    const sourceKey = normalizeFieldCode(
      field.sourceTitle || field.sourceCode || field.sourceId
    );
    const sourceDataKey = `${sourceKey}|${getConsolidationDatumKey(field)}`;

    // Regla del backend CONSOLIDATION_SOURCE_REPEATED:
    // una fuente solo puede aportar una evidencia para cada dato personal.
    if (seenSourceData.has(sourceDataKey)) {
      return;
    }

    seenEvidenceIds.add(evidenceId);
    seenSourceData.add(sourceDataKey);
    evidenceIds.push(evidenceId);
  });

  return evidenceIds;
}

function buildAddressGroups(
  fields: readonly SelectedProfileFieldViewModel[]
): ConsolidatedAddressViewModel[] {
  const groups = new Map<string, ConsolidatedAddressViewModel>();

  fields.forEach((field) => {
    const recordMatch = / · Registro (\d+)$/i.exec(field.label);
    const recordNumber = recordMatch?.[1] ?? '1';
    const key = `${field.sourceId}|${recordNumber}`;
    const existing = groups.get(key);

    if (existing) {
      existing.fields.push(field);
      return;
    }

    groups.set(key, {
      id: key,
      title: `Dirección ${groups.size + 1}`,
      sourceCode: field.sourceCode,
      sourceTitle: field.sourceTitle,
      sourceColor: field.sourceColor,
      fields: [field]
    });
  });

  return Array.from(groups.values());
}

function chunkItems<T>(items: readonly T[], pageSize: number): T[][] {
  if (!items.length || pageSize <= 0) {
    return [];
  }

  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize));
  }
  return pages;
}

function pageAt<T>(pages: readonly T[][], index: number): T[] {
  return pages[normalizePageIndex(index, pages.length)] ?? [];
}

function normalizePageIndex(index: number, pageCount: number): number {
  if (pageCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), pageCount - 1);
}

function movePageIndex(
  currentIndex: number,
  pageCount: number,
  direction: number
): number {
  if (pageCount <= 1) {
    return 0;
  }

  return (currentIndex + direction + pageCount) % pageCount;
}

function createPageLabel(index: number, pageCount: number): string {
  return pageCount > 0 ? `${index + 1} de ${pageCount}` : '0 de 0';
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

function createPdfFileName(profileName: string): string {
  const normalized = profileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `perfil-consolidado-${normalized || 'resultado'}.pdf`;
}
