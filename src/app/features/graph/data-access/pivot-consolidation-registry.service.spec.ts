import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { ConsolidatedProfileResponse } from '../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { PivotSearchContext } from '../../search/data-access/search-state.service';
import { PivotConsolidationRegistryService } from './pivot-consolidation-registry.service';

const ids = {
  root: '11111111-1111-4111-8111-111111111111',
  parentSearch: '22222222-2222-4222-8222-222222222222',
  parentResult: '33333333-3333-4333-8333-333333333333',
  parentLink: '44444444-4444-4444-8444-444444444444',
  pivotSearch: '55555555-5555-4555-8555-555555555555',
  pivotResult: '66666666-6666-4666-8666-666666666666',
  profile: '77777777-7777-4777-8777-777777777777'
};

const context: PivotSearchContext = {
  graphProfileId: ids.root,
  parentSearchId: ids.parentSearch,
  parentResultId: ids.parentResult,
  parentLinkId: ids.parentLink,
  nodeTitle: 'Persona vinculada'
};

const profile = {
  profileId: ids.profile,
  searchId: ids.pivotSearch,
  preconsolidatedResultId: ids.pivotResult
} as ConsolidatedProfileResponse;

describe('PivotConsolidationRegistryService', () => {
  let service: PivotConsolidationRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PivotConsolidationRegistryService,
        { provide: AuthService, useValue: { accountNumber: () => 'PRUEBA_PIVOT' } },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    sessionStorage.removeItem('spm.pivot-consolidations.v1:PRUEBA_PIVOT');
    service = TestBed.inject(PivotConsolidationRegistryService);
  });

  afterEach(() => sessionStorage.removeItem('spm.pivot-consolidations.v1:PRUEBA_PIVOT'));

  it('does not mark un-consolidated pivot searches as consolidated', () => {
    expect(service.forLink(ids.root, ids.parentSearch, ids.parentResult, ids.parentLink)).toEqual([]);
  });

  it('associates a successful consolidation with the exact original link', () => {
    expect(service.recordConsolidation(context, ids.pivotSearch, ids.pivotResult, profile)).toBeTrue();
    const matched = service.forLink(ids.root, ids.parentSearch, ids.parentResult, ids.parentLink);
    expect(matched.length).toBe(1);
    expect(matched[0].profileId).toBe(ids.profile);
    expect(service.forLink(ids.root, ids.parentSearch, ids.parentResult, ids.pivotResult)).toEqual([]);
  });

  it('ignores a response for a different search and deduplicates repeated saves', () => {
    expect(service.recordConsolidation(context, ids.parentSearch, ids.pivotResult, profile)).toBeFalse();
    expect(service.recordConsolidation(context, ids.pivotSearch, ids.pivotResult, profile)).toBeTrue();
    expect(service.recordConsolidation(context, ids.pivotSearch, ids.pivotResult, profile)).toBeTrue();
    expect(service.records().length).toBe(1);
  });

  it('restores associations in the same browser session and account', () => {
    service.recordConsolidation(context, ids.pivotSearch, ids.pivotResult, profile);
    const restored = TestBed.runInInjectionContext(() => new PivotConsolidationRegistryService());
    expect(restored.forLink(ids.root, ids.parentSearch, ids.parentResult, ids.parentLink).length).toBe(1);
  });
});
