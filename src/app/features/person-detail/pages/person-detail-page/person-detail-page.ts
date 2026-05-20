import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PersonDetailFacade } from '../../person-detail.facade';

@Component({
  selector: 'app-person-detail-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './person-detail-page.html',
  styleUrl: './person-detail-page.scss'
})
export class PersonDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(PersonDetailFacade);

  readonly person = this.facade.person;
  readonly addresses = this.facade.addresses;
  readonly records = this.facade.records;
  readonly relations = this.facade.relations;

  readonly initials = computed(() => {
    const person = this.person();

    if (!person) {
      return '';
    }

    return person.fullName
      .split(' ')
      .slice(0, 2)
      .map(value => value.charAt(0))
      .join('')
      .toUpperCase();
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.facade.loadPerson(id);
    }
  }

  getRiskLabel(risk: string): string {
    const labels: Record<string, string> = {
      low: 'Bajo',
      medium: 'Medio',
      high: 'Alto',
      critical: 'Crítico'
    };

    return labels[risk] ?? risk;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      wanted: 'Búsqueda',
      unknown: 'Sin confirmar'
    };

    return labels[status] ?? status;
  }
}