import { DatePipe, isPlatformBrowser } from '@angular/common';
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
import { AuthService } from '../../../../core/auth/auth.service';
import {
  ProfileConsolidationFacade,
  ProfileSource
} from '../../profile-consolidation.facade';

type SidebarPanel = 'history' | 'bookmarks' | null;
type QuickSearchIcon = 'person' | 'curp' | 'vehicle' | 'weapon';
type QuickSearchType = 'personas' | 'vehiculo' | 'armas';

interface QuickSearchItem {
  id: number;
  label: string;
  type: QuickSearchType;
  icon: QuickSearchIcon;
}

@Component({
  selector: 'app-profile-consolidation-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './profile-consolidation-page.html',
  styleUrl: './profile-consolidation-page.scss'
})
export class ProfileConsolidationPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(ProfileConsolidationFacade);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private clockInterval?: ReturnType<typeof setInterval>;

  readonly profileId: string = this.route.snapshot.paramMap.get('id') ?? '1';

  readonly sources = this.facade.sources;
  readonly selectedSource = this.facade.selectedSource;
  readonly selectedFields = this.facade.selectedFields;
  readonly completedLabel = this.facade.completedLabel;
  readonly accepted = this.facade.accepted;

  readonly currentTime = signal(new Date());
  readonly profileOpen = signal(false);
  readonly activeSidebarPanel = signal<SidebarPanel>(null);
  readonly displayName = this.authService.displayName;

  readonly completionPercent = computed(() => {
    const [selectedRaw, totalRaw] = this.completedLabel()
      .split(' de ')
      .map((value) => Number(value));

    const selected = Number.isFinite(selectedRaw) ? selectedRaw : 0;
    const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : 49;

    return Math.min(100, Math.round((selected / total) * 100));
  });

  readonly recentSearches: QuickSearchItem[] = [
    {
      id: 1,
      label: 'Benito Juárez García',
      type: 'personas',
      icon: 'person'
    },
    {
      id: 2,
      label: 'JDPS950728HDFABC',
      type: 'personas',
      icon: 'curp'
    },
    {
      id: 3,
      label: 'Omar Hernández',
      type: 'personas',
      icon: 'person'
    },
    {
      id: 4,
      label: 'Toyota Corolla 2020',
      type: 'vehiculo',
      icon: 'vehicle'
    },
    {
      id: 5,
      label: 'Pistola Glock 9mm',
      type: 'armas',
      icon: 'weapon'
    }
  ];

  readonly savedSearches: QuickSearchItem[] = [
    {
      id: 1,
      label: 'Ana Sofía García Hernández',
      type: 'personas',
      icon: 'person'
    },
    {
      id: 2,
      label: 'Nissan Versa 2020',
      type: 'vehiculo',
      icon: 'vehicle'
    },
    {
      id: 3,
      label: 'Rifle calibre .223',
      type: 'armas',
      icon: 'weapon'
    }
  ];

  ngOnInit(): void {
    this.facade.loadProfile(this.profileId);

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

  getSelectedSourceCount(source: ProfileSource): number {
    return source.fields.filter((field) => field.selected).length;
  }

  selectSource(sourceId: string): void {
    this.facade.selectSource(sourceId);
  }

  toggleField(fieldId: string): void {
    this.facade.toggleField(fieldId);
  }

  selectAll(): void {
    this.facade.selectAllCurrentSource();
  }

  accept(): void {
    this.facade.acceptProfile();
  }

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
    this.activeSidebarPanel.set(null);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  goToResults(): void {
    this.closeProfile();
    this.activeSidebarPanel.set(null);
    this.router.navigateByUrl('/busqueda');
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
    this.closeProfile();
    this.activeSidebarPanel.set(null);

    this.router.navigate(['/busqueda'], {
      queryParams: {
        tipo: item.type,
        q: item.label
      }
    });
  }

  getQuickSearchIcon(item: QuickSearchItem): QuickSearchIcon {
    return item.icon;
  }
}