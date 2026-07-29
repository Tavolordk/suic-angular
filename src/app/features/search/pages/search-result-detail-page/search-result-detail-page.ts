import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  SearchResultDetailResponse,
  SearchResultEvidenceDto
} from '../../../../core/infrastructure/search-api/search-api.models';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';

@Component({
  selector: 'app-search-result-detail-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-result-detail-page.html',
  styleUrl: './search-result-detail-page.scss'
})
export class SearchResultDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly searchApi = inject(SearchApiService);
  private readonly authService = inject(AuthService);

  readonly accountNumber = this.authService.accountNumber;
  readonly primaryProfile = this.authService.primaryProfile;
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<SearchResultDetailResponse | null>(null);

  readonly sourceGroups = computed(() => this.detail()?.sourceGroups ?? []);
  readonly linkGroups = computed(() => this.detail()?.linkGroups ?? []);
  readonly sourceRecordCount = computed(() =>
    this.sourceGroups().reduce(
      (total, group) => total + (group.records?.length ?? 0),
      0
    )
  );
  readonly relationshipCount = computed(() =>
    this.linkGroups().reduce((total, group) => total + group.count, 0)
  );

  ngOnInit(): void {
    const searchId = this.route.snapshot.paramMap.get('searchId')?.trim();
    const resultId = this.route.snapshot.paramMap.get('resultId')?.trim();

    if (!searchId || !resultId) {
      this.loading.set(false);
      this.errorMessage.set(
        'La ruta no contiene el searchId y resultId necesarios para consultar el perfil.'
      );
      return;
    }

    this.searchApi
      .getResultDetail(searchId, resultId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error: unknown) =>
          this.errorMessage.set(this.extractErrorMessage(error))
      });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl('/busqueda');
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  evidenceLabel(evidence: SearchResultEvidenceDto): string {
    return evidence.code?.trim() || 'Dato';
  }

  evidenceValue(evidence: SearchResultEvidenceDto): string {
    return evidence.value?.trim() || 'Sin valor';
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as
        | { message?: unknown; title?: unknown }
        | string
        | null;

      if (typeof response === 'string' && response.trim()) {
        return response.trim();
      }

      if (response && typeof response === 'object') {
        if (typeof response.message === 'string' && response.message.trim()) {
          return response.message.trim();
        }
        if (typeof response.title === 'string' && response.title.trim()) {
          return response.title.trim();
        }
      }

      if (error.status === 0) {
        return 'No fue posible conectar con el servicio de detalle.';
      }

      return `El servicio de detalle respondió con código ${error.status}.`;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'Ocurrió un error inesperado al consultar el perfil.';
  }
}
