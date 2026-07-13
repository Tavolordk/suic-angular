export interface AuthSession {
    usuario: string;
    correo: string;
    telefono: string;
    displayName: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresIn: number;
    expiresAtUtc: string | null;
    sid: string | null;
    jti: string | null;
    sistema: string | null;
    audience: string | null;
    profileVersion: number;
    perfiles: string[];
    issuedAt: string;
}

export interface LoginPayload {
    usuario: string;
    correo: string;
    telefono: string;
}

export interface PendingContactAuthentication {
    usuario: string;
    correo: string;
    telefono: string;
    cuenta: string;
    medioContacto: string;
    contactoEnmascarado: string | null;
    sistema: string | null;
    audience: string | null;
    profileVersion: number;
    perfiles: string[];
    idCodigo: string | null;
}