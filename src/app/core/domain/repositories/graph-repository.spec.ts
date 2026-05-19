import { TestBed } from '@angular/core/testing';

import { GraphRepository } from './graph-repository';

describe('GraphRepository', () => {
  let service: GraphRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
