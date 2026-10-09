import { describe, expect, it } from 'vitest';
import { buildVehicleSearchRequest, normalizeVehicleSearch } from './vehicle-search-request.mapper';
import { hasSearchTerms } from './search-request.mapper';

describe('Vehicle Search', () => {
  it('envía VIN y PLACA con las opciones exactas del backend', () => {
    expect(buildVehicleSearchRequest({ vin: ' 1fmggu0d75 ', placa: 'mje519' })).toEqual({
      entityType: 'Vehicle',
      criteria: [],
      identifiers: [
        { code: 'VIN', value: '1FMGGU0D75' },
        { code: 'PLACA', value: 'MJE519' }
      ],
      options: { includeTrace: true, includeContextualCandidates: true }
    });
  });

  it('permite solamente una placa', () => {
    const request = buildVehicleSearchRequest({ vin: '', placa: 'abc-123' });
    expect(request.identifiers).toEqual([{ code: 'PLACA', value: 'ABC-123' }]);
    expect(hasSearchTerms(request)).toBe(true);
  });

  it('permite solamente VIN', () => {
    const request = buildVehicleSearchRequest({ vin: 'JH4KA8270MC000000', placa: '' });
    expect(request.identifiers).toEqual([{ code: 'VIN', value: 'JH4KA8270MC000000' }]);
  });

  it('rechaza solicitudes vacías en la capa de validación', () => {
    expect(hasSearchTerms(buildVehicleSearchRequest({ vin: '  ', placa: '' }))).toBe(false);
    expect(normalizeVehicleSearch({ vin: ' ab cd ', placa: 'a b c' })).toEqual({ vin: 'ABCD', placa: 'ABC' });
  });
});
