import { TestBed } from '@angular/core/testing';

import { SearchPeople } from './search-people';

describe('SearchPeople', () => {
  let service: SearchPeople;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchPeople);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
