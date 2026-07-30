import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DEFAULT_AUTHENTICATED_ROUTE } from './auth.constants';
import { AuthService } from './auth.service';

/** Impide volver al login cuando ya existe una sesión activa. */
export const publicGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isAuthenticated()
        ? router.createUrlTree([DEFAULT_AUTHENTICATED_ROUTE])
        : true;
};
