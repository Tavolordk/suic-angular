import { InjectionToken } from '@angular/core';

/**
 * API de inteligencia independiente del gateway actual.
 * Para QA/producción sustituir este valor mediante un provider de Angular.
 */
export const INTELLIGENCE_API_BASE_URL = new InjectionToken<string>(
  'INTELLIGENCE_API_BASE_URL',
  {
    providedIn: 'root',
    factory: () => 'http://127.0.0.1:8080'
  }
);
