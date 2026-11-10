import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchApiService } from './search-api.service';
import { SEARCH_API_BASE_URL } from './search-api.config';
import { SavedSearchResponse, SearchResultDetailResponse, SearchResultsPageResponse } from './search-api.models';

describe('SearchApiService – búsquedas guardadas v1.1', () => {
  let api: SearchApiService;
  let http: HttpTestingController;
  const searchId = '11111111-1111-4111-8111-111111111111';
  const resultId = '22222222-2222-4222-8222-222222222222';
  const linkId = '55555555-5555-4555-8555-555555555555';
  const page: SearchResultsPageResponse = {
    searchId, entityType: 'Vehicle',
    execution: { status: 'Completed', isPartial: false },
    counts: { totalItems: 0, enriched: 0, partial: 0, contextual: 0 },
    pagination: { page: 1, pageSize: 18, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
    items: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: SEARCH_API_BASE_URL, useValue: '/api' }
    ] });
    api = TestBed.inject(SearchApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('POST /save no envía cuerpo, usuario ni retención y respeta repeated', () => {
    let saved: SavedSearchResponse | undefined;
    api.saveSearch(searchId).subscribe((response) => saved = response);
    const request = http.expectOne(`/api/search/${searchId}/save`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('Accept')).toBe('application/json');
    const expected: SavedSearchResponse = {
      contractVersion: 'SPM.SavedSearch.v1', searchId,
      snapshotId: '33333333-3333-4333-8333-333333333333', snapshotVersion: 1,
      snapshotContractVersion: 'SPM.SearchSnapshot.v1',
      retainUntilUtc: '2026-11-16T18:00:00Z', repeated: true
    };
    request.flush({ success: true, data: expected });
    expect(saved).toEqual(expected);
  });

  it('GET /saved-searches/{id}/results manda page y pageSize y devuelve página histórica', () => {
    let received: SearchResultsPageResponse | undefined;
    api.getSavedResults(searchId, 2, 18).subscribe((response) => received = response);
    const request = http.expectOne(`/api/saved-searches/${searchId}/results?page=2&pageSize=18`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    request.flush({ success: true, data: page });
    expect(received).toEqual(page);
  });

  it('GET detalle histórico conserva searchId y resultId', () => {
    let received: SearchResultDetailResponse | undefined;
    api.getSavedResultDetail(searchId, resultId).subscribe((response) => received = response);
    const request = http.expectOne(`/api/saved-searches/${searchId}/results/${resultId}`);
    expect(request.request.method).toBe('GET');
    const detail: SearchResultDetailResponse = {
      searchId, resultId, entityType: 'Vehicle', hasConflicts: false,
      linkGroups: [{ entityType: 'Person', count: 1, items: [{ linkId }] }]
    };
    request.flush({ success: true, data: detail });
    expect(received?.linkGroups?.[0].items?.[0].linkId).toBe(linkId);
  });

  it('POST pivote histórico envía solo opciones y retorna hija temporal incluso sin coincidencias', () => {
    let received: SearchResultsPageResponse | undefined;
    api.pivotSavedLink(searchId, resultId, linkId, 18).subscribe((response) => received = response);
    const request = http.expectOne(`/api/saved-searches/${searchId}/results/${resultId}/links/${linkId}/pivot?pageSize=18`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ options: {
      includeTrace: false, includeContextualCandidates: true
    } });
    expect(request.request.headers.get('Accept')).toBe('application/json');
    const child = { ...page, searchId: '88888888-8888-4888-8888-888888888888', entityType: 'Person',
      pivotOrigin: { parentSearchId: searchId, parentResultId: resultId, parentLinkId: linkId,
        snapshotVersion: 1, snapshotContractVersion: 'SPM.SearchSnapshot.v1' } };
    request.flush({ success: true, data: child });
    expect(received).toEqual(child);
  });

  it('no confirma guardado cuando success=false', () => {
    let errorMessage = '';
    api.saveSearch(searchId).subscribe({ error: (error: Error) => errorMessage = error.message });
    const request = http.expectOne(`/api/search/${searchId}/save`);
    request.flush({ success: false, message: 'Snapshot rechazado', data: null });
    expect(errorMessage).toBe('Snapshot rechazado');
  });
});
