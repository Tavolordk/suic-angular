import { Component, Input } from '@angular/core';
import { GraphNode } from '../../../../core/domain/entities/graph-node';

@Component({
  selector: 'app-graph-node-detail',
  standalone: true,
  imports: [],
  templateUrl: './graph-node-detail.html',
  styleUrl: './graph-node-detail.scss'
})
export class GraphNodeDetail {
  @Input() node?: GraphNode;

  get typeLabel(): string {
    const type = this.node?.type;

    const labels: Record<string, string> = {
      person: 'Persona',
      vehicle: 'Vehículo',
      address: 'Domicilio',
      organization: 'Organización',
      phone: 'Teléfono',
      event: 'Evento'
    };

    return type ? labels[type] ?? type : '';
  }

  get riskLabel(): string {
    const risk = this.node?.risk;

    const labels: Record<string, string> = {
      low: 'Bajo',
      medium: 'Medio',
      high: 'Alto',
      critical: 'Crítico'
    };

    return risk ? labels[risk] ?? risk : '';
  }
}