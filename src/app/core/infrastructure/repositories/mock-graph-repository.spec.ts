import { TestBed } from '@angular/core/testing';

import { MockGraphRepository } from './mock-graph-repository';

describe('MockGraphRepository', () => {
  let service: MockGraphRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockGraphRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
