#!/bin/sh
set -eu

GATEWAY_URL="${GATEWAY_URL:-${DEFAULT_GATEWAY_URL:-http://10.237.3.42:8081}}"
GATEWAY_URL="${GATEWAY_URL%/}"

case "$GATEWAY_URL" in
  http://*|https://*) ;;
  *)
    echo "ERROR: GATEWAY_URL debe iniciar con http:// o https://" >&2
    exit 1
    ;;
esac

# Escape mínimo para incluir el valor dentro de un string JS entre comillas simples.
ESCAPED_GATEWAY_URL=$(printf '%s' "$GATEWAY_URL" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g")

cat > /app/dist/suic-angular/browser/runtime-config.js <<EOF_CONFIG
globalThis.__APP_CONFIG__ = Object.freeze({
  gatewayUrl: '${ESCAPED_GATEWAY_URL}'
});
EOF_CONFIG

echo "Frontend configurado con GATEWAY_URL=$GATEWAY_URL"
exec "$@"
