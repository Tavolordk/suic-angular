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

  it('propaga un error del motor sin simular resultados', () => {
    let message = '';
    service.pivotLink('a', 'b', 'c').subscribe({ error: (error: Error) => { message = error.message; } });
    const req = httpMock.expectOne('/api/search/a/results/b/links/c/pivot?pageSize=18');
    req.flush({ success: false, message: 'Sin estrategia disponible', data: null });
    expect(message).toBe('Sin estrategia disponible');
  });
});
