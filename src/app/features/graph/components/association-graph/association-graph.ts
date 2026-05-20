import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GraphLink } from '../../../../core/domain/entities/graph-link';
import { GraphNode } from '../../../../core/domain/entities/graph-node';

@Component({
  selector: 'app-association-graph',
  standalone: true,
  imports: [],
  templateUrl: './association-graph.html',
  styleUrl: './association-graph.scss'
})
export class AssociationGraph {
  @Input({ required: true }) nodes: GraphNode[] = [];
  @Input({ required: true }) links: GraphLink[] = [];
  @Input() selectedNodeId?: string;

  @Output() readonly nodeSelected = new EventEmitter<string>();

  readonly width = 920;
  readonly height = 520;

  selectNode(nodeId: string): void {
    this.nodeSelected.emit(nodeId);
  }

  findNode(nodeId: string): GraphNode | undefined {
    return this.nodes.find(node => node.id === nodeId);
  }

  getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      person: '👤',
      vehicle: '🚗',
      address: '⌂',
      organization: '◇',
      phone: '☎',
      event: '◆'
    };

    return icons[type] ?? '•';
  }

  getLineWidth(strength: string): number {
    const widths: Record<string, number> = {
      weak: 1.2,
      medium: 2,
      strong: 3
    };

    return widths[strength] ?? 1.2;
  }
}