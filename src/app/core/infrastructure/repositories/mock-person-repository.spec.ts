import { TestBed } from '@angular/core/testing';

import { MockPersonRepository } from './mock-person-repository';

describe('MockPersonRepository', () => {
  let service: MockPersonRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockPersonRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
