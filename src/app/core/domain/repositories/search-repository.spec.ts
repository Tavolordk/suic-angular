import { TestBed } from '@angular/core/testing';

import { SearchRepository } from './search-repository';

describe('SearchRepository', () => {
  let service: SearchRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
