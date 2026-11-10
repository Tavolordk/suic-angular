import { Injectable, signal } from '@angular/core';
import {
  SearchRequest,
  SearchResultsPageResponse,
  SearchHistoryItemDto
} from '../../../core/infrastructure/search-api/search-api.models';
import { PersonSearchFormValue } from '../domain/person-search.models';
import { VehicleSearchFormValue } from '../domain/vehicle-search.models';
import { WeaponSearchFormValue } from '../domain/weapon-search.models';

/** Contexto para volver del listado derivado al nodo de origen. */
export interface PivotSearchContext {
  graphProfileId: string;
  nodeTitle: string;
  /** Tipo del nodo de origen, también cuando el motor no declara entityType en la página. */
  nodeType?: 'Person' | 'Vehicle' | 'Weapon';
  /** Permite restaurar el tipo del nodo raíz al volver al grafo. */
  graphRootType?: 'Person' | 'Vehicle' | 'Weapon';
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
  readonly weaponFormValue = signal<WeaponSearchFormValue | null>(null);
  readonly pivotContext = signal<PivotSearchContext | null>(null);
  readonly historicalSearchId = signal<string | null>(null);
  readonly recentResultsUrl = signal<string | null>(null);
  readonly recentHistoryItem = signal<SearchHistoryItemDto | null>(null);
  readonly historicalPivotParent = signal<{ searchId: string; resultId: string; entityType: string } | null>(null);

  /** Recuperación reciente: se conserva resultsUrl para todas las páginas posteriores. */
  saveRecentResults(item: SearchHistoryItemDto, page: SearchResultsPageResponse, pageSize: 10 | 18): void {
    this.request.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set(null);
    this.pivotContext.set(null);
    this.historicalPivotParent.set(null);
    this.historicalSearchId.set(null);
    this.recentResultsUrl.set(item.resultsUrl);
    this.recentHistoryItem.set(item);
    this.page.set(page);
    this.pageSize.set(pageSize);
  }

  saveHistoricalResults(page: SearchResultsPageResponse, pageSize: 10 | 18): void {
    this.request.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set(null);
    this.pivotContext.set(null);
    this.historicalPivotParent.set(null);
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalSearchId.set(page.searchId);
    this.page.set(page);
    this.pageSize.set(pageSize);
  }

  savePivotFromHistorical(page: SearchResultsPageResponse, parent: { searchId: string; resultId: string; entityType: string }): void {
    this.request.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set(null);
    this.pivotContext.set(null);
    this.historicalSearchId.set(null); // la hija usa GET temporal, nunca GET histórico
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalPivotParent.set(parent);
    this.page.set(page);
    this.pageSize.set(18);
  }

  saveSearch(
    request: SearchRequest,
    page: SearchResultsPageResponse,
    pageSize: 10 | 18,
    formValue: PersonSearchFormValue
  ): void {
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalSearchId.set(null);
    this.historicalPivotParent.set(null);
    this.request.set(request);
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.formValue.set(formValue);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set(null);
    this.pivotContext.set(null);
  }

  saveVehicleSearch(request: SearchRequest, page: SearchResultsPageResponse, pageSize: 10 | 18, formValue: VehicleSearchFormValue): void {
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalSearchId.set(null);
    this.historicalPivotParent.set(null);
    this.request.set(request);
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.formValue.set(null);
    this.vehicleFormValue.set({ ...formValue });
    this.weaponFormValue.set(null);
    this.pivotContext.set(null);
  }

  saveWeaponSearch(request: SearchRequest, page: SearchResultsPageResponse, pageSize: 10 | 18, formValue: WeaponSearchFormValue): void {
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalSearchId.set(null);
    this.historicalPivotParent.set(null);
    this.request.set(request);
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set({ ...formValue });
    this.pivotContext.set(null);
  }

  /** El pivoteo produce una búsqueda nueva, no criterios capturados en el formulario. */
  savePivotResults(page: SearchResultsPageResponse, context: PivotSearchContext): void {
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalSearchId.set(null);
    this.historicalPivotParent.set(null);
    this.request.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set(null);
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

  clear(): void {
    this.recentResultsUrl.set(null);
    this.recentHistoryItem.set(null);
    this.historicalSearchId.set(null);
    this.historicalPivotParent.set(null);
    this.request.set(null);
    this.page.set(null);
    this.formValue.set(null);
    this.vehicleFormValue.set(null);
    this.weaponFormValue.set(null);
    this.pivotContext.set(null);
  }
}
