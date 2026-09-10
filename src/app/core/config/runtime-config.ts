export interface AppRuntimeConfig {
  gatewayUrl?: string;
  intelligenceApiUrl?: string;
}

declare global {
  // Runtime configuration injected before Angular bootstraps in the browser.
  // The same values are also populated by server.ts during SSR.
  var __APP_CONFIG__: AppRuntimeConfig | undefined;
}

export const DEFAULT_GATEWAY_URL = 'http://10.237.3.42:8081';
export const DEFAULT_INTELLIGENCE_API_URL = 'http://127.0.0.1:8080';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getGatewayUrl(): string {
  const configured = globalThis.__APP_CONFIG__?.gatewayUrl?.trim();
  return normalizeBaseUrl(configured || DEFAULT_GATEWAY_URL);
}

export function getIntelligenceApiUrl(): string {
  const configured = globalThis.__APP_CONFIG__?.intelligenceApiUrl?.trim();
  return normalizeBaseUrl(configured || DEFAULT_INTELLIGENCE_API_URL);
}
