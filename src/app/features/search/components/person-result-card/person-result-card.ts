import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Person } from '../../../../core/domain/entities/person';

@Component({
  selector: 'app-person-result-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './person-result-card.html',
  styleUrl: './person-result-card.scss'
})
export class PersonResultCard {
  @Input({ required: true }) person!: Person;

  get initials(): string {
    return this.person.fullName
      .split(' ')
      .slice(0, 2)
      .map(value => value.charAt(0))
      .join('')
      .toUpperCase();
  }

  get riskLabel(): string {
    const labels = {
      low: 'Bajo',
      medium: 'Medio',
      high: 'Alto',
      critical: 'Crítico'
    };

    return labels[this.person.riskLevel];
  }

  get statusLabel(): string {
    const labels = {
      active: 'Activo',
      inactive: 'Inactivo',
      wanted: 'Búsqueda',
      unknown: 'Sin confirmar'
    };

    return labels[this.person.status];
  }
}