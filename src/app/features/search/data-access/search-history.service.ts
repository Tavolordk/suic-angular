import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { SearchHistoryItemDto, SearchResultPaginationDto } from '../../../core/infrastructure/search-api/search-api.models';
import { SearchApiService } from '../../../core/infrastructure/search-api/search-api.service';

const initialPagination: SearchResultPaginationDto = {
  page: 1, pageSize: 18, totalPages: 0, hasPreviousPage: false, hasNextPage: false
};

/** Historial temporal de la cuenta actual; sin almacenamiento local ni reejecución de POST. */
@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
  private readonly api = inject(SearchApiService);
  private subscription?: Subscription;
  readonly items = signal<SearchHistoryItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalItems = signal(0);
  readonly pagination = signal<SearchResultPaginationDto>({ ...initialPagination });

  load(page = 1): void {
    if (!Number.isInteger(page) || page < 1) return;
    this.subscription?.unsubscribe();
    // Evita exponer entradas antiguas al cambiar de sesión antes de una nueva lectura.
    this.items.set([]);
    this.totalItems.set(0);
    this.pagination.set({ ...initialPagination, page });
    this.error.set(null);
    this.loading.set(true);
    this.subscription = this.api.getSearchHistory(page, 18).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: response => {
        this.items.set(response.items ?? []);
        this.totalItems.set(response.totalItems ?? 0);
        this.pagination.set(response.pagination ?? { ...initialPagination });
      },
      error: (error: unknown) => this.error.set(historyErrorMessage(error))
    });
  }

  reload(): void { this.load(this.pagination().page); }
  goToPage(page: number): void {
    const current = this.pagination();
    if (page < 1 || page > current.totalPages || this.loading()) return;
    this.load(page);
  }

  clear(): void {
    this.subscription?.unsubscribe();
    this.items.set([]);
    this.totalItems.set(0);
    this.pagination.set({ ...initialPagination });
    this.loading.set(false);
    this.error.set(null);
  }
}

export function historyErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    if (error.status === 400) return 'Los parámetros del historial no son válidos.';
    if (error.status === 404 || error.status === 410) return 'La búsqueda reciente ya no está disponible. Actualiza el historial.';
    if (error.status === 503) {
      // Respetar Retry-After: ningún reintento automático ante AuthCentral o Redis.
      return 'El historial o el proveedor de autenticación no está disponible. Inténtalo más tarde.';
    }
    return `No fue posible consultar el historial (HTTP ${error.status}).`;
  }
  return error instanceof Error && error.message.trim()
    ? error.message : 'No fue posible consultar el historial reciente.';
}
