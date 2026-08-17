export interface AuthCentralError {
    code?: string | null;
    message?: string | null;
    detail?: string | null;
    field?: string | null;
}

/** Envoltura estándar `ApiResponse<T>` de Spm.Api. */
export interface AuthCentralApiResponse<T> {
    success: boolean;
    message?: string | null;
    data?: T | null;
    errors?: AuthCentralError[] | null;
    traceId?: string | null;
}

/** POST /api/v1/auth/mfa/challenges → MfaChallengeRequest */
export interface LoginContactRequest {
    /** Cuenta institucional de 14 caracteres. */
    cuenta: string;
    medioContacto: string;
    /** Id del CAPTCHA generado que acaba de validarse. */
    captchaChallengeId: string;
    /** Respuesta alfanumérica capturada por el usuario para ese CAPTCHA. */
    captchaAnswer: string;
}

/**
 * POST /api/v1/auth/mfa/challenges → MfaChallengeResponse
 *
 * El contrato vigente solo devuelve `challengeId` y `maskedContact`. Los demás
 * campos son alias de contratos previos que se conservan opcionales para no
 * romper si el ambiente desplegado todavía responde con la forma anterior.
 */
export interface LoginContactResponse {
    challengeId?: string | null;
    maskedContact?: string | null;

    // --- Alias heredados ---
    cuenta?: string | null;
    medioContacto?: string | null;
    contactoEnmascarado?: string | null;
    sistema?: string | null;
    audience?: string | null;
    profileVersion?: number | null;
    perfiles?: string[] | null;
    idCodigo?: string | null;
}

/** POST /api/v1/auth/mfa/verification → MfaVerificationRequest */
export interface VerifyContactRequest {
    cuenta: string;
    medioContacto: string;
    codigo: string;
}

/** POST /api/v1/auth/tokens/refresh → TokenRefreshRequest */
export interface RefreshTokenRequest {
    refreshToken: string;
}

/** POST /api/v1/auth/sessions/logout → SessionLogoutRequest */
export interface SessionLogoutRequest {
    /** Requerido por el contrato (maxLength 200, minLength 1). */
    sid: string;
    /** Requerido por el contrato (maxLength 8192, minLength 1). */
    refreshToken: string;
    /** Requerido por el contrato (maxLength 500, minLength 1). */
    motivo: string;
}

/** POST /api/v1/auth/sessions/logout → SessionLogoutResponse */
export interface SessionLogoutResponse {
    message?: string | null;
}

/**
 * AuthenticationTokenResponse. El identificador de sesión viaja como `sessionId`
 * y los perfiles como `profiles`; `sid`/`perfiles` quedan como alias heredados.
 */
export interface TokenResponse {
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenType?: string | null;
    expiresIn?: number | null;
    expiresAtUtc?: string | null;
    sessionId?: string | null;
    profileVersion?: number | null;
    profiles?: string[] | null;

    // --- Alias heredados ---
    sid?: string | null;
    jti?: string | null;
    sistema?: string | null;
    audience?: string | null;
    perfiles?: string[] | null;
}

/**
 * Error de negocio o de transporte de los endpoints de autenticación. Conserva el
 * status para que el servicio distinga un refresh token rechazado (terminal) de un
 * fallo transitorio de red que sí admite reintento.
 */
export class AuthHttpError extends Error {
    constructor(
        message: string,
        readonly status: number
    ) {
        super(message);
        this.name = 'AuthHttpError';
    }
}
