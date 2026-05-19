import { TestBed } from '@angular/core/testing';

import { SearchFacade } from './search.facade';

describe('SearchFacade', () => {
  let service: SearchFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
