import { TestBed } from '@angular/core/testing';
import { ConsolidatedProfileResponse } from '../infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { ProfileIntelligenceService } from './profile-intelligence.service';

describe('ProfileIntelligenceService', () => {
  let service: ProfileIntelligenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileIntelligenceService);
  });

  it('describes only values received in the profile', () => {
    const profile = createProfile();
    const analysis = service.analyze(profile);
    expect(analysis.summary).toContain('2 datos con valor');
    expect(analysis.summary).toContain('1 dirección registrada');
    expect(analysis.facts.some((fact) => fact.value === 'ANA')).toBeTrue();
    expect(analysis.facts.some((fact) => fact.value.includes('Reforma 100'))).toBeTrue();
  });

  it('detects different values for the same field without deciding which one is correct', () => {
    const profile = createProfile();
    profile.data = [
      ...(profile.data ?? []),
      { dataId: 'd-3', code: 'NOMBRE', value: 'ANAHI', origins: [{ originId: 'o-2', sourceCode: 'SAU', sourceRecordId: '20' }] }
    ];
    const answer = service.answer('¿Hay inconsistencias?', profile);
    expect(answer.text).toContain('Nombre: ANA / ANAHI');
    expect(answer.disclaimer).toContain('no implica');
  });

  it('does not invent addresses when the response has none', () => {
    const profile = createProfile();
    profile.addresses = [];
    const answer = service.answer('¿Qué domicilios tiene?', profile);
    expect(answer.text).toBe('El perfil recibido no contiene direcciones registradas.');
    expect(answer.evidence.length).toBe(0);
  });
});

function createProfile(): ConsolidatedProfileResponse {
  return {
    profileId: 'profile-1', profileVersionId: 'version-1', versionNumber: 1,
    searchId: 'search-1', preconsolidatedResultId: 'result-1', effectiveAtUtc: '2026-08-21T12:00:00Z',
    data: [
      { dataId: 'd-1', code: 'NOMBRE', value: 'ANA', origins: [{ originId: 'o-1', sourceCode: 'ECCC', sourceRecordId: '10' }] },
      { dataId: 'd-2', code: 'CURP', value: 'AAAA000000HDFBBB00', origins: [{ originId: 'o-1', sourceCode: 'ECCC', sourceRecordId: '10' }] }
    ],
    addresses: [
      { addressId: 'a-1', type: 'Domicilio', street: 'Reforma', exteriorNumber: '100', neighborhood: 'Centro', municipality: 'Cuauhtémoc', state: 'Ciudad de México', postalCode: '06000', origins: [{ originId: 'o-1', sourceCode: 'ECCC', sourceRecordId: '10' }] }
    ]
  };
}
