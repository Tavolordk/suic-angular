import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchQuickPanelService } from '../../../../shared/search-quick-panel/search-quick-panel.service';
import { Topbar } from '../../../../shared/layout/topbar/topbar';

/**
 * Centro de Administración, propuesta visual de SPM-1.0.
 * El HTML original está aislado en un iframe con sandbox sin acceso al origen.
 * No existe aún un contrato de backend para la gestión de identidades, roles,
 * sesiones, auditoría o solicitudes; ninguna operación de la maqueta los invoca.
 */
@Component({
  selector: 'app-administration-page',
  standalone: true,
  imports: [Topbar, RouterLink, RouterLinkActive],
  templateUrl: './administration-page.html',
  styleUrl: './administration-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationPage {
  private readonly quickPanel = inject(SearchQuickPanelService);

  openHistory(): void {
    this.quickPanel.openHistory();
  }

  openSavedSearches(): void {
    this.quickPanel.openSaved();
  }
}
