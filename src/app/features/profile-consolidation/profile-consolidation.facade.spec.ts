import { TestBed } from '@angular/core/testing';

import { ProfileConsolidationFacade } from './profile-consolidation.facade';

describe('ProfileConsolidationFacade', () => {
  let service: ProfileConsolidationFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileConsolidationFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
