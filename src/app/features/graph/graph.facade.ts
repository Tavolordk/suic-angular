import { Injectable, computed, signal } from '@angular/core';
import { GraphLink } from '../../core/domain/entities/graph-link';
import { GraphNode } from '../../core/domain/entities/graph-node';
import {
  createGraphByProfileId,
  PersonGraphMock
} from '../../core/infrastructure/data/graph.mock';

@Injectable({
  providedIn: 'root'
})
export class GraphFacade {
  private readonly selectedPersonId = signal<string>('1');
  private readonly selectedNodeId = signal<string | null>(null);
  private readonly activeFilter = signal<'all' | 'person' | 'vehicle' | 'weapon'>('all');

  readonly currentFilter = this.activeFilter.asReadonly();

  readonly graph = computed<PersonGraphMock>(() => {
    return createGraphByProfileId(this.selectedPersonId());
  });

  readonly nodes = computed<GraphNode[]>(() => {
    const filter = this.activeFilter();
    const nodes = this.graph().nodes;

    if (filter === 'all') {
      return nodes;
    }

    if (filter === 'weapon') {
      return nodes.filter(node => node.id.includes('weapon') || node.id === 'person-main');
    }

    return nodes.filter(node => node.type === filter || node.id === 'person-main');
  });

  readonly links = computed<GraphLink[]>(() => {
    const visibleNodeIds = new Set(this.nodes().map(node => node.id));

    return this.graph().links.filter(
      link => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );
  });

  readonly selectedNode = computed<GraphNode | undefined>(() => {
    const id = this.selectedNodeId();
    const nodes = this.nodes();

    if (!id) {
      return nodes[0];
    }

    return nodes.find(node => node.id === id) ?? nodes[0];
  });

  readonly profileName = computed(() => this.graph().profileName);
  readonly curp = computed(() => this.graph().curp);
  readonly summary = computed(() => this.graph().summary);

  readonly totalNodes = computed(() => this.nodes().length);
  readonly totalLinks = computed(() => this.links().length);

  loadGraph(personId: string): void {
    this.selectedPersonId.set(personId);
    this.selectedNodeId.set(null);
    this.activeFilter.set('all');
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
  }

  filterBy(filter: 'all' | 'person' | 'vehicle' | 'weapon'): void {
    this.activeFilter.set(filter);
    this.selectedNodeId.set(null);
  }
}