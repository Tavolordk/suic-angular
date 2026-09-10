#!/bin/sh
set -eu

GATEWAY_URL="${GATEWAY_URL:-${DEFAULT_GATEWAY_URL:-http://10.237.3.42:8081}}"
INTELLIGENCE_API_URL="${INTELLIGENCE_API_URL:-${DEFAULT_INTELLIGENCE_API_URL:-http://127.0.0.1:8080}}"

GATEWAY_URL="${GATEWAY_URL%/}"
INTELLIGENCE_API_URL="${INTELLIGENCE_API_URL%/}"

validate_url() {
  name="$1"
  value="$2"
  case "$value" in
    http://*|https://*) ;;
    *)
      echo "ERROR: $name debe iniciar con http:// o https://" >&2
      exit 1
      ;;
  esac
}

validate_url "GATEWAY_URL" "$GATEWAY_URL"
validate_url "INTELLIGENCE_API_URL" "$INTELLIGENCE_API_URL"

export GATEWAY_URL INTELLIGENCE_API_URL

node <<'NODE'
const fs = require('node:fs');
const path = '/app/dist/suic-angular/browser/runtime-config.js';
const config = {
  gatewayUrl: process.env.GATEWAY_URL,
  intelligenceApiUrl: process.env.INTELLIGENCE_API_URL,
};

fs.writeFileSync(
  path,
  `globalThis.__APP_CONFIG__ = Object.freeze(${JSON.stringify(config, null, 2)});\n`,
  'utf8',
);
NODE

echo "Frontend configurado con GATEWAY_URL=$GATEWAY_URL"
echo "Frontend configurado con INTELLIGENCE_API_URL=$INTELLIGENCE_API_URL"
exec "$@"
