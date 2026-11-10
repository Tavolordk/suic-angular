import {
  ConsolidatedProfileAddressDto,
  ConsolidatedProfileDataDto,
  ConsolidatedProfileOriginDto,
  ConsolidatedProfileResponse
} from '../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { ProfileSourceViewModel } from './profile-consolidation.models';

/**
 * La consulta del resultado muestra las fuentes originales; el GET del perfil
 * consolidado indica cuáles valores se guardaron efectivamente. No seleccionar
 * todas las evidencias del detalle: no necesariamente fueron consolidadas.
 */
export function mapPersistedConsolidation(
  originalSources: ProfileSourceViewModel[],
  profile: ConsolidatedProfileResponse
): ProfileSourceViewModel[] {
  const sources = originalSources.map(source => ({
    ...source,
    fields: source.fields.map(field => ({ ...field, selected: false }))
  }));
  const persisted = [
    ...(profile.data ?? []).flatMap(data => mapData(data)),
    ...(profile.addresses ?? []).flatMap(address => mapAddress(address))
  ];

  persisted.forEach(item => {
    const origins = item.origins?.length ? item.origins : [null];
    origins.forEach(origin => {
      const matchingSources = sources.filter(source =>
        !origin?.sourceCode?.trim() || normalize(source.title) === normalize(origin.sourceCode)
      );
      const matchingField = matchingSources.flatMap(source =>
        source.fields.map(field => ({ source, field }))
      ).find(({ field }) => normalize(field.code) === normalize(item.code)
        && normalize(field.value) === normalize(item.value));

      if (matchingField) {
        matchingField.field.selected = true;
        return;
      }

      // El perfil persistido puede contener campos no presentes en las fuentes
      // expuestas por el detalle. Se muestran sus valores reales sin inventarlos.
      const sourceCode = origin?.sourceCode?.trim() || 'Perfil consolidado';
      let source = sources.find(candidate => normalize(candidate.title) === normalize(sourceCode));
      if (!source) {
        source = {
          id: `persisted-source-${normalize(sourceCode)}`,
          code: sourceCode === 'Perfil consolidado' ? 'PC' : normalize(sourceCode).slice(0, 2),
          title: sourceCode,
          description: 'Datos registrados en el perfil consolidado',
          color: '#1C6A54',
          recordCount: 1,
          rawEvidenceCount: 0,
          fields: []
        };
        sources.push(source);
      }
      // No duplicar datos idénticos si varias procedencias los reportan.
      if (source.fields.some(field => field.selected && normalize(field.code) === normalize(item.code)
        && normalize(field.value) === normalize(item.value))) return;
      source.fields.push({
        id: `persisted-${item.id}-${source.id}`,
        code: item.code,
        label: labelFor(item.code),
        value: item.value,
        selected: true,
        isIdentifier: false,
        isFile: false,
        recordIndex: 0
      });
      source.rawEvidenceCount++;
    });
  });
  return sources;
}

interface PersistedField {
  id: string;
  code: string;
  value: string;
  origins?: ConsolidatedProfileOriginDto[] | null;
}

function mapData(data: ConsolidatedProfileDataDto): PersistedField[] {
  const value = data.value?.trim();
  const code = data.code?.trim() || data.dataType?.trim();
  return value && code
    ? [{ id: data.dataId, code, value, origins: data.origins }]
    : [];
}

function mapAddress(address: ConsolidatedProfileAddressDto): PersistedField[] {
  const fields: Array<[string, string | null | undefined]> = [
    ['TIPODOMICILIO', address.type],
    ['CALLE', address.street],
    ['NUMEROEXTERIOR', address.exteriorNumber],
    ['NUMEROINTERIOR', address.interiorNumber],
    ['COLONIA', address.neighborhood],
    ['CODIGOPOSTAL', address.postalCode],
    ['ESTADO', address.state],
    ['MUNICIPIO', address.municipality]
  ];
  // stateId y municipalityId son claves de catálogo, no nombres legibles.
  return fields.flatMap(([code, value]) => value?.trim()
    ? [{ id: `${address.addressId}-${code}`, code, value: value.trim(), origins: address.origins }]
    : []);
}

function normalize(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

const FIELD_LABELS: Record<string, string> = {
  NOMBRE: 'Nombre', NOMBRES: 'Nombre(s)', NOMBRECOMPLETO: 'Nombre completo',
  CURP: 'CURP', RFC: 'RFC', ALIAS: 'Alias', CALLE: 'Calle',
  NUMEROEXTERIOR: 'Número exterior', NUMEROINTERIOR: 'Número interior',
  COLONIA: 'Colonia', CODIGOPOSTAL: 'Código postal',
  ESTADO: 'Estado', MUNICIPIO: 'Municipio', TIPODOMICILIO: 'Tipo de domicilio'
};

function labelFor(code: string): string {
  return FIELD_LABELS[normalize(code)] || code.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
}
