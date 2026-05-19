import { TestBed } from '@angular/core/testing';

import { GetPersonDetail } from './get-person-detail';

describe('GetPersonDetail', () => {
  let service: GetPersonDetail;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetPersonDetail);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
