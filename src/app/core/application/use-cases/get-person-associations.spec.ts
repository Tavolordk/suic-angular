import { TestBed } from '@angular/core/testing';

import { GetPersonAssociations } from './get-person-associations';

describe('GetPersonAssociations', () => {
  let service: GetPersonAssociations;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetPersonAssociations);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
