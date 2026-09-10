#!/usr/bin/env sh
set -eu

VERSION="${1:-2.1.0}"
GATEWAY_URL="${2:-http://10.237.3.42:8081}"
INTELLIGENCE_API_URL="${3:-http://127.0.0.1:8080}"
IMAGE_NAME="${4:-ssr-front}"

GATEWAY_URL="${GATEWAY_URL%/}"
INTELLIGENCE_API_URL="${INTELLIGENCE_API_URL%/}"

validate_url() {
  name="$1"
  value="$2"
  case "$value" in
    http://*|https://*) ;;
    *) echo "$name debe iniciar con http:// o https://" >&2; exit 1 ;;
  esac
}

validate_url "GATEWAY_URL" "$GATEWAY_URL"
validate_url "INTELLIGENCE_API_URL" "$INTELLIGENCE_API_URL"

TAR_FILE="${IMAGE_NAME}_${VERSION}.tar"

docker build \
  --build-arg "DEFAULT_GATEWAY_URL=$GATEWAY_URL" \
  --build-arg "DEFAULT_INTELLIGENCE_API_URL=$INTELLIGENCE_API_URL" \
  -t "$IMAGE_NAME:$VERSION" .

docker save -o "$TAR_FILE" "$IMAGE_NAME:$VERSION"

cat > .env <<EOF_ENV
FRONT_IMAGE=$IMAGE_NAME
FRONT_VERSION=$VERSION
FRONT_PORT=3500
GATEWAY_URL=$GATEWAY_URL
INTELLIGENCE_API_URL=$INTELLIGENCE_API_URL
EOF_ENV

echo "Generado: $TAR_FILE"
echo "Gateway: $GATEWAY_URL"
echo "API IA : $INTELLIGENCE_API_URL"
