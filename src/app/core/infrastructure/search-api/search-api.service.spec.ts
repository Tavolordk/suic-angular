import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SEARCH_API_BASE_URL } from './search-api.config';
import { SearchApiService } from './search-api.service';
import { SearchResultsPageResponse } from './search-api.models';

describe('SearchApiService – pivot de personas', () => {
  let service: SearchApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SEARCH_API_BASE_URL, useValue: '/api' }
      ]
    });
    service = TestBed.inject(SearchApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('usa POST, pageSize 18 y las opciones indicadas sin enviar datos personales', () => {
    const expected: SearchResultsPageResponse = {
      searchId: 'search-derivada',
      execution: { status: 'Completed', isPartial: false },
      counts: { totalItems: 1, enriched: 1, partial: 0, contextual: 0 },
      pagination: { page: 1, pageSize: 18, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      items: []
    };
    let response: SearchResultsPageResponse | undefined;
    service.pivotLink('search-padre', 'resultado-padre', 'vinculo-persona').subscribe((page) => {
      response = page;
    });
    const req = httpMock.expectOne('/api/search/search-padre/results/resultado-padre/links/vinculo-persona/pivot?pageSize=18');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      options: { includeTrace: true, includeContextualCandidates: true }
    });
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({ success: true, data: expected });
    expect(response).toEqual(expected);
  });


  it('lee Person v2 y mantiene un resultado por resultId usando la paginación del backend', () => {
    const page: SearchResultsPageResponse = {
      contractVersion: 'SPM.SearchResults.Person.v2',
      searchId: 'busqueda-propietario', entityType: 'Person',
      execution: { status: 'Completed', isPartial: false, consolidatedSearchStatus: 'Completed' },
      counts: { totalItems: 2, enriched: 1, partial: 0, contextual: 0, consolidated: 1 },
      pagination: { page: 1, pageSize: 18, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      items: [
        {
          resultId: 'resultado-consolidado', kind: 'ConsolidatedProfile', status: 'Consolidated',
          card: { name: { value: 'ANA LOPEZ PEREZ', valueCount: 1, sources: ['RNPSP'] } },
          sources: ['RNPSP', 'REPUVE'], links: [], hasConflicts: false,
          consolidatedProfile: { profileId: 'perfil-original', profileVersionId: 'version-1',
            versionNumber: 1, effectiveAtUtc: '2026-11-10T16:00:00Z' }
        },
        {
          resultId: 'resultado-enriquecido', kind: 'Profile', status: 'Enriched',
          card: { name: { value: 'ANA LOPEZ PEREZ', valueCount: 1, sources: ['RNPSP', 'REPUVE'] } },
          sources: ['RNPSP', 'REPUVE'], links: [], hasConflicts: false
        }
      ]
    };
    let actual: SearchResultsPageResponse | undefined;
    service.getResults('busqueda-propietario', 1, 18).subscribe(response => { actual = response; });
    const req = httpMock.expectOne('/api/search/busqueda-propietario/results?page=1&pageSize=18');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({ success: true, message: 'Busqueda ejecutada correctamente.', data: page });
    expect(actual?.items?.map(item => item.resultId)).toEqual(['resultado-consolidado', 'resultado-enriquecido']);
    expect(actual?.counts.consolidated).toBe(1);
    expect(actual?.items?.[1]?.consolidatedProfile).toBeUndefined();
  });

  it('consulta el detalle con searchId y resultId, no con el profileId del original', () => {
    service.getResultDetail('s-123', 'r-456').subscribe();
    const req = httpMock.expectOne('/api/search/s-123/results/r-456');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: {
      searchId: 's-123', resultId: 'r-456', kind: 'ConsolidatedProfile',
      hasConflicts: false, sourceGroups: [], linkGroups: []
    } });
  });

  it('GET historial usa paginación independiente y no envía body ni un propietario', () => {
    service.getSearchHistory(2, 18).subscribe(response => {
      expect(response.totalItems).toBe(19);
      expect(response.pagination.page).toBe(2);
    });
    const req = httpMock.expectOne('/api/search/history?page=2&pageSize=18');
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('Accept')).toBe('application/json');
    expect(req.request.params.keys().sort()).toEqual(['page', 'pageSize']);
    req.flush({ success: true, data: {
      contractVersion: 'SPM.SearchHistory.v1', totalItems: 19,
      pagination: { page: 2, pageSize: 18, totalPages: 2, hasPreviousPage: true, hasNextPage: false },
      items: []
    } });
  });

  it('historial vacío es 200 válido, no debe repetir POST /api/search', () => {
    service.getSearchHistory().subscribe(page => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });
    const req = httpMock.expectOne('/api/search/history?page=1&pageSize=18');
    req.flush({ success: true, data: {
      contractVersion: 'SPM.SearchHistory.v1', totalItems: 0,
      pagination: { page: 1, pageSize: 18, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
      items: []
    } });
  });

  it('abre el resultsUrl relativo del mismo searchId sin reejecutar la búsqueda', () => {
    const searchId = '11111111-1111-4111-8111-111111111111';
    const url = `/api/search/${searchId}/results`;
    service.getHistoryResults(url, searchId, 3, 10).subscribe(response => {
      expect(response.searchId).toBe(searchId);
    });
    const req = httpMock.expectOne(`${url}?page=3&pageSize=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: {
      searchId, entityType: 'Person', execution: { status: 'Completed', isPartial: false },
      counts: { totalItems: 23, enriched: 23, partial: 0, contextual: 0 },
      pagination: { page: 3, pageSize: 10, totalPages: 3, hasPreviousPage: true, hasNextPage: false },
      items: []
    } });
  });

  it('rechaza resultsUrl externa, cruzada o mal formada antes de realizar HTTP', () => {
    const searchId = '11111111-1111-4111-8111-111111111111';
    for (const url of [
      `https://evil.example/api/search/${searchId}/results`,
      '/api/search/22222222-2222-4222-8222-222222222222/results',
      `/api/search/${searchId}/results/otra-ruta`,
      `/api/search/${searchId}/results?owner=other`
    ]) {
      let rejected = false;
      service.getHistoryResults(url, searchId).subscribe({ error: () => { rejected = true; } });
      expect(rejected).toBeTrue();
    }
    httpMock.expectNone(() => true);
  });

  it('no reintenta automáticamente un 503 del historial', () => {
    let status = 0;
    service.getSearchHistory().subscribe({ error: error => { status = error.status; } });
    const req = httpMock.expectOne('/api/search/history?page=1&pageSize=18');
    req.flush({ errors: [{ code: 'AUTH_PROVIDER_RATE_LIMITED' }] },
      { status: 503, statusText: 'Service Unavailable', headers: { 'Retry-After': '60' } });
    expect(status).toBe(503);
  });

  it('propaga un error del motor sin simular resultados', () => {
    let message = '';
    service.pivotLink('a', 'b', 'c').subscribe({ error: (error: Error) => { message = error.message; } });
    const req = httpMock.expectOne('/api/search/a/results/b/links/c/pivot?pageSize=18');
    req.flush({ success: false, message: 'Sin estrategia disponible', data: null });
    expect(message).toBe('Sin estrategia disponible');
  });
});
