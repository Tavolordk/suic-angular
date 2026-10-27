import { SearchRequest } from '../../../core/infrastructure/search-api/search-api.models';
import { WeaponSearchFormValue } from './weapon-search.models';

export function normalizeWeaponSearch(form: WeaponSearchFormValue): WeaponSearchFormValue {
  return {
    matricula: (form.matricula ?? '').trim().replace(/\s+/g, '').toLocaleUpperCase('es-MX')
  };
}

/** El contrato Weapon acepta únicamente el identificador MATRICULA. */
export function buildWeaponSearchRequest(form: WeaponSearchFormValue): SearchRequest {
  const { matricula } = normalizeWeaponSearch(form);
  return {
    entityType: 'Weapon',
    criteria: [],
    identifiers: matricula ? [{ code: 'MATRICULA', value: matricula }] : [],
    options: { includeTrace: true, includeContextualCandidates: true }
  };
}
