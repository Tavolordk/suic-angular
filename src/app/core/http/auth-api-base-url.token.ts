import { InjectionToken } from '@angular/core';
import { getGatewayUrl } from '../config/runtime-config';

/**
 * Host base del API Gateway. El valor se obtiene de runtime-config.js y puede
 * cambiarse con GATEWAY_URL sin recompilar el frontend.
 */
export const AUTH_API_BASE_URL = new InjectionToken<string>('AUTH_API_BASE_URL', {
  providedIn: 'root',
  factory: () => getGatewayUrl(),
});
