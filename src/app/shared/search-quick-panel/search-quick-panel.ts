import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { SearchHistoryItemDto, SearchResultsPageResponse } from '../../core/infrastructure/search-api/search-api.models';
import { SearchApiService } from '../../core/infrastructure/search-api/search-api.service';
import { SearchStateService } from '../../features/search/data-access/search-state.service';
import { SearchHistoryService, historyErrorMessage } from '../../features/search/data-access/search-history.service';
import { historyDate, historyEntityLabel, historyInputsLabel, historyTitle } from '../../features/search/domain/search-history.mapper';
import { Router } from '@angular/router';
import { SavedSearchReferencesService } from '../../features/search/data-access/saved-search-references.service';
import { SearchQuickPanelService } from './search-quick-panel.service';

@Component({
  selector: 'app-search-quick-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-quick-panel.html',
  styleUrl: './search-quick-panel.scss'
})
export class SearchQuickPanel {
  private readonly router = inject(Router);
  readonly panel = inject(SearchQuickPanelService);
  readonly savedReferences = inject(SavedSearchReferencesService);
  readonly savedRecords = this.savedReferences.records;

  private readonly searchApi = inject(SearchApiService);
  private readonly searchState = inject(SearchStateService);
  readonly history = inject(SearchHistoryService);
  readonly items = this.history.items;
  readonly openingId = signal<string | null>(null);
  readonly openError = signal<string | null>(null);
  readonly historyTitle = historyTitle;
  readonly historyDate = historyDate;
  readonly historyEntityLabel = historyEntityLabel;
  readonly historyInputsLabel = historyInputsLabel;

  close(): void {
    this.panel.close();
  }

  openItem(item: SearchHistoryItemDto): void {
    if (this.openingId()) return;
    this.openError.set(null);
    this.openingId.set(item.searchId);
    this.searchApi.getHistoryResults(item.resultsUrl, item.searchId, 1, 18).pipe(
      finalize(() => this.openingId.set(null))
    ).subscribe({
      next: response => {
        if (response.searchId && response.searchId !== item.searchId) {
          this.openError.set('La respuesta no corresponde a la búsqueda seleccionada.');
          return;
        }
        const page: SearchResultsPageResponse = {
          ...response, searchId: item.searchId, entityType: response.entityType || item.entityType
        };
        this.searchState.saveRecentResults(item, page, 18);
        this.close();
        void this.router.navigate(['/busqueda'], { queryParams: { recentSearchId: item.searchId } });
      },
      error: error => {
        if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 410)) {
          this.openError.set('La búsqueda temporal venció o ya no existe. Actualizamos el historial.');
          this.history.load(1);
        } else {
          this.openError.set(historyErrorMessage(error));
        }
      }
    });
  }

  openSavedId(searchId: string): void {
    const id = searchId.trim();
    this.close();
    void this.router.navigate(['/busqueda'], { queryParams: { savedSearchId: id } });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.panel.activePanel()) {
      this.panel.close();
    }
  }
}
