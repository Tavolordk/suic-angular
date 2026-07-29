import { Injectable, signal } from '@angular/core';
import {
  SearchRequest,
  SearchResultsPageResponse
} from '../../../core/infrastructure/search-api/search-api.models';
import { PersonSearchFormValue } from '../domain/person-search.models';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  readonly request = signal<SearchRequest | null>(null);
  readonly page = signal<SearchResultsPageResponse | null>(null);
  readonly pageSize = signal<10 | 18>(10);
  readonly formValue = signal<PersonSearchFormValue | null>(null);
  readonly savedResultIds = signal<ReadonlySet<string>>(new Set<string>());

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
  }
}
