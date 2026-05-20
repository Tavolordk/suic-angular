import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-graph-toolbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './graph-toolbar.html',
  styleUrl: './graph-toolbar.scss'
})
export class GraphToolbar {
  @Input() personId = '';
  @Input() totalNodes = 0;
  @Input() totalLinks = 0;
}