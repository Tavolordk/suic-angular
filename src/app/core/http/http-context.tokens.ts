import { HttpContextToken } from '@angular/common/http';

/**
 * Evita que el interceptor global adjunte credenciales del sistema a una
 * petición explícitamente marcada como independiente (por ejemplo, IA local).
 */
export const SKIP_SYSTEM_AUTH = new HttpContextToken<boolean>(() => false);
