import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly title = signal('suic-angular');

  constructor() {
    // El monitor solo arranca si ya hay sesión; verifyContactCode lo reinicia
    // en cuanto la autenticación termina.
    this.auth.startSessionMonitor();
  }

  ngOnDestroy(): void {
    this.auth.stopSessionMonitor();
  }

  protected onDismissSessionPrompt(): void {
    this.auth.dismissSessionPrompt();
  }
}
