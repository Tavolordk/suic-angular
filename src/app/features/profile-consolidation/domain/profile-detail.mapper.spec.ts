import { describe, expect, it } from 'vitest';
import { SearchResultDetailResponse } from '../../../core/infrastructure/search-api/search-api.models';
import { mapSearchResultDetail } from './profile-detail.mapper';

const createDetail = (): SearchResultDetailResponse => ({
  searchId: '11111111-1111-1111-1111-111111111111',
  resultId: '22222222-2222-2222-2222-222222222222',
  entityType: 'Person',
  kind: 'Enriched',
  status: 'Completed',
  hasConflicts: false,
  sourceGroups: [
    {
      sourceCode: 'RND',
      sourceName: 'Registro Nacional de Detenciones',
      records: [
        {
          sourceRecordId: 'RND-001',
          identifiers: [
            {
              evidenceId: 'evidence-curp',
              code: 'CURP',
              value: 'HEGM880202HMCRDG02'
            },
            {
              evidenceId: 'evidence-rfc',
              code: 'RFC',
              value: 'HEMM7709295Z9'
            },
            {
              evidenceId: 'evidence-niv',
              code: 'vehicle.identifiers.NIV',
              value: '1HGCM82633A004352'
            },
            {
              evidenceId: 'evidence-person-id',
              code: 'personId',
              value: '98765'
            },
            {
              evidenceId: 'evidence-id-person',
              code: 'idPersona',
              value: '123'
            },
            {
              evidenceId: 'evidence-uppercase-id',
              code: 'ID_PERSONA',
              value: '456'
            },
            {
              evidenceId: 'evidence-guid',
              code: 'employeeGuid',
              value: 'abc'
            },
            {
              evidenceId: 'evidence-identifier',
              code: 'identificadorEmpleado',
              value: 'EMP-100'
            }
          ],
          attributes: [
            {
              evidenceId: 'evidence-name',
              code: 'nombre',
              value: 'MIGUEL ANGEL'
            },
            {
              evidenceId: 'evidence-last-name',
              code: 'apellidoPaterno',
              value: 'HERNANDEZ'
            },
            {
              evidenceId: 'evidence-birth-date',
              code: 'fechaNacimiento',
              value: '1977-09-29'
            },
            {
              evidenceId: 'evidence-nested',
              code: 'employee.esto.aquello',
              value: 'VALOR FINAL'
            },
            {
              evidenceId: 'evidence-created-date',
              code: 'employee.fechaCreacion',
              value: '2020-01-01T10:00:00Z'
            },
            {
              evidenceId: 'evidence-assignment-update',
              code: 'employee.adscripcion.fechaActualizacion',
              value: '2026-07-28T15:10:00Z'
            },
            {
              evidenceId: 'evidence-person-update',
              code: 'employee.persona.fechaActualizacion',
              value: '2026-07-29T11:20:00Z'
            },
            {
              evidenceId: 'evidence-nested-id-segment',
              code: 'employee.id.valor',
              value: '999'
            },
            {
              evidenceId: 'evidence-plural-ids',
              code: 'employee.ids',
              value: '1,2,3'
            },
            {
              evidenceId: 'evidence-record-id',
              code: 'sourceRecordId',
              value: 'RND-001'
            },
            {
              evidenceId: 'evidence-object-id',
              code: 'employee.objectId',
              value: '507f1f77bcf86cd799439011'
            },
            {
              evidenceId: 'evidence-uuid-value',
              code: 'employee.claveInterna',
              value: '550e8400-e29b-41d4-a716-446655440000'
            }
          ]
        }
      ]
    }
  ],
  linkGroups: [
    {
      entityType: 'Vehicle',
      count: 1,
      items: [
        {
          linkId: '33333333-3333-3333-3333-333333333333',
          status: 'ACTIVE',
          relationshipCode: 'OWNER',
          identifiers: [
            { evidenceId: 'link-vehicle-id', code: 'vehicleId', value: '98765' },
            { evidenceId: 'link-vehicle-niv', code: 'vehicle.identifiers.NIV', value: '4JKL5678901' }
          ],
          attributes: [
            { evidenceId: 'link-vehicle-plate', code: 'vehicle.placa', value: 'GDL234' },
            { evidenceId: 'link-vehicle-date', code: 'vehicle.fechaRegistro', value: '2025-01-01' },
            { evidenceId: 'link-vehicle-model', code: 'vehicle.modelo', value: 'CIVIC' }
          ],
          origins: [
            {
              sourceLinkId: '44444444-4444-4444-4444-444444444444',
              sourceCode: 'REPUVE',
              sourceRecordId: 'REPUVE-01'
            }
          ]
        }
      ]
    },
    {
      entityType: 'Person',
      count: 1,
      items: [
        {
          linkId: '55555555-5555-5555-5555-555555555555',
          identifiers: [
            { evidenceId: 'link-person-id', code: 'personId', value: '123' },
            { evidenceId: 'link-person-curp', code: 'CURP', value: 'JLMG680423HDFRTY' }
          ],
          attributes: [
            { evidenceId: 'link-person-name', code: 'person.name', value: 'JOSE GARCIA FLORES' },
            { evidenceId: 'link-person-birth', code: 'person.fechaNacimiento', value: '1968-04-23' }
          ],
          origins: [
            {
              sourceLinkId: '66666666-6666-6666-6666-666666666666',
              sourceCode: 'RNPSP'
            }
          ]
        }
      ]
    },
    {
      entityType: 'Weapon',
      count: 1,
      items: [
        {
          linkId: '75571f55-4d6a-4c7f-be49-99434df61c62',
          status: 'Independent',
          relationshipCode: 'PORTADOR',
          identifiers: [],
          attributes: [
            {
              evidenceId: '7bf6808b-b0bf-d17c-30d9-446635555ecc',
              code: 'idArma',
              value: '3006',
              origins: [
                {
                  sourceCode: 'RNPSP',
                  sourceName: 'Registro Nacional de Personal de Seguridad Publica',
                  sourceRecordId: '196528'
                }
              ]
            },
            {
              evidenceId: '23cc36aa-befd-bae0-eaad-8ddb014911f4',
              code: 'numeroLicencia',
              value: '41',
              origins: [
                {
                  sourceCode: 'RNPSP',
                  sourceName: 'Registro Nacional de Personal de Seguridad Publica',
                  sourceRecordId: '196528'
                }
              ]
            },
            {
              evidenceId: '5a8eb8be-7aa6-453b-7b48-999313f28764',
              code: 'tipoArmaId',
              value: '2',
              origins: [
                {
                  sourceCode: 'RNPSP',
                  sourceName: 'Registro Nacional de Personal de Seguridad Publica',
                  sourceRecordId: '196528'
                }
              ]
            },
            {
              evidenceId: 'eefda0aa-b774-7b90-c724-9c2fc1536889',
              code: 'tipoArma',
              value: 'REVOLVER',
              origins: [
                {
                  sourceCode: 'RNPSP',
                  sourceName: 'Registro Nacional de Personal de Seguridad Publica',
                  sourceRecordId: '196528'
                }
              ]
            }
          ],
          origins: [
            {
              sourceLinkId: '9ad8e69a-62ab-4ff2-a055-4defbffeb8ab',
              sourceCode: 'RNPSP',
              sourceName: 'Registro Nacional de Personal de Seguridad Publica',
              sourceRecordId: '196528'
            }
          ]
        }
      ]
    }
  ]
});

describe('mapSearchResultDetail', () => {
  it('construye las fuentes con la información útil del resultado real', () => {
    const result = mapSearchResultDetail(createDetail());

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].title).toBe('RND');
    expect(result.sources[0].description).toBe(
      'Registro Nacional de Detenciones'
    );
    expect(result.sources[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'CURP', value: 'HEGM880202HMCRDG02' }),
        expect.objectContaining({ label: 'RFC', value: 'HEMM7709295Z9' }),
        expect.objectContaining({ label: 'NIV/VIN', value: '1HGCM82633A004352' }),
        expect.objectContaining({ label: 'Nombre', value: 'MIGUEL ANGEL' }),
        expect.objectContaining({
          label: 'Apellido paterno',
          value: 'HERNANDEZ'
        }),
        expect.objectContaining({
          label: 'Fecha de nacimiento',
          value: '29/09/1977'
        })
      ])
    );
  });

  it('elimina absolutamente todos los identificadores técnicos', () => {
    const result = mapSearchResultDetail(createDetail());
    const fields = result.sources[0].fields;
    const visibleCodes = fields.map((field) => field.code);

    expect(visibleCodes).not.toEqual(
      expect.arrayContaining([
        'personId',
        'idPersona',
        'ID_PERSONA',
        'employeeGuid',
        'identificadorEmpleado',
        'employee.id.valor',
        'employee.ids',
        'sourceRecordId',
        'employee.objectId',
        'employee.claveInterna'
      ])
    );

    expect(
      fields.some((field) =>
        /(^|\s)(id|ids|uuid|guid|identificador|identifier)(\s|$)/i.test(
          field.label
        )
      )
    ).toBe(false);
  });

  it('conserva solo las fechas autorizadas', () => {
    const result = mapSearchResultDetail(createDetail());
    const fields = result.sources[0].fields;

    expect(fields.some((field) => field.code === 'employee.fechaCreacion')).toBe(
      false
    );

    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Fecha actualización adscripción',
          value: '28/07/2026'
        }),
        expect.objectContaining({
          label: 'Fecha actualización persona',
          value: '29/07/2026'
        })
      ])
    );
  });

  it('usa únicamente el último segmento de una ruta JSON como nombre del campo', () => {
    const result = mapSearchResultDetail(createDetail());
    const nestedField = result.sources[0].fields.find(
      (field) => field.code === 'employee.esto.aquello'
    );

    expect(nestedField).toEqual(
      expect.objectContaining({
        label: 'Aquello',
        value: 'VALOR FINAL'
      })
    );
  });

  it('forma el encabezado del perfil con la evidencia disponible', () => {
    const result = mapSearchResultDetail(createDetail());

    expect(result.profileName).toBe('MIGUEL ANGEL HERNANDEZ');
    expect(result.profileSubtitle).toContain('HEGM880202HMCRDG02');
  });

  it('mapea los vínculos sin usar cantidades simuladas', () => {
    const result = mapSearchResultDetail(createDetail());

    expect(result.links).toEqual([
      expect.objectContaining({ label: 'Vehículo', count: 1, kind: 'vehicle' }),
      expect.objectContaining({ label: 'Persona', count: 1, kind: 'person' }),
      expect.objectContaining({ label: 'Arma', count: 1, kind: 'weapon' })
    ]);
  });

  it('mapea la información visible de los vínculos sin exponer IDs técnicos', () => {
    const result = mapSearchResultDetail(createDetail());
    const vehicle = result.links[0];
    const person = result.links[1];

    expect(vehicle.items[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'NIV/VIN', value: '4JKL5678901' }),
        expect.objectContaining({ label: 'Placa', value: 'GDL234' }),
        expect.objectContaining({ label: 'Modelo', value: 'CIVIC' })
      ])
    );
    expect(vehicle.items[0].fields.some((field) => field.label.includes('Id'))).toBe(false);
    expect(vehicle.items[0].fields.some((field) => field.value === '98765')).toBe(false);
    expect(vehicle.items[0].fields.some((field) => field.label.includes('Fecha registro'))).toBe(false);
    expect(vehicle.items[0].sources).toEqual([
      expect.objectContaining({ label: 'REPUVE' })
    ]);

    expect(person.items[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Nombre', value: 'JOSE GARCIA FLORES' }),
        expect.objectContaining({ label: 'Fecha de nacimiento', value: '23/04/1968' }),
        expect.objectContaining({ label: 'CURP', value: 'JLMG680423HDFRTY' })
      ])
    );
    expect(person.items[0].fields.some((field) => field.value === '123')).toBe(false);
  });

  it('obtiene el detalle de armas desde linkGroups y oculta sus IDs técnicos', () => {
    const result = mapSearchResultDetail(createDetail());
    const weapon = result.links.find((link) => link.entityType === 'Weapon');

    expect(weapon).toEqual(
      expect.objectContaining({
        label: 'Arma',
        count: 1,
        kind: 'weapon'
      })
    );

    expect(weapon?.items[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Número de licencia', value: '41' }),
        expect.objectContaining({ label: 'Tipo de arma', value: 'REVOLVER' }),
        expect.objectContaining({ label: 'Estatus', value: 'Independiente' }),
        expect.objectContaining({ label: 'Relación', value: 'Portador' })
      ])
    );

    expect(
      weapon?.items[0].fields.some((field) =>
        ['3006', '2'].includes(field.value)
      )
    ).toBe(false);

    expect(weapon?.items[0].sources).toEqual([
      expect.objectContaining({ label: 'RNPSP' })
    ]);
  });

});
