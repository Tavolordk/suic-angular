param(
    [string]$Version = "2.1.0",
    [string]$GatewayUrl = "http://10.237.3.42:8081",
    [string]$ImageName = "spm-front"
)

$ErrorActionPreference = "Stop"

if ($GatewayUrl -notmatch '^https?://') {
    throw "GatewayUrl debe iniciar con http:// o https://. Ejemplo: http://10.237.3.42:8081"
}

$GatewayUrl = $GatewayUrl.TrimEnd('/')
$TarFile = "${ImageName}_${Version}.tar"

Write-Host "============================================="
Write-Host " BUILD DOCKER - ${ImageName}:${Version}"
Write-Host " Gateway por defecto: $GatewayUrl"
Write-Host "============================================="

docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker no esta disponible." }

docker build `
  --build-arg "DEFAULT_GATEWAY_URL=$GatewayUrl" `
  -t "${ImageName}:${Version}" `
  .
if ($LASTEXITCODE -ne 0) { throw "Fallo docker build." }

if (Test-Path $TarFile) { Remove-Item $TarFile -Force }
docker save -o $TarFile "${ImageName}:${Version}"
if ($LASTEXITCODE -ne 0) { throw "Fallo docker save." }

@"
FRONT_IMAGE=$ImageName
FRONT_VERSION=$Version
FRONT_PORT=3500
GATEWAY_URL=$GatewayUrl
"@ | Set-Content -Encoding ascii .env

Write-Host ""
Write-Host "LISTO"
Write-Host "Imagen : ${ImageName}:${Version}"
Write-Host "TAR    : $TarFile"
Write-Host ".env   : GATEWAY_URL=$GatewayUrl"
Write-Host ""
Write-Host "En el servidor:"
Write-Host "  docker load -i $TarFile"
Write-Host "  docker compose up -d"
Write-Host ""
Write-Host "Si luego cambia la IP NO necesitas reconstruir el TAR:"
Write-Host "  cambia GATEWAY_URL en .env y ejecuta docker compose up -d --force-recreate"
