export interface AuthSession {
    usuario: string;
    correo: string;
    telefono: string;
    displayName: string;
    issuedAt: string;
}

export interface LoginPayload {
    usuario: string;
    correo: string;
    telefono: string;
}