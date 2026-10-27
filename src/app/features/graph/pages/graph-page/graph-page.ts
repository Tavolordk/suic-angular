import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, map, of, Subscription, switchMap, throwError } from 'rxjs';
import { IntelligenceApiService } from '../../../../core/intelligence/intelligence-api.service';
import { answerGraphFacts, compactGraphFacts } from '../../../../core/intelligence/graph-factual-answers';
import { LinceMascotComponent } from '../../../../shared/ui/lince-mascot/lince-mascot.component';
import {
  IntelligenceChatHistoryMessage,
  IntelligenceGraphPayload
} from '../../../../core/intelligence/intelligence-api.models';
import { ProfileIntelligenceService } from '../../../../core/intelligence/profile-intelligence.service';
import {
  IntelligenceAnswer,
  IntelligenceEvidence,
  ProfileIntelligenceSnapshot
} from '../../../../core/intelligence/profile-intelligence.models';
import { ConsolidatedProfilesApiService } from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.service';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';
import { SearchStateService } from '../../../search/data-access/search-state.service';
import { PivotConsolidationRecord, PivotConsolidationRegistryService } from '../../data-access/pivot-consolidation-registry.service';
import {
  SearchResultDetailResponse,
  SearchResultLinkItemDto
} from '../../../../core/infrastructure/search-api/search-api.models';
import {
  ConsolidatedProfileAddressDto,
  ConsolidatedProfileResponse
} from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';

type GraphNodeType = 'person' | 'vehicle' | 'weapon';
type IntroAnimationMode = 'individual' | 'wave' | 'global';

interface GraphNodeDetail {
  label: string;
  value: string;
}

interface GraphNodeLinks {
  persons: number;
  vehicles: number;
  weapons: number;
}

interface GraphNode {
  id: string;
  type: GraphNodeType;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  radius: number;
  details: GraphNodeDetail[];
  links: GraphNodeLinks;
  /** Identifies secondary nodes loaded from a pivoted consolidated profile. */
  branchProfileId?: string;
  identityKeys?: string[];
  consolidations?: PivotConsolidationRecord[];
}

interface GraphLink {
  id: string;
  sourceId: string;
  targetId: string;
  type: Exclude<GraphNodeType, 'person'> | 'person';
  label: string;
  externalId: string;
  status: string;
  details: GraphNodeDetail[];
  sourceNames: string[];
  searchId?: string;
  resultId?: string;
  branchProfileId?: string;
}

interface GraphFilter {
  type: GraphNodeType;
  label: string;
}

interface ExpandedPivotBranch {
  record: PivotConsolidationRecord;
  profile: ConsolidatedProfileResponse;
  relations: GraphRelationEntry[];
}

interface GraphRelationEntry {
  type: GraphNodeType;
  item: SearchResultLinkItemDto;
}

type GraphRelationshipView = 'all' | GraphNodeType;


interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  evidence: IntelligenceEvidence[];
  disclaimer?: string | null;
  streaming?: boolean;
  mode?: 'local-llm' | 'deterministic-fallback';
  model?: string | null;
  thinking?: boolean;
}

interface GraphAddressViewModel {
  id: string;
  title: string;
  label: string;
  sourceNames: string[];
  details: GraphNodeDetail[];
}

const ROOT_X = 620;
const ROOT_Y = 320;
const ADDRESSES_PER_PAGE = 3;
const RELATIONSHIPS_PER_PAGE = 100;
const BRANCH_RELATIONSHIP_LIMIT = 12;

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [DecimalPipe, LinceMascotComponent],
  templateUrl: './graph-page.html',
  styleUrl: './graph-page.scss'
})
export class GraphPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly consolidatedProfilesApi = inject(ConsolidatedProfilesApiService);
  private readonly searchApi = inject(SearchApiService);
  private readonly searchState = inject(SearchStateService);
  private readonly pivotRegistry = inject(PivotConsolidationRegistryService);
  private readonly profileIntelligence = inject(ProfileIntelligenceService);
  private readonly intelligenceApi = inject(IntelligenceApiService);

  @ViewChild('aiPanel') private aiPanelElement?: ElementRef<HTMLElement>;
  @ViewChild('aiChatViewport') private aiChatViewport?: ElementRef<HTMLElement>;
  @ViewChild('aiComposer') private aiComposer?: ElementRef<HTMLTextAreaElement>;
  private aiChatSubscription?: Subscription;
  private aiMessageSequence = 0;
  private aiRequestSequence = 0;
  private activeAiRequestId = 0;
  private aiPanelDragPointerId: number | null = null;
  private aiPanelDragStartClientX = 0;
  private aiPanelDragStartClientY = 0;
  private aiPanelDragStartX = 0;
  private aiPanelDragStartY = 0;

  readonly rootTypeHint: GraphNodeType | undefined =
    this.route.snapshot.queryParamMap.get('entityType')?.toLowerCase() === 'vehicle' ? 'vehicle' : undefined;

  readonly profileId =
    this.route.snapshot.queryParamMap.get('profileId')?.trim() ||
    this.route.snapshot.queryParamMap.get('investigationId')?.trim() ||
    '';

  readonly detailPanelOpen = signal(true);
  readonly selectedNodeId = signal(this.profileId || 'profile');
  readonly selectedLinkId = signal<string | null>(null);
  readonly expandedLinkType = signal<GraphNodeType | null>(null);
  readonly zoom = signal(1);
  readonly introAnimating = signal(true);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly dragging = signal(false);

  // Si regresamos desde la lista de tarjetas, restaurar el nodo que originó el pivoteo.
  private returnLinkId = this.route.snapshot.queryParamMap.get('pivotLinkId')?.trim() || null;

  private readonly viewBoxWidth = 1100;
  private readonly viewBoxHeight = 680;
  private readonly individualAnimationLimit = 200;
  private readonly waveAnimationLimit = 2000;
  private readonly introDurationMs = 2800;

  private dragStartClientX = 0;
  private dragStartClientY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;
  private pointerMoved = false;
  private suppressNodeClick = false;
  private introTimer?: ReturnType<typeof setTimeout>;

  readonly activeFilters = signal<Record<GraphNodeType, boolean>>({
    person: true,
    vehicle: true,
    weapon: true
  });

  readonly filters: GraphFilter[] = [
    { type: 'person', label: 'Personas' },
    { type: 'vehicle', label: 'Vehículos' },
    { type: 'weapon', label: 'Armas' }
  ];

  readonly nodes = signal<GraphNode[]>([
    createPlaceholderNode(this.profileId || 'profile', 'Cargando perfil consolidado...')
  ]);
  readonly links = signal<GraphLink[]>([]);
  readonly addresses = signal<GraphAddressViewModel[]>([]);
  readonly addressPageIndex = signal(0);

  readonly relationshipCatalog = signal<GraphRelationEntry[]>([]);
  private readonly aiSourceDetail = signal<SearchResultDetailResponse | null>(null);
  readonly relationshipTotals = signal<GraphNodeLinks>({ persons: 0, vehicles: 0, weapons: 0 });
  readonly relationshipViewType = signal<GraphRelationshipView>('all');
  readonly relationshipQuery = signal('');
  readonly relationshipPageIndex = signal(0);
  readonly relationshipPageSize = RELATIONSHIPS_PER_PAGE;
  readonly pivotLoading = signal(false);
  readonly pivotError = signal<string | null>(null);
  readonly pivotNoResults = signal<{ nodeTitle: string; isPartial: boolean } | null>(null);
  readonly expandedPivotBranches = signal<ExpandedPivotBranch[]>([]);
  readonly expandingPivotProfileId = signal<string | null>(null);
  readonly pivotExpansionError = signal<string | null>(null);

  // La IA trabaja sobre el response ya recibido. No cambia contratos ni dispara endpoints existentes.
  readonly loadedProfile = signal<ConsolidatedProfileResponse | null>(null);
  readonly aiPanelOpen = signal(false);
  readonly aiPanelMinimized = signal(false);
  readonly aiPanelMaximized = signal(false);
  readonly aiPanelPositioned = signal(false);
  readonly aiPanelDragging = signal(false);
  readonly aiPanelX = signal(0);
  readonly aiPanelY = signal(16);
  readonly aiQuestion = signal('');
  readonly aiSnapshot = signal<ProfileIntelligenceSnapshot | null>(null);
  readonly aiAnswer = signal<IntelligenceAnswer | null>(null);
  readonly aiMessages = signal<AiChatMessage[]>([]);
  // Vistas del nuevo centro de inteligencia; no cambian el historial enviado a la API.
  readonly aiView = signal<'home' | 'chat' | 'evidence'>('home');
  readonly aiCopiedMessageId = signal<string | null>(null);
  readonly aiSelectedEvidenceMessageId = signal<string | null>(null);
  readonly aiEvidenceSearch = signal('');
  readonly aiErrorMessage = signal<string | null>(null);
  readonly isAiLoading = signal(false);
  readonly aiThinkingEnabled = signal(true);
  readonly aiServiceStatus = signal<'checking' | 'online' | 'fallback'>('checking');
  readonly aiSuggestedQuestions = [
    { icon: 'fa-file-lines', title: 'Resumen del perfil', description: 'Información principal', question: 'Resume este perfil consolidado y menciona los datos más importantes disponibles.' },
    { icon: 'fa-diagram-project', title: 'Explorar vínculos', description: 'Personas y relaciones', question: '¿Qué personas están vinculadas con este perfil y qué relaciones aparecen en el grafo?' },
    { icon: 'fa-car-side', title: 'Revisar vehículos', description: 'Vehículos relacionados', question: '¿Qué vehículos aparecen vinculados con este perfil en los datos disponibles?' },
    { icon: 'fa-link', title: 'Consultar evidencias', description: 'Datos y fuentes', question: '¿Cuáles son las evidencias y fuentes más relevantes disponibles para este perfil?' }
  ] as const;


  readonly nodeIndex = computed(
    () => new Map(this.nodes().map((node) => [node.id, node] as const))
  );

  readonly visibleNodes = computed(() => {
    const filters = this.activeFilters();
    const rootId = this.nodes()[0]?.id;
    return this.nodes().filter((node) => node.id === rootId || filters[node.type]);
  });

  readonly visibleLinks = computed(() => {
    const visibleIds = new Set(this.visibleNodes().map((node) => node.id));
    return this.links().filter(
      (link) => visibleIds.has(link.sourceId) && visibleIds.has(link.targetId)
    );
  });

  readonly filteredRelationshipCatalog = computed(() => {
    const viewType = this.relationshipViewType();
    const query = normalizeSearchText(this.relationshipQuery());

    return this.relationshipCatalog().filter((relation) => {
      if (viewType !== 'all' && relation.type !== viewType) {
        return false;
      }

      if (!query) {
        return true;
      }

      return relationSearchText(relation).includes(query);
    });
  });

  readonly relationshipPageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredRelationshipCatalog().length / this.relationshipPageSize))
  );

  readonly relationshipPageLabel = computed(() => {
    const totalLoaded = this.filteredRelationshipCatalog().length;
    if (!totalLoaded) {
      return '0 de 0 cargados';
    }

    const page = Math.min(this.relationshipPageIndex(), this.relationshipPageCount() - 1);
    const start = page * this.relationshipPageSize + 1;
    const end = Math.min(totalLoaded, start + this.relationshipPageSize - 1);
    return `${start.toLocaleString('es-MX')}-${end.toLocaleString('es-MX')} de ${totalLoaded.toLocaleString('es-MX')} cargados`;
  });

  readonly reportedRelationshipCount = computed(() => {
    const totals = this.relationshipTotals();
    switch (this.relationshipViewType()) {
      case 'person': return totals.persons;
      case 'vehicle': return totals.vehicles;
      case 'weapon': return totals.weapons;
      default: return totals.persons + totals.vehicles + totals.weapons;
    }
  });

  readonly loadedRelationshipCount = computed(() => this.filteredRelationshipCatalog().length);

  readonly loadedRelationshipCountForView = computed(() => {
    const viewType = this.relationshipViewType();
    return viewType === 'all'
      ? this.relationshipCatalog().length
      : this.relationshipCatalog().filter((relation) => relation.type === viewType).length;
  });

  readonly relationshipsAreTruncated = computed(() =>
    this.reportedRelationshipCount() > this.loadedRelationshipCountForView()
  );

  readonly addressPageCount = computed(() =>
    Math.max(1, Math.ceil(this.addresses().length / ADDRESSES_PER_PAGE))
  );

  readonly visibleAddresses = computed(() => {
    const pageCount = this.addressPageCount();
    const index = Math.min(this.addressPageIndex(), pageCount - 1);
    const start = index * ADDRESSES_PER_PAGE;
    return this.addresses().slice(start, start + ADDRESSES_PER_PAGE);
  });

  readonly addressPageLabel = computed(() => {
    const total = this.addresses().length;
    if (!total) {
      return '0 de 0';
    }
    const index = Math.min(this.addressPageIndex(), this.addressPageCount() - 1);
    const start = index * ADDRESSES_PER_PAGE + 1;
    const end = Math.min(total, start + ADDRESSES_PER_PAGE - 1);
    return `${start}-${end} de ${total}`;
  });

  readonly introMode = computed<IntroAnimationMode>(() =>
    this.resolveIntroMode(this.visibleLinks().length)
  );

  readonly selectedNode = computed(() => {
    const nodes = this.nodes();
    return (
      nodes.find((node) => node.id === this.selectedNodeId()) ??
      nodes[0] ??
      createPlaceholderNode(this.profileId || 'profile', 'Perfil consolidado')
    );
  });

  readonly rootNode = computed(() =>
    this.nodes()[0] ?? createPlaceholderNode(this.profileId || 'profile', 'Perfil consolidado')
  );

  readonly selectedLink = computed(() => {
    const selectedId = this.selectedLinkId();
    if (!selectedId) {
      return null;
    }
    return this.links().find((link) => link.id === selectedId) ?? null;
  });

  /** Solo los nodos Persona provenientes de un vínculo pueden originar esta búsqueda. */
  readonly selectedPivotLink = computed(() => {
    const node = this.selectedNode();
    if (node.id === this.rootNode().id || node.type !== 'person') {
      return null;
    }
    return this.links().find((link) =>
      link.targetId === node.id && link.type === 'person' && Boolean(link.externalId?.trim())
    ) ?? null;
  });

  /** A link can yield more than one consolidated profile; never infer completion from search hits. */
  readonly selectedConsolidations = computed(() => {
    return this.selectedNode().consolidations ?? [];
  });

  readonly expandedRelatedNodes = computed(() => {
    const type = this.expandedLinkType();
    if (!type) {
      return [];
    }
    const rootId = this.rootNode().id;
    return this.nodes().filter((node) => node.id !== rootId && node.type === type);
  });

  readonly pendingProfilesLabel = computed(() => {
    const visible = this.visibleLinks().length;
    const total = this.reportedRelationshipCount();
    return `${visible.toLocaleString('es-MX')} visibles de ${total.toLocaleString('es-MX')} vínculos`;
  });

  readonly graphTransform = computed(() =>
    `translate(${this.panX()} ${this.panY()}) scale(${this.zoom()})`
  );

  readonly aiEvidence = computed<IntelligenceEvidence[]>(() => {
    const lastAssistant = [...this.aiMessages()].reverse().find((message) => message.role === 'assistant');
    return lastAssistant?.evidence ?? this.aiAnswer()?.evidence ?? [];
  });
  readonly aiDisplayedEvidence = computed<IntelligenceEvidence[]>(() => {
    // Evita atribuir evidencias de una respuesta anterior a otra que no las tiene.
    const selectedId = this.aiSelectedEvidenceMessageId();
    if (selectedId) {
      return this.aiMessages().find((message) => message.id === selectedId)?.evidence ?? [];
    }
    // La vista general utiliza datos locales del perfil mientras no haya respuestas.
    const lastResponse = [...this.aiMessages()].reverse().find((message) => message.role === 'assistant');
    if (lastResponse?.evidence.length) return lastResponse.evidence;
    return this.aiSnapshot()?.facts ?? this.aiAnswer()?.evidence ?? [];
  });
  readonly aiFilteredEvidence = computed(() => {
    const query = normalizeSearchText(this.aiEvidenceSearch());
    const records = this.aiDisplayedEvidence();
    if (!query) return records;
    return records.filter((record) => normalizeSearchText(
      `${record.label} ${record.value} ${record.kind} ${record.sourceCodes.join(' ')}`
    ).includes(query));
  });
  readonly aiServiceStatusLabel = computed(() => {
    switch (this.aiServiceStatus()) {
      case 'online': return 'Servicio disponible';
      case 'fallback': return 'Análisis disponible';
      default: return 'Verificando servicio';
    }
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  ngAfterViewInit(): void {
    this.restartIntroAnimation();
  }

  ngOnDestroy(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
    this.aiChatSubscription?.unsubscribe();
  }

  loadProfile(): void {
    if (!this.profileId || this.isLoading()) {
      if (!this.profileId) {
        this.setGraphError('No se recibió el profileId del perfil consolidado.');
      }
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.aiSourceDetail.set(null);
    this.consolidatedProfilesApi.getProfile(this.profileId).subscribe({
      next: (profile) => {
        const graph = mapProfileToGraph(profile, [], undefined, this.rootTypeHint);
        const fallbackSnapshot = this.profileIntelligence.analyze(profile);
        this.loadedProfile.set(profile);
        this.nodes.set(graph.nodes);
        this.links.set(graph.links);
        this.expandedPivotBranches.set([]);
        this.addresses.set(mapAddressesForPanel(profile.addresses ?? []));
        this.addressPageIndex.set(0);
        this.selectedNodeId.set(graph.nodes[0]?.id ?? profile.profileId);
        this.selectedLinkId.set(null);
        this.expandedLinkType.set(null);

        // Fallback determinista inmediato: la pantalla nunca depende de que la API IA esté arriba.
        this.aiSnapshot.set(fallbackSnapshot);
        const initialAnswer = this.profileIntelligence.answer(
          '',
          profile,
          this.selectedNodeContext(),
          this.currentAiGraphPayload()
        );
        this.aiAnswer.set(initialAnswer);
        // El chat inicia limpio. El análisis automático queda disponible como respaldo,
        // pero no ocupa la conversación hasta que el usuario haga una pregunta.
        this.aiMessages.set([]);
        this.aiErrorMessage.set(null);
        this.aiServiceStatus.set('checking');
        this.isLoading.set(false);
        this.restartIntroAnimation();

        // Llamadas NUEVAS e independientes; no modifican ni repiten los endpoints de negocio.
        // La API 3.1.1 concentra el análisis generativo en /chat/stream.
        // El snapshot determinista ya se calculó arriba; aquí sólo validamos disponibilidad del LLM.
        this.refreshLocalLlmHealth();
        this.loadRelationshipGraph(profile);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.setGraphError(extractErrorMessage(error));
      }
    });
  }


  private loadRelationshipGraph(profile: ConsolidatedProfileResponse): void {
    const searchId = profile.searchId?.trim();
    const resultId = profile.preconsolidatedResultId?.trim();

    if (!searchId || !resultId) {
      return;
    }

    this.searchApi.getResultDetail(searchId, resultId).subscribe({
      next: (detail) => {
        this.aiSourceDetail.set(detail);
        this.relationshipCatalog.set(collectGraphRelations(detail));
        this.relationshipTotals.set(collectRelationshipTotals(detail));
        this.relationshipViewType.set('all');
        this.relationshipQuery.set('');
        this.relationshipPageIndex.set(0);
        this.pivotError.set(null);
        this.renderRelationshipPage(profile);
      },
      error: () => {
        // El perfil raíz sigue disponible aunque el endpoint de detalle no responda.
        // Así el grafo nunca queda sin estado ni bloquea el análisis del perfil consolidado.
      }
    });
  }

  private renderRelationshipPage(profile = this.loadedProfile(), preserveView = false): void {
    const previouslySelectedId = this.selectedNodeId();
    if (!profile) {
      return;
    }

    const catalog = this.filteredRelationshipCatalog();
    if (this.returnLinkId) {
      const sourceIndex = catalog.findIndex((relation) => relation.item.linkId === this.returnLinkId);
      if (sourceIndex >= 0) {
        this.relationshipPageIndex.set(Math.floor(sourceIndex / this.relationshipPageSize));
      }
    }
    const pageCount = Math.max(1, Math.ceil(catalog.length / this.relationshipPageSize));
    const pageIndex = Math.min(this.relationshipPageIndex(), pageCount - 1);
    if (pageIndex !== this.relationshipPageIndex()) {
      this.relationshipPageIndex.set(pageIndex);
    }

    const start = pageIndex * this.relationshipPageSize;
    const pageRelations = catalog.slice(start, start + this.relationshipPageSize);
    const graph = mapProfileToGraph(profile, pageRelations, this.relationshipTotals(), this.rootTypeHint);

    const expandedGraph = this.appendPivotBranches(graph);
    this.nodes.set(expandedGraph.nodes);
    this.links.set(expandedGraph.links);
    this.selectedNodeId.set(
      preserveView && expandedGraph.nodes.some(node => node.id === previouslySelectedId)
        ? previouslySelectedId : (graph.nodes[0]?.id ?? profile.profileId)
    );
    this.selectedLinkId.set(null);
    if (this.returnLinkId) {
      const returningLink = expandedGraph.links.find((link) => link.externalId === this.returnLinkId);
      if (returningLink) {
        this.selectedNodeId.set(returningLink.targetId);
        this.selectedLinkId.set(returningLink.id);
        this.detailPanelOpen.set(true);
      }
      this.returnLinkId = null;
    }
    const viewType = this.relationshipViewType();
    this.expandedLinkType.set(viewType === 'all' ? null : viewType);
    if (!preserveView) {
      this.resetZoom();
      this.restartIntroAnimation();
    }
  }

  /** Keep one visible occurrence per identity; the latest expanded branch owns shared children. */
  private appendPivotBranches(graph: { nodes: GraphNode[]; links: GraphLink[] }): { nodes: GraphNode[]; links: GraphLink[] } {
    const root = graph.nodes[0];
    if (!root) return graph;
    const nodes: GraphNode[] = [root];
    let links: GraphLink[] = [];
    const identities = new Map<string, GraphNode>();
    for (const key of root.identityKeys ?? []) identities.set(key, root);
    identities.set(`profile:${root.id}`, root);

    const reuseNode = (candidate: GraphNode, link: GraphLink): GraphNode => {
      const records = link.searchId && link.resultId
        ? this.pivotRegistry.forLink(this.profileId, link.searchId, link.resultId, link.externalId) : [];
      // Multiple consolidation results are not evidence that those profiles are the same person.
      const keys = [...(candidate.identityKeys ?? [])];
      if (records.length === 1) keys.push(`profile:${records[0].profileId}`);
      const existing = keys.map(key => identities.get(key)).find((node): node is GraphNode => !!node);
      const node = existing ?? { ...candidate, consolidations: [] };
      if (!existing) nodes.push(node);
      node.consolidations = [...(node.consolidations ?? []), ...records].filter((record, index, all) =>
        all.findIndex(other => other.profileId === record.profileId) === index);
      for (const key of keys) identities.set(key, node);
      return node;
    };
    for (const link of graph.links) {
      const candidate = graph.nodes.find(node => node.id === link.targetId);
      if (!candidate) continue;
      const node = reuseNode(candidate, link);
      if (node.id !== root.id && !links.some(entry => entry.targetId === node.id)) {
        links.push({ ...link, targetId: node.id });
      }
    }

    // Resolve dependencies even when an existing branch was reactivated after one of its children.
    const pending = [...this.expandedPivotBranches()];
    while (pending.length) {
      const branchIndex = pending.findIndex(branch => nodes.some(node =>
        node.consolidations?.some(record => record.profileId === branch.record.profileId)));
      if (branchIndex < 0) break;
      const [branch] = pending.splice(branchIndex, 1);
      const parentNode = nodes.find(node => node.consolidations?.some(record =>
        record.profileId === branch.record.profileId))!;
      const childGraph = mapProfileToGraph(branch.profile, branch.relations.slice(0, BRANCH_RELATIONSHIP_LIMIT));
      for (const key of childGraph.nodes[0].identityKeys ?? []) identities.set(key, parentNode);
      identities.set(`profile:${branch.profile.profileId}`, parentNode);
      const direction = Math.atan2(parentNode.y - root.y, parentNode.x - root.x);
      childGraph.nodes.slice(1).forEach((child, index) => {
        const sourceLink = childGraph.links[index];
        if (!sourceLink) return;
        // Some reciprocal links only contain a full name, without the ancestor's CURP/profile ID.
        // Hide that visual back-reference only along the current ancestry, never across siblings.
        const returningAncestor = findReturningAncestor(child, parentNode, nodes, links);
        const knownProfiles = sourceLink.searchId && sourceLink.resultId
          ? this.pivotRegistry.forLink(this.profileId, sourceLink.searchId, sourceLink.resultId, sourceLink.externalId)
          : [];
        if (returningAncestor && (!knownProfiles.length || knownProfiles.every(record =>
          record.profileId === returningAncestor.id || returningAncestor.consolidations?.some(existing =>
            existing.profileId === record.profileId)))) return;
        const node = reuseNode({ ...child, id: `pivot:${branch.profile.profileId}:${child.id}` }, sourceLink);
        // Never move the root, the expanding node, or an ancestor underneath its own descendant.
        let ancestor: string | undefined = parentNode.id;
        const visited = new Set<string>();
        while (ancestor && !visited.has(ancestor)) {
          if (ancestor === node.id) return;
          visited.add(ancestor);
          ancestor = links.find(link => link.targetId === ancestor)?.sourceId;
        }
        if (node.id === root.id) return;
        const angle = direction - Math.PI * 0.58 + (index % 7 / 6) * Math.PI * 1.16;
        let distance = 320 + Math.floor(index / 7) * 220;
        let x = parentNode.x + Math.cos(angle) * distance;
        let y = parentNode.y + Math.sin(angle) * distance;
        while (nodes.some(other => other !== node && Math.hypot(other.x - x, other.y - y) < 190)) {
          distance += 100;
          x = parentNode.x + Math.cos(angle) * distance;
          y = parentNode.y + Math.sin(angle) * distance;
        }
        const offsetX = x - node.x;
        const offsetY = y - node.y;
        const descendants = [node.id];
        const moved = new Set<string>(descendants);
        while (descendants.length) {
          const parentId = descendants.shift()!;
          for (const edge of links.filter(link => link.sourceId === parentId)) {
            if (moved.has(edge.targetId)) continue;
            moved.add(edge.targetId);
            const descendant = nodes.find(candidate => candidate.id === edge.targetId);
            if (descendant) {
              descendant.x += offsetX;
              descendant.y += offsetY;
              descendants.push(descendant.id);
            }
          }
        }
        Object.assign(node, { x, y, branchProfileId: branch.profile.profileId });
        links = links.filter(link => link.targetId !== node.id);
        links.push({ ...sourceLink, id: `pivot-edge:${branch.profile.profileId}:${sourceLink.id}`,
          sourceId: parentNode.id, targetId: node.id, branchProfileId: branch.profile.profileId });
      });
    }
    // Moving a populated branch can bring its descendants close to another branch.
    nodes.forEach((node, index) => {
      const previous = nodes.slice(0, index);
      while (previous.some(other => Math.hypot(other.x - node.x, other.y - node.y) < 190)) {
        node.y += 190;
      }
    });
    return { nodes, links };
  }

  isPivotNodeConsolidated(node: GraphNode): boolean {
    return node.id !== this.rootNode().id && !!node.consolidations?.length;
  }

  isPivotProfileExpanded(profileId: string): boolean {
    return this.expandedPivotBranches().some(branch => branch.record.profileId === profileId);
  }

  expandPivotProfile(record: PivotConsolidationRecord, collapseIfExpanded = true, onComplete?: () => void): void {
    if (this.expandingPivotProfileId()) return;
    if (this.isPivotProfileExpanded(record.profileId)) {
      if (!collapseIfExpanded) {
        this.expandedPivotBranches.update(branches => [
          ...branches.filter(branch => branch.record.profileId !== record.profileId),
          ...branches.filter(branch => branch.record.profileId === record.profileId)
        ]);
        this.renderRelationshipPage(undefined, true);
        this.focusExpandedBranch(record.profileId);
        onComplete?.();
        return;
      }
      this.expandedPivotBranches.update(branches => branches.filter(branch => branch.record.profileId !== record.profileId));
      this.pivotExpansionError.set(null);
      this.renderRelationshipPage(undefined, true);
      // Restoring the parent node is less confusing than selecting a disappeared child.
      this.selectSourceLink(record);
      return;
    }

    this.expandingPivotProfileId.set(record.profileId);
    this.pivotExpansionError.set(null);
    this.consolidatedProfilesApi.getProfile(record.profileId).pipe(
      switchMap(profile => {
        const searchId = profile.searchId?.trim();
        const resultId = profile.preconsolidatedResultId?.trim();
        if (!searchId || !resultId) return of({ profile, relations: [] as GraphRelationEntry[], detailError: false });
        return this.searchApi.getResultDetail(searchId, resultId).pipe(
          map(detail => ({ profile, relations: collectGraphRelations(detail), detailError: false })),
          catchError(() => of({ profile, relations: [] as GraphRelationEntry[], detailError: true }))
        );
      }),
      finalize(() => {
        this.expandingPivotProfileId.set(null);
        onComplete?.();
      })
    ).subscribe({
      next: data => {
        if (data.detailError) {
          this.pivotExpansionError.set('No fue posible consultar los vínculos del perfil consolidado. Inténtalo de nuevo.');
          return;
        }
        if (!data.relations.length) {
          this.pivotExpansionError.set(
            'El perfil está consolidado, pero no tiene vínculos adicionales disponibles para desplegar.'
          );
          return;
        }
        this.expandedPivotBranches.update(branches => [...branches, { record, ...data }]);
        this.renderRelationshipPage(undefined, true);
        this.selectSourceLink(record);
        this.focusExpandedBranch(record.profileId);
      },
      error: (error: unknown) => this.pivotExpansionError.set(extractErrorMessage(error))
    });
  }

  private selectSourceLink(record: PivotConsolidationRecord): void {
    const node = this.nodes().find(candidate => candidate.consolidations?.some(entry =>
      entry.profileId === record.profileId));
    if (!node) return;
    const link = this.links().find(entry => entry.targetId === node.id);
    this.selectedNodeId.set(node.id);
    this.selectedLinkId.set(link?.id ?? null);
    this.detailPanelOpen.set(true);
  }

  /** Focus the selected origin and its new branch, without modifying the other graph nodes. */
  private focusExpandedBranch(profileId: string): void {
    const related = this.nodes().filter(node => node.branchProfileId === profileId);
    const parent = this.selectedNode();
    if (!related.length) return;
    const displayed = [...related, parent, this.rootNode()];
    const minX = Math.min(...displayed.map(node => node.x));
    const maxX = Math.max(...displayed.map(node => node.x));
    const minY = Math.min(...displayed.map(node => node.y));
    const maxY = Math.max(...displayed.map(node => node.y));
    const targetZoom = clamp(Math.min(
      1, (this.viewBoxWidth - 150) / Math.max(1, maxX - minX),
      (this.viewBoxHeight - 150) / Math.max(1, maxY - minY)
    ), 0.15, 1);
    this.zoom.set(Number(targetZoom.toFixed(2)));
    this.panX.set(this.viewBoxWidth / 2 - (minX + maxX) / 2 * targetZoom);
    this.panY.set(this.viewBoxHeight / 2 - (minY + maxY) / 2 * targetZoom);
  }

  openPivotProfileGraph(profileId: string): void {
    void this.router.navigate(['/grafo'], { queryParams: { profileId } });
  }

  setRelationshipView(type: GraphRelationshipView): void {
    this.relationshipViewType.set(type);
    this.relationshipPageIndex.set(0);

    if (type !== 'all') {
      this.activeFilters.update((filters) => ({ ...filters, [type]: true }));
      this.expandedLinkType.set(type);
    } else {
      this.expandedLinkType.set(null);
    }

    this.renderRelationshipPage();
  }

  setRelationshipQuery(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.relationshipQuery.set(value);
    this.relationshipPageIndex.set(0);
    this.renderRelationshipPage();
  }

  previousRelationshipPage(): void {
    if (this.relationshipPageIndex() <= 0) {
      return;
    }

    this.relationshipPageIndex.update((page) => page - 1);
    this.renderRelationshipPage();
  }

  nextRelationshipPage(): void {
    if (this.relationshipPageIndex() >= this.relationshipPageCount() - 1) {
      return;
    }

    this.relationshipPageIndex.update((page) => page + 1);
    this.renderRelationshipPage();
  }

  /**
   * Verifica el vínculo Persona en el detalle real del resultado padre y envía
   * la respuesta paginada de Pivot a las mismas tarjetas de búsqueda.
   * Nunca envía nombre, CURP o RFC desde el navegador.
   */
  pivotSelectedNode(): void {
    const link = this.selectedPivotLink();
    const node = this.selectedNode();
    if (!link || this.pivotLoading()) {
      return;
    }

    const searchId = link.searchId?.trim() || this.loadedProfile()?.searchId?.trim();
    const resultId = link.resultId?.trim() || this.loadedProfile()?.preconsolidatedResultId?.trim();
    const linkId = link.externalId?.trim();

    if (!searchId || !resultId || !linkId) {
      this.pivotError.set('No se encontraron los identificadores necesarios para buscar desde esta persona.');
      return;
    }

    this.pivotLoading.set(true);
    this.pivotError.set(null);
    this.pivotNoResults.set(null);

    this.searchApi.getResultDetail(searchId, resultId).pipe(
      switchMap((detail) => {
        // No usar IDs generados por el grafo ni confundir un vínculo Vehículo/Arma
        // con una persona. El motor acepta el linkId definido por este detalle.
        const belongsToPerson = (detail.linkGroups ?? []).some((group) =>
          resolveGraphNodeType(group.entityType) === 'person' &&
          (group.items ?? []).some((item) => item.linkId === linkId)
        );
        if (!belongsToPerson) {
          return throwError(() => new Error('Esta persona ya no está disponible entre los vínculos del resultado. Actualiza el grafo e inténtalo de nuevo.'));
        }
        return this.searchApi.pivotLink(searchId, resultId, linkId, 18);
      }),
      finalize(() => this.pivotLoading.set(false))
    ).subscribe({
      next: (page) => {
        if (!page.searchId?.trim() || !page.pagination || !page.counts || !Array.isArray(page.items ?? [])) {
          this.pivotError.set('El servidor no devolvió una página de resultados válida para el pivoteo.');
          return;
        }

        // El motor puede responder success=true y Completed con 0 coincidencias.
        // Solo cambiar de pantalla si hay tarjetas reales; no modificar el estado
        // de búsqueda ni la selección del grafo cuando el pivoteo fue vacío.
        if ((page.items?.length ?? 0) === 0 || page.counts.totalItems <= 0) {
          this.pivotNoResults.set({
            nodeTitle: node.title,
            isPartial: page.execution?.isPartial === true
          });
          return;
        }

        this.searchState.savePivotResults(page, {
          graphProfileId: this.profileId,
          nodeTitle: node.title,
          parentSearchId: searchId,
          parentResultId: resultId,
          parentLinkId: linkId
        });
        void this.router.navigate(['/busqueda']);
      },
      error: (error: unknown) => {
        this.pivotError.set(extractErrorMessage(error));
      }
    });
  }

  dismissPivotNoResults(): void {
    this.pivotNoResults.set(null);
  }

  @HostListener('document:keydown.escape')
  dismissPivotNoResultsOnEscape(): void {
    if (this.pivotNoResults()) {
      this.dismissPivotNoResults();
    }
  }

  toggleAiPanel(): void {
    if (this.aiPanelOpen()) {
      this.closeAiPanel();
    } else {
      this.openAiPanel();
    }
  }

  openAiPanel(): void {
    this.aiPanelOpen.set(true);
    this.aiPanelMinimized.set(false);
    this.aiPanelMaximized.set(false);
    this.aiView.set(this.aiMessages().length ? 'chat' : 'home');
    this.focusAiComposer();
  }

  setAiView(view: 'home' | 'chat' | 'evidence'): void {
    this.aiView.set(view);
    if (view === 'evidence') this.aiEvidenceSearch.set('');
    if (view === 'chat') {
      this.scrollAiChatToBottom();
    }
  }

  openAiMessageEvidence(messageId: string): void {
    this.aiSelectedEvidenceMessageId.set(messageId);
    this.setAiView('evidence');
  }

  setAiEvidenceSearch(event: Event): void {
    this.aiEvidenceSearch.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  aiEvidenceKindLabel(kind: IntelligenceEvidence['kind']): string {
    switch (kind) {
      case 'profile': return 'Perfil';
      case 'address': return 'Domicilio';
      case 'origin': return 'Fuente';
      case 'node': return 'Nodo';
      case 'relation': return 'Vínculo';
      default: return 'Dato';
    }
  }

  copyAiResponse(messageId: string, answer: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText || !answer.trim()) {
      return;
    }
    navigator.clipboard.writeText(answer).then(() => {
      this.aiCopiedMessageId.set(messageId);
    }).catch(() => {
      this.aiCopiedMessageId.set(null);
    });
  }

  closeAiPanel(): void {
    this.endAiPanelDrag();
    this.aiPanelOpen.set(false);
    this.aiPanelMinimized.set(false);
    this.aiPanelMaximized.set(false);
  }

  toggleAiPanelMinimized(): void {
    const next = !this.aiPanelMinimized();
    this.aiPanelMinimized.set(next);
    if (next) {
      this.aiPanelMaximized.set(false);
    }
    this.clampAiPanelPositionSoon();
  }

  toggleAiPanelMaximized(): void {
    const next = !this.aiPanelMaximized();
    this.aiPanelMaximized.set(next);
    if (next) {
      this.aiPanelMinimized.set(false);
      this.endAiPanelDrag();
    } else {
      this.clampAiPanelPositionSoon();
      this.focusAiComposer();
    }
  }

  startAiPanelDrag(event: PointerEvent): void {
    if (this.aiPanelMaximized()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) {
      return;
    }

    const panel = this.aiPanelElement?.nativeElement;
    const parent = panel?.parentElement;
    if (!panel || !parent) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    if (!this.aiPanelPositioned()) {
      this.aiPanelX.set(panelRect.left - parentRect.left);
      this.aiPanelY.set(panelRect.top - parentRect.top);
      this.aiPanelPositioned.set(true);
    }

    this.aiPanelDragPointerId = event.pointerId;
    this.aiPanelDragStartClientX = event.clientX;
    this.aiPanelDragStartClientY = event.clientY;
    this.aiPanelDragStartX = this.aiPanelX();
    this.aiPanelDragStartY = this.aiPanelY();
    this.aiPanelDragging.set(true);

    const handle = event.currentTarget as HTMLElement | null;
    handle?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  moveAiPanelDrag(event: PointerEvent): void {
    if (!this.aiPanelDragging() || this.aiPanelDragPointerId !== event.pointerId) {
      return;
    }

    const panel = this.aiPanelElement?.nativeElement;
    const parent = panel?.parentElement;
    if (!panel || !parent) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const margin = 8;
    const deltaX = event.clientX - this.aiPanelDragStartClientX;
    const deltaY = event.clientY - this.aiPanelDragStartClientY;
    const maxX = Math.max(margin, parentRect.width - panelWidth - margin);
    const maxY = Math.max(margin, parentRect.height - panelHeight - margin);

    this.aiPanelX.set(clamp(this.aiPanelDragStartX + deltaX, margin, maxX));
    this.aiPanelY.set(clamp(this.aiPanelDragStartY + deltaY, margin, maxY));
  }

  endAiPanelDrag(event?: PointerEvent): void {
    if (event && this.aiPanelDragPointerId !== null) {
      const handle = event.currentTarget as HTMLElement | null;
      if (handle?.hasPointerCapture?.(this.aiPanelDragPointerId)) {
        handle.releasePointerCapture(this.aiPanelDragPointerId);
      }
    }
    this.aiPanelDragPointerId = null;
    this.aiPanelDragging.set(false);
  }

  private clampAiPanelPositionSoon(): void {
    if (!this.aiPanelPositioned()) {
      return;
    }
    setTimeout(() => this.clampAiPanelPosition());
  }

  private clampAiPanelPosition(): void {
    const panel = this.aiPanelElement?.nativeElement;
    const parent = panel?.parentElement;
    if (!panel || !parent || this.aiPanelMaximized()) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const margin = 8;
    const maxX = Math.max(margin, parentRect.width - panel.offsetWidth - margin);
    const maxY = Math.max(margin, parentRect.height - panel.offsetHeight - margin);
    this.aiPanelX.set(clamp(this.aiPanelX(), margin, maxX));
    this.aiPanelY.set(clamp(this.aiPanelY(), margin, maxY));
  }

  setAiQuestion(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.aiQuestion.set(target?.value ?? '');
    if (target) {
      target.style.height = 'auto';
      target.style.height = `${Math.min(target.scrollHeight, 132)}px`;
    }
  }

  onAiComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.askAi();
    }
  }

  askAi(questionOverride?: string): void {
    const profile = this.loadedProfile();
    if (!profile || this.isAiLoading()) {
      if (!profile) {
        this.aiErrorMessage.set('Primero debe cargarse el perfil consolidado.');
      }
      return;
    }

    const question = (questionOverride ?? this.aiQuestion()).trim();
    if (!question) {
      return;
    }

    // Las relaciones proceden del detalle de búsqueda, no únicamente de la página
    // actualmente visible. Si el usuario pregunta antes de cargar ese endpoint,
    // esperamos su respuesta en vez de mandar un grafo incompleto a la IA.
    const searchId = profile.searchId?.trim();
    const resultId = profile.preconsolidatedResultId?.trim();
    if (!this.aiSourceDetail() && searchId && resultId) {
      this.isAiLoading.set(true);
      this.aiErrorMessage.set(null);
      this.searchApi.getResultDetail(searchId, resultId).subscribe({
        next: (detail) => {
          this.aiSourceDetail.set(detail);
          this.relationshipCatalog.set(collectGraphRelations(detail));
          this.relationshipTotals.set(collectRelationshipTotals(detail));
          this.renderRelationshipPage(profile, true);
          this.isAiLoading.set(false);
          this.askAi(question);
        },
        error: () => {
          this.isAiLoading.set(false);
          this.aiErrorMessage.set('No fue posible consultar el detalle de búsqueda. Inténtalo nuevamente; no se generó una respuesta incompleta.');
        }
      });
      return;
    }

    const requestId = ++this.aiRequestSequence;
    this.activeAiRequestId = requestId;

    const selectedNode = this.selectedNodeContext();
    const graph = this.currentAiGraphPayload();
    const history = this.currentChatHistory();
    const thinking = this.aiThinkingEnabled();
    const userMessage = this.createAiMessage('user', question);
    const assistantMessage = this.createAiMessage('assistant', '', {
      streaming: true,
      mode: 'local-llm',
      thinking
    });

    this.aiView.set('chat');
    this.aiCopiedMessageId.set(null);
    this.aiSelectedEvidenceMessageId.set(null);
    this.aiMessages.update((messages) => [...messages, userMessage, assistantMessage]);
    this.aiQuestion.set('');
    this.resetAiComposerHeight();
    this.isAiLoading.set(true);
    this.aiErrorMessage.set(null);
    this.scrollAiChatToBottom();

    // Para listados y relaciones explícitas, respondemos desde los 2 endpoints
    // ya consultados, sin el truncamiento del fast-path del backend (12 vehículos).
    const factualAnswer = this.aiSourceDetail()
      ? answerGraphFacts(question, this.aiSourceDetail()!, history)
      : null;
    if (factualAnswer) {
      this.updateAiMessage(assistantMessage.id, (message) => ({
        ...message,
        text: factualAnswer.text,
        evidence: factualAnswer.evidence,
        disclaimer: factualAnswer.disclaimer,
        streaming: false,
        mode: 'deterministic-fallback',
        thinking: false
      }));
      this.aiAnswer.set(factualAnswer);
      this.isAiLoading.set(false);
      this.scrollAiChatToBottom();
      return;
    }

    this.aiChatSubscription?.unsubscribe();
    // El análisis detallado debe llegar al modo generativo cuando la pregunta
    // exige comparar o interpretar fuentes; 'auto' puede priorizar resúmenes rápidos.
    const requiresDetailedAnalysis = thinking && /\b(analiza|analisis|compara|comparacion|evalua|diferencias|inconsistencias|hipotesis|riesgos|recomendaciones|conclusiones|hallazgos|respaldo|explica|porque)\b/.test(normalizeSearchText(question));
    this.aiChatSubscription = this.intelligenceApi
      .streamChat(profile, question, history, thinking, selectedNode, graph, requiresDetailedAnalysis ? 'deep' : 'auto')
      .subscribe({
        next: (event) => {
          if (requestId !== this.activeAiRequestId) {
            return;
          }

          if (event.type === 'meta') {
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              mode: event.mode,
              model: event.model ?? null,
              thinking: event.thinking ?? message.thinking
            }));
            this.aiServiceStatus.set(event.mode === 'local-llm' ? 'online' : 'fallback');
          }

          if (event.type === 'reasoning_delta') {
            // Compatibilidad con APIs anteriores: el razonamiento interno nunca se pinta.
            // El usuario sólo ve el estado genérico de "Razonando…" hasta que llega la respuesta final.
          }

          if (event.type === 'delta') {
            const deltaText = this.coerceAiText(event.text);
            if (deltaText) {
              this.updateAiMessage(assistantMessage.id, (message) => ({
                ...message,
                text: this.coerceAiText(message.text) + deltaText
              }));
            }
          }

          if (event.type === 'replace') {
            // El modo directo puede haber mostrado una salida provisional. Si la API
            // detecta idioma incorrecto o truncamiento, la sustituye de forma atómica
            // por la respuesta final validada en español.
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              text: this.coerceAiText(event.text),
              mode: event.mode,
              model: event.model ?? null,
              thinking: event.thinking ?? message.thinking
            }));
            this.aiServiceStatus.set(event.mode === 'local-llm' ? 'online' : 'fallback');
          }

          if (event.type === 'done') {
            const finalText = this.coerceAiText(event.text).trim();
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              text: finalText || this.coerceAiText(message.text),
              streaming: false,
              evidence: this.normalizeAiEvidence(event.evidence),
              disclaimer: event.disclaimer ?? null,
              mode: event.mode,
              model: event.model ?? null,
              thinking: event.thinking ?? message.thinking
            }));

            let completed = this.aiMessages().find((message) => message.id === assistantMessage.id);
            if (!this.coerceAiText(completed?.text).trim()) {
              const fallback = this.profileIntelligence.answer(question, profile, selectedNode, graph);
              this.updateAiMessage(assistantMessage.id, (message) => ({
                ...message,
                text: fallback.text,
                evidence: fallback.evidence,
                disclaimer: fallback.disclaimer,
                streaming: false,
                mode: 'deterministic-fallback',
                model: null,
                thinking: false
              }));
              completed = this.aiMessages().find((message) => message.id === assistantMessage.id);
              this.aiServiceStatus.set('fallback');
            } else {
              this.aiServiceStatus.set(event.mode === 'local-llm' ? 'online' : 'fallback');
            }

            if (completed && this.coerceAiText(completed.text).trim()) {
              this.aiAnswer.set({
                text: this.coerceAiText(completed.text),
                evidence: completed.evidence ?? [],
                disclaimer: completed.disclaimer ?? undefined
              });
              this.aiErrorMessage.set(null);
            }

            this.isAiLoading.set(false);
          }

          if (event.type === 'error') {
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              streaming: false
            }));
            this.aiErrorMessage.set('No fue posible completar la consulta. Intenta nuevamente.');
            this.isAiLoading.set(false);
          }

          this.scrollAiChatToBottom();
        },
        error: () => {
          if (requestId !== this.activeAiRequestId) {
            return;
          }
          const fallback = this.profileIntelligence.answer(question, profile, selectedNode, graph);
          this.updateAiMessage(assistantMessage.id, (message) => ({
            ...message,
            text: fallback.text,
            evidence: fallback.evidence,
            disclaimer: fallback.disclaimer,
            streaming: false,
            mode: 'deterministic-fallback',
            model: null
          }));
          this.aiAnswer.set(fallback);
          this.aiServiceStatus.set('fallback');
          this.aiErrorMessage.set(
            'No fue posible completar el análisis en línea. Se generó un resultado con la información disponible del perfil.'
          );
          this.isAiLoading.set(false);
          this.scrollAiChatToBottom();
        },
        complete: () => {
          if (requestId !== this.activeAiRequestId) {
            return;
          }
          if (this.isAiLoading()) {
            let completed = this.aiMessages().find((message) => message.id === assistantMessage.id);
            if (!this.coerceAiText(completed?.text).trim()) {
              const fallback = this.profileIntelligence.answer(question, profile, selectedNode, graph);
              this.updateAiMessage(assistantMessage.id, (message) => ({
                ...message,
                text: fallback.text,
                evidence: fallback.evidence,
                disclaimer: fallback.disclaimer,
                streaming: false,
                mode: 'deterministic-fallback',
                model: null,
                thinking: false
              }));
              this.aiAnswer.set(fallback);
              this.aiServiceStatus.set('fallback');
              this.aiErrorMessage.set(null);
            } else {
              this.updateAiMessage(assistantMessage.id, (message) => ({
                ...message,
                text: this.coerceAiText(message.text),
                streaming: false
              }));
            }
            this.isAiLoading.set(false);
          }
          this.aiChatSubscription = undefined;
          this.scrollAiChatToBottom();
        }
      });
  }


  toggleAiThinking(): void {
    if (this.isAiLoading()) {
      return;
    }
    this.aiThinkingEnabled.update((enabled) => !enabled);
  }

  stopAiGeneration(): void {
    if (!this.isAiLoading()) {
      return;
    }
    this.activeAiRequestId = ++this.aiRequestSequence;
    this.aiChatSubscription?.unsubscribe();
    this.aiChatSubscription = undefined;
    this.aiMessages.update((messages) =>
      messages.map((message) =>
        message.streaming
          ? {
              ...message,
              streaming: false,
              text: message.text || 'Consulta detenida por el usuario.'
            }
          : message
      )
    );
    this.isAiLoading.set(false);
  }

  clearAiConversation(): void {
    this.activeAiRequestId = ++this.aiRequestSequence;
    this.aiChatSubscription?.unsubscribe();
    this.aiChatSubscription = undefined;
    this.aiQuestion.set('');
    this.aiErrorMessage.set(null);
    this.isAiLoading.set(false);
    this.aiMessages.set([]);
    this.aiAnswer.set(null);
    this.aiView.set('home');
    this.aiCopiedMessageId.set(null);
    this.aiSelectedEvidenceMessageId.set(null);
    this.aiEvidenceSearch.set('');
    this.resetAiComposerHeight();
    this.focusAiComposer();
  }

  private resetAiComposerHeight(): void {
    setTimeout(() => {
      const element = this.aiComposer?.nativeElement;
      if (element) {
        element.style.height = '44px';
      }
    });
  }

  private focusAiComposer(): void {
    setTimeout(() => this.aiComposer?.nativeElement.focus());
  }

  private currentChatHistory(): IntelligenceChatHistoryMessage[] {
    return this.aiMessages()
      .filter((message) => !message.streaming && this.coerceAiText(message.text).trim().length > 0)
      .slice(-8)
      // Las respuestas con 32+ vehículos ya están respaldadas en el contexto del grafo:
      // no reenviar miles de tokens repetidos a un LLM que corre en CPU.
      .map((message) => ({
        role: message.role,
        content: this.coerceAiText(message.text).slice(0, message.role === 'assistant' ? 1000 : 1400)
      }));
  }

  private coerceAiText(value: unknown): string {
    return typeof value === 'string' ? value : value == null ? '' : String(value);
  }

  /** HTML seguro (Angular lo sanitiza al enlazarlo) y Markdown básico legible. */
  formatAiResponseText(value: string): string {
    const clean = this.coerceAiText(value)
      .replace(/&#x20;|&#32;|&nbsp;/gi, ' ')
      .replace(/\\([*_`#.\-])/g, '$1')
      .replace(/\u00a0/g, ' ');
    const escaped = clean
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return escaped
      .replace(/\*\*([^\n*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\n)#{1,4}\s+([^\n]+)/g, '$1<strong>$2</strong>')
      .replace(/(^|\n)\s*[-*]\s+/g, '$1• ');
  }

  private normalizeAiEvidence(value: unknown): IntelligenceEvidence[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item, index) => {
      const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      const path = this.coerceAiText(raw['path']);
      const section = this.coerceAiText(raw['section']);
      const kindRaw = this.coerceAiText(raw['kind']);
      const validKinds = new Set(['profile', 'data', 'address', 'origin', 'node', 'relation']);
      const kind = (validKinds.has(kindRaw) ? kindRaw :
        section === 'addresses' ? 'address' :
        section === 'sources' ? 'origin' :
        section === 'relations' ? 'relation' :
        section === 'vehicles' || section === 'weapons' ? 'node' :
        'data') as IntelligenceEvidence['kind'];

      const sourceCodes = Array.isArray(raw['sourceCodes'])
        ? (raw['sourceCodes'] as unknown[]).map((source) => this.coerceAiText(source)).filter(Boolean)
        : [];

      return {
        kind,
        id: this.coerceAiText(raw['id']) || path || `evidence-${index}`,
        label: this.coerceAiText(raw['label']) || section || path || `Evidencia ${index + 1}`,
        value: this.coerceAiText(raw['value']),
        sourceCodes
      };
    });
  }

  private createAiMessage(
    role: 'user' | 'assistant',
    text: string,
    options: Partial<Omit<AiChatMessage, 'id' | 'role' | 'text'>> = {}
  ): AiChatMessage {
    this.aiMessageSequence += 1;
    return {
      id: `ai-message-${this.aiMessageSequence}`,
      role,
      text,
      evidence: [],
      streaming: false,
      ...options
    };
  }

  private updateAiMessage(
    messageId: string,
    updater: (message: AiChatMessage) => AiChatMessage
  ): void {
    this.aiMessages.update((messages) =>
      messages.map((message) => (message.id === messageId ? updater(message) : message))
    );
  }

  private scrollAiChatToBottom(): void {
    setTimeout(() => {
      const element = this.aiChatViewport?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  private refreshLocalLlmHealth(): void {
    this.intelligenceApi.checkLlmHealth().subscribe({
      next: (health) => {
        const ready = health.runtimeReachable && health.modelAvailable && health.status === 'ok';
        this.aiServiceStatus.set(ready ? 'online' : 'fallback');
        if (ready) {
          this.aiErrorMessage.set(null);
        }
      },
      error: () => {
        this.aiServiceStatus.set('fallback');
      }
    });
  }

  private currentAiGraphPayload(): IntelligenceGraphPayload {
    const detail = this.aiSourceDetail();
    if (detail) {
      // No limitar el contexto a la página/filtro visible del SVG.
      // Para grafos masivos se acota a 120 relaciones; los listados completos
      // se resuelven por separado con el catálogo original sin esa cota.
      const root = this.rootNode();
      const related = compactGraphFacts(detail);
      return {
        nodes: [
          { id: root.id, type: this.getNodeTypeLabel(root.type), title: root.title, subtitle: root.subtitle, details: root.details.slice(0, 8) },
          ...related
        ],
        links: related.map((node) => ({ id: `ia-${node.id}`, sourceId: root.id, targetId: node.id })),
        selectedNodeId: this.selectedNodeId()
      };
    }
    return {
      nodes: this.nodes().map((node) => ({
        id: node.id,
        type: this.getNodeTypeLabel(node.type),
        title: node.title,
        subtitle: node.subtitle,
        details: node.details
      })),
      links: this.links().map((link) => ({ id: link.id, sourceId: link.sourceId, targetId: link.targetId })),
      selectedNodeId: this.selectedNodeId()
    };
  }

  private selectedNodeContext() {
    const selected = this.selectedNode();
    return {
      id: selected.id,
      type: this.getNodeTypeLabel(selected.type),
      title: selected.title,
      subtitle: selected.subtitle,
      details: selected.details
    };
  }

  getIntroLinkDelay(index: number): number {
    const linkCount = Math.max(
      1,
      Math.min(this.visibleLinks().length, this.individualAnimationLimit)
    );
    const firstTraceMs = 320;
    const traceWindowMs = 900;

    if (linkCount === 1) {
      return firstTraceMs;
    }

    return (
      firstTraceMs +
      Math.round((Math.min(index, linkCount - 1) * traceWindowMs) / (linkCount - 1))
    );
  }

  getIntroNodeDelay(node: GraphNode): number {
    const rootId = this.nodes()[0]?.id;

    if (node.id === rootId) {
      return 120;
    }

    const linkIndex = this.visibleLinks().findIndex(
      (link) =>
        (link.sourceId === rootId && link.targetId === node.id) ||
        (link.targetId === rootId && link.sourceId === node.id)
    );

    return linkIndex >= 0 ? this.getIntroLinkDelay(linkIndex) + 650 : 960;
  }

  goBack(): void {
    this.router.navigateByUrl('/lineas-investigacion');
  }

  selectNode(nodeId: string, event?: Event): void {
    event?.stopPropagation();

    if (event instanceof KeyboardEvent && event.key === ' ') {
      event.preventDefault();
    }

    if (this.suppressNodeClick) {
      return;
    }

    this.selectedNodeId.set(nodeId);
    this.pivotError.set(null);
    this.pivotExpansionError.set(null);
    const rootId = this.rootNode().id;
    const connectedLink = nodeId === rootId
      ? undefined
      : this.links().find((link) => link.targetId === nodeId);
    this.selectedLinkId.set(connectedLink?.id ?? null);
    this.detailPanelOpen.set(true);
    const records = this.selectedConsolidations();
    const expandNext = (index: number): void => {
      const record = records[index];
      if (record) this.expandPivotProfile(record, false, () => expandNext(index + 1));
    };
    expandNext(0);
  }

  selectLink(linkId: string, event?: Event): void {
    event?.stopPropagation();
    if (this.suppressNodeClick) {
      return;
    }

    const link = this.links().find((candidate) => candidate.id === linkId);
    if (!link) {
      return;
    }

    const rootId = this.rootNode().id;
    const relatedNodeId = link.sourceId === rootId
      ? link.targetId
      : link.targetId === rootId
        ? link.sourceId
        : link.targetId;

    this.selectedLinkId.set(link.id);
    this.selectedNodeId.set(relatedNodeId);
    this.expandedLinkType.set(link.type);
    this.pivotError.set(null);
    this.detailPanelOpen.set(true);
  }

  showRelatedNodes(type: GraphNodeType): void {
    const nextType: GraphRelationshipView = this.relationshipViewType() === type ? 'all' : type;
    this.setRelationshipView(nextType);
    this.detailPanelOpen.set(true);
  }

  selectRelatedNode(nodeId: string): void {
    this.selectNode(nodeId);
  }

  toggleDetailPanel(): void {
    this.detailPanelOpen.update((value) => !value);
  }

  toggleFilter(type: GraphNodeType): void {
    this.activeFilters.update((filters) => {
      const nextFilters = { ...filters, [type]: !filters[type] };
      if (!Object.values(nextFilters).some(Boolean)) {
        return filters;
      }

      const selectedNode = this.selectedNode();
      const rootId = this.nodes()[0]?.id;
      if (selectedNode.id !== rootId && !nextFilters[selectedNode.type]) {
        const nextNode = this.nodes().find(
          (node) => node.id === rootId || nextFilters[node.type]
        );
        if (nextNode) {
          this.selectedNodeId.set(nextNode.id);
          this.selectedLinkId.set(null);
        }
      }

      return nextFilters;
    });
    this.resetZoom();
  }

  previousAddressPage(): void {
    this.addressPageIndex.update((index) =>
      index <= 0 ? this.addressPageCount() - 1 : index - 1
    );
  }

  nextAddressPage(): void {
    this.addressPageIndex.update((index) =>
      index >= this.addressPageCount() - 1 ? 0 : index + 1
    );
  }

  zoomIn(): void {
    this.zoom.update((value) => Math.min(1.55, Number((value + 0.1).toFixed(2))));
  }

  zoomOut(): void {
    this.zoom.update((value) => Math.max(0.15, Number((value - 0.1).toFixed(2))));
  }

  /** Centra y encuadra TODOS los nodos actualmente visibles. */
  resetZoom(): void {
    const nodes = this.visibleNodes();
    if (!nodes.length) {
      this.zoom.set(1);
      this.panX.set(0);
      this.panY.set(0);
      return;
    }
    const minX = Math.min(...nodes.map(node => node.x - node.radius - 36));
    const maxX = Math.max(...nodes.map(node => node.x + node.radius + 36));
    const minY = Math.min(...nodes.map(node => node.y - node.radius - 48));
    const maxY = Math.max(...nodes.map(node => node.y + node.radius + 48));
    const scale = clamp(Math.min(
      1.2, (this.viewBoxWidth - 56) / Math.max(1, maxX - minX),
      (this.viewBoxHeight - 56) / Math.max(1, maxY - minY)
    ), 0.15, 1.2);
    this.zoom.set(Number(scale.toFixed(3)));
    this.panX.set(this.viewBoxWidth / 2 - (minX + maxX) / 2 * scale);
    this.panY.set(this.viewBoxHeight / 2 - (minY + maxY) / 2 * scale);
  }

  onGraphPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const svg = event.currentTarget as SVGSVGElement;
    this.dragging.set(true);
    this.pointerMoved = false;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;
    this.dragStartPanX = this.panX();
    this.dragStartPanY = this.panY();
    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  onGraphPointerMove(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }

    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const deltaClientX = event.clientX - this.dragStartClientX;
    const deltaClientY = event.clientY - this.dragStartClientY;

    if (Math.abs(deltaClientX) > 3 || Math.abs(deltaClientY) > 3) {
      this.pointerMoved = true;
    }

    const deltaSvgX = (deltaClientX / rect.width) * this.viewBoxWidth;
    const deltaSvgY = (deltaClientY / rect.height) * this.viewBoxHeight;
    const zoomFactor = this.zoom();

    this.panX.set(this.dragStartPanX + deltaSvgX / zoomFactor);
    this.panY.set(this.dragStartPanY + deltaSvgY / zoomFactor);
  }

  onGraphPointerUp(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }

    const svg = event.currentTarget as SVGSVGElement;
    this.dragging.set(false);

    if (this.pointerMoved) {
      this.suppressNodeClick = true;
      setTimeout(() => {
        this.suppressNodeClick = false;
      });
    }

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
  }

  onGraphWheel(event: WheelEvent): void {
    event.preventDefault();
    event.deltaY < 0 ? this.zoomIn() : this.zoomOut();
  }

  isFilterActive(type: GraphNodeType): boolean {
    return this.activeFilters()[type];
  }

  isSelected(node: GraphNode): boolean {
    return this.selectedNodeId() === node.id;
  }

  isConnectedToSelected(node: GraphNode): boolean {
    const selectedId = this.selectedNodeId();
    if (node.id === selectedId) {
      return true;
    }

    return this.links().some(
      (link) =>
        (link.sourceId === selectedId && link.targetId === node.id) ||
        (link.targetId === selectedId && link.sourceId === node.id)
    );
  }

  getNodeOpacity(node: GraphNode): number {
    return this.isConnectedToSelected(node) ? 1 : 0.42;
  }

  isLinkSelected(link: GraphLink): boolean {
    return this.selectedLinkId() === link.id;
  }

  getLinkOpacity(link: GraphLink): number {
    if (this.isLinkSelected(link)) {
      return 1;
    }
    const selectedId = this.selectedNodeId();
    return link.sourceId === selectedId || link.targetId === selectedId ? 0.5 : 0.13;
  }

  getLinkStrokeWidth(link: GraphLink): number {
    if (this.isLinkSelected(link)) {
      return 4;
    }
    const selectedId = this.selectedNodeId();
    return link.sourceId === selectedId || link.targetId === selectedId ? 2.2 : 1.2;
  }

  getLinkSourceTitle(link: GraphLink): string {
    return this.getNodeById(link.sourceId).title;
  }

  getLinkTargetTitle(link: GraphLink): string {
    return this.getNodeById(link.targetId).title;
  }

  getNodeColor(type: GraphNodeType): string {
    switch (type) {
      case 'person':
        return '#FCB025';
      case 'vehicle':
        return '#8B3086';
      case 'weapon':
        return '#3E8C22';
      default:
        return '#99A8BE';
    }
  }

  getNodeTypeLabel(type: GraphNodeType): string {
    switch (type) {
      case 'person':
        return 'Persona';
      case 'vehicle':
        return 'Vehículo';
      case 'weapon':
        return 'Arma';
      default:
        return 'Entidad';
    }
  }

  getNodeById(nodeId: string): GraphNode {
    return this.nodeIndex().get(nodeId) ?? this.nodes()[0] ?? createPlaceholderNode('profile', 'Perfil');
  }

  getNodeDetailBackground(type: GraphNodeType): string {
    return this.hexToRgba(this.getNodeColor(type), 0.13);
  }

  getNodeDetailBorder(type: GraphNodeType): string {
    return `1.5px solid ${this.hexToRgba(this.getNodeColor(type), 0.33)}`;
  }

  getSoftBackground(type: GraphNodeType): string {
    return this.hexToRgba(this.getNodeColor(type), 0.08);
  }

  getSoftBorder(type: GraphNodeType): string {
    return `1px solid ${this.hexToRgba(this.getNodeColor(type), 0.25)}`;
  }

  getGlowColor(type: GraphNodeType): string {
    return this.hexToRgba(this.getNodeColor(type), 0.55);
  }

  private setGraphError(message: string): void {
    this.errorMessage.set(message);
    this.loadedProfile.set(null);
    this.aiSnapshot.set(null);
    this.aiAnswer.set(null);
    this.aiMessages.set([]);
    this.aiServiceStatus.set('fallback');
    this.nodes.set([createPlaceholderNode(this.profileId || 'profile', 'No fue posible cargar el perfil', message)]);
    this.links.set([]);
    this.addresses.set([]);
    this.addressPageIndex.set(0);
    this.relationshipCatalog.set([]);
    this.relationshipTotals.set({ persons: 0, vehicles: 0, weapons: 0 });
    this.relationshipViewType.set('all');
    this.relationshipQuery.set('');
    this.relationshipPageIndex.set(0);
    this.pivotError.set(null);
    this.expandedPivotBranches.set([]);
    this.pivotExpansionError.set(null);
    this.selectedNodeId.set(this.profileId || 'profile');
    this.selectedLinkId.set(null);
    this.expandedLinkType.set(null);
  }

  private restartIntroAnimation(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }

    this.introAnimating.set(true);
    this.introTimer = setTimeout(() => this.introAnimating.set(false), this.introDurationMs);
  }

  private resolveIntroMode(linkCount: number): IntroAnimationMode {
    if (linkCount <= this.individualAnimationLimit) {
      return 'individual';
    }
    if (linkCount <= this.waveAnimationLimit) {
      return 'wave';
    }
    return 'global';
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalizedHex = hex.replace('#', '');
    const red = parseInt(normalizedHex.substring(0, 2), 16);
    const green = parseInt(normalizedHex.substring(2, 4), 16);
    const blue = parseInt(normalizedHex.substring(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}

function mapProfileToGraph(
  profile: ConsolidatedProfileResponse,
  relationItems: GraphRelationEntry[] = [],
  reportedCounts?: GraphNodeLinks,
  rootTypeHint?: GraphNodeType
): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const positions = createRelatedPositions(relationItems.length);
  const rootType = rootTypeHint ?? resolveConsolidatedRootType(profile);
  const profileTitle = resolveProfileTitle(profile, rootType);
  const rootDetails = (profile.data ?? [])
    .filter((datum) => datum.value?.trim())
    .map((datum) => ({
      label: humanizeCode(datum.code || datum.dataType || 'Dato'),
      value: datum.value!.trim()
    }));

  if (!rootDetails.length) {
    rootDetails.push(
      { label: 'Versión', value: String(profile.versionNumber) },
      { label: 'Fecha efectiva', value: formatDateTime(profile.effectiveAtUtc) }
    );
  }

  const counts = reportedCounts ?? relationItems.reduce(
    (acc, relation) => {
      if (relation.type === 'person') acc.persons += 1;
      if (relation.type === 'vehicle') acc.vehicles += 1;
      if (relation.type === 'weapon') acc.weapons += 1;
      return acc;
    },
    { persons: 0, vehicles: 0, weapons: 0 }
  );

  const nodes: GraphNode[] = [
    {
      id: profile.profileId,
      type: rootType,
      title: profileTitle,
      subtitle:
        findDataValue(profile, rootType === 'vehicle' ? ['VIN', 'NIV', 'PLACA', 'PLACAS'] : ['CURP', 'RFC', 'CUIP']) || `Versión ${profile.versionNumber}`,
      x: ROOT_X,
      y: ROOT_Y,
      radius: 35,
      identityKeys: graphIdentityKeys(rootType, profile.data ?? []),
      details: rootDetails,
      links: counts
    }
  ];

  const links: GraphLink[] = [];

  relationItems.forEach((relation, index) => {
    const position = positions[index] ?? { x: ROOT_X, y: ROOT_Y };
    const nodeId = `relation-${relation.type}-${relation.item.linkId || index}`;
    const details = buildRelationDetails(relation.item, relation.type);

    nodes.push({
      id: nodeId,
      type: relation.type,
      title: resolveRelationTitle(relation.item, relation.type, index),
      subtitle: resolveRelationIdentifier(relation.item, relation.type),
      x: position.x,
      y: position.y,
      radius: relation.type === 'person' ? 29 : 27,
      identityKeys: graphIdentityKeys(relation.type, [...(relation.item.identifiers ?? []), ...(relation.item.attributes ?? [])]),
      details,
      links: { persons: 0, vehicles: 0, weapons: 0 }
    });

    links.push({
      id: `profile-link-${relation.item.linkId || index}`,
      sourceId: profile.profileId,
      targetId: nodeId,
      type: relation.type,
      label: humanizeRelationship(relation.item.relationshipCode),
      externalId: relation.item.linkId || `vinculo-${index + 1}`,
      status: relation.item.status?.trim() || 'Sin estatus informado',
      details: buildLinkDetails(relation.item, relation.type),
      sourceNames: Array.from(new Set(
        (relation.item.origins ?? [])
          .map((origin) => origin.sourceName?.trim() || origin.sourceCode?.trim() || '')
          .filter(Boolean)
      )),
      searchId: profile.searchId?.trim() || undefined,
      resultId: profile.preconsolidatedResultId?.trim() || undefined
    });
  });

  return { nodes, links };
}

function collectGraphRelations(detail?: SearchResultDetailResponse | null): GraphRelationEntry[] {
  if (!detail?.linkGroups?.length) {
    return [];
  }

  return detail.linkGroups.flatMap((group) => {
    const type = resolveGraphNodeType(group.entityType);
    if (!type) {
      return [];
    }

    return (group.items ?? []).map((item) => ({ type, item }));
  });
}

function collectRelationshipTotals(detail?: SearchResultDetailResponse | null): GraphNodeLinks {
  const totals: GraphNodeLinks = { persons: 0, vehicles: 0, weapons: 0 };

  for (const group of detail?.linkGroups ?? []) {
    const type = resolveGraphNodeType(group.entityType);
    if (!type) {
      continue;
    }

    const count = Math.max(0, Number(group.count ?? group.items?.length ?? 0));
    if (type === 'person') totals.persons += count;
    if (type === 'vehicle') totals.vehicles += count;
    if (type === 'weapon') totals.weapons += count;
  }

  return totals;
}

function relationSearchText(relation: GraphRelationEntry): string {
  const item = relation.item;
  const values = [
    relation.type,
    item.linkId,
    item.status,
    item.relationshipCode,
    item.placa,
    item.plate,
    item.licensePlate,
    item.plateNumber,
    ...(item.identifiers ?? []).flatMap((entry) => [entry.code, entry.value]),
    ...(item.attributes ?? []).flatMap((entry) => [entry.code, entry.value]),
    ...(item.origins ?? []).flatMap((origin) => [origin.sourceCode, origin.sourceName, origin.sourceRecordId])
  ];

  return normalizeSearchText(values.filter(Boolean).join(' '));
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .trim();
}

function resolveGraphNodeType(entityType?: string | null): GraphNodeType | null {
  const normalized = normalizeCode(entityType ?? '');
  if (/(PERSON|PERSONA)/.test(normalized)) return 'person';
  if (/(VEHICLE|VEHICULO|AUTO|AUTOMOVIL|CARRO)/.test(normalized)) return 'vehicle';
  if (/(WEAPON|ARMA|FIREARM)/.test(normalized)) return 'weapon';
  return null;
}

function buildRelationDetails(item: SearchResultLinkItemDto, type: GraphNodeType): GraphNodeDetail[] {
  const evidence = [...(item.identifiers ?? []), ...(item.attributes ?? [])];
  const details = evidence
    .filter((entry) => entry.value?.trim())
    .slice(0, 10)
    .map((entry) => ({
      label: humanizeCode(entry.code || 'Dato'),
      value: entry.value!.trim()
    }));

  if (type === 'vehicle') {
    const plate = resolveRelationValue(item, ['PLACA', 'PLACAS', 'PLATE', 'PLATENUMBER', 'LICENSEPLATE']);
    if (plate && !details.some((detail) => normalizeCode(detail.label) === 'PLACA')) {
      details.unshift({ label: 'Placa', value: plate });
    }
  }

  const relationship = humanizeRelationship(item.relationshipCode);
  if (relationship !== 'Vínculo relacionado') {
    details.push({ label: 'Relación', value: relationship });
  }

  return details.length ? details : [{ label: 'Vínculo', value: relationship }];
}

function buildLinkDetails(item: SearchResultLinkItemDto, type: GraphNodeType): GraphNodeDetail[] {
  const details: GraphNodeDetail[] = [];
  if (item.linkId?.trim()) {
    // Identificador interno reservado para operaciones, no para la vista.
  }
  if (item.status?.trim()) {
    details.push({ label: 'Estado', value: item.status.trim().toLowerCase() === 'independent' ? 'Independiente' : item.status.trim() });
  }

  const relationship = humanizeRelationship(item.relationshipCode);
  details.push({ label: 'Tipo de relación', value: relationship });

  const entityDetails = buildRelationDetails(item, type)
    .filter((detail) => !/(?:^|\s)(?:ID|LINKEDID|TYPEID)(?:$|\s)/i.test(detail.label) && !/REPORTE\s*ROBO\s*ID/i.test(detail.label) && normalizeCode(detail.label) !== 'RELACION')
    .slice(0, 8);
  details.push(...entityDetails);

  return details;
}

function resolveRelationTitle(item: SearchResultLinkItemDto, type: GraphNodeType, index: number): string {
  if (type === 'person') {
    const fullName = resolveRelationValue(item, ['NOMBRECOMPLETO', 'FULLNAME', 'NAME']);
    const nameParts = [
      resolveRelationValue(item, ['NOMBRE', 'NOMBRES', 'FIRSTNAME']),
      resolveRelationValue(item, ['APELLIDOPATERNO', 'LASTNAME', 'SURNAME']),
      resolveRelationValue(item, ['APELLIDOMATERNO', 'SECONDLASTNAME'])
    ].filter(Boolean);
    return fullName || nameParts.join(' ') || `Persona vinculada ${index + 1}`;
  }

  if (type === 'vehicle') {
    const make = resolveRelationValue(item, ['MARCA', 'MAKE']);
    const model = resolveRelationValue(item, ['MODELO', 'MODEL']);
    return [make, model].filter(Boolean).join(' ') || 'Vehículo vinculado';
  }

  return resolveRelationValue(item, ['TIPODEARMA', 'TIPOARMA', 'WEAPONTYPE', 'MARCA']) || 'Arma vinculada';
}

function resolveRelationIdentifier(item: SearchResultLinkItemDto, type: GraphNodeType): string {
  if (type === 'vehicle') {
    const vin = resolveRelationValue(item, ['VIN', 'NIV']);
    const plate = resolveRelationValue(item, ['PLACA', 'PLACAS', 'PLATE', 'PLATENUMBER', 'LICENSEPLATE']);
    if (vin) return `VIN/NIV: ${vin}`;
    if (plate) return `Placa: ${plate}`;
    return 'Vehículo sin VIN/NIV o placa disponible';
  }

  if (type === 'weapon') {
    const serial = resolveRelationValue(item, ['SERIE', 'SERIALNUMBER', 'MATRICULA', 'REGISTRATIONNUMBER']);
    return serial ? `Serie: ${serial}` : 'Arma sin serie disponible';
  }

  const personId = resolveRelationValue(item, ['CURP', 'RFC', 'CUIP']);
  return personId || 'Persona vinculada';
}

function resolveRelationValue(item: SearchResultLinkItemDto, codes: string[]): string {
  const wanted = new Set(codes.map(normalizeCode));
  const evidence = [...(item.identifiers ?? []), ...(item.attributes ?? [])];
  const match = evidence.find((entry) => wanted.has(normalizeCode(entry.code ?? '')) && entry.value?.trim());
  if (match?.value?.trim()) {
    return match.value.trim();
  }

  if (wanted.has('PLACA') || wanted.has('PLATE') || wanted.has('LICENSEPLATE')) {
    return [item.placa, item.plate, item.licensePlate, item.plateNumber].find((value) => value?.trim())?.trim() || '';
  }

  return '';
}

function humanizeRelationship(value?: string | null): string {
  const normalized = value?.trim();
  return normalized ? humanizeCode(normalized) : 'Vínculo relacionado';
}

function createRelatedPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  let placed = 0;
  let ring = 0;

  while (placed < count) {
    const capacity = Math.min(count - placed, 8 + ring * 4);
    const radiusX = 360 + ring * 220;
    const radiusY = 300 + ring * 190;

    for (let index = 0; index < capacity; index += 1) {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / capacity;
      positions.push({
        x: ROOT_X + Math.cos(angle) * radiusX,
        y: ROOT_Y + Math.sin(angle) * radiusY
      });
    }

    placed += capacity;
    ring += 1;
  }

  return positions;
}

function mapAddressesForPanel(addresses: ConsolidatedProfileAddressDto[]): GraphAddressViewModel[] {
  return addresses.map((address, index) => ({
    id: address.addressId,
    title: address.type?.trim() || `Dirección ${index + 1}`,
    label: formatAddressLabel(address),
    sourceNames: Array.from(
      new Set(
        (address.origins ?? []).map((origin, originIndex) =>
          sourceDisplayName(origin.sourceCode?.trim() || '', originIndex)
        )
      )
    ),
    details: addressDetails(address).filter((detail) => detail.value !== '—')
  }));
}

function sourceDisplayName(sourceCode: string, index = 0): string {
  switch (normalizeCode(sourceCode)) {
    case 'REPUVE':
    case 'VEHICLE':
    case 'VEHICLES':
      return 'Vehículos';
    case 'WEAPON':
    case 'WEAPONS':
      return 'Armas';
    default:
      return sourceCode || `Fuente ${index + 1}`;
  }
}

function addressDetails(address: ConsolidatedProfileAddressDto): GraphNodeDetail[] {
  return [
    { label: 'Calle', value: address.street?.trim() || '—' },
    { label: 'Núm. exterior', value: address.exteriorNumber?.trim() || '—' },
    { label: 'Núm. interior', value: address.interiorNumber?.trim() || '—' },
    { label: 'Colonia', value: address.neighborhood?.trim() || '—' },
    { label: 'Municipio', value: address.municipality?.trim() || '—' },
    { label: 'Estado', value: address.state?.trim() || '—' },
    { label: 'Código postal', value: address.postalCode?.trim() || '—' }
  ];
}

function formatAddressLabel(address: ConsolidatedProfileAddressDto): string {
  const street = [address.street?.trim(), address.exteriorNumber?.trim()].filter(Boolean).join(' ');
  return [street, address.neighborhood?.trim(), address.municipality?.trim(), address.state?.trim()]
    .filter(Boolean)
    .join(', ') || 'Dirección consolidada';
}

/** ConsolidatedProfileResponse no declara entityType: inferir solo por evidencias
 * de identidad del perfil, no por la presencia de vínculos con vehículos. */
function resolveConsolidatedRootType(profile: ConsolidatedProfileResponse): GraphNodeType {
  const version = normalizeCode(profile.contractVersion ?? '');
  if (version.includes('VEHICLE')) return 'vehicle';
  if (version.includes('PERSON')) return 'person';
  if (findDataValue(profile, ['CURP', 'RFC', 'CUIP'])) return 'person';
  if (findDataValue(profile, ['VIN', 'NIV', 'PLACA', 'PLACAS', 'LICENSEPLATE'])) return 'vehicle';
  return 'person'; // Tipo no confirmado por el contrato; compatibilidad existente.
}

function resolveProfileTitle(profile: ConsolidatedProfileResponse, rootType = resolveConsolidatedRootType(profile)): string {
  if (rootType === 'vehicle') {
    const brand = findDataValue(profile, ['MARCA', 'MAKE']);
    const model = findDataValue(profile, ['MODELO', 'MODEL']);
    return [brand, model].filter(Boolean).join(' ') || findDataValue(profile, ['PLACA', 'VIN', 'NIV']) || `Vehículo ${profile.profileId.slice(0, 8)}`;
  }

  const directName = findDataValue(profile, ['NOMBRECOMPLETO', 'FULLNAME']);
  if (directName) {
    return directName;
  }

  const firstName = findDataValue(profile, ['NOMBRE', 'NOMBRES', 'NAME', 'FIRSTNAME']);
  const paternal = findDataValue(profile, ['APELLIDOPATERNO', 'PRIMERAPELLIDO', 'LASTNAME', 'SURNAME']);
  const maternal = findDataValue(profile, ['APELLIDOMATERNO', 'SEGUNDOAPELLIDO', 'SECONDLASTNAME', 'MOTHERSLASTNAME']);
  const name = [firstName, paternal, maternal].filter(Boolean).join(' ').trim();
  return name || findDataValue(profile, ['CURP', 'RFC', 'CUIP']) || `Perfil ${profile.profileId.slice(0, 8)}`;
}

function findDataValue(profile: ConsolidatedProfileResponse, codes: string[]): string {
  const wanted = new Set(codes.map(normalizeCode));
  return (
    (profile.data ?? []).find((datum) => {
      const path = (datum.code ?? '').replace(/\[[\"']?([^\]\"']+)[\"']?\]/g, '.$1');
      const leaf = path.split(/[./\\:]+/).filter(Boolean).at(-1) ?? '';
      return wanted.has(normalizeCode(leaf));
    })?.value?.trim() ??
    ''
  );
}

function normalizeCode(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function humanizeCode(value: string): string {
  const compact = value.trim();
  if (!compact) {
    return 'Dato';
  }

  return compact
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLocaleLowerCase('es-MX')
    .replace(/^./, (character) => character.toLocaleUpperCase('es-MX'));
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!timestamp) {
    return value || '—';
  }
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function createPlaceholderNode(id: string, title: string, message = 'Consultando datos del perfil...'): GraphNode {
  return {
    id,
    type: 'person',
    title,
    subtitle: '',
    x: ROOT_X,
    y: ROOT_Y,
    radius: 35,
    details: [{ label: 'Estado', value: message }],
    links: { persons: 0, vehicles: 0, weapons: 0 }
  };
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return 'Tu sesión venció. Inicia sesión nuevamente.';
  }
  if (error instanceof HttpErrorResponse && error.status === 403) {
    return 'No tienes permisos para consultar esta información.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Ocurrió un error inesperado al consultar el perfil consolidado.';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Only stable identifiers can merge nodes; names and placeholder labels are never identities. */
function graphIdentityKeys(type: GraphNodeType, evidence: Array<{ code?: string | null; value?: string | null }>): string[] {
  const allowed = type === 'person' ? ['CURP', 'CUIP']
    : type === 'vehicle' ? ['VIN', 'NIV'] : ['SERIE', 'SERIALNUMBER'];
  return evidence.flatMap(entry => {
    const code = normalizeCode(entry.code ?? '');
    const value = entry.value?.trim().toUpperCase();
    if (!value || !allowed.includes(code)) return [];
    const canonicalCode = code === 'NIV' ? 'VIN' : code === 'SERIALNUMBER' ? 'SERIE' : code;
    return [`${type}:${canonicalCode}:${value}`];
  });
}

/** A display-only fallback for reciprocal person links that omit stable identity fields. */
function findReturningAncestor(
  child: GraphNode, parent: GraphNode, nodes: GraphNode[], links: GraphLink[]
): GraphNode | undefined {
  if (child.type !== 'person') return undefined;
  const normalizeName = (value: string): string => value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
  const name = normalizeName(child.title ?? '');
  if (name.split(' ').length < 3 || /^PERSONA VINCULADA(?: \d+)?$/.test(name)) return undefined;
  const matches = nodes.filter(node => node.type === 'person' && normalizeName(node.title ?? '') === name);
  if (matches.length !== 1) return undefined;
  const match = matches[0];
  const childKeys = child.identityKeys ?? [];
  const ancestorKeys = match.identityKeys ?? [];
  // A matching name must never override conflicting CURP/CUIP values.
  if (childKeys.some(key => ancestorKeys.some(other =>
    key.slice(0, key.lastIndexOf(':')) === other.slice(0, other.lastIndexOf(':')) && key !== other))) {
    return undefined;
  }
  let ancestorId: string | undefined = parent.id;
  const visited = new Set<string>();
  while (ancestorId && !visited.has(ancestorId)) {
    if (ancestorId === match.id) return match;
    visited.add(ancestorId);
    ancestorId = links.find(link => link.targetId === ancestorId)?.sourceId;
  }
  return undefined;
}
