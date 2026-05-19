import { Component, inject } from '@angular/core';
import { SearchFilter } from '../../../../core/domain/entities/search-filter';
import { SearchFacade } from '../../search.facade';
import { SearchForm } from '../../components/search-form/search-form';
import { SearchResults } from '../../components/search-results/search-results';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [SearchForm, SearchResults],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage {
  private readonly facade = inject(SearchFacade);

  readonly results = this.facade.results;
  readonly hasSearched = this.facade.hasSearched;
  readonly totalResults = this.facade.totalResults;

  search(filter: SearchFilter): void {
    this.facade.search(filter);
  }

  clear(): void {
    this.facade.clear();
  }
}