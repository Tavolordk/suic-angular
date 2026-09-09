export interface AppRuntimeConfig {
  gatewayUrl?: string;
}

declare global {
  // Runtime configuration injected before Angular bootstraps in the browser.
  // The same value is also populated by server.ts during SSR.
  var __APP_CONFIG__: AppRuntimeConfig | undefined;
}

export const DEFAULT_GATEWAY_URL = 'http://10.237.3.42:8081';

export function getGatewayUrl(): string {
  const configured = globalThis.__APP_CONFIG__?.gatewayUrl?.trim();
  return (configured || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');
}
