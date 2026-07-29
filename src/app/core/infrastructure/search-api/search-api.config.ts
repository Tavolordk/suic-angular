import { InjectionToken } from '@angular/core';

/**
 * El Swagger entregado pertenece al mismo host actualmente usado por AuthService.
 * Al mover la API a gateway o proxy, cambia solamente este token.
 */
export const SEARCH_API_BASE_URL = new InjectionToken<string>(
  'SEARCH_API_BASE_URL',
  {
    providedIn: 'root',
    factory: () => 'http://10.237.3.42:55808/api'
  }
);
