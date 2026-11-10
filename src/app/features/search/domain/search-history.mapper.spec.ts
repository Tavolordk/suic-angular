import { SearchHistoryItemDto } from '../../../core/infrastructure/search-api/search-api.models';
import { historyEntityLabel, historyInputsLabel, historyIsExpired, historyTitle } from './search-history.mapper';

const base: SearchHistoryItemDto = {
  searchId: '11111111-1111-4111-8111-111111111111', entityType: 'Person',
  startedAtUtc: '2026-11-10T18:00:00Z', createdAtUtc: '2026-11-10T18:00:10Z',
  expiresAtUtc: '2026-11-10T18:20:10Z',
  inputs: [
    { type: 'Criterion', code: 'nombre', value: 'ANA' },
    { type: 'Criterion', code: 'apellidoPaterno', value: 'LOPEZ' }
  ],
  options: { includeTrace: true, includeContextualCandidates: true },
  counts: { totalItems: 4, enriched: 1, partial: 0, contextual: 0, consolidated: 3 },
  execution: { status: 'Completed', isPartial: false },
  resultOrigin: 'Temporary', resultsUrl: '/api/search/11111111-1111-4111-8111-111111111111/results'
};

describe('historial de búsqueda', () => {
  it('muestra criterios y la entidad sin confundir tarjetas con búsquedas', () => {
    expect(historyTitle(base)).toBe('ANA · LOPEZ');
    expect(historyInputsLabel(base.inputs)).toBe('Nombre: ANA · A. paterno: LOPEZ');
    expect(historyEntityLabel(base.entityType)).toBe('Persona');
  });
  it('reconoce Vehicle y Weapon en el historial', () => {
    expect(historyEntityLabel('Vehicle')).toBe('Vehículo');
    expect(historyEntityLabel('Weapon')).toBe('Arma');
  });
  it('interpreta timestamps UTC por su instante real sin acoplarse a la zona horaria', () => {
    expect(historyIsExpired(base, Date.parse('2026-11-10T18:20:09Z'))).toBeFalse();
    expect(historyIsExpired(base, Date.parse('2026-11-10T18:20:10Z'))).toBeTrue();
  });
});
