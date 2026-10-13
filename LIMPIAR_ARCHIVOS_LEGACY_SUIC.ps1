# Limpieza conservadora de archivos antiguos que no pertenecen al SRC SUIC actual.
# No modifica servicios, endpoints, ni componentes vigentes.
# Compatible con Windows PowerShell 5.1 y PowerShell 7+.
param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$src = Join-Path $ProjectRoot 'src'
if (-not (Test-Path -LiteralPath (Join-Path $src 'app\app.routes.ts'))) {
    throw "No encuentro src/app/app.routes.ts en '$ProjectRoot'. Ejecuta este script desde la raiz de suic-angular."
}

$legacy = @(
    [pscustomobject]@{
        Rel = 'app\features\auth\infrastructure\local-storage-auth.repository.ts'
        Tokens = @('LocalStorageAuthRepository', 'local-storage-auth.repository')
    },
    [pscustomobject]@{
        Rel = 'app\registro-page.component.ts'
        Tokens = @('RegistroPageComponent', 'registro-page.component', 'app-registro-page')
    },
    [pscustomobject]@{
        Rel = 'app\shared\ui\animated-wave-background\animated-wave-background.component.ts'
        Tokens = @('AnimatedWaveBackgroundComponent', 'animated-wave-background.component', 'app-animated-wave-background')
    }
)

$present = @($legacy | Where-Object {
    Test-Path -LiteralPath (Join-Path $src $_.Rel)
})
if ($present.Count -eq 0) {
    Write-Host 'No existen los tres archivos legacy. No se modifico nada.' -ForegroundColor Green
    Write-Host 'Si ng serve sigue fallando, comparte el nuevo registro de errores.'
    exit 0
}

Write-Host 'Verificando referencias a los archivos legacy antes de moverlos...' -ForegroundColor Cyan
$codeFiles = @(Get-ChildItem -LiteralPath $src -Recurse -File |
    Where-Object { $_.Extension -in @('.ts', '.html', '.scss', '.json') })

$allLegacyPaths = @($present | ForEach-Object { Join-Path $src $_.Rel })
$references = @()
foreach ($item in $present) {
    $selfPath = Join-Path $src $item.Rel
    foreach ($file in $codeFiles) {
        if ($allLegacyPaths -contains $file.FullName) { continue }
        $content = [System.IO.File]::ReadAllText($file.FullName)
        foreach ($token in $item.Tokens) {
            if ($content.IndexOf($token, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $references += [pscustomobject]@{
                    Legacy = $item.Rel
                    ReferencedBy = $file.FullName.Substring($src.Length + 1)
                    Match = $token
                }
                break
            }
        }
    }
}

if ($references.Count -gt 0) {
    Write-Host 'No se movio nada: hay referencias que requieren revision.' -ForegroundColor Yellow
    $references | Format-Table -AutoSize
    throw 'Comparte estas referencias para evaluar si los archivos realmente estan en uso.'
}

$backupBase = Join-Path $ProjectRoot '_respaldo_archivos_legacy_fuera_de_src'
$backup = Join-Path $backupBase (Get-Date -Format 'yyyyMMdd_HHmmss_fff')
foreach ($item in $present) {
    $origin = Join-Path $src $item.Rel
    $destination = Join-Path $backup $item.Rel
    $destinationDir = Split-Path -Path $destination -Parent
    New-Item -Path $destinationDir -ItemType Directory -Force | Out-Null
    Move-Item -LiteralPath $origin -Destination $destination -ErrorAction Stop
    Write-Host "Respaldo: $($item.Rel)" -ForegroundColor Green
}

Write-Host ''
Write-Host "Listo. Los archivos antiguos se movieron a: $backup" -ForegroundColor Green
Write-Host 'El resto de src no fue modificado. ng serve detectara los cambios automaticamente.'
Write-Host 'Para validar compilacion completa: detiene ng serve y ejecuta ng build.'
