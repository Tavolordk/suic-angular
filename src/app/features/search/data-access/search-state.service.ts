import { Injectable, signal } from '@angular/core';
import {
  SearchRequest,
  SearchResultsPageResponse
} from '../../../core/infrastructure/search-api/search-api.models';
import { PersonSearchFormValue } from '../domain/person-search.models';
import { VehicleSearchFormValue } from '../domain/vehicle-search.models';

/** Contexto para volver del listado derivado al nodo de origen. */
export interface PivotSearchContext {
  graphProfileId: string;
  nodeTitle: string;
  parentSearchId: string;
  parentResultId: string;
  parentLinkId: string;
}

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  readonly request = signal<SearchRequest | null>(null);
  readonly page = signal<SearchResultsPageResponse | null>(null);
  readonly pageSize = signal<10 | 18>(10);
  readonly formValue = signal<PersonSearchFormValue | null>(null);
  readonly vehicleFormValue = signal<VehicleSearchFormValue | null>(null);
  readonly savedResultIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly pivotContext = signal<PivotSearchContext | null>(null);

  saveSearch(
    request: SearchRequest,
    page: SearchResultsPageResponse,
    pageSize: 10 | 18,
    formValue: PersonSearchFormValue
  ): void {
    this.request.set(request);
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.formValue.set(formValue);
    this.vehicleFormValue.set(null);
    this.pivotContext.set(null);
  }

  saveVehicleSearch(request: SearchRequest, page: SearchResultsPageResponse, pageSize: 10 | 18, formValue: VehicleSearchFormValue): void {
    this.request.set(request);
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.formValue.set(null);
    this.vehicleFormValue.set({ ...formValue });
    this.pivotContext.set(null);
  }

  /** El pivoteo produce una búsqueda nueva, no criterios capturados en el formulario. */
  savePivotResults(page: SearchResultsPageResponse, context: PivotSearchContext): void {
    this.request.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.page.set(page);
    this.pageSize.set(18);
    this.pivotContext.set(context);
  }

  clearPivotContext(): void {
    this.pivotContext.set(null);
  }

  updatePage(page: SearchResultsPageResponse, pageSize: 10 | 18): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
  }

  toggleSavedResult(resultId: string): void {
    const next = new Set(this.savedResultIds());
    if (next.has(resultId)) {
      next.delete(resultId);
    } else {
      next.add(resultId);
    }
    this.savedResultIds.set(next);
  }

  clear(): void {
    this.request.set(null);
    this.page.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.pivotContext.set(null);
  }
}
