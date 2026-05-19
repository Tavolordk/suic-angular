import { TestBed } from '@angular/core/testing';

import { PersonRepository } from './person-repository';

describe('PersonRepository', () => {
  let service: PersonRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
