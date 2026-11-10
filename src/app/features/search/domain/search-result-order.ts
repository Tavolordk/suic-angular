import { SearchResultItemDto } from '../../../core/infrastructure/search-api/search-api.models';

/**
 * Orden estable de una página recibida. No modifica los IDs, no fusiona
 * nombres iguales y no intenta paginar en el navegador.
 * El backend debe aplicar el orden global antes de paginar.
 */
export function orderResultPage(items: readonly SearchResultItemDto[]): SearchResultItemDto[] {
  return [...items].sort((a, b) =>
    Number(b.kind === 'ConsolidatedProfile') - Number(a.kind === 'ConsolidatedProfile')
  );
}
