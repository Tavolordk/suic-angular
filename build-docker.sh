#!/usr/bin/env sh
set -eu

VERSION="${1:-2.1.0}"
GATEWAY_URL="${2:-http://10.237.3.42:8081}"
IMAGE_NAME="${3:-ssr-front}"
GATEWAY_URL="${GATEWAY_URL%/}"

case "$GATEWAY_URL" in
  http://*|https://*) ;;
  *) echo "GATEWAY_URL debe iniciar con http:// o https://" >&2; exit 1 ;;
esac

TAR_FILE="${IMAGE_NAME}_${VERSION}.tar"

docker build --build-arg "DEFAULT_GATEWAY_URL=$GATEWAY_URL" -t "$IMAGE_NAME:$VERSION" .
docker save -o "$TAR_FILE" "$IMAGE_NAME:$VERSION"

cat > .env <<EOF_ENV
FRONT_IMAGE=$IMAGE_NAME
FRONT_VERSION=$VERSION
FRONT_PORT=3500
GATEWAY_URL=$GATEWAY_URL
EOF_ENV

echo "Generado: $TAR_FILE"
echo "Gateway: $GATEWAY_URL"
