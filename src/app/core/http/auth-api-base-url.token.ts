import { InjectionToken } from '@angular/core';

/**
 * Host de Spm.Api. Los endpoints de autenticación y captcha cuelgan de
 * `/api/auth`. Al mover la API a gateway o proxy, cambia solamente este token.
 */
export const AUTH_API_BASE_URL = new InjectionToken<string>('AUTH_API_BASE_URL', {
    providedIn: 'root',
    factory: () => 'http://10.237.3.42:55808'
});
