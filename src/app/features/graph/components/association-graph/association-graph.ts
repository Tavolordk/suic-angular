import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
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

  readonly width = 1100;
  readonly height = 760;

  readonly zoom = signal(0.9);
  readonly panX = signal(0);
  readonly panY = signal(0);

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialPanX = 0;
  private initialPanY = 0;

  get graphTransform(): string {
    return `translate(${this.panX()} ${this.panY()}) scale(${this.zoom()})`;
  }

  selectNode(nodeId: string): void {
    this.nodeSelected.emit(nodeId);
  }

  findNode(nodeId: string): GraphNode | undefined {
    return this.nodes.find(node => node.id === nodeId);
  }

  getNodeIcon(type: string, nodeId?: string): string {
    if (nodeId?.includes('weapon')) {
      return 'fa-solid fa-gun';
    }

    const icons: Record<string, string> = {
      person: 'fa-regular fa-user',
      vehicle: 'fa-solid fa-car-side',
      address: 'fa-solid fa-location-dot',
      organization: 'fa-solid fa-building-shield',
      phone: 'fa-solid fa-phone',
      event: 'fa-solid fa-triangle-exclamation'
    };

    return icons[type] ?? 'fa-solid fa-circle';
  }

  getLineWidth(strength: string): number {
    const widths: Record<string, number> = {
      weak: 1.2,
      medium: 2,
      strong: 3
    };

    return widths[strength] ?? 1.2;
  }

  zoomIn(): void {
    this.zoom.update(value => Math.min(1.7, Number((value + 0.1).toFixed(2))));
  }

  zoomOut(): void {
    this.zoom.update(value => Math.max(0.55, Number((value - 0.1).toFixed(2))));
  }

  resetView(): void {
    this.zoom.set(0.9);
    this.panX.set(0);
    this.panY.set(0);
  }

  moveLeft(): void {
    this.panX.update(value => value + 80);
  }

  moveRight(): void {
    this.panX.update(value => value - 80);
  }

  moveUp(): void {
    this.panY.update(value => value + 80);
  }

  moveDown(): void {
    this.panY.update(value => value - 80);
  }

  startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialPanX = this.panX();
    this.initialPanY = this.panY();
  }

  drag(event: MouseEvent): void {
    if (!this.isDragging) {
      return;
    }

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    this.panX.set(this.initialPanX + deltaX);
    this.panY.set(this.initialPanY + deltaY);
  }

  stopDrag(): void {
    this.isDragging = false;
  }

  handleWheel(event: WheelEvent): void {
    event.preventDefault();

    if (event.deltaY < 0) {
      this.zoomIn();
      return;
    }

    this.zoomOut();
  }
}