export interface AuthCentralError {
    code?: string | null;
    message?: string | null;
    detail?: string | null;
}

export interface AuthCentralApiResponse<T> {
    success: boolean;
    data?: T | null;
    errors?: AuthCentralError[] | null;
    traceId?: string | null;
}

export interface LoginContactRequest {
    cuenta: string;
    medioContacto: string;
}

export interface LoginContactResponse {
    cuenta: string | null;
    medioContacto: string | null;
    contactoEnmascarado: string | null;
    sistema: string | null;
    audience: string | null;
    profileVersion: number;
    perfiles: string[] | null;
    idCodigo: string | null;
}

export interface VerifyContactRequest {
    cuenta: string;
    medioContacto: string;
    codigo: string;
}

/** PATCH /api/auth/tokens */
export interface RefreshTokenRequest {
    refreshToken: string;
}

/** DELETE /api/auth/sesiones */
export interface LogoutRequest {
    sid: string | null;
    refreshToken: string | null;
    motivo: string;
}

export interface TokenResponse {
    accessToken: string | null;
    refreshToken: string | null;
    tokenType: string | null;
    expiresIn: number;
    expiresAtUtc: string | null;
    sid: string | null;
    jti: string | null;
    sistema: string | null;
    audience: string | null;
    profileVersion: number;
    perfiles: string[] | null;
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
