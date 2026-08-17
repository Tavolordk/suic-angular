import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { AUTH_API_BASE_URL } from '../http/auth-api-base-url.token';
import {
    AuthCentralApiResponse,
    AuthHttpError,
    LoginContactRequest,
    LoginContactResponse,
    RefreshTokenRequest,
    SessionLogoutRequest,
    SessionLogoutResponse,
    TokenResponse,
    VerifyContactRequest
} from './auth-api.model';
import { AuthSession, PendingContactAuthentication } from './auth-session.model';

type JwtClaims = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AuthApi {
    private readonly http = inject(HttpClient);
    private readonly apiHost = inject(AUTH_API_BASE_URL).replace(/\/$/, '');
    private readonly authV1BaseUrl = `${this.apiHost}/api/v1/auth`;

    /** POST /api/v1/auth/mfa/challenges */
    requestContactCode(request: LoginContactRequest): Observable<LoginContactResponse> {
        return this.http
            .post<AuthCentralApiResponse<LoginContactResponse>>(
                `${this.authV1BaseUrl}/mfa/challenges`,
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

    /** POST /api/v1/auth/mfa/verification */
    verifyContactCode(
        request: VerifyContactRequest,
        challenge: PendingContactAuthentication
    ): Observable<AuthSession> {
        return this.http
            .post<AuthCentralApiResponse<TokenResponse>>(
                `${this.authV1BaseUrl}/mfa/verification`,
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

    /**
     * POST /api/v1/auth/tokens/refresh
     *
     * El endpoint está declarado como público en el swagger (`security: []`): se
     * autentica con el refresh token del cuerpo, no con el Bearer. El interceptor
     * lo excluye para no mandar un access token ya vencido.
     */
    refreshSession(session: AuthSession): Observable<AuthSession> {
        const refreshToken = session.refreshToken?.trim();

        if (!refreshToken) {
            return throwError(
                () => new AuthHttpError('La sesión no tiene un refresh token válido.', 401)
            );
        }

        const request: RefreshTokenRequest = { refreshToken };

        return this.http
            .post<AuthCentralApiResponse<TokenResponse>>(
                `${this.authV1BaseUrl}/tokens/refresh`,
                request
            )
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

    /**
     * POST /api/v1/auth/sessions/logout
     *
     * Requiere Bearer (seguridad global del swagger) y los tres campos del cuerpo
     * son obligatorios. Si la sesión local no tiene `sid` o `refreshToken` no se
     * envía la petición: el backend respondería 400 y el cierre local se hace igual.
     */
    logout(session: AuthSession | null, motivo = 'Cierre voluntario'): Observable<void> {
        const sid = session?.sid?.trim();
        const refreshToken = session?.refreshToken?.trim();

        if (!sid || !refreshToken) {
            console.warn(
                '[AuthApi] Se omite POST /api/v1/auth/sessions/logout: la sesión local no tiene sid o refreshToken.'
            );

            return of(void 0);
        }

        const request: SessionLogoutRequest = {
            sid,
            refreshToken,
            motivo: this.normalizeLogoutReason(motivo)
        };

        return this.http
            .post<AuthCentralApiResponse<SessionLogoutResponse>>(
                `${this.authV1BaseUrl}/sessions/logout`,
                request
            )
            .pipe(
                map((response) => {
                    // El contrato puede responder 200 con `data: null`; basta con
                    // que el backend confirme el cierre en `success`.
                    if (response && response.success === false) {
                        throw new AuthHttpError(
                            this.readApiMessage(response) ?? 'No se pudo cerrar la sesión.',
                            400
                        );
                    }

                    return void 0;
                }),
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
            contactoEnmascarado: this.resolveMaskedContact(response),
            sistema: response.sistema ?? null,
            audience: response.audience ?? null,
            profileVersion: response.profileVersion ?? 0,
            perfiles: response.perfiles ?? [],
            idCodigo: this.resolveChallengeId(response),
            issuedAt: new Date().toISOString()
        };
    }

    /**
     * Fusiona la respuesta de un reenvío con el reto ya almacenado. Vive aquí para
     * que AuthService no tenga que conocer los alias del contrato de la API.
     */
    mergePendingChallenge(
        pending: PendingContactAuthentication,
        response: LoginContactResponse,
        request: LoginContactRequest
    ): PendingContactAuthentication {
        return {
            ...pending,
            cuenta: response.cuenta?.trim() || request.cuenta,
            // No reemplazar el contacto real con el canal retornado por la API.
            medioContacto: request.medioContacto,
            contactoEnmascarado:
                this.resolveMaskedContact(response) ?? pending.contactoEnmascarado,
            sistema: response.sistema ?? pending.sistema,
            audience: response.audience ?? pending.audience,
            profileVersion: response.profileVersion ?? pending.profileVersion,
            perfiles: response.perfiles ?? pending.perfiles,
            idCodigo: this.resolveChallengeId(response) ?? pending.idCodigo,
            issuedAt: new Date().toISOString()
        };
    }

    private resolveMaskedContact(response: LoginContactResponse): string | null {
        const masked = response.maskedContact ?? response.contactoEnmascarado;

        return masked?.trim() || null;
    }

    private resolveChallengeId(response: LoginContactResponse): string | null {
        const challengeId = response.challengeId ?? response.idCodigo;

        return challengeId?.trim() || null;
    }

    private normalizeLogoutReason(motivo: string): string {
        // maxLength 500 / minLength 1 según SessionLogoutRequest.
        const normalized = motivo?.trim() || 'Cierre voluntario';

        return normalized.slice(0, 500);
    }

    private unwrapResponse<T>(response: AuthCentralApiResponse<T>, fallbackMessage: string): T {
        if (response?.success && response.data != null) {
            return response.data;
        }

        // En el endpoint de refresh, una respuesta de negocio sin datos significa
        // que el backend rechazó la renovación; el servicio la trata como terminal.
        const apiMessage = this.readApiMessage(response) ?? fallbackMessage;

        throw new AuthHttpError(apiMessage.trim() || fallbackMessage, 400);
    }

    private readApiMessage(response: AuthCentralApiResponse<unknown> | null): string | null {
        const fromErrors = response?.errors
            ?.map((error) => error.detail || error.message)
            .find((candidate): candidate is string => Boolean(candidate?.trim()));

        return fromErrors?.trim() || response?.message?.trim() || null;
    }

    private toSession(
        response: TokenResponse,
        source: PendingContactAuthentication | AuthSession
    ): AuthSession {
        const accessToken = response.accessToken?.trim();

        if (!accessToken) {
            throw new Error('El servicio no devolvió un token de acceso válido.');
        }

        const perfiles = response.profiles ?? response.perfiles ?? [];
        const claims = this.decodeJwtPayload(accessToken);
        const usuario = this.resolveUsuario(source);
        const displayName =
            this.readClaim(claims, ['name', 'nombre', 'unique_name']) || usuario || 'Usuario';

        // `sessionId` es el nombre del contrato vigente; `sid` queda como alias y,
        // en última instancia, se lee del propio JWT para que el logout siempre
        // tenga un identificador de sesión que enviar.
        const sid =
            response.sessionId?.trim() ||
            response.sid?.trim() ||
            this.readClaim(claims, ['sid', 'session_id']) ||
            null;

        return {
            usuario,
            correo: source.correo,
            telefono: source.telefono,
            displayName,
            accessToken,
            refreshToken: response.refreshToken?.trim() || null,
            tokenType: response.tokenType?.trim() || 'Bearer',
            expiresIn: Number(response.expiresIn ?? 0),
            expiresAtUtc: response.expiresAtUtc ?? null,
            sid,
            jti: response.jti?.trim() || this.readClaim(claims, ['jti']),
            sistema: response.sistema ?? null,
            audience: response.audience ?? this.readClaim(claims, ['aud']),
            profileVersion: response.profileVersion ?? 0,
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

        return this.readApiMessage(response);
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
            case 502:
                return 'El servicio de autenticación respondió con un error de puerta de enlace.';
            case 503:
                return 'El servicio de autenticación no está disponible temporalmente.';
            case 504:
                return 'El servicio tardó demasiado en responder. Intenta nuevamente.';
            default:
                return fallbackMessage;
        }
    }
}
