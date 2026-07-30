import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DEFAULT_AUTHENTICATED_ROUTE } from './auth.constants';
import { AuthService } from './auth.service';

/**
 * La pantalla de verificación solo es accesible con una solicitud de código viva.
 * Sin ella, el usuario regresa al login para validar un nuevo CAPTCHA.
 */
export const twoFactorGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return router.createUrlTree([DEFAULT_AUTHENTICATED_ROUTE]);
    }

    return authService.pendingContact() ? true : router.createUrlTree(['/login']);
};
