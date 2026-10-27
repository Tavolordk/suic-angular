import { describe, expect, it } from 'vitest';
import { buildWeaponSearchRequest, normalizeWeaponSearch } from './weapon-search-request.mapper';
import { hasSearchTerms } from './search-request.mapper';

describe('Weapon Search', () => {
  it('envía exclusivamente MATRICULA y las opciones documentadas por el backend', () => {
    expect(buildWeaponSearchRequest({ matricula: ' ccj0142 ' })).toEqual({
      entityType: 'Weapon',
      criteria: [],
      identifiers: [{ code: 'MATRICULA', value: 'CCJ0142' }],
      options: { includeTrace: true, includeContextualCandidates: true }
    });
  });

  it('normaliza espacios y mayúsculas', () => {
    expect(normalizeWeaponSearch({ matricula: ' cc j 0142 ' })).toEqual({ matricula: 'CCJ0142' });
  });

  it('no genera una petición con identificadores vacíos', () => {
    const request = buildWeaponSearchRequest({ matricula: '  ' });
    expect(request.identifiers).toEqual([]);
    expect(hasSearchTerms(request)).toBe(false);
  });
});
