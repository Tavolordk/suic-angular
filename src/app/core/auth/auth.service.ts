import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
    computed,
    inject,
    Injectable,
    PLATFORM_ID,
    signal
} from '@angular/core';
import {
    catchError,
    map,
    Observable,
    throwError
} from 'rxjs';

import {
    AuthCentralApiResponse,
    LoginContactRequest,
    LoginContactResponse,
    TokenResponse,
    VerifyContactRequest
} from './auth-api.model';

import {
    AuthSession,
    LoginPayload,
    PendingContactAuthentication
} from './auth-session.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiBaseUrl =
        'http://10.237.3.42:55808/api/auth';

    private readonly storageKey = 'suic-auth-session';

    private readonly pendingStorageKey =
        'suic-pending-contact-auth';

    private readonly http = inject(HttpClient);

    private readonly isBrowser = isPlatformBrowser(
        inject(PLATFORM_ID)
    );

    private readonly sessionState =
        signal<AuthSession | null>(
            this.readStoredSession()
        );

    private readonly pendingContactState =
        signal<PendingContactAuthentication | null>(
            this.readPendingContact()
        );

    readonly session =
        this.sessionState.asReadonly();

    readonly pendingContact =
        this.pendingContactState.asReadonly();

    readonly isAuthenticated = computed(
        () => Boolean(
            this.sessionState()?.accessToken
        )
    );

    readonly accountNumber = computed(
        () =>
            this.sessionState()?.usuario?.trim() ||
            'Usuario'
    );

    readonly primaryProfile = computed(() => {
        const profile = this.sessionState()
            ?.perfiles
            .find((item) => Boolean(item?.trim()));

        return profile?.trim() || 'Sin perfil asignado';
    });

    readonly displayName = this.accountNumber;

    requestContactCode(
        payload: LoginPayload
    ): Observable<LoginContactResponse> {
        const normalizedPayload =
            this.normalizeLoginPayload(payload);

        const request: LoginContactRequest = {
            cuenta: normalizedPayload.usuario,
            medioContacto:
                this.resolveContactMethod(
                    normalizedPayload
                )
        };

        return this.sendContactRequest(request).pipe(
            map((response) => {
                const pendingAuthentication:
                    PendingContactAuthentication = {
                    ...normalizedPayload,

                    cuenta:
                        response.cuenta?.trim() ||
                        request.cuenta,

                    medioContacto:
                        request.medioContacto,

                    contactoEnmascarado:
                        response.contactoEnmascarado,

                    sistema: response.sistema,

                    audience: response.audience,

                    profileVersion:
                        response.profileVersion,

                    perfiles:
                        response.perfiles ?? [],

                    idCodigo:
                        response.idCodigo
                };

                this.pendingContactState.set(
                    pendingAuthentication
                );

                this.persistPendingContact(
                    pendingAuthentication
                );

                return response;
            })
        );
    }

    resendContactCode():
        Observable<LoginContactResponse> {
        const pendingAuthentication =
            this.pendingContactState();

        if (!pendingAuthentication) {
            return throwError(
                () =>
                    new Error(
                        'La solicitud de código ya no está disponible.'
                    )
            );
        }

        const request: LoginContactRequest = {
            cuenta: pendingAuthentication.cuenta,
            medioContacto:
                this.resolvePendingContactMethod(
                    pendingAuthentication
                )
        };

        return this.sendContactRequest(request).pipe(
            map((response) => {
                const updatedPendingAuthentication:
                    PendingContactAuthentication = {
                    ...pendingAuthentication,

                    cuenta:
                        response.cuenta?.trim() ||
                        request.cuenta,

                    medioContacto: request.medioContacto,

                    contactoEnmascarado:
                        response.contactoEnmascarado ??
                        pendingAuthentication
                            .contactoEnmascarado,

                    sistema:
                        response.sistema ??
                        pendingAuthentication.sistema,

                    audience:
                        response.audience ??
                        pendingAuthentication.audience,

                    profileVersion:
                        response.profileVersion,

                    perfiles:
                        response.perfiles ??
                        pendingAuthentication.perfiles,

                    idCodigo:
                        response.idCodigo ??
                        pendingAuthentication.idCodigo
                };

                this.pendingContactState.set(
                    updatedPendingAuthentication
                );

                this.persistPendingContact(
                    updatedPendingAuthentication
                );

                return response;
            })
        );
    }

    verifyContactCode(
        codigo: string
    ): Observable<AuthSession> {
        const pendingAuthentication =
            this.pendingContactState();

        if (!pendingAuthentication) {
            return throwError(
                () =>
                    new Error(
                        'Solicita un nuevo código para continuar.'
                    )
            );
        }

        const request: VerifyContactRequest = {
            cuenta: pendingAuthentication.cuenta,

            medioContacto:
                this.resolvePendingContactMethod(
                    pendingAuthentication
                ),

            codigo: codigo.trim()
        };

        return this.http
            .post<
                AuthCentralApiResponse<TokenResponse>
            >(
                `${this.apiBaseUrl}/contacto/verificar`,
                request
            )
            .pipe(
                map((response) =>
                    this.unwrapResponse(
                        response,
                        'No fue posible validar el código.'
                    )
                ),

                map((tokenResponse) => {
                    if (!tokenResponse.accessToken) {
                        throw new Error(
                            'El servicio no devolvió un token de acceso válido.'
                        );
                    }

                    const session: AuthSession = {
                        usuario:
                            pendingAuthentication.cuenta.trim() ||
                            pendingAuthentication.usuario,

                        correo:
                            pendingAuthentication.correo,

                        telefono:
                            pendingAuthentication.telefono,

                        displayName:
                            pendingAuthentication.cuenta.trim() ||
                            pendingAuthentication.usuario ||
                            'Usuario',

                        accessToken:
                            tokenResponse.accessToken,

                        refreshToken:
                            tokenResponse.refreshToken,

                        tokenType:
                            tokenResponse.tokenType ||
                            'Bearer',

                        expiresIn:
                            tokenResponse.expiresIn,

                        expiresAtUtc:
                            tokenResponse.expiresAtUtc,

                        sid:
                            tokenResponse.sid,

                        jti:
                            tokenResponse.jti,

                        sistema:
                            tokenResponse.sistema,

                        audience:
                            tokenResponse.audience,

                        profileVersion:
                            tokenResponse.profileVersion,

                        perfiles:
                            tokenResponse.perfiles ?? [],

                        issuedAt:
                            new Date().toISOString()
                    };

                    this.sessionState.set(session);

                    this.persistSession(session);

                    this.clearPendingAuthentication();

                    return session;
                }),

                catchError((error: unknown) =>
                    this.handleHttpError(error)
                )
            );
    }

    cancelPendingAuthentication(): void {
        this.clearPendingAuthentication();
    }

    logout(): void {
        this.sessionState.set(null);

        this.clearPendingAuthentication();

        if (this.isBrowser) {
            localStorage.removeItem(
                this.storageKey
            );
        }
    }

    private sendContactRequest(
        request: LoginContactRequest
    ): Observable<LoginContactResponse> {
        return this.http
            .post<
                AuthCentralApiResponse<LoginContactResponse>
            >(
                `${this.apiBaseUrl}/contacto`,
                request
            )
            .pipe(
                map((response) =>
                    this.unwrapResponse(
                        response,
                        'No fue posible enviar el código.'
                    )
                ),

                catchError((error: unknown) =>
                    this.handleHttpError(error)
                )
            );
    }

    private normalizeLoginPayload(
        payload: LoginPayload
    ): LoginPayload {
        return {
            usuario: payload.usuario.trim(),

            correo: payload.correo
                .trim()
                .toLowerCase(),

            telefono: payload.telefono.trim()
        };
    }

    private resolveContactMethod(
        payload: LoginPayload
    ): string {
        const medioContacto =
            payload.telefono ||
            payload.correo;

        if (!medioContacto) {
            throw new Error(
                'Ingresa un correo o teléfono para recibir el código.'
            );
        }

        return medioContacto;
    }

    private unwrapResponse<T>(
        response: AuthCentralApiResponse<T>,
        fallbackMessage: string
    ): T {
        if (
            !response.success ||
            response.data == null
        ) {
            const apiMessage =
                response.errors
                    ?.map(
                        (error) =>
                            error.message ||
                            error.detail
                    )
                    .find(
                        (
                            message
                        ): message is string =>
                            Boolean(
                                message?.trim()
                            )
                    );

            throw new Error(
                apiMessage?.trim() ||
                fallbackMessage
            );
        }

        return response.data;
    }

    private handleHttpError(
        error: unknown
    ): Observable<never> {
        if (
            error instanceof Error &&
            !(error instanceof HttpErrorResponse)
        ) {
            return throwError(() => error);
        }

        if (
            !(error instanceof HttpErrorResponse)
        ) {
            return throwError(
                () =>
                    new Error(
                        'Ocurrió un error inesperado al autenticar.'
                    )
            );
        }

        const apiMessage =
            this.extractApiErrorMessage(error);

        if (apiMessage) {
            return throwError(
                () => new Error(apiMessage)
            );
        }

        switch (error.status) {
            case 0:
                return throwError(
                    () =>
                        new Error(
                            'No fue posible conectar con el servicio de autenticación. Verifica la red o la configuración CORS.'
                        )
                );

            case 400:
                return throwError(
                    () =>
                        new Error(
                            'Los datos enviados no son válidos.'
                        )
                );

            case 401:
                return throwError(
                    () =>
                        new Error(
                            'El código es incorrecto o ya expiró.'
                        )
                );

            case 503:
                return throwError(
                    () =>
                        new Error(
                            'El servicio de autenticación no está disponible temporalmente.'
                        )
                );

            case 504:
                return throwError(
                    () =>
                        new Error(
                            'El servicio tardó demasiado en responder. Intenta nuevamente.'
                        )
                );

            default:
                return throwError(
                    () =>
                        new Error(
                            'No fue posible completar la autenticación. Intenta nuevamente.'
                        )
                );
        }
    }

    private extractApiErrorMessage(
        error: HttpErrorResponse
    ): string | null {
        const response = error.error as
            | AuthCentralApiResponse<unknown>
            | string
            | null;

        if (
            typeof response === 'string' &&
            response.trim()
        ) {
            return response.trim();
        }

        if (
            !response ||
            typeof response !== 'object'
        ) {
            return null;
        }

        const message =
            response.errors
                ?.map(
                    (apiError) =>
                        apiError.message ||
                        apiError.detail
                )
                .find(
                    (
                        candidate
                    ): candidate is string =>
                        Boolean(
                            candidate?.trim()
                        )
                );

        return message?.trim() || null;
    }

    private readStoredSession():
        AuthSession | null {
        if (!this.isBrowser) {
            return null;
        }

        const rawSession =
            localStorage.getItem(
                this.storageKey
            );

        if (!rawSession) {
            return null;
        }

        try {
            const session = JSON.parse(
                rawSession
            ) as AuthSession;

            if (!session.accessToken) {
                localStorage.removeItem(
                    this.storageKey
                );

                return null;
            }

            if (
                session.expiresAtUtc &&
                new Date(
                    session.expiresAtUtc
                ).getTime() <= Date.now()
            ) {
                localStorage.removeItem(
                    this.storageKey
                );

                return null;
            }

            return session;
        } catch {
            localStorage.removeItem(
                this.storageKey
            );

            return null;
        }
    }

    private readPendingContact():
        PendingContactAuthentication | null {
        if (!this.isBrowser) {
            return null;
        }

        const rawPendingContact =
            sessionStorage.getItem(
                this.pendingStorageKey
            );

        if (!rawPendingContact) {
            return null;
        }

        try {
            return JSON.parse(
                rawPendingContact
            ) as PendingContactAuthentication;
        } catch {
            sessionStorage.removeItem(
                this.pendingStorageKey
            );

            return null;
        }
    }

    private persistSession(
        session: AuthSession
    ): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.setItem(
            this.storageKey,
            JSON.stringify(session)
        );
    }

    private persistPendingContact(
        pendingContact:
            PendingContactAuthentication
    ): void {
        if (!this.isBrowser) {
            return;
        }

        sessionStorage.setItem(
            this.pendingStorageKey,
            JSON.stringify(pendingContact)
        );
    }

    private clearPendingAuthentication(): void {
        this.pendingContactState.set(null);

        if (this.isBrowser) {
            sessionStorage.removeItem(
                this.pendingStorageKey
            );
        }
    }

    private resolvePendingContactMethod(
        pendingAuthentication:
            PendingContactAuthentication
    ): string {
        const medioContacto =
            pendingAuthentication.telefono ||
            pendingAuthentication.correo;

        if (!medioContacto) {
            throw new Error(
                'No se encontró el correo electrónico o número telefónico utilizado para la autenticación.'
            );
        }

        return medioContacto.trim();
    }
}