import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsolidatedProfileComponent } from '../../components/consolidated-profile/consolidated-profile';
import { DataSelectionComponent } from '../../components/data-selection/data-selection';
import { SourceListComponent } from '../../components/source-list/source-list';
import { ProfileConsolidationFacade } from '../../profile-consolidation.facade';

@Component({
  selector: 'app-profile-consolidation-page',
  standalone: true,
  imports: [
    RouterLink,
    SourceListComponent,
    DataSelectionComponent,
    ConsolidatedProfileComponent
  ],
  templateUrl: './profile-consolidation-page.html',
  styleUrl: './profile-consolidation-page.scss'
})
export class ProfileConsolidationPage {
  private readonly facade = inject(ProfileConsolidationFacade);

  readonly sources = this.facade.sources;
  readonly selectedSource = this.facade.selectedSource;
  readonly completedLabel = this.facade.completedLabel;
  readonly accepted = this.facade.accepted;

  selectSource(sourceId: string): void {
    this.facade.selectSource(sourceId);
  }

  toggleField(fieldId: string): void {
    this.facade.toggleField(fieldId);
  }

  selectAll(): void {
    this.facade.selectAllCurrentSource();
  }

  accept(): void {
    this.facade.acceptProfile();
  }
}