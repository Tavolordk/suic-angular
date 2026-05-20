import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileSource } from '../../profile-consolidation.facade';

@Component({
  selector: 'app-data-selection',
  standalone: true,
  imports: [],
  templateUrl: './data-selection.html',
  styleUrl: './data-selection.scss'
})
export class DataSelectionComponent {
  @Input({ required: true }) source!: ProfileSource;

  @Output() readonly fieldToggled = new EventEmitter<string>();
  @Output() readonly selectAllRequested = new EventEmitter<void>();

  get selectedCount(): number {
    return this.source.fields.filter(field => field.selected).length;
  }

  get coincidenceLabel(): string {
    if (this.source.percentage >= 80) {
      return 'alto';
    }

    if (this.source.percentage >= 60) {
      return 'medio';
    }

    return 'bajo';
  }
}