import { mapPersistedConsolidation } from './consolidated-profile-view.mapper';
import { ProfileSourceViewModel } from './profile-consolidation.models';
import { ConsolidatedProfileResponse } from '../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';

describe('Vista de sólo lectura de la consolidación persistida', () => {
  const source: ProfileSourceViewModel = {
    id: 'source-1', code: 'RN', title: 'RNPSP', description: '1 registro', color: '#1C6A54',
    recordCount: 1, rawEvidenceCount: 2,
    fields: [
      { id: 'ev1', code: 'NOMBRE', label: 'Nombre', value: 'ANA LOPEZ PEREZ', selected: false, recordIndex: 0, isIdentifier: false, isFile: false },
      { id: 'ev2', code: 'CURP', label: 'CURP', value: 'DATO NO CONSOLIDADO', selected: false, recordIndex: 0, isIdentifier: true, isFile: false }
    ]
  };
  const profile: ConsolidatedProfileResponse = {
    profileId: 'original-1', profileVersionId: 'version-1', versionNumber: 1,
    searchId: 's1', preconsolidatedResultId: 'r1', effectiveAtUtc: '2026-11-10T16:00:00Z',
    data: [{ dataId: 'd1', code: 'NOMBRE', value: 'ANA LOPEZ PEREZ', origins: [{ originId: 'o1', sourceCode: 'RNPSP' }] }],
    addresses: []
  };

  it('marca únicamente los datos verdaderamente persistidos, manteniendo evidencias originales', () => {
    const mapped = mapPersistedConsolidation([source], profile);
    expect(mapped[0].fields.map(field => field.selected)).toEqual([true, false]);
    expect(source.fields.every(field => !field.selected)).toBe(true);
  });

  it('muestra los datos persistidos aunque el detalle omita ese atributo', () => {
    const mapped = mapPersistedConsolidation([source], {
      ...profile, data: [{ dataId: 'd2', code: 'RFC', value: 'UN RFC PERSISTIDO', origins: [{ originId: 'o1', sourceCode: 'RNPSP' }] }]
    });
    expect(mapped[0].fields.find(field => field.value === 'UN RFC PERSISTIDO')?.selected).toBe(true);
    expect(mapped[0].fields.some(field => field.value === 'DATO NO CONSOLIDADO' && field.selected)).toBe(false);
  });

  it('no inventa datos ni marca todo como seleccionado cuando el backend no los devuelve', () => {
    const mapped = mapPersistedConsolidation([source], { ...profile, data: null, addresses: null });
    expect(mapped[0].fields.every(field => !field.selected)).toBe(true);
  });
});
