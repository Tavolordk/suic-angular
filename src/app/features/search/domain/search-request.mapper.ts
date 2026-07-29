import { SearchRequest } from '../../../core/infrastructure/search-api/search-api.models';
import { PersonSearchFormValue } from './person-search.models';

const TEXT_CRITERIA: ReadonlyArray<{
  formField: keyof PersonSearchFormValue;
  apiField: string;
}> = [
  { formField: 'nombres', apiField: 'nombre' },
  { formField: 'apellidoPaterno', apiField: 'apellidoPaterno' },
  { formField: 'apellidoMaterno', apiField: 'apellidoMaterno' },
  { formField: 'alias', apiField: 'alias' }
];

const IDENTIFIERS: ReadonlyArray<{
  formField: keyof PersonSearchFormValue;
  code: string;
}> = [
  { formField: 'curp', code: 'CURP' },
  { formField: 'rfc', code: 'RFC' }
];

export function buildPersonSearchRequest(
  formValue: PersonSearchFormValue
): SearchRequest {
  const criteria = TEXT_CRITERIA.flatMap(({ formField, apiField }) => {
    const value = normalizeText(formValue[formField]);
    return value ? [{ field: apiField, value }] : [];
  });

  const fechaNacimiento = formValue.fechaNacimiento?.trim();
  if (fechaNacimiento) {
    criteria.push({ field: 'fechaNacimiento', value: fechaNacimiento });
  }

  const identifiers = IDENTIFIERS.flatMap(({ formField, code }) => {
    const value = normalizeText(formValue[formField]);
    return value ? [{ code, value }] : [];
  });

  return {
    entityType: 'Person',
    criteria,
    identifiers,
    options: {
      includeTrace: false,
      includeContextualCandidates: true
    }
  };
}

export function hasSearchTerms(request: SearchRequest): boolean {
  return request.criteria.length > 0 || request.identifiers.length > 0;
}

function normalizeText(value: string): string {
  return value?.trim().replace(/\s+/g, ' ').toUpperCase() ?? '';
}
