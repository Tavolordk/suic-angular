import { SearchRequest } from '../../../core/infrastructure/search-api/search-api.models';
import { VehicleSearchFormValue } from './vehicle-search.models';

export function normalizeVehicleSearch(form: VehicleSearchFormValue): VehicleSearchFormValue {
  return {
    vin: (form.vin ?? '').trim().replace(/\s+/g, '').toLocaleUpperCase('es-MX'),
    placa: (form.placa ?? '').trim().replace(/\s+/g, '').toLocaleUpperCase('es-MX')
  };
}

/** No se envían filtros o identificadores no documentados. Permite VIN, PLACA o ambos. */
export function buildVehicleSearchRequest(form: VehicleSearchFormValue): SearchRequest {
  const values = normalizeVehicleSearch(form);
  return {
    entityType: 'Vehicle',
    criteria: [],
    identifiers: [
      ...(values.vin ? [{ code: 'VIN', value: values.vin }] : []),
      ...(values.placa ? [{ code: 'PLACA', value: values.placa }] : [])
    ],
    options: { includeTrace: true, includeContextualCandidates: true }
  };
}
