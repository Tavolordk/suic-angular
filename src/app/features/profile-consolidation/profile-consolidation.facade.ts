import { Injectable, computed, signal } from '@angular/core';

export interface ProfileSource {
  id: string;
  code: string;
  title: string;
  description: string;
  percentage: number;
  color: string;
  fields: ProfileField[];
}

export interface ProfileField {
  id: string;
  label: string;
  value: string;
  selected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileConsolidationFacade {
  private readonly selectedSourceId = signal('rnd');
  private readonly acceptedValue = signal(false);

  readonly accepted = this.acceptedValue.asReadonly();

  readonly sources = signal<ProfileSource[]>([
    {
      id: 'rnd',
      code: 'RN',
      title: 'RND',
      description: 'Registro Nacional de Detenciones',
      percentage: 50,
      color: '#1f7745',
      fields: [
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'alias', label: 'Alias', value: 'El Benny', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false }
      ]
    },
    {
      id: 'iph',
      code: 'IP',
      title: 'IPH',
      description: 'Informe Policial Homologado',
      percentage: 60,
      color: '#12395c',
      fields: [
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'alias', label: 'Alias', value: 'El Benny', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false }
      ]
    },
    {
      id: 'rnip',
      code: 'RN',
      title: 'RNIP',
      description: 'Registro Nacional de Información Penitenciaria',
      percentage: 50,
      color: '#6c461f',
      fields: [
        { id: 'fotografia', label: 'Fotografía', value: '—', selected: false },
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'alias', label: 'Alias', value: 'El Benny', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false }
      ]
    },
    {
      id: 'mandamientos',
      code: 'MA',
      title: 'MANDAMIENTOS',
      description: 'Mandamientos Judiciales',
      percentage: 50,
      color: '#415261',
      fields: [
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'alias', label: 'Alias', value: 'El Benny', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false }
      ]
    },
    {
      id: 'licencias',
      code: 'LI',
      title: 'LICENCIAS',
      description: 'Registro Nacional de Licencias de Conducir',
      percentage: 50,
      color: '#3b1d67',
      fields: [
        { id: 'fotografia', label: 'Fotografía', value: '—', selected: false },
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false }
      ]
    },
    {
      id: 'rnpsp',
      code: 'RN',
      title: 'RNPSP',
      description: 'Registro Nacional de Personal de Seguridad Pública',
      percentage: 95,
      color: '#163247',
      fields: [
        { id: 'fotografia', label: 'Fotografía', value: '—', selected: false },
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false }
      ]
    },
    {
      id: 'repuve',
      code: 'RE',
      title: 'REPUVE',
      description: 'Registro Público Vehicular',
      percentage: 80,
      color: '#6e1f6e',
      fields: [
        { id: 'apellidoPaterno', label: 'Apellido Paterno', value: 'Juárez', selected: false },
        { id: 'apellidoMaterno', label: 'Apellido Materno', value: 'García', selected: false },
        { id: 'nombre', label: 'Nombre', value: 'Benito', selected: false },
        { id: 'fechaNacimiento', label: 'Fecha de Nacimiento', value: '15/03/1987', selected: false },
        { id: 'curp', label: 'CURP', value: 'JDPS950728HDFAE', selected: false },
        { id: 'rfc', label: 'RFC', value: 'JDPS870315HDF0', selected: false }
      ]
    }
  ]);

  readonly selectedSource = computed(() => {
    return this.sources().find(source => source.id === this.selectedSourceId()) ?? this.sources()[0];
  });

  readonly selectedFieldsCount = computed(() => {
    return this.sources()
      .flatMap(source => source.fields)
      .filter(field => field.selected).length;
  });

  readonly selectedFields = computed(() => {
    return this.sources()
      .flatMap(source =>
        source.fields
          .filter(field => field.selected)
          .map(field => ({
            ...field,
            sourceTitle: source.title,
            sourceColor: source.color
          }))
      );
  });

  readonly totalFieldsCount = computed(() => {
    return 49;
  });

  readonly completedLabel = computed(() => {
    return `${this.selectedFieldsCount()} de ${this.totalFieldsCount()}`;
  });

  selectSource(sourceId: string): void {
    this.selectedSourceId.set(sourceId);
  }

  toggleField(fieldId: string): void {
    const sourceId = this.selectedSourceId();

    this.sources.update(sources =>
      sources.map(source => {
        if (source.id !== sourceId) {
          return source;
        }

        return {
          ...source,
          fields: source.fields.map(field =>
            field.id === fieldId
              ? { ...field, selected: !field.selected }
              : field
          )
        };
      })
    );
  }

  selectAllCurrentSource(): void {
    const sourceId = this.selectedSourceId();

    this.sources.update(sources =>
      sources.map(source => {
        if (source.id !== sourceId) {
          return source;
        }

        return {
          ...source,
          fields: source.fields.map(field => ({
            ...field,
            selected: true
          }))
        };
      })
    );
  }

  acceptProfile(): void {
    this.acceptedValue.set(true);
  }
}