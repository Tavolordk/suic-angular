import { Injectable, computed, signal } from '@angular/core';
import { findSearchResultById, SearchResultMock } from '../../core/infrastructure/data/search-results.mock';

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
  private readonly profileValue = signal<SearchResultMock>(findSearchResultById('1'));

  readonly accepted = this.acceptedValue.asReadonly();
  readonly profile = this.profileValue.asReadonly();

  readonly sources = signal<ProfileSource[]>(
    this.createSources(this.profileValue())
  );

  readonly selectedSource = computed(() => {
    return (
      this.sources().find(source => source.id === this.selectedSourceId()) ??
      this.sources()[0]
    );
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

  readonly totalFieldsCount = computed(() => 49);

  readonly completedLabel = computed(() => {
    return `${this.selectedFieldsCount()} de ${this.totalFieldsCount()}`;
  });

  loadProfile(profileId: string): void {
    const profile = findSearchResultById(profileId);

    this.profileValue.set(profile);
    this.acceptedValue.set(false);
    this.selectedSourceId.set('rnd');
    this.sources.set(this.createSources(profile));
  }

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

  private createSources(profile: SearchResultMock): ProfileSource[] {
    const fields: ProfileField[] = [
      {
        id: 'apellidoPaterno',
        label: 'Apellido Paterno',
        value: profile.paternalLastName,
        selected: false
      },
      {
        id: 'apellidoMaterno',
        label: 'Apellido Materno',
        value: profile.maternalLastName || '—',
        selected: false
      },
      {
        id: 'nombre',
        label: 'Nombre',
        value: profile.firstName,
        selected: false
      },
      {
        id: 'alias',
        label: 'Alias',
        value: profile.alias,
        selected: false
      },
      {
        id: 'fechaNacimiento',
        label: 'Fecha de Nacimiento',
        value: '15/03/1987',
        selected: false
      },
      {
        id: 'curp',
        label: 'CURP',
        value: profile.curp,
        selected: false
      },
      {
        id: 'rfc',
        label: 'RFC',
        value: profile.rfc,
        selected: false
      }
    ];

    return [
      {
        id: 'rnd',
        code: 'RN',
        title: 'RND',
        description: 'Registro Nacional de Detenciones',
        percentage: 50,
        color: '#1f7745',
        fields: structuredClone(fields)
      },
      {
        id: 'iph',
        code: 'IP',
        title: 'IPH',
        description: 'Informe Policial Homologado',
        percentage: 60,
        color: '#12395c',
        fields: structuredClone(fields)
      },
      {
        id: 'rnip',
        code: 'RN',
        title: 'RNIP',
        description: 'Registro Nacional de Información Penitenciaria',
        percentage: 50,
        color: '#6c461f',
        fields: [
          {
            id: 'fotografia',
            label: 'Fotografía',
            value: '—',
            selected: false
          },
          ...structuredClone(fields)
        ]
      },
      {
        id: 'mandamientos',
        code: 'MA',
        title: 'MANDAMIENTOS',
        description: 'Mandamientos Judiciales',
        percentage: 50,
        color: '#415261',
        fields: structuredClone(fields)
      },
      {
        id: 'licencias',
        code: 'LI',
        title: 'LICENCIAS',
        description: 'Registro Nacional de Licencias de Conducir',
        percentage: 50,
        color: '#3b1d67',
        fields: [
          {
            id: 'fotografia',
            label: 'Fotografía',
            value: '—',
            selected: false
          },
          ...structuredClone(fields)
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
          {
            id: 'fotografia',
            label: 'Fotografía',
            value: '—',
            selected: false
          },
          ...structuredClone(fields)
        ]
      },
      {
        id: 'repuve',
        code: 'RE',
        title: 'REPUVE',
        description: 'Registro Público Vehicular',
        percentage: 80,
        color: '#6e1f6e',
        fields: structuredClone(fields).filter(field => field.id !== 'alias')
      }
    ];
  }
}