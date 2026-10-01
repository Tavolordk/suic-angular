import { Injectable, signal } from '@angular/core';

export type SearchQuickPanelType = 'history' | 'bookmarks' | null;

export interface SearchQuickPanelItem {
  id: number;
  preset: string;
  label: string;
  typeLabel: string;
  description: string;
  icon: 'person' | 'curp';
}

@Injectable({ providedIn: 'root' })
export class SearchQuickPanelService {
  readonly activePanel = signal<SearchQuickPanelType>(null);

  readonly recentSearches: SearchQuickPanelItem[] = [
    {
      id: 1,
      preset: 'recent-curp',
      label: 'HEGM880202HMCRDG02',
      typeLabel: 'CURP',
      description: 'CURP: HEGM880202HMCRDG02',
      icon: 'curp'
    },
    {
      id: 2,
      preset: 'recent-miguel',
      label: 'Miguel Angel Hernández',
      typeLabel: 'Persona',
      description: 'Nombre: MIGUEL ANGEL · A. paterno: HERNANDEZ',
      icon: 'person'
    }
  ];

  readonly savedSearches: SearchQuickPanelItem[] = [
    {
      id: 1,
      preset: 'saved-rfc',
      label: 'RFC HEMM7709295Z9',
      typeLabel: 'Persona',
      description: 'Nombre: MIGUEL ANGEL · RFC: HEMM7709295Z9',
      icon: 'person'
    },
    {
      id: 2,
      preset: 'saved-miguel-date',
      label: 'Miguel Hernández · 1977-09-29',
      typeLabel: 'Persona',
      description: 'Nombre: MIGUEL ANGEL · Nacimiento: 1977-09-29',
      icon: 'person'
    }
  ];

  openHistory(): void {
    this.activePanel.set('history');
  }

  openSaved(): void {
    this.activePanel.set('bookmarks');
  }

  close(): void {
    this.activePanel.set(null);
  }
}
