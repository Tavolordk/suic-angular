param(
    [string]$Version = "2.1.0",
    [string]$GatewayUrl = "http://10.237.3.42:8081",
    [string]$IntelligenceApiUrl = "http://127.0.0.1:8080",
    [string]$ImageName = "spm-front"
)

$ErrorActionPreference = "Stop"

function Assert-HttpUrl([string]$Name, [string]$Value) {
    if ($Value -notmatch '^https?://') {
        throw "$Name debe iniciar con http:// o https://. Valor recibido: $Value"
    }
}

Assert-HttpUrl "GatewayUrl" $GatewayUrl
Assert-HttpUrl "IntelligenceApiUrl" $IntelligenceApiUrl

$GatewayUrl = $GatewayUrl.TrimEnd('/')
$IntelligenceApiUrl = $IntelligenceApiUrl.TrimEnd('/')
$TarFile = "${ImageName}_${Version}.tar"

Write-Host "============================================="
Write-Host " BUILD DOCKER - ${ImageName}:${Version}"
Write-Host " Gateway por defecto: $GatewayUrl"
Write-Host " API IA por defecto  : $IntelligenceApiUrl"
Write-Host "============================================="

docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker no esta disponible." }

docker build `
  --build-arg "DEFAULT_GATEWAY_URL=$GatewayUrl" `
  --build-arg "DEFAULT_INTELLIGENCE_API_URL=$IntelligenceApiUrl" `
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
INTELLIGENCE_API_URL=$IntelligenceApiUrl
"@ | Set-Content -Encoding ascii .env

Write-Host ""
Write-Host "LISTO"
Write-Host "Imagen : ${ImageName}:${Version}"
Write-Host "TAR    : $TarFile"
Write-Host ".env   : GATEWAY_URL=$GatewayUrl"
Write-Host ".env   : INTELLIGENCE_API_URL=$IntelligenceApiUrl"
Write-Host ""
Write-Host "En el servidor:"
Write-Host "  docker load -i $TarFile"
Write-Host "  docker compose up -d"
Write-Host ""
Write-Host "Si luego cambia alguna URL NO necesitas reconstruir el TAR:"
Write-Host "  cambia GATEWAY_URL y/o INTELLIGENCE_API_URL en .env"
Write-Host "  docker compose up -d --force-recreate"
