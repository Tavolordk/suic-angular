import { TestBed } from '@angular/core/testing';

import { PersonDetailFacade } from './person-detail.facade';

describe('PersonDetailFacade', () => {
  let service: PersonDetailFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonDetailFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
