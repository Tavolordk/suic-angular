import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ConsolidatedProfilesApiService } from '../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.service';
import {
  ConsolidatedProfileAddressDto,
  ConsolidatedProfileOriginDto,
  ConsolidatedProfileResponse,
} from '../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';

type ViewMode = 'list' | 'grid';
type SortOrder = 'recent' | 'oldest' | 'name';

type EntityTone = 'person' | 'location' | 'source';
type GraphTone =
  | 'person'
  | 'vehicle'
  | 'weapon'
  | 'organization'
  | 'location'
  | 'event';

interface InvestigationEntity {
  label: string;
  tone: EntityTone;
}

interface InvestigationStat {
  value: number;
  label: string;
}

interface GraphCategory {
  label: string;
  count: number;
  tone: GraphTone;
}

interface GraphRelationship {
  label: string;
  count: number;
}

interface GraphNode {
  id: string;
  label: string;
  tone: GraphTone;
  x: number;
  y: number;
  radius: number;
  delay: number;
  important: boolean;
}

interface GraphEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  weight: number;
}

interface GraphPreview {
  totalNodes: number;
  totalEdges: number;
  sampledNodes: number;
  sampledEdges: number;
  summary: string;
  samplingStrategy: string;
  categories: GraphCategory[];
  relationships: GraphRelationship[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface InvestigationLine {
  id: string;
  title: string;
  entities: InvestigationEntity[];
  stats: InvestigationStat[];
  lastActivity: string;
  activityOrder: number;
  graph: GraphPreview;
}

interface GraphPreviewConfig {
  totalNodes: number;
  totalEdges: number;
  summary: string;
  samplingStrategy: string;
  focusLabels: string[];
  categories: GraphCategory[];
  relationships: GraphRelationship[];
  seed: number;
}

const PAGE_SIZE = 18;

const GRAPH_POSITIONS = [
  [300, 165],
  [190, 95],
  [412, 82],
  [470, 185],
  [390, 260],
  [225, 265],
  [118, 185],
  [90, 82],
  [520, 74],
  [548, 272],
  [302, 58],
  [302, 292],
  [155, 230],
  [450, 232],
  [168, 48],
  [515, 142],
] as const;

function buildGraphPreview(config: GraphPreviewConfig): GraphPreview {
  const nodeCount = Math.max(1, Math.min(config.totalNodes, GRAPH_POSITIONS.length));
  const labels = config.focusLabels.length ? config.focusLabels : ['Perfil consolidado'];
  const tones = config.categories.length
    ? config.categories.flatMap((category) =>
        Array.from({ length: Math.max(1, Math.min(category.count, 4)) }, () => category.tone),
      )
    : (['person'] as GraphTone[]);

  const nodes: GraphNode[] = GRAPH_POSITIONS.slice(0, nodeCount).map(([x, y], index) => ({
    id: `node-${config.seed}-${index}`,
    label: labels[index] ?? `${config.categories[index % config.categories.length]?.label ?? 'Entidad'} ${index + 1}`,
    tone: index === 0 ? 'person' : tones[(index + config.seed) % tones.length],
    x,
    y,
    radius: index === 0 ? 17 : index < 6 ? 12 : 9,
    delay: -((index * 0.27 + config.seed * 0.11) % 4),
    important: index < Math.min(6, labels.length),
  }));

  const edgeCount = Math.min(config.totalEdges, Math.max(0, nodes.length - 1));
  const edges: GraphEdge[] = nodes.slice(1, edgeCount + 1).map((target, index) => ({
    id: `edge-${config.seed}-${index}`,
    x1: nodes[0].x,
    y1: nodes[0].y,
    x2: target.x,
    y2: target.y,
    delay: -((index * 0.19 + config.seed * 0.13) % 3),
    weight: index < 5 ? 2.2 : 1.3,
  }));

  return {
    totalNodes: config.totalNodes,
    totalEdges: config.totalEdges,
    sampledNodes: nodes.length,
    sampledEdges: edges.length,
    summary: config.summary,
    samplingStrategy: config.samplingStrategy,
    categories: config.categories,
    relationships: config.relationships,
    nodes,
    edges,
  };
}

@Component({
  selector: 'app-lineas-investigacion',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './lineas-investigacion.component.html',
  styleUrl: './lineas-investigacion.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineasInvestigacionComponent implements OnInit, OnDestroy {
  private readonly consolidatedProfilesApi = inject(ConsolidatedProfilesApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly routes = {
    search: '/busqueda',
    history: '/historial',
    saved: '/guardados',
    investigations: '/lineas-investigacion',
    graph: '/grafo',
  } as const;

  readonly currentTime = signal(new Date());
  readonly searchTerm = signal('');
  readonly sortOrder = signal<SortOrder>('recent');
  readonly viewMode = signal<ViewMode>('list');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedLine = signal<InvestigationLine | null>(null);
  readonly investigationLines = signal<InvestigationLine[]>([]);

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  readonly visibleLines = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('es-MX');

    const filtered = this.investigationLines().filter((line) => {
      if (!term) {
        return true;
      }

      const searchable = [line.title, ...line.entities.map((entity) => entity.label)]
        .join(' ')
        .toLocaleLowerCase('es-MX');

      return searchable.includes(term);
    });

    return [...filtered].sort((left, right) => {
      switch (this.sortOrder()) {
        case 'oldest':
          return left.activityOrder - right.activityOrder;
        case 'name':
          return left.title.localeCompare(right.title, 'es-MX');
        case 'recent':
        default:
          return right.activityOrder - left.activityOrder;
      }
    });
  });

  readonly currentDateLabel = computed(() =>
    new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(this.currentTime()),
  );

  private readonly clockTimer =
    typeof window === 'undefined'
      ? undefined
      : window.setInterval(() => this.currentTime.set(new Date()), 1_000);

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadProfiles(1);
    }
  }

  ngOnDestroy(): void {
    if (this.clockTimer !== undefined) {
      window.clearInterval(this.clockTimer);
    }
  }

  @HostListener('document:keydown.escape')
  closePreviewWithEscape(): void {
    this.closeGraphPreview();
  }

  loadProfiles(page: number): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.consolidatedProfilesApi
      .getProfiles(page, PAGE_SIZE)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.currentPage.set(response.page || page);
          this.totalPages.set(Math.max(1, response.totalPages || 1));
          this.totalItems.set(response.totalItems || 0);
          this.investigationLines.set(
            (response.items ?? []).map((profile, index) =>
              this.mapProfileToInvestigationLine(profile, index),
            ),
          );
        },
        error: (error: unknown) => {
          this.investigationLines.set([]);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm.set(input?.value ?? '');
  }

  updateSort(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = select?.value as SortOrder | undefined;

    if (value === 'recent' || value === 'oldest' || value === 'name') {
      this.sortOrder.set(value);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  openGraphPreview(line: InvestigationLine): void {
    this.selectedLine.set(line);
  }

  closeGraphPreview(): void {
    this.selectedLine.set(null);
  }

  onPreviewBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeGraphPreview();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.loadProfiles(page);
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  private mapProfileToInvestigationLine(
    profile: ConsolidatedProfileResponse,
    index: number,
  ): InvestigationLine {
    const data = profile.data ?? [];
    const addresses = profile.addresses ?? [];
    const origins = collectOrigins(profile);
    const title = resolveProfileTitle(profile);
    const addressLabels = addresses.slice(0, 4).map(formatAddressLabel);
    const originLabels = origins.slice(0, 4).map(formatOriginLabel);
    const totalNodes = 1 + addresses.length + origins.length;
    const totalEdges = addresses.length + origins.length;
    const seed = hashSeed(profile.profileId, index);

    const entities: InvestigationEntity[] = [{ label: 'Perfil consolidado', tone: 'person' }];
    if (addresses.length) {
      entities.push({
        label: `${addresses.length} ${addresses.length === 1 ? 'dirección' : 'direcciones'}`,
        tone: 'location',
      });
    }
    if (origins.length) {
      entities.push({
        label: `${origins.length} ${origins.length === 1 ? 'fuente' : 'fuentes'}`,
        tone: 'source',
      });
    }

    const categories: GraphCategory[] = [
      { label: 'Perfil', count: 1, tone: 'person' },
      ...(addresses.length
        ? [{ label: 'Ubicaciones', count: addresses.length, tone: 'location' as GraphTone }]
        : []),
      ...(origins.length
        ? [{ label: 'Fuentes', count: origins.length, tone: 'organization' as GraphTone }]
        : []),
    ];

    const relationships: GraphRelationship[] = [
      ...(addresses.length
        ? [{ label: 'Direcciones consolidadas', count: addresses.length }]
        : []),
      ...(origins.length ? [{ label: 'Fuentes de origen', count: origins.length }] : []),
    ];

    return {
      id: profile.profileId,
      title,
      entities,
      stats: [
        { value: data.length, label: 'Datos consolidados' },
        { value: addresses.length, label: 'Direcciones' },
        { value: origins.length, label: 'Fuentes' },
      ],
      lastActivity: formatRelativeActivity(profile.effectiveAtUtc),
      activityOrder: Date.parse(profile.effectiveAtUtc) || 0,
      graph: buildGraphPreview({
        seed,
        totalNodes,
        totalEdges,
        summary:
          'La vista usa únicamente el perfil consolidado, sus direcciones y las fuentes de origen devueltas por el servicio.',
        samplingStrategy:
          totalNodes > GRAPH_POSITIONS.length
            ? `Se muestran hasta ${GRAPH_POSITIONS.length} elementos representativos del perfil, direcciones y fuentes.`
            : 'Se muestran los elementos disponibles del perfil, sus direcciones y sus fuentes.',
        focusLabels: [title, ...addressLabels, ...originLabels],
        categories,
        relationships,
      }),
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Ocurrió un error inesperado al consultar las líneas de investigación.';
  }
}

function resolveProfileTitle(profile: ConsolidatedProfileResponse): string {
  const directName = findDataValue(profile, ['NOMBRECOMPLETO', 'FULLNAME']);
  if (directName) {
    return directName;
  }

  const firstName = findDataValue(profile, ['NOMBRE', 'NOMBRES', 'NAME', 'FIRSTNAME']);
  const paternal = findDataValue(profile, ['APELLIDOPATERNO', 'PRIMERAPELLIDO', 'LASTNAME', 'SURNAME']);
  const maternal = findDataValue(profile, [
    'APELLIDOMATERNO',
    'SEGUNDOAPELLIDO',
    'SECONDLASTNAME',
    'MOTHERSLASTNAME',
  ]);
  const composedName = [firstName, paternal, maternal].filter(Boolean).join(' ').trim();
  if (composedName) {
    return composedName;
  }

  return (
    findDataValue(profile, ['CURP', 'RFC', 'CUIP']) ||
    `Perfil ${profile.profileId.slice(0, 8)}`
  );
}

function findDataValue(profile: ConsolidatedProfileResponse, codes: string[]): string {
  const wanted = new Set(codes.map(normalizeCode));
  const item = (profile.data ?? []).find((datum) => wanted.has(normalizeCode(datum.code ?? '')));
  return item?.value?.trim() ?? '';
}

function normalizeCode(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function collectOrigins(profile: ConsolidatedProfileResponse): ConsolidatedProfileOriginDto[] {
  const seen = new Set<string>();
  const result: ConsolidatedProfileOriginDto[] = [];

  const add = (origin: ConsolidatedProfileOriginDto) => {
    const key = [origin.originId, origin.sourceCode, origin.sourceRecordId].filter(Boolean).join('|');
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(origin);
  };

  (profile.data ?? []).forEach((datum) => (datum.origins ?? []).forEach(add));
  (profile.addresses ?? []).forEach((address) => (address.origins ?? []).forEach(add));

  return result;
}

function formatAddressLabel(address: ConsolidatedProfileAddressDto): string {
  const street = [address.street?.trim(), address.exteriorNumber?.trim()].filter(Boolean).join(' ');
  return (
    [street, address.neighborhood?.trim(), address.municipality?.trim(), address.state?.trim()]
      .filter(Boolean)
      .join(', ') || address.type?.trim() || 'Dirección'
  );
}

function formatOriginLabel(origin: ConsolidatedProfileOriginDto): string {
  return origin.sourceCode?.trim() || origin.sourceRecordId?.trim() || 'Fuente';
}

function formatRelativeActivity(value: string): string {
  const timestamp = Date.parse(value);
  if (!timestamp) {
    return 'Sin fecha';
  }

  const differenceMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(differenceMs / 60_000);
  if (minutes < 1) {
    return 'Hace unos segundos';
  }
  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function hashSeed(profileId: string, fallback: number): number {
  const value = profileId.replace(/-/g, '').slice(-6);
  const parsed = Number.parseInt(value, 16);
  return Number.isFinite(parsed) ? parsed % 97 : fallback + 1;
}
