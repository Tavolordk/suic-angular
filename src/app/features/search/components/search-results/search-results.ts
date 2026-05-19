import { Component, Input } from '@angular/core';
import { Person } from '../../../../core/domain/entities/person';
import { PersonResultCard } from '../person-result-card/person-result-card';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [PersonResultCard],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss'
})
export class SearchResults {
  @Input({ required: true }) people: Person[] = [];
  @Input() hasSearched = false;
}