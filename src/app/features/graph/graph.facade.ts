import { Injectable, computed, signal } from '@angular/core';
import { GraphLink } from '../../core/domain/entities/graph-link';
import { GraphNode } from '../../core/domain/entities/graph-node';
import { DEFAULT_GRAPH_MOCK, GRAPH_MOCK } from '../../core/infrastructure/data/graph.mock';

@Injectable({
  providedIn: 'root'
})
export class GraphFacade {
  private readonly selectedPersonId = signal<string>('1');
  private readonly selectedNodeId = signal<string | null>(null);

  readonly graph = computed(() => {
    const personId = this.selectedPersonId();

    return GRAPH_MOCK.find(graph => graph.personId === personId) ?? DEFAULT_GRAPH_MOCK;
  });

  readonly nodes = computed<GraphNode[]>(() => this.graph().nodes);
  readonly links = computed<GraphLink[]>(() => this.graph().links);

  readonly selectedNode = computed<GraphNode | undefined>(() => {
    const id = this.selectedNodeId();

    if (!id) {
      return this.nodes()[0];
    }

    return this.nodes().find(node => node.id === id);
  });

  readonly totalNodes = computed(() => this.nodes().length);
  readonly totalLinks = computed(() => this.links().length);

  loadGraph(personId: string): void {
    this.selectedPersonId.set(personId);
    this.selectedNodeId.set(null);
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
  }

  clearSelection(): void {
    this.selectedNodeId.set(null);
  }
}