import { TestBed } from '@angular/core/testing';

import { FilterSearchResults } from './filter-search-results';

describe('FilterSearchResults', () => {
  let service: FilterSearchResults;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterSearchResults);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
