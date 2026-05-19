import { TestBed } from '@angular/core/testing';

import { GraphFacade } from './graph.facade';

describe('GraphFacade', () => {
  let service: GraphFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
