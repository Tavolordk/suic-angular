import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthStorage } from '../auth/auth.storage';

/**
 * Agrega el access token a todas las peticiones protegidas.
 *
 * Según el swagger de Spm.Api la seguridad global es `Bearer`, y solo se declaran
 * públicos (`security: []`) los endpoints de CAPTCHA, el reto MFA, la verificación
 * MFA y el refresh de tokens. Todo lo demás —incluyendo POST /api/v1/auth/sessions/logout
 * y los endpoints de /api/search— viaja con `Authorization: Bearer <accessToken>`.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
    const authStorage = inject(AuthStorage);
    const authService = inject(AuthService);
    const session = authStorage.session();
    const token = session?.accessToken?.trim();
    const tokenType = session?.tokenType?.trim() || 'Bearer';
    const publicAuthenticationRequest = isPublicAuthenticationRequest(
        request.url,
        request.method
    );
    const sessionManagementRequest = isSessionManagementRequest(request.url);

    const headers: Record<string, string> = {
        'X-Trace-Id': createTraceId()
    };

    if (token && !publicAuthenticationRequest) {
        headers['Authorization'] = `${tokenType} ${token}`;
    }

    if (token && !sessionManagementRequest) {
        authService.notifyAuthenticatedHttpActivity();
    }

    return next(request.clone({ setHeaders: headers })).pipe(
        catchError((error: unknown) => {
            if (token && isSessionRejectedError(error) && !sessionManagementRequest) {
                // El servicio decide si el 401 fue por sesión caducada (muestra modal)
                // o por falta de permisos (propaga el error a la pantalla).
                return authService.resolveUnauthorizedRequest(error);
            }

            return throwError(() => error);
        })
    );
};

function isSessionRejectedError(error: unknown): boolean {
    // Solo 401 indica sesión/token inválido. Un 403 significa falta de permisos
    // sobre el recurso con una sesión válida, y no debe disparar el modal de sesión.
    return error instanceof HttpErrorResponse && error.status === 401;
}

function isSessionManagementRequest(url: string): boolean {
    return url.includes('/api/v1/auth/');
}

/**
 * Endpoints declarados sin seguridad en el swagger. El refresh entra aquí porque
 * se autentica con el refreshToken del cuerpo: mandarle un access token vencido
 * provocaría un 401 antes de poder renovar la sesión.
 */
function isPublicAuthenticationRequest(url: string, method: string): boolean {
    if (method.toUpperCase() !== 'POST') {
        return false;
    }

    const cleanUrl = normalizeUrl(url);

    return (
        cleanUrl.endsWith('/api/v1/auth/captcha/challenges') ||
        cleanUrl.includes('/api/v1/auth/captcha/challenges/') ||
        cleanUrl.endsWith('/api/v1/auth/mfa/challenges') ||
        cleanUrl.endsWith('/api/v1/auth/mfa/verification') ||
        cleanUrl.endsWith('/api/v1/auth/tokens/refresh')
    );
}

function normalizeUrl(url: string): string {
    return url.split('?')[0].replace(/\/+$/, '');
}

function createTraceId(): string {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `suic-web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
