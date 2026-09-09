import { InjectionToken } from '@angular/core';
import { getGatewayUrl } from '../../config/runtime-config';

/**
 * Base de los endpoints de búsqueda publicados por el mismo API Gateway.
 * Mantiene /api como parte del contrato del frontend.
 */
export const SEARCH_API_BASE_URL = new InjectionToken<string>('SEARCH_API_BASE_URL', {
  providedIn: 'root',
  factory: () => `${getGatewayUrl()}/api`,
});
