import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileSource } from '../../profile-consolidation.facade';

@Component({
  selector: 'app-source-list',
  standalone: true,
  imports: [],
  templateUrl: './source-list.html',
  styleUrl: './source-list.scss'
})
export class SourceListComponent {
  @Input({ required: true }) sources: ProfileSource[] = [];
  @Input({ required: true }) selectedSourceId = '';

  @Output() readonly sourceSelected = new EventEmitter<string>();
}