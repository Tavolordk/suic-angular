import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ConsolidatedProfileResponse } from '../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { PivotSearchContext } from '../../search/data-access/search-state.service';

/** Only linkage identifiers are kept in sessionStorage; no personal information or search payloads. */
export interface PivotConsolidationRecord {
  graphProfileId: string;
  parentSearchId: string;
  parentResultId: string;
  parentLinkId: string;
  pivotSearchId: string;
  pivotResultId: string;
  profileId: string;
  savedAt: string;
}

const STORAGE_PREFIX = 'spm.pivot-consolidations.v1';
const MAX_RECORDS = 250;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class PivotConsolidationRegistryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly currentAccount = computed(() => this.auth.accountNumber()?.trim() || 'no-account');
  private readonly recordScope = signal({
    account: this.currentAccount(),
    items: this.restore() as readonly PivotConsolidationRecord[]
  });
  // Login changes in this tab must never display associations from the prior account.
  readonly records = computed(() => {
    const scope = this.recordScope();
    return scope.account === this.currentAccount() ? scope.items : this.restore();
  });

  forLink(graphProfileId: string, searchId: string, resultId: string, linkId: string): PivotConsolidationRecord[] {
    return this.records().filter(record =>
      record.graphProfileId === graphProfileId &&
      record.parentSearchId === searchId &&
      record.parentResultId === resultId &&
      record.parentLinkId === linkId
    );
  }

  recordConsolidation(
    context: PivotSearchContext | null,
    searchId: string,
    resultId: string,
    profile: ConsolidatedProfileResponse
  ): boolean {
    if (!context || !this.hasValidIds([
      context.graphProfileId, context.parentSearchId, context.parentResultId,
      context.parentLinkId, searchId, resultId, profile.profileId
    ])) {
      return false;
    }
    // Do not associate a consolidation from another search or result with the selected link.
    if (profile.searchId !== searchId || profile.preconsolidatedResultId !== resultId) {
      return false;
    }

    const saved: PivotConsolidationRecord = {
      graphProfileId: context.graphProfileId,
      parentSearchId: context.parentSearchId,
      parentResultId: context.parentResultId,
      parentLinkId: context.parentLinkId,
      pivotSearchId: searchId,
      pivotResultId: resultId,
      profileId: profile.profileId,
      savedAt: new Date().toISOString()
    };
    const next = [saved, ...this.records().filter(record => !(
      record.graphProfileId === saved.graphProfileId &&
      record.parentSearchId === saved.parentSearchId &&
      record.parentResultId === saved.parentResultId &&
      record.parentLinkId === saved.parentLinkId &&
      record.profileId === saved.profileId
    ))].slice(0, MAX_RECORDS);
    this.recordScope.set({ account: this.currentAccount(), items: next });
    this.persist(next);
    return true;
  }

  private hasValidIds(ids: string[]): boolean {
    return ids.every(id => UUID_PATTERN.test(id));
  }

  private get storageKey(): string {
    // Account-scope the session data, avoiding cross-user association in the same browser tab.
    return `${STORAGE_PREFIX}:${this.currentAccount()}`;
  }

  private restore(): PivotConsolidationRecord[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(value)) return [];
      return value.slice(0, MAX_RECORDS).filter((v): v is PivotConsolidationRecord =>
        !!v && typeof v === 'object' &&
        ['graphProfileId', 'parentSearchId', 'parentResultId', 'parentLinkId', 'pivotSearchId', 'pivotResultId', 'profileId']
          .every(k => UUID_PATTERN.test(String((v as Record<string, unknown>)[k] ?? ''))) &&
        typeof (v as PivotConsolidationRecord).savedAt === 'string'
      );
    } catch { return []; }
  }

  private persist(records: readonly PivotConsolidationRecord[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { sessionStorage.setItem(this.storageKey, JSON.stringify(records)); }
    catch { /* The graph keeps working if storage is disabled or exhausted. */ }
  }
}
