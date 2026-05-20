import { Component, signal } from '@angular/core';

type EntityType = 'personas' | 'vehiculo' | 'armas';

interface SearchField {
  placeholder: string;
}

interface SearchResult {
  id: number;
  name: string;
  alias: string;
  curp: string;
  rfc: string;
  vehicles: number;
  weapons: number;
  people: number;
  bookmarked: boolean;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage {
  readonly selectedEntity = signal<EntityType>('personas');
  readonly expanded = signal(true);
  readonly searched = signal(false);
  readonly pageSize = signal(10);

  readonly results: SearchResult[] = [
    {
      id: 1,
      name: 'Benito Juárez García',
      alias: 'El Benny',
      curp: 'JDPS950728HDFABC',
      rfc: 'CVLT850901MDFMNS',
      vehicles: 1,
      weapons: 3,
      people: 0,
      bookmarked: true
    },
    {
      id: 2,
      name: 'María López Hernández',
      alias: 'La Sombra',
      curp: 'MLFH870315MMNRXZ',
      rfc: '—',
      vehicles: 1,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 3,
      name: 'Omar Hernández Reyes',
      alias: 'El Rojo',
      curp: 'OHRR920614HDFQWP',
      rfc: 'APGE910812MMNNKL',
      vehicles: 0,
      weapons: 0,
      people: 2,
      bookmarked: false
    },
    {
      id: 4,
      name: 'Carmen Villanueva Torres',
      alias: '—',
      curp: 'CVLT850901MDFMNS',
      rfc: 'RCDS750630HDFPML',
      vehicles: 1,
      weapons: 0,
      people: 2,
      bookmarked: false
    },
    {
      id: 5,
      name: 'José Luis Martínez',
      alias: 'El Coronel',
      curp: 'JL MG680423HDFRTY'.replace(' ', ''),
      rfc: 'LFRZ881120MMNDRT',
      vehicles: 0,
      weapons: 3,
      people: 0,
      bookmarked: false
    },
    {
      id: 6,
      name: 'Ana Patricia Gómez',
      alias: 'La Gata',
      curp: 'APGE910812MMNNKL',
      rfc: '—',
      vehicles: 1,
      weapons: 0,
      people: 0,
      bookmarked: false
    },
    {
      id: 7,
      name: 'Roberto Carlos Díaz',
      alias: 'El Tigre',
      curp: 'RCDS750630HDFPML',
      rfc: 'GEMM800710MMNSPL',
      vehicles: 0,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 8,
      name: 'Lucía Fernández Ruiz',
      alias: 'La Doctora',
      curp: 'LFRZ881120MMNDRT',
      rfc: 'FJPP721005HDFBCD',
      vehicles: 1,
      weapons: 0,
      people: 0,
      bookmarked: true
    },
    {
      id: 9,
      name: 'Miguel Ángel Sánchez',
      alias: 'El Chato',
      curp: 'MASV940225HDFQRT',
      rfc: 'SICF951230MMNASD',
      vehicles: 1,
      weapons: 3,
      people: 2,
      bookmarked: false
    },
    {
      id: 10,
      name: 'Gloria Esperanza Mora',
      alias: 'La Reina',
      curp: 'GEMM800710MMNSPL',
      rfc: '—',
      vehicles: 0,
      weapons: 0,
      people: 2,
      bookmarked: false
    }
  ];

  get fields(): SearchField[] {
    if (this.selectedEntity() === 'vehiculo') {
      return [
        { placeholder: 'NIV / VIN' },
        { placeholder: 'Placa' },
        { placeholder: 'No. de motor' },
        { placeholder: 'Marca' },
        { placeholder: 'Submarca' },
        { placeholder: 'Modelo' }
      ];
    }

    if (this.selectedEntity() === 'armas') {
      return [
        { placeholder: 'Matrícula' },
        { placeholder: 'No. de serie' },
        { placeholder: 'Marca' },
        { placeholder: 'Modelo' },
        { placeholder: 'Calibre' }
      ];
    }

    return [
      { placeholder: 'Nombre (s)' },
      { placeholder: 'Apellido Paterno' },
      { placeholder: 'Apellido Materno' },
      { placeholder: 'Alias' },
      { placeholder: 'CURP' },
      { placeholder: 'RFC' },
      { placeholder: 'CUIP' }
    ];
  }

  selectEntity(entity: EntityType): void {
    this.selectedEntity.set(entity);
  }

  search(): void {
    this.searched.set(true);
  }

  clear(): void {
    this.searched.set(false);
  }

  toggleExpanded(): void {
    this.expanded.update(value => !value);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
  }
}