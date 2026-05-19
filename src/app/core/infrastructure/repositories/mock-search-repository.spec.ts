import { TestBed } from '@angular/core/testing';

import { MockSearchRepository } from './mock-search-repository';

describe('MockSearchRepository', () => {
  let service: MockSearchRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockSearchRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
