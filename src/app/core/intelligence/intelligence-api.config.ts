import { InjectionToken } from '@angular/core';
import { getIntelligenceApiUrl } from '../config/runtime-config';

/**
 * API de inteligencia independiente del gateway principal.
 * El valor se obtiene de runtime-config.js y puede cambiarse con
 * INTELLIGENCE_API_URL sin recompilar el frontend.
 */
export const INTELLIGENCE_API_BASE_URL = new InjectionToken<string>(
  'INTELLIGENCE_API_BASE_URL',
  {
    providedIn: 'root',
    factory: () => getIntelligenceApiUrl(),
  },
);
