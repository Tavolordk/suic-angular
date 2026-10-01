import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  SearchQuickPanelItem,
  SearchQuickPanelService
} from './search-quick-panel.service';

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

  readonly items = () =>
    this.panel.activePanel() === 'history'
      ? this.panel.recentSearches
      : this.panel.savedSearches;

  close(): void {
    this.panel.close();
  }

  openItem(item: SearchQuickPanelItem): void {
    this.panel.close();
    void this.router.navigate(['/busqueda'], {
      queryParams: { quickPreset: item.preset }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.panel.activePanel()) {
      this.panel.close();
    }
  }
}
