import { describe, expect, it } from 'vitest';
import { PersonSearchFormValue } from './person-search.models';
import { buildPersonSearchRequest } from './search-request.mapper';

const emptyForm = (): PersonSearchFormValue => ({
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  alias: '',
  fechaNacimiento: '',
  curp: '',
  rfc: ''
});

describe('buildPersonSearchRequest', () => {
  it('genera una búsqueda exacta por CURP', () => {
    expect(
      buildPersonSearchRequest({
        ...emptyForm(),
        curp: 'HEGM880202HMCRDG02'
      })
    ).toEqual({
      entityType: 'Person',
      criteria: [],
      identifiers: [{ code: 'CURP', value: 'HEGM880202HMCRDG02' }],
      options: {
        includeTrace: false,
        includeContextualCandidates: true
      }
    });
  });

  it('combina RFC con nombre y apellido paterno', () => {
    const request = buildPersonSearchRequest({
      ...emptyForm(),
      nombres: 'Miguel Angel',
      apellidoPaterno: 'Hernandez',
      rfc: 'HEMM7709295Z9'
    });

    expect(request.criteria).toEqual([
      { field: 'nombre', value: 'MIGUEL ANGEL' },
      { field: 'apellidoPaterno', value: 'HERNANDEZ' }
    ]);
    expect(request.identifiers).toEqual([
      { code: 'RFC', value: 'HEMM7709295Z9' }
    ]);
  });

  it('genera nombre más apellido paterno', () => {
    const request = buildPersonSearchRequest({
      ...emptyForm(),
      nombres: 'MIGUEL ANGEL',
      apellidoPaterno: 'HERNANDEZ'
    });

    expect(request.criteria).toEqual([
      { field: 'nombre', value: 'MIGUEL ANGEL' },
      { field: 'apellidoPaterno', value: 'HERNANDEZ' }
    ]);
  });

  it('genera el nombre completo', () => {
    const request = buildPersonSearchRequest({
      ...emptyForm(),
      nombres: 'MIGUEL ANGEL',
      apellidoPaterno: 'HERNANDEZ',
      apellidoMaterno: 'MENDOZA'
    });

    expect(request.criteria).toEqual([
      { field: 'nombre', value: 'MIGUEL ANGEL' },
      { field: 'apellidoPaterno', value: 'HERNANDEZ' },
      { field: 'apellidoMaterno', value: 'MENDOZA' }
    ]);
  });

  it('combina nombre, apellido paterno y fecha de nacimiento', () => {
    const request = buildPersonSearchRequest({
      ...emptyForm(),
      nombres: 'MIGUEL ANGEL',
      apellidoPaterno: 'HERNANDEZ',
      fechaNacimiento: '1977-09-29'
    });

    expect(request.criteria).toEqual([
      { field: 'nombre', value: 'MIGUEL ANGEL' },
      { field: 'apellidoPaterno', value: 'HERNANDEZ' },
      { field: 'fechaNacimiento', value: '1977-09-29' }
    ]);
  });
});
