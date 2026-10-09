import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SearchResultsPageResponse } from '../../../core/infrastructure/search-api/search-api.models';
import { PersonSearchFormValue } from '../../search/domain/person-search.models';
import { VehicleSearchFormValue } from '../../search/domain/vehicle-search.models';

export interface InvestigationSearchContext {
  investigationId: string;
  investigationFolio: string;
  investigationName: string;
  lineId?: string;
  lineTitle?: string;
  pivotNode?: string;
}

export interface InvestigationLinkedSearch {
  id: string;
  investigationId: string;
  investigationFolio: string;
  investigationName: string;
  entity: 'personas' | 'vehiculo';
  label: string;
  criteria: PersonSearchFormValue | VehicleSearchFormValue;
  backendSearchId: string;
  totalResults: number;
  executionStatus: string;
  isPartial: boolean;
  createdAt: string;
  updatedAt: string;
  lineId?: string;
  lineTitle?: string;
  pivotNode?: string;
}

@Injectable({ providedIn: 'root' })
export class InvestigationWorkspaceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly searchesStorageKey = 'spm-investigation-linked-searches-v1';
  private readonly contextStorageKey = 'spm-investigation-search-context-v1';

  readonly activeContext = signal<InvestigationSearchContext | null>(this.loadContext());
  readonly linkedSearches = signal<Record<string, InvestigationLinkedSearch[]>>(this.loadSearches());

  beginSearch(context: InvestigationSearchContext): void {
    this.activeContext.set(context);
    this.persistContext(context);
  }

  clearContext(): void {
    this.activeContext.set(null);
    if (this.isBrowser) {
      sessionStorage.removeItem(this.contextStorageKey);
    }
  }

  searchesFor(investigationId: string): InvestigationLinkedSearch[] {
    return this.linkedSearches()[investigationId] ?? [];
  }

  findSearch(searchId: string): InvestigationLinkedSearch | null {
    for (const searches of Object.values(this.linkedSearches())) {
      const match = searches.find((item) => item.id === searchId);
      if (match) {
        return match;
      }
    }
    return null;
  }

  resumeSearch(search: InvestigationLinkedSearch): void {
    this.beginSearch({
      investigationId: search.investigationId,
      investigationFolio: search.investigationFolio,
      investigationName: search.investigationName,
      lineId: search.lineId,
      lineTitle: search.lineTitle,
      pivotNode: search.pivotNode,
    });
  }

  recordSuccessfulSearch(formValue: PersonSearchFormValue | VehicleSearchFormValue, page: SearchResultsPageResponse, entity: 'personas' | 'vehiculo' = 'personas'): InvestigationLinkedSearch | null {
    const context = this.activeContext();
    if (!context) {
      return null;
    }

    const now = new Date().toISOString();
    const current = this.searchesFor(context.investigationId);
    const existing = current.find((item) => item.backendSearchId === page.searchId);

    const record: InvestigationLinkedSearch = {
      id: existing?.id ?? `inv-search-${Date.now()}`,
      investigationId: context.investigationId,
      investigationFolio: context.investigationFolio,
      investigationName: context.investigationName,
      entity,
      label: entity === 'vehiculo' ? this.buildVehicleLabel(formValue as VehicleSearchFormValue) : this.buildLabel(formValue as PersonSearchFormValue),
      criteria: { ...formValue },
      backendSearchId: page.searchId,
      totalResults: page.counts.totalItems,
      executionStatus: page.execution.status?.trim() || 'Completada',
      isPartial: page.execution.isPartial,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lineId: context.lineId,
      lineTitle: context.lineTitle,
      pivotNode: context.pivotNode,
    };

    const nextForInvestigation = existing
      ? current.map((item) => (item.id === existing.id ? record : item))
      : [record, ...current];

    this.linkedSearches.update((all) => ({
      ...all,
      [context.investigationId]: nextForInvestigation,
    }));
    this.persistSearches();
    return record;
  }

  deleteSearch(investigationId: string, searchId: string): void {
    this.linkedSearches.update((all) => ({
      ...all,
      [investigationId]: (all[investigationId] ?? []).filter((item) => item.id !== searchId),
    }));
    this.persistSearches();
  }

  private buildVehicleLabel(value: VehicleSearchFormValue): string {
    const entries = [value.vin && `VIN ${value.vin}`, value.placa && `Placa ${value.placa}`].filter(Boolean);
    return entries.join(' · ') || 'Búsqueda de vehículo';
  }

  private buildLabel(value: PersonSearchFormValue): string {
    const name = [value.nombres, value.apellidoPaterno, value.apellidoMaterno]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');

    if (value.curp.trim()) {
      return `CURP ${value.curp.trim()}`;
    }
    if (value.rfc.trim()) {
      return `RFC ${value.rfc.trim()}`;
    }
    if (name) {
      return name;
    }
    if (value.alias.trim()) {
      return `Alias ${value.alias.trim()}`;
    }
    if (value.contacto.trim()) {
      return `Contacto ${value.contacto.trim()}`;
    }
    return 'Búsqueda de persona';
  }

  private loadSearches(): Record<string, InvestigationLinkedSearch[]> {
    if (!this.isBrowser) {
      return {};
    }

    try {
      const raw = localStorage.getItem(this.searchesStorageKey);
      return raw ? JSON.parse(raw) as Record<string, InvestigationLinkedSearch[]> : {};
    } catch {
      return {};
    }
  }

  private loadContext(): InvestigationSearchContext | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = sessionStorage.getItem(this.contextStorageKey);
      return raw ? JSON.parse(raw) as InvestigationSearchContext : null;
    } catch {
      return null;
    }
  }

  private persistSearches(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(this.searchesStorageKey, JSON.stringify(this.linkedSearches()));
  }

  private persistContext(context: InvestigationSearchContext): void {
    if (!this.isBrowser) {
      return;
    }
    sessionStorage.setItem(this.contextStorageKey, JSON.stringify(context));
  }
}
