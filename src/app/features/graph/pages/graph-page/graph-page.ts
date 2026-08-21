import { DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IntelligenceApiService } from '../../../../core/intelligence/intelligence-api.service';
import {
  GraphAnalysisApiResponse,
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
import {
  ConsolidatedProfileAddressDto,
  ConsolidatedProfileOriginDto,
  ConsolidatedProfileResponse
} from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';

type GraphNodeType = 'person' | 'source';
type IntroAnimationMode = 'individual' | 'wave' | 'global';

interface GraphNodeDetail {
  label: string;
  value: string;
}

interface GraphNodeLinks {
  profiles: number;
  locations: number;
  sources: number;
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
}

interface GraphLink {
  id: string;
  sourceId: string;
  targetId: string;
}

interface GraphFilter {
  type: GraphNodeType;
  label: string;
}


interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  evidence: IntelligenceEvidence[];
  disclaimer?: string | null;
  streaming?: boolean;
  mode?: 'local-llm' | 'deterministic-fallback';
  model?: string | null;
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

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './graph-page.html',
  styleUrl: './graph-page.scss'
})
export class GraphPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly consolidatedProfilesApi = inject(ConsolidatedProfilesApiService);
  private readonly profileIntelligence = inject(ProfileIntelligenceService);
  private readonly intelligenceApi = inject(IntelligenceApiService);

  @ViewChild('aiPanel') private aiPanelElement?: ElementRef<HTMLElement>;
  @ViewChild('aiChatViewport') private aiChatViewport?: ElementRef<HTMLElement>;
  @ViewChild('aiComposer') private aiComposer?: ElementRef<HTMLTextAreaElement>;
  private aiChatSubscription?: Subscription;
  private aiMessageSequence = 0;
  private aiPanelDragPointerId: number | null = null;
  private aiPanelDragStartClientX = 0;
  private aiPanelDragStartClientY = 0;
  private aiPanelDragStartX = 0;
  private aiPanelDragStartY = 0;

  readonly profileId =
    this.route.snapshot.queryParamMap.get('profileId')?.trim() ||
    this.route.snapshot.queryParamMap.get('investigationId')?.trim() ||
    '';

  readonly detailPanelOpen = signal(true);
  readonly selectedNodeId = signal(this.profileId || 'profile');
  readonly zoom = signal(1);
  readonly introAnimating = signal(true);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly dragging = signal(false);

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
    source: true
  });

  readonly filters: GraphFilter[] = [
    { type: 'person', label: 'Perfil' },
    { type: 'source', label: 'Fuentes' }
  ];

  readonly nodes = signal<GraphNode[]>([
    createPlaceholderNode(this.profileId || 'profile', 'Cargando perfil consolidado...')
  ]);
  readonly links = signal<GraphLink[]>([]);
  readonly addresses = signal<GraphAddressViewModel[]>([]);
  readonly addressPageIndex = signal(0);

  // La IA trabaja sobre el response ya recibido. No cambia contratos ni dispara endpoints existentes.
  readonly loadedProfile = signal<ConsolidatedProfileResponse | null>(null);
  readonly aiPanelOpen = signal(true);
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
  readonly aiErrorMessage = signal<string | null>(null);
  readonly isAiLoading = signal(false);
  readonly aiServiceStatus = signal<'checking' | 'online' | 'fallback'>('checking');
  readonly aiGraphAnalysis = signal<GraphAnalysisApiResponse | null>(null);

  readonly nodeIndex = computed(
    () => new Map(this.nodes().map((node) => [node.id, node] as const))
  );

  readonly visibleNodes = computed(() => {
    const filters = this.activeFilters();
    return this.nodes().filter((node) => filters[node.type]);
  });

  readonly visibleLinks = computed(() => {
    const visibleIds = new Set(this.visibleNodes().map((node) => node.id));
    return this.links().filter(
      (link) => visibleIds.has(link.sourceId) && visibleIds.has(link.targetId)
    );
  });

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

  readonly pendingProfilesLabel = computed(() => {
    const related = Math.max(0, this.nodes().length - 1);
    return `${related} ${related === 1 ? 'elemento relacionado' : 'elementos relacionados'}`;
  });

  readonly graphTransform = computed(() =>
    `translate(${this.panX()} ${this.panY()}) scale(${this.zoom()})`
  );

  readonly aiEvidence = computed<IntelligenceEvidence[]>(() => {
    const lastAssistant = [...this.aiMessages()].reverse().find((message) => message.role === 'assistant');
    return lastAssistant?.evidence ?? this.aiAnswer()?.evidence ?? [];
  });
  readonly aiServiceStatusLabel = computed(() => {
    switch (this.aiServiceStatus()) {
      case 'online': return 'Qwen local listo';
      case 'fallback': return 'Modo exacto local';
      default: return 'Conectando IA local';
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

    this.consolidatedProfilesApi.getProfile(this.profileId).subscribe({
      next: (profile) => {
        const graph = mapProfileToGraph(profile);
        const fallbackSnapshot = this.profileIntelligence.analyze(profile);
        this.loadedProfile.set(profile);
        this.nodes.set(graph.nodes);
        this.links.set(graph.links);
        this.addresses.set(mapAddressesForPanel(profile.addresses ?? []));
        this.addressPageIndex.set(0);
        this.selectedNodeId.set(graph.nodes[0]?.id ?? profile.profileId);

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
        this.refreshRemoteProfileAnalysis(profile);
        this.refreshRemoteGraphAnalysis();
        this.refreshLocalLlmHealth();
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.setGraphError(extractErrorMessage(error));
      }
    });
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
    this.focusAiComposer();
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

    const selectedNode = this.selectedNodeContext();
    const graph = this.currentAiGraphPayload();
    const history = this.currentChatHistory();
    const userMessage = this.createAiMessage('user', question);
    const assistantMessage = this.createAiMessage('assistant', '', {
      streaming: true,
      mode: 'local-llm'
    });

    this.aiMessages.update((messages) => [...messages, userMessage, assistantMessage]);
    this.aiQuestion.set('');
    this.resetAiComposerHeight();
    this.isAiLoading.set(true);
    this.aiErrorMessage.set(null);
    this.scrollAiChatToBottom();

    this.aiChatSubscription?.unsubscribe();
    this.aiChatSubscription = this.intelligenceApi
      .streamChat(profile, question, history, selectedNode, graph)
      .subscribe({
        next: (event) => {
          if (event.type === 'meta') {
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              mode: event.mode,
              model: event.model ?? null
            }));
            this.aiServiceStatus.set(event.mode === 'local-llm' ? 'online' : 'fallback');
          }

          if (event.type === 'delta') {
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              text: message.text + event.text
            }));
          }

          if (event.type === 'replace') {
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              text: event.text,
              mode: event.mode,
              model: event.model ?? null
            }));
            this.aiServiceStatus.set('fallback');
          }

          if (event.type === 'done') {
            this.updateAiMessage(assistantMessage.id, (message) => ({
              ...message,
              streaming: false,
              evidence: event.evidence ?? [],
              disclaimer: event.disclaimer ?? null,
              mode: event.mode,
              model: event.model ?? null
            }));

            const completed = this.aiMessages().find((message) => message.id === assistantMessage.id);
            if (completed) {
              this.aiAnswer.set({
                text: completed.text,
                evidence: completed.evidence,
                disclaimer: completed.disclaimer ?? undefined
              });
            }

            this.aiServiceStatus.set(event.mode === 'local-llm' ? 'online' : 'fallback');
            this.isAiLoading.set(false);
          }

          this.scrollAiChatToBottom();
        },
        error: () => {
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
            'La API de IA local no respondió. Se usó el analizador determinista del navegador; los datos del perfil siguen disponibles.'
          );
          this.isAiLoading.set(false);
          this.scrollAiChatToBottom();
        },
        complete: () => {
          if (this.isAiLoading()) {
            this.isAiLoading.set(false);
          }
        }
      });
  }

  stopAiGeneration(): void {
    if (!this.isAiLoading()) {
      return;
    }
    this.aiChatSubscription?.unsubscribe();
    this.aiChatSubscription = undefined;
    this.aiMessages.update((messages) =>
      messages.map((message) =>
        message.streaming
          ? {
              ...message,
              streaming: false,
              text: message.text || 'Generación detenida por el usuario.'
            }
          : message
      )
    );
    this.isAiLoading.set(false);
  }

  clearAiConversation(): void {
    this.aiChatSubscription?.unsubscribe();
    this.aiChatSubscription = undefined;
    this.aiQuestion.set('');
    this.aiErrorMessage.set(null);
    this.isAiLoading.set(false);
    this.aiMessages.set([]);
    this.aiAnswer.set(null);
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
      .filter((message) => !message.streaming && message.text.trim().length > 0)
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.text }));
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

  private refreshRemoteProfileAnalysis(profile: ConsolidatedProfileResponse): void {
    this.intelligenceApi.analyzeProfile(profile).subscribe({
      next: (snapshot) => {
        this.aiSnapshot.set(snapshot);
        this.aiErrorMessage.set(null);
      },
      error: () => {
        this.aiServiceStatus.set('fallback');
        this.aiErrorMessage.set(
          'No fue posible conectar con http://127.0.0.1:8080. El perfil funciona normalmente y usa el análisis local como respaldo.'
        );
      }
    });
  }

  private refreshRemoteGraphAnalysis(): void {
    if (!this.loadedProfile()) {
      return;
    }

    this.intelligenceApi.analyzeGraph(this.currentAiGraphPayload()).subscribe({
      next: (analysis) => {
        this.aiGraphAnalysis.set(analysis);
      },
      error: () => {
        // El grafo visual continúa funcionando; sólo se pierde esta descripción complementaria.
        this.aiGraphAnalysis.set(null);
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
    return {
      nodes: this.nodes().map((node) => ({
        id: node.id,
        type: this.getNodeTypeLabel(node.type),
        title: node.title,
        subtitle: node.subtitle,
        details: node.details
      })),
      links: this.links().map((link) => ({ ...link })),
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

  selectNode(nodeId: string): void {
    if (this.suppressNodeClick) {
      return;
    }

    this.selectedNodeId.set(nodeId);
    this.detailPanelOpen.set(true);
    this.refreshRemoteGraphAnalysis();
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
      if (!nextFilters[selectedNode.type]) {
        const nextNode = this.nodes().find((node) => nextFilters[node.type]);
        if (nextNode) {
          this.selectedNodeId.set(nextNode.id);
        }
      }

      return nextFilters;
    });
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
    this.zoom.update((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))));
  }

  resetZoom(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
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

  getLinkOpacity(link: GraphLink): number {
    const selectedId = this.selectedNodeId();
    return link.sourceId === selectedId || link.targetId === selectedId ? 0.45 : 0.15;
  }

  getLinkStrokeWidth(link: GraphLink): number {
    const selectedId = this.selectedNodeId();
    return link.sourceId === selectedId || link.targetId === selectedId ? 2 : 1.2;
  }

  getNodeColor(type: GraphNodeType): string {
    switch (type) {
      case 'person':
        return '#FCB025';
      case 'source':
        return '#3E8C22';
      default:
        return '#99A8BE';
    }
  }

  getNodeTypeLabel(type: GraphNodeType): string {
    switch (type) {
      case 'person':
        return 'Perfil';
      case 'source':
        return 'Fuente';
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
    this.aiGraphAnalysis.set(null);
    this.aiServiceStatus.set('fallback');
    this.nodes.set([createPlaceholderNode(this.profileId || 'profile', 'No fue posible cargar el perfil', message)]);
    this.links.set([]);
    this.addresses.set([]);
    this.addressPageIndex.set(0);
    this.selectedNodeId.set(this.profileId || 'profile');
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

function mapProfileToGraph(profile: ConsolidatedProfileResponse): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const addresses = profile.addresses ?? [];
  const origins = collectOrigins(profile);
  const positions = createRelatedPositions(origins.length);
  const profileTitle = resolveProfileTitle(profile);
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

  const nodes: GraphNode[] = [
    {
      id: profile.profileId,
      type: 'person',
      title: profileTitle,
      subtitle:
        findDataValue(profile, ['CURP', 'RFC', 'CUIP']) || `Versión ${profile.versionNumber}`,
      x: ROOT_X,
      y: ROOT_Y,
      radius: 35,
      details: rootDetails,
      links: {
        profiles: 1,
        locations: addresses.length,
        sources: origins.length
      }
    }
  ];

  const links: GraphLink[] = [];

  origins.forEach((origin, index) => {
    const position = positions[index] ?? { x: ROOT_X, y: ROOT_Y };
    const nodeId = `source-${origin.originId || index}`;
    const rawSourceCode = origin.sourceCode?.trim() || '';
    nodes.push({
      id: nodeId,
      type: 'source',
      title: sourceDisplayName(rawSourceCode, index),
      subtitle: origin.sourceRecordId?.trim() || 'Origen del dato consolidado',
      x: position.x,
      y: position.y,
      radius: 26,
      details: [
        { label: 'Fuente', value: sourceDisplayName(rawSourceCode, index) },
        { label: 'Código técnico', value: rawSourceCode || '—' },
        { label: 'Registro de origen', value: origin.sourceRecordId?.trim() || '—' }
      ],
      links: { profiles: 1, locations: 0, sources: 0 }
    });
    links.push({
      id: `profile-source-${origin.originId || index}`,
      sourceId: profile.profileId,
      targetId: nodeId
    });
  });

  return { nodes, links };
}

function createRelatedPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  let placed = 0;
  let ring = 0;

  while (placed < count) {
    const capacity = Math.min(count - placed, 8 + ring * 4);
    const radiusX = 220 + ring * 105;
    const radiusY = 180 + ring * 75;

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

function collectOrigins(profile: ConsolidatedProfileResponse): ConsolidatedProfileOriginDto[] {
  const seen = new Set<string>();
  const origins: ConsolidatedProfileOriginDto[] = [];

  const add = (origin: ConsolidatedProfileOriginDto) => {
    const key = [origin.originId, origin.sourceCode, origin.sourceRecordId].filter(Boolean).join('|');
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    origins.push(origin);
  };

  (profile.data ?? []).forEach((datum) => (datum.origins ?? []).forEach(add));
  (profile.addresses ?? []).forEach((address) => (address.origins ?? []).forEach(add));
  return origins;
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

function resolveProfileTitle(profile: ConsolidatedProfileResponse): string {
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
    (profile.data ?? []).find((datum) => wanted.has(normalizeCode(datum.code ?? '')))?.value?.trim() ??
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
    links: { profiles: 1, locations: 0, sources: 0 }
  };
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Ocurrió un error inesperado al consultar el perfil consolidado.';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
