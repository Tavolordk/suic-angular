import { Injectable, inject, signal } from '@angular/core';
import { SearchHistoryService } from '../../features/search/data-access/search-history.service';

export type SearchQuickPanelType = 'history' | 'bookmarks' | null;

@Injectable({ providedIn: 'root' })
export class SearchQuickPanelService {
  private readonly searchHistory = inject(SearchHistoryService);
  readonly activePanel = signal<SearchQuickPanelType>(null);

  openHistory(): void {
    this.searchHistory.load(1);
    this.activePanel.set('history');
  }

  openSaved(): void {
    this.activePanel.set('bookmarks');
  }

  close(): void {
    this.activePanel.set(null);
  }
}
