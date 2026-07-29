import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';
import {
  ProfileFieldViewModel,
  ProfileLinkGroupViewModel,
  ProfileLinkItemViewModel,
  ProfilePhotoViewModel,
  ProfileSourceViewModel,
  SelectedProfileFieldViewModel
} from '../../domain/profile-consolidation.models';
import { mapSearchResultDetail } from '../../domain/profile-detail.mapper';

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
const PHOTOS_PER_PAGE = 3;
const LINK_ITEMS_PER_PAGE = 2;

@Component({
  selector: 'app-profile-consolidation-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-consolidation-page.html',
  styleUrls: [
    './profile-consolidation-page.scss',
    './profile-consolidation-carousel.scss'
  ]
})
export class ProfileConsolidationPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly searchApi = inject(SearchApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly searchId =
    this.route.snapshot.queryParamMap.get('searchId')?.trim() ?? '';
  readonly resultId =
    this.route.snapshot.queryParamMap.get('resultId')?.trim() ?? '';

  readonly currentTime = signal(new Date());
  readonly profileOpen = signal(false);
  readonly activeSidebarPanel = signal<SidebarPanel>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly accepted = signal(false);
  readonly selectedSourceId = signal('');
  readonly sources = signal<ProfileSourceViewModel[]>([]);
  readonly links = signal<ProfileLinkGroupViewModel[]>([]);
  readonly activeLinkGroupId = signal<string | null>(null);
  readonly photos = signal<ProfilePhotoViewModel[]>([]);
  readonly profileName = signal('Perfil sin nombre disponible');
  readonly profileSubtitle = signal('Perfil de persona');
  readonly profileStatus = signal('');
  readonly hasConflicts = signal(false);
  readonly relatedFileCount = signal(0);
  readonly additionalObjectCount = signal(0);

  readonly sourcePageIndex = signal(0);
  readonly sourceFieldPageIndex = signal(0);
  readonly consolidatedFieldPageIndex = signal(0);
  readonly photoPageIndex = signal(0);
  readonly linkItemPageIndex = signal(0);

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;
  readonly displayName = computed(
    () => this.accountNumber()?.trim() || 'Usuario'
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
          sourceTitle: source.title,
          sourceColor: source.color
        }))
    )
  );

  readonly totalAvailable = computed(() =>
    this.sources().reduce((total, source) => total + source.fields.length, 0)
  );

  readonly totalSelected = computed(() => this.selectedFields().length);

  readonly completedLabel = computed(
    () => `${this.totalSelected()} de ${this.totalAvailable()}`
  );

  readonly completionPercent = computed(() => {
    const total = this.totalAvailable();
    return total > 0 ? Math.round((this.totalSelected() / total) * 100) : 0;
  });

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

  readonly sourceFieldPages = computed(() =>
    chunkItems(this.selectedSource()?.fields ?? [], FIELDS_PER_PAGE)
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

  readonly consolidatedFieldPages = computed(() =>
    chunkItems(this.selectedFields(), CONSOLIDATED_FIELDS_PER_PAGE)
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
  readonly visibleSelectedFields = computed<
    SelectedProfileFieldViewModel[]
  >(() =>
    pageAt(
      this.consolidatedFieldPages(),
      this.normalizedConsolidatedFieldPageIndex()
    )
  );
  readonly consolidatedFieldPageLabel = computed(() =>
    createPageLabel(
      this.normalizedConsolidatedFieldPageIndex(),
      this.consolidatedFieldPageCount()
    )
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
        'No se recibieron searchId y resultId para consultar el perfil consolidado.'
      );
      return;
    }

    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.accepted.set(false);

    this.searchApi
      .getResultDetail(this.searchId, this.resultId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (detail) => {
          const viewModel = mapSearchResultDetail(detail);

          this.sources.set(viewModel.sources);
          this.selectedSourceId.set(viewModel.sources[0]?.id ?? '');
          this.links.set(viewModel.links);
          this.activeLinkGroupId.set(null);
          this.photos.set(viewModel.photos);
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
    return source.fields.filter((field) => field.selected).length;
  }

  toggleField(fieldId: string): void {
    const currentSourceId = this.selectedSource()?.id;
    if (!currentSourceId) {
      return;
    }

    this.sources.update((sources) =>
      sources.map((source) =>
        source.id !== currentSourceId
          ? source
          : {
              ...source,
              fields: source.fields.map((field) =>
                field.id === fieldId
                  ? { ...field, selected: !field.selected }
                  : field
              )
            }
      )
    );

    this.consolidatedFieldPageIndex.set(0);
    this.accepted.set(false);
  }

  selectAll(): void {
    const selectedSource = this.selectedSource();
    if (!selectedSource) {
      return;
    }

    const shouldSelect = selectedSource.fields.some((field) => !field.selected);

    this.sources.update((sources) =>
      sources.map((source) =>
        source.id !== selectedSource.id
          ? source
          : {
              ...source,
              fields: source.fields.map((field) => ({
                ...field,
                selected: shouldSelect
              }))
            }
      )
    );

    this.consolidatedFieldPageIndex.set(0);
    this.accepted.set(false);
  }

  accept(): void {
    if (!this.selectedFields().length) {
      return;
    }
    this.accepted.set(true);
  }

  toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  goToResults(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set(null);
    void this.router.navigateByUrl('/busqueda');
  }

  goToHistory(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set('history');
  }

  goToSaved(): void {
    this.profileOpen.set(false);
    this.activeSidebarPanel.set('bookmarks');
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
    this.consolidatedFieldPageIndex.set(0);
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
    this.profileName.set('Perfil sin nombre disponible');
    this.profileSubtitle.set('Perfil de persona');
    this.profileStatus.set('');
    this.hasConflicts.set(false);
    this.accepted.set(false);
    this.resetCarouselPages();
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
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
