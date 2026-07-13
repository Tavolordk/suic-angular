export interface AuthCentralError {
    code: string | null;
    message: string | null;
    detail: string | null;
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