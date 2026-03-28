# Requereix: npm install des de Windows (Node win32) perquè lightningcss instal·li el binari correcte.
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

$apiDir = Join-Path $Root 'src\app\api'
$stashDir = Join-Path $Root '.api-server-only-stash'

function Restore-Api {
  if (Test-Path -LiteralPath $stashDir) {
    if (Test-Path -LiteralPath $apiDir) {
      Remove-Item -LiteralPath $apiDir -Recurse -Force
    }
    Move-Item -LiteralPath $stashDir -Destination $apiDir
  }
}

if (Test-Path -LiteralPath $stashDir) {
  Write-Host "Estat inconsistent: elimina $stashDir i torna-ho a provar."
  exit 1
}

try {
  Move-Item -LiteralPath $apiDir -Destination $stashDir
  $env:CAPACITOR_STATIC = '1'

  if (-not $env:NEXT_PUBLIC_API_URL) {
    Write-Host "Avís: NEXT_PUBLIC_API_URL no està definit. L’app Capacitor necessita l’URL del backend (Railway), p. ex.:"
    Write-Host '  $env:NEXT_PUBLIC_API_URL="https://el-teu-projecte.up.railway.app"; npm run build:capacitor'
  }

  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  npx cap sync
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  Restore-Api
}
