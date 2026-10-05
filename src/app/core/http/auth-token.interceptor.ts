import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthSession } from '../auth/auth-session.model';
import { AuthStorage } from '../auth/auth.storage';
import { SKIP_SYSTEM_AUTH } from './http-context.tokens';

/**
 * Flujo para endpoints protegidos:
 * 1. GET /api/v1/auth/sessions/current con el access token actual.
 * 2. Si la sesión está activa, se ejecuta la petición original.
 * 3. Si la validación falla o la sesión no está activa, se hace refresh token,
 *    se valida nuevamente /sessions/current y solo entonces se reintenta la petición.
 *
 * Los endpoints de autenticación no pasan por la puerta de validación para evitar
 * recursión. CAPTCHA/MFA/refresh siguen siendo públicos; current/logout reciben Bearer.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
    const authStorage = inject(AuthStorage);
    const authService = inject(AuthService);
    const skipSystemAuth = request.context.get(SKIP_SYSTEM_AUTH);
    const publicAuthenticationRequest = isPublicAuthenticationRequest(request.url, request.method);
    const sessionManagementRequest = isSessionManagementRequest(request.url);

    if (skipSystemAuth) {
        return next(withTraceId(request));
    }

    if (publicAuthenticationRequest || sessionManagementRequest) {
        const session = authStorage.session();
        const preparedRequest = publicAuthenticationRequest
            ? withTraceId(request)
            : withSessionHeaders(request, session);

        return next(preparedRequest);
    }

    const session = authStorage.session();
    if (!session?.accessToken?.trim()) {
        return next(withTraceId(request));
    }

    return authService.ensureActiveSession().pipe(
        switchMap((activeSession) => {
            authService.notifyAuthenticatedHttpActivity();

            return next(withSessionHeaders(request, activeSession)).pipe(
                catchError((error: unknown) => {
                    if (isSessionRejectedError(error)) {
                        return authService.resolveUnauthorizedRequest(error);
                    }

                    return throwError(() => error);
                })
            );
        }),
        catchError((error: unknown) => throwError(() => error))
    );
};

function withSessionHeaders(request: HttpRequest<unknown>, session: AuthSession | null): HttpRequest<unknown> {
    const token = session?.accessToken?.trim();
    const tokenType = session?.tokenType?.trim() || 'Bearer';
    const headers: Record<string, string> = {
        'X-Trace-Id': createTraceId()
    };

    if (token) {
        headers['Authorization'] = `${tokenType} ${token}`;
    }

    return request.clone({ setHeaders: headers });
}

function withTraceId(request: HttpRequest<unknown>): HttpRequest<unknown> {
    return request.clone({
        setHeaders: {
            'X-Trace-Id': createTraceId()
        }
    });
}

function isSessionRejectedError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
}

function isSessionManagementRequest(url: string): boolean {
    return normalizeUrl(url).includes('/api/v1/auth/');
}

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
