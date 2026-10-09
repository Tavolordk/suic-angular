import { SearchStateService } from './search-state.service';
import { SearchResultsPageResponse } from '../../../core/infrastructure/search-api/search-api.models';

describe('SearchStateService – pivoteo', () => {
  let service: SearchStateService;

  beforeEach(() => { service = new SearchStateService(); });

  it('conserva las tarjetas obtenidas y el origen sin inventar un formulario de búsqueda', () => {
    const page: SearchResultsPageResponse = {
      searchId: 'nuevo-search-id',
      execution: { status: 'Completed', isPartial: false },
      counts: { totalItems: 1, enriched: 1, partial: 0, contextual: 0 },
      pagination: { page: 1, pageSize: 18, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      items: []
    };
    const context = {
      graphProfileId: 'perfil-consolidado', nodeTitle: 'Persona relacionada',
      parentSearchId: 'busqueda-original', parentResultId: 'resultado-original', parentLinkId: 'persona-link'
    };
    service.savePivotResults(page, context);
    expect(service.page()).toEqual(page);
    expect(service.pageSize()).toBe(18);
    expect(service.pivotContext()).toEqual(context);
    expect(service.request()).toBeNull();
    expect(service.formValue()).toBeNull();
    service.clear();
    expect(service.pivotContext()).toBeNull();
  });
});
