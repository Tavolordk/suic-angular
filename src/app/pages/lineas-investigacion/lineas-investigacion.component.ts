import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

type ViewMode = 'list' | 'grid';
type SortOrder = 'recent' | 'oldest' | 'name';

type EntityTone = 'person' | 'vehicle' | 'weapon';
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

const GRAPH_EDGE_PAIRS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 7],
  [1, 10],
  [1, 12],
  [2, 8],
  [2, 10],
  [2, 15],
  [3, 8],
  [3, 13],
  [3, 15],
  [4, 9],
  [4, 11],
  [4, 13],
  [5, 11],
  [5, 12],
  [6, 7],
  [6, 12],
  [7, 14],
  [8, 15],
  [9, 13],
  [10, 14],
] as const;

function buildGraphPreview(config: GraphPreviewConfig): GraphPreview {
  const labels = [
    ...config.focusLabels,
    'Perfil relacionado',
    'Ubicación',
    'Evento',
    'Cuenta asociada',
  ];

  const tones =
    config.categories.length > 0
      ? config.categories.map((category) => category.tone)
      : (['person', 'vehicle', 'weapon'] as GraphTone[]);

  const nodes: GraphNode[] = GRAPH_POSITIONS.map(([x, y], index) => ({
    id: `node-${config.seed}-${index}`,
    label: labels[index] ?? `${config.categories[index % config.categories.length]?.label ?? 'Entidad'} ${index + 1}`,
    tone: index === 0 ? tones[0] : tones[(index + config.seed) % tones.length],
    x,
    y,
    radius: index === 0 ? 17 : index < 6 ? 12 : 8 + ((index + config.seed) % 3),
    delay: -((index * 0.27 + config.seed * 0.11) % 4),
    important: index < Math.min(6, config.focusLabels.length + 2),
  }));

  const edges: GraphEdge[] = GRAPH_EDGE_PAIRS.map(([sourceIndex, targetIndex], index) => {
    const source = nodes[sourceIndex];
    const target = nodes[targetIndex];

    return {
      id: `edge-${config.seed}-${index}`,
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
      delay: -((index * 0.19 + config.seed * 0.13) % 3),
      weight: index < 6 ? 2.2 : 1.1 + ((index + config.seed) % 3) * 0.35,
    };
  });

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
export class LineasInvestigacionComponent implements OnDestroy {
  /*
   * Ajusta solamente estas rutas si en tu proyecto utilizan otros paths.
   * La ruta nueva incluida en app.routes.patch.ts es /lineas-investigacion.
   */
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
  readonly selectedLine = signal<InvestigationLine | null>(null);

  readonly totalPages = 7;
  readonly pages = Array.from({ length: this.totalPages }, (_, index) => index + 1);

  readonly investigationLines = signal<InvestigationLine[]>([
    {
      id: 'benito-juarez-garcia',
      title: 'Benito Juárez García',
      entities: [
        { label: 'Persona', tone: 'person' },
        { label: 'Honda Civic', tone: 'vehicle' },
        { label: 'Glock 9mm', tone: 'weapon' },
      ],
      stats: [
        { value: 14, label: 'Vínculos activos' },
        { value: 7, label: 'Perfiles vinculados' },
        { value: 7, label: 'Perfiles vinculados' },
      ],
      lastActivity: 'Hace 2 horas',
      activityOrder: 1,
      graph: buildGraphPreview({
        seed: 1,
        totalNodes: 1_284_330,
        totalEdges: 4_908_221,
        summary:
          'La vista prioriza a la persona investigada, los vehículos, armas y perfiles con mayor centralidad dentro de la línea.',
        samplingStrategy:
          'Nodos de mayor centralidad, relaciones recientes y diversidad de tipos de entidad.',
        focusLabels: ['Benito Juárez García', 'Honda Civic', 'Glock 9mm', 'María López'],
        categories: [
          { label: 'Personas', count: 426_210, tone: 'person' },
          { label: 'Vehículos', count: 184_906, tone: 'vehicle' },
          { label: 'Armas', count: 72_415, tone: 'weapon' },
          { label: 'Organizaciones', count: 19_704, tone: 'organization' },
          { label: 'Ubicaciones', count: 581_095, tone: 'location' },
        ],
        relationships: [
          { label: 'Relacionado con', count: 2_186_410 },
          { label: 'Propietario de', count: 968_735 },
          { label: 'Coincidencia en evento', count: 711_204 },
        ],
      }),
    },
    {
      id: 'honda-civic',
      title: 'Honda civic',
      entities: [
        { label: 'Vehículo', tone: 'vehicle' },
        { label: 'María Lopez', tone: 'person' },
        { label: 'Glock 9mm', tone: 'weapon' },
      ],
      stats: [
        { value: 14, label: 'Vínculos activos' },
        { value: 7, label: 'Perfiles vinculados' },
        { value: 7, label: 'Perfiles vinculados' },
      ],
      lastActivity: 'Hace 3 horas',
      activityOrder: 2,
      graph: buildGraphPreview({
        seed: 2,
        totalNodes: 82_145,
        totalEdges: 205_678,
        summary:
          'La muestra se centra en el vehículo, propietarios, ubicaciones recurrentes y objetos vinculados.',
        samplingStrategy:
          'Vecindad de dos saltos del vehículo, actividad reciente y conexiones de mayor peso.',
        focusLabels: ['Honda Civic', 'María López', 'Glock 9mm', 'Taller asociado'],
        categories: [
          { label: 'Vehículos', count: 12_920, tone: 'vehicle' },
          { label: 'Personas', count: 28_570, tone: 'person' },
          { label: 'Ubicaciones', count: 34_475, tone: 'location' },
          { label: 'Armas', count: 1_850, tone: 'weapon' },
          { label: 'Eventos', count: 4_330, tone: 'event' },
        ],
        relationships: [
          { label: 'Conducido por', count: 71_504 },
          { label: 'Detectado en', count: 62_118 },
          { label: 'Relacionado con', count: 45_702 },
        ],
      }),
    },
    {
      id: '22-special',
      title: '22 Special',
      entities: [
        { label: 'Arma', tone: 'weapon' },
        { label: 'Honda Civic', tone: 'person' },
        { label: 'Glock 9mm', tone: 'weapon' },
      ],
      stats: [
        { value: 14, label: 'Vínculos activos' },
        { value: 7, label: 'Perfiles vinculados' },
        { value: 7, label: 'Perfiles vinculados' },
      ],
      lastActivity: 'Hace 1 día',
      activityOrder: 3,
      graph: buildGraphPreview({
        seed: 3,
        totalNodes: 5_780_430,
        totalEdges: 18_650_910,
        summary:
          'La muestra destaca armas, personas, ubicaciones y eventos con mayor relevancia alrededor del objeto investigado.',
        samplingStrategy:
          'Top de centralidad, conexiones con mayor recurrencia y una muestra estratificada por tipo.',
        focusLabels: ['22 Special', 'Honda Civic', 'Glock 9mm', 'Evento relacionado'],
        categories: [
          { label: 'Armas', count: 804_210, tone: 'weapon' },
          { label: 'Personas', count: 1_964_822, tone: 'person' },
          { label: 'Vehículos', count: 618_904, tone: 'vehicle' },
          { label: 'Eventos', count: 971_132, tone: 'event' },
          { label: 'Ubicaciones', count: 1_421_362, tone: 'location' },
        ],
        relationships: [
          { label: 'Asegurado en', count: 6_214_445 },
          { label: 'Relacionado con', count: 4_988_217 },
          { label: 'Coincidencia balística', count: 3_174_086 },
        ],
      }),
    },
  ]);

  readonly visibleLines = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('es-MX');

    const filtered = this.investigationLines().filter((line) => {
      if (!term) {
        return true;
      }

      const searchable = [
        line.title,
        ...line.entities.map((entity) => entity.label),
      ]
        .join(' ')
        .toLocaleLowerCase('es-MX');

      return searchable.includes(term);
    });

    return [...filtered].sort((left, right) => {
      switch (this.sortOrder()) {
        case 'oldest':
          return right.activityOrder - left.activityOrder;
        case 'name':
          return left.title.localeCompare(right.title, 'es-MX');
        case 'recent':
        default:
          return left.activityOrder - right.activityOrder;
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

  ngOnDestroy(): void {
    if (this.clockTimer !== undefined) {
      window.clearInterval(this.clockTimer);
    }
  }

  @HostListener('document:keydown.escape')
  closePreviewWithEscape(): void {
    this.closeGraphPreview();
  }

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm.set(input?.value ?? '');
    this.currentPage.set(1);
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
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }
}