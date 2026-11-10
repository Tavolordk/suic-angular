import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { SavedSearchResponse } from '../../../core/infrastructure/search-api/search-api.models';

export interface SavedSearchReference {
  searchId: string;
  retainUntilUtc: string;
  entityType: string;
}

const STORAGE_PREFIX = 'spm-saved-search-ids-v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class SavedSearchReferencesService {
  private readonly auth = inject(AuthService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly records = signal<SavedSearchReference[]>([]);

  constructor() {
    effect(() => {
      const account = this.auth.isAuthenticated() ? this.auth.session()?.usuario?.trim() : null;
      this.records.set(this.read(account));
    });
  }

  remember(saved: SavedSearchResponse, entityType: string): void {
    if (!UUID_PATTERN.test(saved.searchId) || !saved.retainUntilUtc) return;
    const record: SavedSearchReference = {
      searchId: saved.searchId,
      retainUntilUtc: saved.retainUntilUtc,
      entityType
    };
    const next = [record, ...this.records().filter((item) => item.searchId !== record.searchId)];
    this.records.set(next);
    const key = this.storageKey(this.auth.isAuthenticated() ? this.auth.session()?.usuario?.trim() : null);
    if (key && this.browser) {
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* lectura remota sigue disponible */ }
    }
  }

  isSaved(searchId: string | null): boolean {
    return !!searchId && this.records().some((item) => item.searchId === searchId);
  }

  private storageKey(account: string | null | undefined): string | null {
    return account ? `${STORAGE_PREFIX}${encodeURIComponent(account)}` : null;
  }

  private read(account: string | null | undefined): SavedSearchReference[] {
    const key = this.storageKey(account);
    if (!this.browser || !key) return [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is SavedSearchReference =>
        item !== null && typeof item === 'object' &&
        UUID_PATTERN.test(String(item.searchId)) &&
        typeof item.retainUntilUtc === 'string' &&
        typeof item.entityType === 'string'
      );
    } catch { return []; }
  }
}
