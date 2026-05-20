import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AssociationGraph } from '../../components/association-graph/association-graph';
import { GraphNodeDetail } from '../../components/graph-node-detail/graph-node-detail';
import { GraphToolbar } from '../../components/graph-toolbar/graph-toolbar';
import { GraphFacade } from '../../graph.facade';

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [AssociationGraph, GraphNodeDetail, GraphToolbar],
  templateUrl: './graph-page.html',
  styleUrl: './graph-page.scss'
})
export class GraphPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(GraphFacade);

  readonly nodes = this.facade.nodes;
  readonly links = this.facade.links;
  readonly selectedNode = this.facade.selectedNode;
  readonly totalNodes = this.facade.totalNodes;
  readonly totalLinks = this.facade.totalLinks;

  personId = '1';

  ngOnInit(): void {
    this.personId = this.route.snapshot.paramMap.get('id') ?? '1';
    this.facade.loadGraph(this.personId);
  }

  selectNode(nodeId: string): void {
    this.facade.selectNode(nodeId);
  }
}