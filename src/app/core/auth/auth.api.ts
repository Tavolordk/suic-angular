import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { AUTH_API_BASE_URL } from '../http/auth-api-base-url.token';
import {
    AuthCentralApiResponse,
    AuthHttpError,
    LoginContactRequest,
    LoginContactResponse,
    TokenResponse,
    VerifyContactRequest
} from './auth-api.model';
import { AuthSession, PendingContactAuthentication } from './auth-session.model';

type JwtClaims = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AuthApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${inject(AUTH_API_BASE_URL).replace(/\/$/, '')}/api/auth`;

    /** POST /api/auth/contacto */
    requestContactCode(request: LoginContactRequest): Observable<LoginContactResponse> {
        return this.http
            .post<AuthCentralApiResponse<LoginContactResponse>>(
                `${this.baseUrl}/contacto`,
                request
            )
            .pipe(
                map((response) =>
                    this.unwrapResponse(response, 'No fue posible enviar el código.')
                ),
                catchError((error: unknown) =>
                    this.handleError(error, 'No fue posible enviar el código.')
                )
            );
    }

    /** POST /api/auth/contacto/verificar */
    verifyContactCode(
        request: VerifyContactRequest,
        challenge: PendingContactAuthentication
    ): Observable<AuthSession> {
        return this.http
            .post<AuthCentralApiResponse<TokenResponse>>(
                `${this.baseUrl}/contacto/verificar`,
                request
            )
            .pipe(
                map((response) =>
                    this.unwrapResponse(response, 'No fue posible validar el código.')
                ),
                map((tokenResponse) => this.toSession(tokenResponse, challenge)),
                catchError((error: unknown) =>
                    this.handleError(error, 'El código es incorrecto o ya expiró.')
                )
            );
    }

    /** PATCH /api/auth/tokens */
    refreshSession(session: AuthSession): Observable<AuthSession> {
        if (!session.refreshToken) {
            return throwError(
                () => new AuthHttpError('La sesión no tiene un refresh token válido.', 401)
            );
        }

        return this.http
            .patch<AuthCentralApiResponse<TokenResponse>>(`${this.baseUrl}/tokens`, {
                refreshToken: session.refreshToken
            })
            .pipe(
                map((response) =>
                    this.unwrapResponse(response, 'No se pudo refrescar la sesión.')
                ),
                map((tokenResponse) => this.toSession(tokenResponse, session)),
                catchError((error: unknown) =>
                    this.handleError(error, 'No se pudo refrescar la sesión.')
                )
            );
    }

    /** DELETE /api/auth/sesiones */
    logout(session: AuthSession | null, motivo = 'USER_LOGOUT'): Observable<void> {
        if (!session?.sid) {
            return of(void 0);
        }

        return this.http
            .delete<void>(`${this.baseUrl}/sesiones`, {
                body: {
                    sid: session.sid,
                    refreshToken: session.refreshToken,
                    motivo
                }
            })
            .pipe(
                catchError((error: unknown) =>
                    this.handleError(error, 'No se pudo cerrar la sesión.')
                )
            );
    }

    toPendingChallenge(
        response: LoginContactResponse,
        request: LoginContactRequest,
        identity: { usuario: string; correo: string; telefono: string }
    ): PendingContactAuthentication {
        return {
            ...identity,
            cuenta: response.cuenta?.trim() || request.cuenta,
            // La API puede responder el canal de envío (por ejemplo, "telegram")
            // en medioContacto. Para verificar el OTP debemos conservar el número
            // telefónico o correo que realmente se envió en la solicitud.
            medioContacto: request.medioContacto,
            contactoEnmascarado: response.contactoEnmascarado,
            sistema: response.sistema,
            audience: response.audience,
            profileVersion: response.profileVersion,
            perfiles: response.perfiles ?? [],
            idCodigo: response.idCodigo,
            issuedAt: new Date().toISOString()
        };
    }

    private unwrapResponse<T>(response: AuthCentralApiResponse<T>, fallbackMessage: string): T {
        if (response?.success && response.data != null) {
            return response.data;
        }

        const apiError = response?.errors?.find((error) => error.detail || error.message);
        const apiMessage = apiError?.detail ?? apiError?.message ?? fallbackMessage;

        // En el endpoint de refresh, una respuesta de negocio sin datos significa
        // que el backend rechazó la renovación; el servicio la trata como terminal.
        throw new AuthHttpError(apiMessage.trim() || fallbackMessage, 400);
    }

    private toSession(
        response: TokenResponse,
        source: PendingContactAuthentication | AuthSession
    ): AuthSession {
        if (!response.accessToken) {
            throw new Error('El servicio no devolvió un token de acceso válido.');
        }

        const perfiles = response.perfiles ?? [];
        const claims = this.decodeJwtPayload(response.accessToken);
        const usuario = this.resolveUsuario(source);
        const displayName =
            this.readClaim(claims, ['name', 'nombre', 'unique_name']) || usuario || 'Usuario';

        return {
            usuario,
            correo: source.correo,
            telefono: source.telefono,
            displayName,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            tokenType: response.tokenType || 'Bearer',
            expiresIn: response.expiresIn,
            expiresAtUtc: response.expiresAtUtc,
            sid: response.sid,
            jti: response.jti,
            sistema: response.sistema,
            audience: response.audience,
            profileVersion: response.profileVersion,
            perfiles,
            issuedAt: new Date().toISOString()
        };
    }

    private resolveUsuario(source: PendingContactAuthentication | AuthSession): string {
        if ('cuenta' in source) {
            return source.cuenta.trim() || source.usuario.trim();
        }

        return source.usuario.trim();
    }

    private decodeJwtPayload(token: string): JwtClaims {
        try {
            const payload = token.split('.')[1];

            if (!payload) {
                return {};
            }

            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

            return JSON.parse(atob(padded)) as JwtClaims;
        } catch {
            return {};
        }
    }

    private readClaim(claims: JwtClaims, keys: string[]): string | null {
        for (const key of keys) {
            const value = claims[key];

            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }

            if (typeof value === 'number') {
                return String(value);
            }
        }

        return null;
    }

    private handleError(error: unknown, fallbackMessage: string): Observable<never> {
        if (error instanceof HttpErrorResponse) {
            const apiMessage = this.extractApiErrorMessage(error);

            if (apiMessage) {
                return throwError(() => new AuthHttpError(apiMessage, error.status));
            }

            return throwError(
                () => new AuthHttpError(this.messageForStatus(error.status, fallbackMessage), error.status)
            );
        }

        if (error instanceof Error) {
            return throwError(() => error);
        }

        return throwError(() => new Error(fallbackMessage));
    }

    private extractApiErrorMessage(error: HttpErrorResponse): string | null {
        const response = error.error as AuthCentralApiResponse<unknown> | string | null;

        if (typeof response === 'string' && response.trim()) {
            return response.trim();
        }

        if (!response || typeof response !== 'object') {
            return null;
        }

        const message = response.errors
            ?.map((apiError) => apiError.detail || apiError.message)
            .find((candidate): candidate is string => Boolean(candidate?.trim()));

        return message?.trim() || null;
    }

    private messageForStatus(status: number, fallbackMessage: string): string {
        switch (status) {
            case 0:
                return 'No fue posible conectar con el servicio de autenticación. Verifica la red o la configuración CORS.';
            case 400:
                return 'Los datos enviados no son válidos.';
            case 401:
                return 'El código es incorrecto o ya expiró.';
            case 403:
                return 'No tienes permisos para completar esta operación.';
            case 503:
                return 'El servicio de autenticación no está disponible temporalmente.';
            case 504:
                return 'El servicio tardó demasiado en responder. Intenta nuevamente.';
            default:
                return fallbackMessage;
        }
    }
}
