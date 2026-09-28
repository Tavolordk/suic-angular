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
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import {
  InvestigationLinkedSearch,
  InvestigationWorkspaceService
} from '../../data-access/investigation-workspace.service';

type InvestigationStatus = 'Activa' | 'En revisión' | 'Finalizada';
type InvestigationRole = 'Administrador' | 'Investigador' | 'Solo búsqueda';
type InvestigationScreen = 'list' | 'workspace' | 'line';
type WorkspaceTab = 'lines' | 'searches' | 'members';
type StatusFilter = 'all' | InvestigationStatus;
type NodeKey = 'root' | 'vehicle' | 'person' | 'closed';

interface InvestigationMetric {
  icon: string;
  value: number;
  label: string;
}

interface InvestigationMember {
  initials: string;
  name: string;
  role: string;
  description: string;
}

interface InvestigationActivity {
  icon: string;
  text: string;
  meta: string;
}

interface InvestigationLine {
  id: string;
  category: 'Persona' | 'Vehículo';
  title: string;
  description: string;
  status: 'En desarrollo' | 'En revisión';
  entities: number;
  closedBranches: number;
  createdBy: string;
  updated: string;
}

interface Investigation {
  id: string;
  folio: string;
  name: string;
  description: string;
  status: InvestigationStatus;
  createdBy: string;
  metrics: InvestigationMetric[];
  participants: string[];
  members: InvestigationMember[];
  activity: InvestigationActivity[];
  lines: InvestigationLine[];
}

interface GraphNodeDetail {
  title: string;
  subtitle: string;
  trace: string;
  icon: string;
}

const MOCK_INVESTIGATIONS: Investigation[] = [
  {
    id: 'horizonte',
    folio: 'SPM-INV-2026-0048',
    name: 'Operación Horizonte',
    description: 'Espacio de trabajo sobre personas, vehículos y vínculos asociados.',
    status: 'Activa',
    createdBy: 'A. Castillo',
    metrics: [
      { icon: 'fa-solid fa-diagram-project', value: 4, label: 'Líneas' },
      { icon: 'fa-solid fa-address-card', value: 12, label: 'Perfiles consolidados' },
      { icon: 'fa-solid fa-user-group', value: 5, label: 'Participantes' },
    ],
    participants: ['AC', 'ML', 'JR', '+2'],
    members: [
      {
        initials: 'AC',
        name: 'A. Castillo',
        role: 'Creador · Administrador',
        description: 'Puede administrar participantes y finalizar la investigación.',
      },
      {
        initials: 'ML',
        name: 'M. López',
        role: 'Investigador',
        description: 'Puede buscar, consolidar y pivotear vínculos.',
      },
      {
        initials: 'JR',
        name: 'J. Rivera',
        role: 'Investigador',
        description: 'Puede buscar, consolidar y pivotear vínculos.',
      },
    ],
    activity: [
      {
        icon: 'fa-solid fa-link',
        text: 'M. López consolidó Vehículo 01',
        meta: 'Hoy · Línea 01',
      },
      {
        icon: 'fa-solid fa-code-branch',
        text: 'J. Rivera cerró una rama',
        meta: 'Ayer · Línea 01',
      },
      {
        icon: 'fa-solid fa-magnifying-glass',
        text: 'Nueva búsqueda vinculada',
        meta: 'Hace 2 días',
      },
    ],
    lines: [
      {
        id: 'linea-01',
        category: 'Persona',
        title: 'Perfil A y sus vínculos',
        description: 'Perfil raíz consolidado; conexiones a personas y vehículos.',
        status: 'En desarrollo',
        entities: 6,
        closedBranches: 2,
        createdBy: 'M. López',
        updated: 'Actualizada hoy',
      },
      {
        id: 'linea-02',
        category: 'Vehículo',
        title: 'Vehículo 02',
        description: 'Vehículo consolidado y revisión de vínculos con personas.',
        status: 'En desarrollo',
        entities: 3,
        closedBranches: 0,
        createdBy: 'J. Rivera',
        updated: 'Ayer',
      },
    ],
  },
  {
    id: 'corredor-norte',
    folio: 'SPM-INV-2026-0037',
    name: 'Corredor Norte',
    description: 'Colaboración entre analistas en dos líneas de investigación.',
    status: 'Activa',
    createdBy: 'G. Ruiz',
    metrics: [
      { icon: 'fa-solid fa-diagram-project', value: 2, label: 'Líneas' },
      { icon: 'fa-solid fa-address-card', value: 7, label: 'Perfiles consolidados' },
      { icon: 'fa-solid fa-user-group', value: 3, label: 'Participantes' },
    ],
    participants: ['AC', 'GR', 'VT'],
    members: [],
    activity: [],
    lines: [],
  },
  {
    id: 'rutas-centro',
    folio: 'SPM-INV-2026-0029',
    name: 'Rutas del Centro',
    description: 'Revisión compartida de hallazgos y ramas consolidadas.',
    status: 'En revisión',
    createdBy: 'P. Gómez',
    metrics: [
      { icon: 'fa-solid fa-diagram-project', value: 3, label: 'Líneas' },
      { icon: 'fa-solid fa-address-card', value: 9, label: 'Perfiles consolidados' },
      { icon: 'fa-solid fa-user-group', value: 4, label: 'Participantes' },
    ],
    participants: ['AC', 'PG', 'VM', '+1'],
    members: [],
    activity: [],
    lines: [],
  },
];

const NODE_DETAILS: Record<NodeKey, GraphNodeDetail> = {
  root: {
    title: 'Perfil A · Persona',
    subtitle: 'Entidad principal consolidada',
    trace: 'Consolidado por M. López. Origen y evidencias disponibles en trazabilidad.',
    icon: 'fa-solid fa-user',
  },
  vehicle: {
    title: 'Vehículo 01',
    subtitle: 'Vínculo consolidado',
    trace: 'Consolidado por J. Rivera desde un vínculo de Perfil A.',
    icon: 'fa-solid fa-car-side',
  },
  person: {
    title: 'Persona B',
    subtitle: 'Vínculo por revisar',
    trace: 'Vínculo detectado; todavía no consolidado dentro de la línea.',
    icon: 'fa-solid fa-user-clock',
  },
  closed: {
    title: 'Vehículo 03',
    subtitle: 'Rama cerrada',
    trace: 'Rama cerrada por J. Rivera; la evidencia permanece consultable.',
    icon: 'fa-solid fa-car-rear',
  },
};

@Component({
  selector: 'app-investigations-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './investigations-page.html',
  styleUrl: './investigations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigationsPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly investigationWorkspace = inject(InvestigationWorkspaceService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;

  readonly currentTime = signal(new Date());
  readonly role = signal<InvestigationRole>('Administrador');
  readonly screen = signal<InvestigationScreen>('list');
  readonly activeTab = signal<WorkspaceTab>('lines');
  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly investigations = signal<Investigation[]>(this.loadInvestigations());
  readonly selectedInvestigationId = signal(MOCK_INVESTIGATIONS[0].id);
  readonly selectedLineId = signal(MOCK_INVESTIGATIONS[0].lines[0].id);
  readonly selectedNode = signal<NodeKey>('root');
  readonly branchClosed = signal(false);
  readonly createDialogOpen = signal(false);
  readonly memberDialogOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly profileOpen = signal(false);

  readonly draftName = signal('');
  readonly draftDescription = signal('');
  readonly draftMemberName = signal('');
  readonly draftMemberRole = signal('Investigador');
  readonly selectedParticipants = signal(new Set(['M. López', 'J. Rivera']));
  readonly availableMembers = ['M. López', 'J. Rivera', 'G. Ruiz', 'V. Torres', 'P. Gómez', 'A. Castillo'];

  readonly currentDateLabel = computed(() =>
    new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(this.currentTime()),
  );

  readonly selectedInvestigation = computed(() =>
    this.investigations().find((item) => item.id === this.selectedInvestigationId()) ??
      this.investigations()[0],
  );

  readonly selectedLine = computed(() => {
    const investigation = this.selectedInvestigation();
    return (
      investigation?.lines.find((line) => line.id === this.selectedLineId()) ??
      investigation?.lines[0] ??
      null
    );
  });

  readonly linkedSearches = computed(() => {
    const investigation = this.selectedInvestigation();
    return investigation ? this.investigationWorkspace.searchesFor(investigation.id) : [];
  });

  readonly selectedNodeDetail = computed(() => NODE_DETAILS[this.selectedNode()]);
  readonly canCreate = computed(() => this.role() === 'Administrador');
  readonly canInvestigate = computed(() => this.role() !== 'Solo búsqueda');

  readonly visibleInvestigations = computed(() => {
    if (!this.canInvestigate()) {
      return [];
    }

    const query = this.searchTerm().trim().toLocaleLowerCase('es-MX');
    const filter = this.statusFilter();

    return this.investigations().filter((item) => {
      const matchesText = !query || `${item.name} ${item.folio}`.toLocaleLowerCase('es-MX').includes(query);
      const matchesStatus = filter === 'all' || item.status === filter;
      return matchesText && matchesStatus;
    });
  });

  private clockTimer: ReturnType<typeof setInterval> | undefined;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (this.isBrowser) {
      this.clockTimer = setInterval(() => this.currentTime.set(new Date()), 1_000);
    }
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const investigationId = params.get('investigationId');
    const tab = params.get('tab');

    if (investigationId && this.investigations().some((item) => item.id === investigationId)) {
      this.selectedInvestigationId.set(investigationId);
      const investigation = this.investigations().find((item) => item.id === investigationId);
      if (investigation?.lines[0]) {
        this.selectedLineId.set(investigation.lines[0].id);
      }
      this.screen.set('workspace');
    }

    if (tab === 'searches' || tab === 'members' || tab === 'lines') {
      this.activeTab.set(tab);
    }
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.createDialogOpen.set(false);
    this.memberDialogOpen.set(false);
    this.profileOpen.set(false);
  }

  @HostListener('document:click')
  closeProfileOnOutsideClick(): void {
    this.profileOpen.set(false);
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  updateStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as StatusFilter | undefined;
    if (value === 'all' || value === 'Activa' || value === 'En revisión' || value === 'Finalizada') {
      this.statusFilter.set(value);
    }
  }

  updateRole(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as InvestigationRole | undefined;
    if (value !== 'Administrador' && value !== 'Investigador' && value !== 'Solo búsqueda') {
      return;
    }

    this.role.set(value);
    this.createDialogOpen.set(false);
    if (value === 'Solo búsqueda') {
      this.screen.set('list');
    }
  }

  setTab(tab: WorkspaceTab): void {
    this.activeTab.set(tab);
  }

  openInvestigation(item: Investigation): void {
    this.selectedInvestigationId.set(item.id);
    if (item.lines[0]) {
      this.selectedLineId.set(item.lines[0].id);
    }
    this.activeTab.set('lines');
    this.screen.set('workspace');
  }

  openLine(line: InvestigationLine): void {
    this.selectedLineId.set(line.id);
    this.selectedNode.set('root');
    this.branchClosed.set(false);
    this.screen.set('line');
  }

  goToList(): void {
    this.screen.set('list');
  }

  goToWorkspace(): void {
    this.screen.set('workspace');
  }

  selectNode(node: NodeKey): void {
    this.selectedNode.set(node);
  }

  toggleBranch(): void {
    const line = this.selectedLine();
    if (!line) {
      return;
    }

    this.branchClosed.update((closed) => !closed);
    const delta = this.branchClosed() ? 1 : -1;
    this.updateSelectedInvestigation((investigation) => ({
      ...investigation,
      activity: [
        {
          icon: 'fa-solid fa-code-branch',
          text: `${this.accountNumber() || 'Usuario actual'} ${this.branchClosed() ? 'cerró' : 'reabrió'} una rama`,
          meta: `Ahora · ${line.id.toUpperCase()}`
        },
        ...investigation.activity
      ],
      lines: investigation.lines.map((item) =>
        item.id === line.id
          ? { ...item, closedBranches: Math.max(0, item.closedBranches + delta), updated: 'Actualizada ahora' }
          : item
      )
    }));
    this.flash(this.branchClosed() ? 'Rama cerrada y guardada en el espacio local.' : 'Rama reabierta y guardada en el espacio local.');
  }

  openCreateDialog(): void {
    if (!this.canCreate()) {
      return;
    }

    this.draftName.set('');
    this.draftDescription.set('');
    this.selectedParticipants.set(new Set(['M. López', 'J. Rivera']));
    this.createDialogOpen.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  updateDraftName(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  updateDraftDescription(event: Event): void {
    this.draftDescription.set((event.target as HTMLTextAreaElement | null)?.value ?? '');
  }

  toggleParticipant(name: string, event: Event): void {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked);
    this.selectedParticipants.update((current) => {
      const next = new Set(current);
      checked ? next.add(name) : next.delete(name);
      return next;
    });
  }

  createPreview(): void {
    const name = this.draftName().trim();
    if (!name) {
      this.flash('Captura un nombre para la investigación.');
      return;
    }

    const id = `preview-${Date.now()}`;
    const members = [...this.selectedParticipants()].map((participant) => ({
      initials: participant
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(''),
      name: participant,
      role: 'Investigador',
      description: 'Participante agregado en la vista previa del frontend.',
    }));

    const preview: Investigation = {
      id,
      folio: `SPM-LOCAL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      name,
      description: this.draftDescription().trim() || 'Investigación colaborativa creada como vista previa.',
      status: 'Activa',
      createdBy: this.accountNumber() || 'Usuario actual',
      metrics: [
        { icon: 'fa-solid fa-diagram-project', value: 0, label: 'Líneas' },
        { icon: 'fa-solid fa-address-card', value: 0, label: 'Perfiles consolidados' },
        { icon: 'fa-solid fa-user-group', value: members.length + 1, label: 'Participantes' },
      ],
      participants: ['YO', ...members.slice(0, 2).map((member) => member.initials)],
      members,
      activity: [],
      lines: [],
    };

    this.investigations.update((items) => [preview, ...items]);
    this.persistInvestigations();
    this.selectedInvestigationId.set(id);
    this.activeTab.set('lines');
    this.createDialogOpen.set(false);
    this.screen.set('workspace');
    this.flash('Investigación creada y guardada localmente para pruebas del frontend.');
  }

  newSearch(): void {
    if (!this.canInvestigate()) {
      return;
    }

    const investigation = this.selectedInvestigation();
    if (!investigation) {
      return;
    }

    this.investigationWorkspace.beginSearch({
      investigationId: investigation.id,
      investigationFolio: investigation.folio,
      investigationName: investigation.name
    });

    void this.router.navigate(['/busqueda'], {
      queryParams: {
        investigationId: investigation.id,
        investigationFolio: investigation.folio,
        investigationName: investigation.name
      }
    });
  }

  addMember(): void {
    if (!this.canCreate()) {
      return;
    }
    this.draftMemberName.set('');
    this.draftMemberRole.set('Investigador');
    this.memberDialogOpen.set(true);
  }

  closeMemberDialog(): void {
    this.memberDialogOpen.set(false);
  }

  updateDraftMemberName(event: Event): void {
    this.draftMemberName.set((event.target as HTMLSelectElement | null)?.value ?? '');
  }

  updateDraftMemberRole(event: Event): void {
    this.draftMemberRole.set((event.target as HTMLSelectElement | null)?.value ?? 'Investigador');
  }

  saveMember(): void {
    const name = this.draftMemberName().trim();
    if (!name) {
      this.flash('Selecciona un participante.');
      return;
    }

    const investigation = this.selectedInvestigation();
    if (!investigation || investigation.members.some((member) => member.name === name)) {
      this.flash('Ese participante ya forma parte de la investigación.');
      return;
    }

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
    const role = this.draftMemberRole();

    this.updateSelectedInvestigation((item) => ({
      ...item,
      participants: [...item.participants.filter((value) => !value.startsWith('+')), initials],
      members: [
        ...item.members,
        {
          initials,
          name,
          role,
          description: role === 'Administrador'
            ? 'Puede administrar participantes y el espacio de trabajo.'
            : 'Puede ejecutar búsquedas, revisar resultados y trabajar con líneas.'
        }
      ],
      metrics: item.metrics.map((metric) =>
        metric.label === 'Participantes' ? { ...metric, value: metric.value + 1 } : metric
      ),
      activity: [
        { icon: 'fa-solid fa-user-plus', text: `${name} fue agregado al equipo`, meta: 'Ahora · Participantes' },
        ...item.activity
      ]
    }));
    this.memberDialogOpen.set(false);
    this.flash(`${name} fue agregado a la investigación.`);
  }

  pivot(): void {
    if (!this.canInvestigate()) {
      return;
    }

    if (this.selectedNode() === 'closed' || this.branchClosed()) {
      this.flash('Reabre la rama antes de iniciar un nuevo pivote.');
      return;
    }

    const investigation = this.selectedInvestigation();
    const line = this.selectedLine();
    if (!investigation || !line) {
      return;
    }

    const node = this.selectedNodeDetail();
    this.investigationWorkspace.beginSearch({
      investigationId: investigation.id,
      investigationFolio: investigation.folio,
      investigationName: investigation.name,
      lineId: line.id,
      lineTitle: line.title,
      pivotNode: node.title
    });

    void this.router.navigate(['/busqueda'], {
      queryParams: {
        investigationId: investigation.id,
        investigationFolio: investigation.folio,
        investigationName: investigation.name,
        lineId: line.id,
        lineTitle: line.title,
        pivotNode: node.title
      }
    });
  }

  openLinkedSearch(search: InvestigationLinkedSearch): void {
    this.investigationWorkspace.resumeSearch(search);
    void this.router.navigate(['/busqueda'], {
      queryParams: {
        investigationId: search.investigationId,
        investigationFolio: search.investigationFolio,
        investigationName: search.investigationName,
        linkedSearchId: search.id
      }
    });
  }

  deleteLinkedSearch(search: InvestigationLinkedSearch, event: Event): void {
    event.stopPropagation();
    this.investigationWorkspace.deleteSearch(search.investigationId, search.id);
    this.flash('Búsqueda desvinculada de la investigación.');
  }

  searchCriteriaSummary(search: InvestigationLinkedSearch): string {
    const criteria = search.criteria;
    const parts = [
      criteria.nombres,
      criteria.apellidoPaterno,
      criteria.apellidoMaterno,
      criteria.curp && `CURP ${criteria.curp}`,
      criteria.rfc && `RFC ${criteria.rfc}`,
      criteria.contacto
    ].filter(Boolean);
    return parts.slice(0, 3).join(' · ') || 'Criterios de persona';
  }

  isMemberInInvestigation(name: string): boolean {
    return Boolean(this.selectedInvestigation()?.members.some((member) => member.name === name));
  }

  goToSearch(): void {
    this.investigationWorkspace.clearContext();
    void this.router.navigateByUrl('/busqueda');
  }

  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.profileOpen.update((open) => !open);
  }

  keepProfileOpen(event: Event): void {
    event.stopPropagation();
  }

  logout(): void {
    this.profileOpen.set(false);
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  private updateSelectedInvestigation(update: (investigation: Investigation) => Investigation): void {
    const selectedId = this.selectedInvestigationId();
    this.investigations.update((items) =>
      items.map((item) => item.id === selectedId ? update(item) : item)
    );
    this.persistInvestigations();
  }

  private loadInvestigations(): Investigation[] {
    if (!this.isBrowser) {
      return JSON.parse(JSON.stringify(MOCK_INVESTIGATIONS)) as Investigation[];
    }

    try {
      const raw = localStorage.getItem('spm-investigations-workspaces-v1');
      return raw ? JSON.parse(raw) as Investigation[] : JSON.parse(JSON.stringify(MOCK_INVESTIGATIONS)) as Investigation[];
    } catch {
      return JSON.parse(JSON.stringify(MOCK_INVESTIGATIONS)) as Investigation[];
    }
  }

  private persistInvestigations(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem('spm-investigations-workspaces-v1', JSON.stringify(this.investigations()));
  }

  private flash(message: string): void {
    this.toastMessage.set(message);
    if (!this.isBrowser) {
      return;
    }

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3_600);
  }
}
