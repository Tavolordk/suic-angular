import { Injectable, computed, signal } from '@angular/core';
import { Person } from '../../core/domain/entities/person';
import { PEOPLE_MOCK } from '../../core/infrastructure/data/people.mock';

@Injectable({
  providedIn: 'root'
})
export class PersonDetailFacade {
  private readonly selectedPersonId = signal<string | null>(null);

  readonly person = computed<Person | undefined>(() => {
    const id = this.selectedPersonId();

    if (!id) {
      return undefined;
    }

    return PEOPLE_MOCK.find(person => person.id === id);
  });

  readonly addresses = computed(() => [
    {
      type: 'Domicilio principal',
      value: this.person()?.lastKnownAddress ?? 'Sin información',
      date: '2026-05-20'
    },
    {
      type: 'Domicilio anterior',
      value: 'Benito Juárez, Ciudad de México',
      date: '2024-11-12'
    },
    {
      type: 'Referencia',
      value: 'Zona centro, Acapulco de Juárez',
      date: '2023-08-02'
    }
  ]);

  readonly records = computed(() => [
    {
      source: 'Registro Nacional',
      description: 'Consulta de identidad validada',
      date: '2026-05-20',
      status: 'Activo'
    },
    {
      source: 'Movilidad',
      description: 'Coincidencia con domicilio registrado',
      date: '2025-12-18',
      status: 'Validado'
    },
    {
      source: 'Inteligencia',
      description: 'Relación indirecta con persona asociada',
      date: '2025-09-04',
      status: 'Pendiente'
    }
  ]);

  readonly relations = computed(() => [
    {
      name: 'Roberto Salinas Vega',
      type: 'Asociado',
      risk: 'Alto'
    },
    {
      name: 'Claudia Ivonne Pérez',
      type: 'Familiar',
      risk: 'Medio'
    },
    {
      name: 'Grupo Operativo Sur',
      type: 'Organización',
      risk: 'Crítico'
    }
  ]);

  loadPerson(id: string): void {
    this.selectedPersonId.set(id);
  }
}