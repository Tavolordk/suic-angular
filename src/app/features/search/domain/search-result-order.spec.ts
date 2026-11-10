import { orderResultPage } from './search-result-order';
import { SearchResultItemDto } from '../../../core/infrastructure/search-api/search-api.models';

describe('Person v2 · orden de tarjetas', () => {
  const card = { name: { value: 'ANA LOPEZ PEREZ', valueCount: 1, sources: ['RNPSP'] } };
  const plain: SearchResultItemDto = {
    resultId: '313c8eea-36e3-4718-97dd-8bebf8d8ac03', kind: 'Profile', status: 'Enriched',
    card, sources: ['RNPSP', 'REPUVE'], links: [], hasConflicts: false
  };
  const consolidated: SearchResultItemDto = {
    resultId: '4fc051f2-1787-4be7-b72f-047152a273de', kind: 'ConsolidatedProfile', status: 'Consolidated',
    card, sources: ['RNPSP', 'REPUVE'], links: [], hasConflicts: false,
    consolidatedProfile: {
      profileId: 'a65af22e-3cf3-4e02-b103-b206bcf96469',
      profileVersionId: '24438719-d079-40f1-962b-1ab5cf81b92c',
      versionNumber: 1, effectiveAtUtc: '2026-11-10T16:00:00Z'
    }
  };

  it('pone el consolidado primero, conserva ambos resultados con el mismo nombre y sus resultId', () => {
    const page = [plain, consolidated];
    const result = orderResultPage(page);
    expect(result.map(item => item.resultId)).toEqual([consolidated.resultId, plain.resultId]);
    expect(result[0].consolidatedProfile?.profileId).toBe(consolidated.consolidatedProfile?.profileId);
    expect(result[1].consolidatedProfile).toBeUndefined();
    expect(page[0]).toBe(plain); // no mutar respuesta original
  });

  it('usa kind y no status para clasificar las tarjetas', () => {
    const incongruente = { ...plain, status: 'Consolidated' };
    expect(orderResultPage([incongruente, consolidated])[0].kind).toBe('ConsolidatedProfile');
  });
});
