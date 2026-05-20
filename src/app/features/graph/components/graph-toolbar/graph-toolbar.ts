import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type GraphFilter = 'all' | 'person' | 'vehicle' | 'weapon';

@Component({
  selector: 'app-graph-toolbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './graph-toolbar.html',
  styleUrl: './graph-toolbar.scss'
})
export class GraphToolbar {
  @Input() personId = '';
  @Input() profileName = '';
  @Input() curp = '';
  @Input() totalNodes = 0;
  @Input() totalLinks = 0;
  @Input() activeFilter: GraphFilter = 'all';

  @Output() readonly filterSelected = new EventEmitter<GraphFilter>();
}