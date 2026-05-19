import { Injectable, computed, signal } from '@angular/core';
import { Person } from '../../core/domain/entities/person';
import { SearchFilter } from '../../core/domain/entities/search-filter';
import { PEOPLE_MOCK } from '../../core/infrastructure/data/people.mock';

const INITIAL_FILTER: SearchFilter = {
  query: '',
  curp: '',
  name: '',
  firstLastName: '',
  secondLastName: '',
  birthDate: '',
  gender: '',
  entity: '',
  municipality: ''
};

@Injectable({
  providedIn: 'root'
})
export class SearchFacade {
  private readonly people = signal<Person[]>(PEOPLE_MOCK);
  private readonly filter = signal<SearchFilter>(INITIAL_FILTER);
  private readonly hasSearchedValue = signal(false);

  readonly currentFilter = this.filter.asReadonly();
  readonly hasSearched = this.hasSearchedValue.asReadonly();

  readonly results = computed(() => {
    if (!this.hasSearchedValue()) {
      return [];
    }

    const filter = this.filter();
    const people = this.people();

    const query = this.normalize(filter.query);
    const curp = this.normalize(filter.curp);
    const name = this.normalize(filter.name);
    const firstLastName = this.normalize(filter.firstLastName);
    const secondLastName = this.normalize(filter.secondLastName);
    const gender = this.normalize(filter.gender);

    return people.filter(person => {
      const fullName = this.normalize(person.fullName);
      const personCurp = this.normalize(person.curp);
      const personGender = this.normalize(person.gender);

      const matchesQuery =
        !query ||
        fullName.includes(query) ||
        personCurp.includes(query) ||
        person.aliases.some(alias => this.normalize(alias).includes(query));

      const matchesCurp = !curp || personCurp.includes(curp);
      const matchesName = !name || fullName.includes(name);
      const matchesFirstLastName = !firstLastName || fullName.includes(firstLastName);
      const matchesSecondLastName = !secondLastName || fullName.includes(secondLastName);
      const matchesGender = !gender || personGender === gender;

      return (
        matchesQuery &&
        matchesCurp &&
        matchesName &&
        matchesFirstLastName &&
        matchesSecondLastName &&
        matchesGender
      );
    });
  });

  readonly totalResults = computed(() => this.results().length);

  updateFilter(filter: SearchFilter): void {
    this.filter.set(filter);
  }

  search(filter: SearchFilter): void {
    this.filter.set(filter);
    this.hasSearchedValue.set(true);
  }

  clear(): void {
    this.filter.set(INITIAL_FILTER);
    this.hasSearchedValue.set(false);
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}