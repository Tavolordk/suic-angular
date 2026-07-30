import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthStorage } from '../auth/auth.storage';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
    const authStorage = inject(AuthStorage);
    const authService = inject(AuthService);
    const session = authStorage.session();
    const token = session?.accessToken;
    const sessionManagementRequest = isSessionManagementRequest(request.url);
    const refreshTokenRequest = isRefreshTokenRequest(request.url, request.method);

    const headers: Record<string, string> = {
        'X-Trace-Id': createTraceId()
    };

    // El endpoint PATCH /api/auth/tokens se autentica con el refreshToken del body.
    // No enviamos además el access token, para que un Bearer próximo a vencer no
    // interfiera con una renovación válida.
    // Tampoco se sobrescribe una cabecera Authorization que el servicio llamador
    // ya haya construido (p. ej. SearchApiService).
    if (token && !refreshTokenRequest && !request.headers.has('Authorization')) {
        headers['Authorization'] = `${session?.tokenType || 'Bearer'} ${token}`;
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
    return url.includes('/api/auth/');
}

function isRefreshTokenRequest(url: string, method: string): boolean {
    if (method.toUpperCase() !== 'PATCH') {
        return false;
    }

    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    return cleanUrl.endsWith('/api/auth/tokens');
}

function createTraceId(): string {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `suic-web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
