import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
type SearchEntity = 'personas' | 'vehiculo' | 'armas';

interface EntityOption {
  key: SearchEntity;
  label: string;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private clockInterval?: number;

  readonly currentTime = signal(new Date());
  readonly selectedEntity = signal<SearchEntity>('personas');
  readonly profileOpen = signal(false);
  readonly hasSearched = signal(false);
  readonly frequentSearchesEmpty = signal(true);

  readonly entityOptions: EntityOption[] = [
    {
      key: 'personas',
      label: 'Personas'
    },
    {
      key: 'vehiculo',
      label: 'Vehículo'
    },
    {
      key: 'armas',
      label: 'Armas'
    }
  ];

  readonly personForm = this.fb.group({
    nombres: [''],
    apellidoPaterno: [''],
    apellidoMaterno: [''],
    alias: [''],
    curp: [''],
    rfc: [''],
    cuip: ['']
  });

  readonly vehicleForm = this.fb.group({
    niv: [''],
    placa: [''],
    noMotor: [''],
    marca: [''],
    modelo: [''],
    color: ['']
  });

  readonly weaponForm = this.fb.group({
    matricula: [''],
    marca: [''],
    modelo: [''],
    calibre: [''],
    tipoArma: [''],
    licencia: ['']
  });

  readonly activeForm = computed(() => {
    switch (this.selectedEntity()) {
      case 'vehiculo':
        return this.vehicleForm;
      case 'armas':
        return this.weaponForm;
      default:
        return this.personForm;
    }
  });

  ngOnInit(): void {
    this.clockInterval = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      window.clearInterval(this.clockInterval);
    }
  }

  selectEntity(entity: SearchEntity): void {
    this.selectedEntity.set(entity);
    this.hasSearched.set(false);
  }

  clearSearch(): void {
    this.activeForm().reset();
    this.hasSearched.set(false);
  }

  search(): void {
    this.hasSearched.set(true);
  }

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.closeProfile();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  goToMainSearch(): void {
    this.closeProfile();
  }

  goToHistory(): void {
    this.closeProfile();
  }

  goToSaved(): void {
    this.closeProfile();
  }
}