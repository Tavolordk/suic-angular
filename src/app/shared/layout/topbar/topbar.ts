import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private clockInterval?: ReturnType<typeof setInterval>;

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;
  readonly currentTime = signal(new Date());
  readonly currentDateLabel = computed(() => formatSpanishDate(this.currentTime()));
  readonly profileOpen = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
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

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
  }

  @HostListener('document:click')
  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}

function formatSpanishDate(date: Date): string {
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const day = String(date.getDate()).padStart(2, '0');

  return `${weekdays[date.getDay()]}, ${day} De ${months[date.getMonth()]} De ${date.getFullYear()}`;
}
