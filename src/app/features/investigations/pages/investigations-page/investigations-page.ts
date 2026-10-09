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

import { Topbar } from '../../../../shared/layout/topbar/topbar';
import { SearchQuickPanelService } from '../../../../shared/search-quick-panel/search-quick-panel.service';
type InvestigationStatus = 'Activa' | 'En revisión' | 'Finalizada';
type InvestigationRole = 'Administrador' | 'Investigador' | 'Solo búsqueda';
type InvestigationScreen = 'list' | 'users' | 'user-lines' | 'user-saved' | 'workspace' | 'line';
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

interface DirectoryUser {
  id: string;
  name: string;
  handle: string;
  role: InvestigationRole;
  investigations: number;
}

interface DirectoryLineRecord {
  id: string;
  owner: string;
  investigationId: string;
  lineId: string;
  title: string;
  root: string;
  profiles: number;
  updated: string;
  closed: boolean;
}

interface DirectorySavedSearch {
  id: string;
  owner: string;
  investigationId: string;
  query: string;
  chain: string[];
  updated: string;
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
    members: [
      {
        initials: 'GR',
        name: 'G. Ruiz',
        role: 'Investigador',
        description: 'Responsable de seguimiento de vínculos consolidados.',
      },
      {
        initials: 'ML',
        name: 'M. López',
        role: 'Investigador',
        description: 'Puede buscar, consolidar y pivotear vínculos.',
      },
    ],
    activity: [],
    lines: [
      {
        id: 'linea-03',
        category: 'Persona',
        title: 'Persona C y sus vínculos',
        description: 'Línea de persona consolidada dentro de Corredor Norte.',
        status: 'En desarrollo',
        entities: 2,
        closedBranches: 0,
        createdBy: 'M. López',
        updated: 'Hace 2 días',
      },
      {
        id: 'linea-05',
        category: 'Vehículo',
        title: 'Vehículo 05',
        description: 'Vehículo raíz con relaciones en revisión.',
        status: 'En desarrollo',
        entities: 2,
        closedBranches: 0,
        createdBy: 'G. Ruiz',
        updated: 'Hace 6 días',
      },
    ],
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
    members: [
      {
        initials: 'PG',
        name: 'P. Gómez',
        role: 'Solo consulta',
        description: 'Consulta el espacio y sus evidencias históricas.',
      },
    ],
    activity: [],
    lines: [
      {
        id: 'linea-04',
        category: 'Persona',
        title: 'Perfil D y sus vínculos',
        description: 'Línea histórica conservada en modo de revisión.',
        status: 'En revisión',
        entities: 5,
        closedBranches: 1,
        createdBy: 'A. Castillo',
        updated: 'Hace 5 días',
      },
    ],
  },
];

const DIRECTORY_USERS: DirectoryUser[] = [
  { id: 'ac', name: 'A. Castillo', handle: 'acastillo', role: 'Administrador', investigations: 3 },
  { id: 'ml', name: 'M. López', handle: 'mlopez', role: 'Investigador', investigations: 2 },
  { id: 'jr', name: 'J. Rivera', handle: 'jrivera', role: 'Investigador', investigations: 2 },
  { id: 'gr', name: 'G. Ruiz', handle: 'gruiz', role: 'Investigador', investigations: 1 },
  { id: 'vt', name: 'V. Torres', handle: 'vtorres', role: 'Investigador', investigations: 1 },
  { id: 'pg', name: 'P. Gómez', handle: 'pgomez', role: 'Solo búsqueda', investigations: 0 },
  { id: 'vm', name: 'V. Medina', handle: 'vmedina', role: 'Investigador', investigations: 1 },
  { id: 'sa', name: 'S. Álvarez', handle: 'salvarez', role: 'Investigador', investigations: 0 },
  { id: 'dc', name: 'D. Cruz', handle: 'dcruz', role: 'Solo búsqueda', investigations: 0 },
  { id: 'ef', name: 'E. Flores', handle: 'eflores', role: 'Investigador', investigations: 2 },
  { id: 'lh', name: 'L. Herrera', handle: 'lherrera', role: 'Administrador', investigations: 1 },
  { id: 'cn', name: 'C. Navarro', handle: 'cnavarro', role: 'Solo búsqueda', investigations: 0 },
  { id: 'or', name: 'O. Reyes', handle: 'oreyes', role: 'Investigador', investigations: 1 },
  { id: 'bm', name: 'B. Morales', handle: 'bmorales', role: 'Investigador', investigations: 0 },
  { id: 'fm', name: 'F. Martínez', handle: 'fmartinez', role: 'Solo búsqueda', investigations: 0 },
  { id: 'rt', name: 'R. Trejo', handle: 'rtrejo', role: 'Investigador', investigations: 0 },
  { id: 'is', name: 'I. Soto', handle: 'isoto', role: 'Investigador', investigations: 1 },
  { id: 'nb', name: 'N. Bautista', handle: 'nbautista', role: 'Solo búsqueda', investigations: 0 },
];

const DIRECTORY_LINES: DirectoryLineRecord[] = [
  { id: 'LINEA-01', owner: 'ml', investigationId: 'horizonte', lineId: 'linea-01', title: 'Perfil A y sus vínculos', root: 'Perfil A', profiles: 4, updated: 'Hoy', closed: false },
  { id: 'LINEA-02', owner: 'jr', investigationId: 'horizonte', lineId: 'linea-02', title: 'Vehículo 02', root: 'Vehículo 02', profiles: 3, updated: 'Ayer', closed: false },
  { id: 'LINEA-03', owner: 'ml', investigationId: 'corredor-norte', lineId: 'linea-03', title: 'Persona C y sus vínculos', root: 'Persona C', profiles: 2, updated: 'Hace 2 días', closed: false },
  { id: 'LINEA-04', owner: 'ac', investigationId: 'rutas-centro', lineId: 'linea-04', title: 'Perfil D y sus vínculos', root: 'Perfil D', profiles: 5, updated: 'Hace 5 días', closed: true },
  { id: 'LINEA-05', owner: 'gr', investigationId: 'corredor-norte', lineId: 'linea-05', title: 'Vehículo 05', root: 'Vehículo 05', profiles: 2, updated: 'Hace 6 días', closed: false },
];

const DIRECTORY_SAVED_SEARCHES: DirectorySavedSearch[] = [
  { id: 'BUS-101', owner: 'ac', query: 'Persona · Perfil D', investigationId: 'rutas-centro', chain: ['Perfil D'], updated: 'Hace 5 días' },
  { id: 'BUS-102', owner: 'ml', query: 'Persona · Perfil A', investigationId: 'horizonte', chain: ['Perfil A'], updated: 'Hoy' },
  { id: 'BUS-103', owner: 'ml', query: 'Persona · Persona B', investigationId: 'horizonte', chain: ['Perfil A', 'Vehículo 01', 'Persona B'], updated: 'Hoy' },
  { id: 'BUS-104', owner: 'jr', query: 'Vehículo · Vehículo 01', investigationId: 'horizonte', chain: ['Perfil A', 'Vehículo 01'], updated: 'Ayer' },
  { id: 'BUS-105', owner: 'gr', query: 'Vehículo · Vehículo 05', investigationId: 'corredor-norte', chain: ['Vehículo 05'], updated: 'Hace 6 días' },
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
  imports: [DatePipe, RouterLink, Topbar],
  templateUrl: './investigations-page.html',
  styleUrl: './investigations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigationsPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly investigationWorkspace = inject(InvestigationWorkspaceService);
  private readonly searchQuickPanel = inject(SearchQuickPanelService);
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
  readonly lineReturnScreen = signal<'workspace' | 'user-lines'>('workspace');
  readonly createDialogOpen = signal(false);
  readonly memberDialogOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly profileOpen = signal(false);
  readonly directoryUsers = signal<DirectoryUser[]>(DIRECTORY_USERS.map((user) => ({ ...user })));
  readonly directoryLines = signal<DirectoryLineRecord[]>(DIRECTORY_LINES.map((line) => ({ ...line })));
  readonly userSearchTerm = signal('');
  readonly userRoleFilter = signal<'all' | InvestigationRole>('all');
  readonly usersPage = signal(1);
  readonly usersPageSize = 6;
  readonly selectedUserId = signal('ml');
  readonly userLineStatusFilter = signal<'all' | 'active' | 'closed'>('all');
  readonly assignmentDialogOpen = signal(false);
  readonly assignmentUserId = signal<string | null>(null);
  readonly assignmentInvestigationId = signal('horizonte');

  readonly draftName = signal('');
  readonly draftDescription = signal('');
  readonly draftMemberName = signal('');
  readonly draftMemberRole = signal('Investigador');
  readonly selectedParticipants = signal(new Set(['M. López', 'J. Rivera']));
  readonly availableMembers = DIRECTORY_USERS
    .filter((user) => user.role !== 'Solo búsqueda')
    .map((user) => user.name);

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


  readonly filteredDirectoryUsers = computed(() => {
    const query = this.normalize(this.userSearchTerm());
    const role = this.userRoleFilter();
    return this.directoryUsers().filter((user) => {
      const matchesRole = role === 'all' || user.role === role;
      const matchesText = !query || this.normalize(`${user.name} ${user.handle} ${user.role}`).includes(query);
      return matchesRole && matchesText;
    });
  });

  readonly usersTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredDirectoryUsers().length / this.usersPageSize)),
  );

  readonly pagedDirectoryUsers = computed(() => {
    const page = Math.min(this.usersPage(), this.usersTotalPages());
    const start = (page - 1) * this.usersPageSize;
    return this.filteredDirectoryUsers().slice(start, start + this.usersPageSize);
  });

  readonly selectedDirectoryUser = computed(() =>
    this.directoryUsers().find((user) => user.id === this.selectedUserId()) ?? null,
  );

  readonly selectedUserLines = computed(() => {
    const filter = this.userLineStatusFilter();
    return this.directoryLines().filter((line) => {
      if (line.owner !== this.selectedUserId()) {
        return false;
      }
      if (filter === 'all') {
        return true;
      }
      return filter === 'closed' ? line.closed : !line.closed;
    });
  });

  readonly selectedUserLineCount = computed(() =>
    this.directoryLines().filter((line) => line.owner === this.selectedUserId()).length,
  );

  readonly selectedUserSavedSearches = computed(() =>
    DIRECTORY_SAVED_SEARCHES.filter((search) => search.owner === this.selectedUserId()),
  );

  readonly assignmentUser = computed(() =>
    this.directoryUsers().find((user) => user.id === this.assignmentUserId()) ?? null,
  );

  readonly assignmentInvestigation = computed(() =>
    this.investigations().find((item) => item.id === this.assignmentInvestigationId()) ?? null,
  );

  readonly assignmentBlockedReason = computed(() => {
    const user = this.assignmentUser();
    const investigation = this.assignmentInvestigation();
    if (!user || !investigation) {
      return 'Selecciona una investigación.';
    }
    if (user.role === 'Solo búsqueda') {
      return 'Los usuarios con rol Solo búsqueda no participan en investigaciones.';
    }
    if (investigation.status === 'Finalizada') {
      return 'Una investigación finalizada no acepta nuevos participantes.';
    }
    if (investigation.members.some((member) => member.name === user.name)) {
      return 'Este usuario ya participa en la investigación seleccionada.';
    }
    return '';
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
    const requestedScreen = params.get('screen');

    if (requestedScreen === 'users' && this.role() !== 'Solo búsqueda') {
      this.screen.set('users');
    }

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
    this.assignmentDialogOpen.set(false);
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
    this.memberDialogOpen.set(false);
    this.assignmentDialogOpen.set(false);
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
    this.lineReturnScreen.set('workspace');
    this.screen.set('line');
  }

  goToList(): void {
    this.screen.set('list');
  }

  goToUsers(): void {
    if (this.role() === 'Solo búsqueda') {
      return;
    }
    this.screen.set('users');
  }

  updateUserSearch(event: Event): void {
    this.userSearchTerm.set((event.target as HTMLInputElement | null)?.value ?? '');
    this.usersPage.set(1);
  }

  updateUserRoleFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as 'all' | InvestigationRole | undefined;
    if (value === 'all' || value === 'Administrador' || value === 'Investigador' || value === 'Solo búsqueda') {
      this.userRoleFilter.set(value);
      this.usersPage.set(1);
    }
  }

  previousUsersPage(): void {
    this.usersPage.update((page) => Math.max(1, page - 1));
  }

  nextUsersPage(): void {
    this.usersPage.update((page) => Math.min(this.usersTotalPages(), page + 1));
  }

  openUserLines(user: DirectoryUser): void {
    if (!this.canCreate()) {
      return;
    }
    this.selectedUserId.set(user.id);
    this.userLineStatusFilter.set('all');
    this.screen.set('user-lines');
  }

  openUserSavedSearches(user: DirectoryUser): void {
    if (!this.canCreate()) {
      return;
    }
    this.selectedUserId.set(user.id);
    this.screen.set('user-saved');
  }

  updateUserLineStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as 'all' | 'active' | 'closed' | undefined;
    if (value === 'all' || value === 'active' || value === 'closed') {
      this.userLineStatusFilter.set(value);
    }
  }

  openDirectoryLine(record: DirectoryLineRecord): void {
    let investigation = this.investigations().find((item) => item.id === record.investigationId);
    if (!investigation) {
      this.flash('La investigación asociada ya no está disponible.');
      return;
    }

    let line = investigation.lines.find((item) => item.id === record.lineId);
    if (!line) {
      const generatedLine: InvestigationLine = {
        id: record.lineId,
        category: record.title.toLocaleLowerCase('es-MX').includes('vehículo') ? 'Vehículo' : 'Persona',
        title: record.title,
        description: `Línea asociada al perfil raíz ${record.root}.`,
        status: record.closed ? 'En revisión' : 'En desarrollo',
        entities: record.profiles,
        closedBranches: record.closed ? 1 : 0,
        createdBy: this.selectedDirectoryUser()?.name ?? 'Usuario SPM',
        updated: record.updated,
      };
      this.investigations.update((items) => items.map((item) =>
        item.id === record.investigationId ? { ...item, lines: [...item.lines, generatedLine] } : item,
      ));
      this.persistInvestigations();
      investigation = this.investigations().find((item) => item.id === record.investigationId) ?? investigation;
      line = generatedLine;
    }

    this.selectedInvestigationId.set(investigation.id);
    this.selectedLineId.set(line.id);
    this.selectedNode.set('root');
    this.branchClosed.set(record.closed);
    this.lineReturnScreen.set('user-lines');
    this.screen.set('line');
  }

  backFromLine(): void {
    this.screen.set(this.lineReturnScreen());
  }

  toggleDirectoryLine(record: DirectoryLineRecord): void {
    if (!this.canCreate()) {
      return;
    }
    const investigation = this.investigations().find((item) => item.id === record.investigationId);
    if (record.closed && investigation?.status === 'Finalizada') {
      this.flash('Primero reactiva la investigación para reabrir esta línea.');
      return;
    }
    this.directoryLines.update((items) =>
      items.map((item) => item.id === record.id ? { ...item, closed: !item.closed } : item),
    );
    this.flash(record.closed ? 'Línea reactivada en la demostración.' : 'Línea cerrada y disponible en solo lectura.');
  }

  openAssignmentDialog(user: DirectoryUser): void {
    if (!this.canCreate() || user.role === 'Solo búsqueda') {
      return;
    }
    this.assignmentUserId.set(user.id);
    const firstAvailable = this.investigations().find((item) =>
      item.status !== 'Finalizada' && !item.members.some((member) => member.name === user.name),
    );
    this.assignmentInvestigationId.set(firstAvailable?.id ?? this.investigations()[0]?.id ?? '');
    this.assignmentDialogOpen.set(true);
  }

  closeAssignmentDialog(): void {
    this.assignmentDialogOpen.set(false);
  }

  updateAssignmentInvestigation(event: Event): void {
    this.assignmentInvestigationId.set((event.target as HTMLSelectElement | null)?.value ?? '');
  }

  confirmUserAssignment(): void {
    const user = this.assignmentUser();
    const investigation = this.assignmentInvestigation();
    if (!user || !investigation || this.assignmentBlockedReason()) {
      this.flash(this.assignmentBlockedReason() || 'No fue posible asociar al usuario.');
      return;
    }

    const initials = this.initialsFor(user.name);
    this.investigations.update((items) => items.map((item) => {
      if (item.id !== investigation.id) {
        return item;
      }
      return {
        ...item,
        participants: [...item.participants.filter((value) => !value.startsWith('+')), initials],
        members: [...item.members, {
          initials,
          name: user.name,
          role: user.role,
          description: user.role === 'Administrador'
            ? 'Puede administrar participantes y el espacio de trabajo.'
            : 'Puede ejecutar búsquedas y colaborar en las líneas de investigación.',
        }],
        metrics: item.metrics.map((metric) =>
          metric.label === 'Participantes' ? { ...metric, value: metric.value + 1 } : metric,
        ),
        activity: [
          { icon: 'fa-solid fa-user-plus', text: `${user.name} fue agregado al equipo`, meta: 'Ahora · Directorio de usuarios' },
          ...item.activity,
        ],
      };
    }));
    this.directoryUsers.update((items) =>
      items.map((item) => item.id === user.id ? { ...item, investigations: item.investigations + 1 } : item),
    );
    this.persistInvestigations();
    this.assignmentDialogOpen.set(false);
    this.flash(`${user.name} fue asociado a ${investigation.name}.`);
  }

  investigationName(id: string): string {
    return this.investigations().find((item) => item.id === id)?.name ?? id;
  }

  investigationFolio(id: string): string {
    return this.investigations().find((item) => item.id === id)?.folio ?? id;
  }

  investigationStatus(id: string): InvestigationStatus | null {
    return this.investigations().find((item) => item.id === id)?.status ?? null;
  }

  roleIcon(role: InvestigationRole): string {
    return role === 'Administrador'
      ? 'fa-solid fa-user-shield'
      : role === 'Investigador'
        ? 'fa-solid fa-user-pen'
        : 'fa-solid fa-eye';
  }

  userInitials(name: string): string {
    return this.initialsFor(name);
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
    if (search.entity === 'vehiculo') {
      const criteria = search.criteria as { vin?: string; placa?: string };
      return [criteria.vin && `VIN ${criteria.vin}`, criteria.placa && `Placa ${criteria.placa}`].filter(Boolean).join(' · ') || 'Identificadores de vehículo';
    }
    const criteria = search.criteria as import('../../../search/domain/person-search.models').PersonSearchFormValue;
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

  isDirectoryUserInInvestigation(investigation: Investigation, userName: string): boolean {
    return investigation.members.some((member) => member.name === userName);
  }

  goToSearch(): void {
    this.investigationWorkspace.clearContext();
    void this.router.navigateByUrl('/busqueda');
  }

  openSearchHistory(): void {
    this.profileOpen.set(false);
    this.searchQuickPanel.openHistory();
  }

  openSavedSearches(): void {
    this.profileOpen.set(false);
    this.searchQuickPanel.openSaved();
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

  private normalize(value: string): string {
    return value
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private initialsFor(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
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
