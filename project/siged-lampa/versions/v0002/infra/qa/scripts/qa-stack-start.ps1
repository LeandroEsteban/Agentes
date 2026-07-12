param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path,
    [int]$BackendPort = 3100,
    [int]$FrontendPort = 4173
)

$ErrorActionPreference = "Stop"
$runs = Join-Path $ProjectRoot "runs\phase7ar2"
New-Item -ItemType Directory -Force -Path $runs | Out-Null
Get-Content "$PSScriptRoot\..\.env.qa.local" | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { Set-Item "env:$($matches[1].Trim())" $matches[2].Trim() } }
$env:APP_ENV = "qa"
$env:NODE_ENV = "qa"
$env:PERSISTENCE_MODE = "postgres"
$env:PORT = "$BackendPort"
$env:VITE_BACKEND_URL = "http://127.0.0.1:$BackendPort"
$env:VITE_DATA_MODE = "real"
$env:VITE_ENABLE_DEMO_FALLBACK = "false"

& "$PSScriptRoot\qa-start.ps1" -ProjectRoot $ProjectRoot
& "$PSScriptRoot\qa-wait.ps1"
& "$PSScriptRoot\qa-migrate.ps1" -ProjectRoot $ProjectRoot
& "$PSScriptRoot\qa-seed.ps1" -ProjectRoot $ProjectRoot
& "$PSScriptRoot\qa-verify.ps1" -ProjectRoot $ProjectRoot

$backend = Start-Process -FilePath "node.exe" -ArgumentList "backend/src/server.js" -WorkingDirectory $ProjectRoot -PassThru -RedirectStandardOutput "$runs\backend-qa.log" -RedirectStandardError "$runs\backend-qa-error.log"
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host 127.0.0.1 --port $FrontendPort" -WorkingDirectory (Join-Path $ProjectRoot "frontend") -PassThru -RedirectStandardOutput "$runs\frontend-qa.log" -RedirectStandardError "$runs\frontend-qa-error.log"
for ($i = 0; $i -lt 30; $i++) { try { if ((Invoke-WebRequest "http://127.0.0.1:$BackendPort/health" -UseBasicParsing).StatusCode -eq 200) { break } } catch {}; Start-Sleep 1 }
for ($i = 0; $i -lt 30; $i++) { try { if ((Invoke-WebRequest "http://127.0.0.1:$FrontendPort/" -UseBasicParsing).StatusCode -eq 200) { break } } catch {}; Start-Sleep 1 }
$databaseHealth = Invoke-WebRequest "http://127.0.0.1:$BackendPort/health/database" -UseBasicParsing
$backendHealth = Invoke-WebRequest "http://127.0.0.1:$BackendPort/health" -UseBasicParsing
$frontendHealth = Invoke-WebRequest "http://127.0.0.1:$FrontendPort/" -UseBasicParsing
@{ postgresql = @{ host = "127.0.0.1"; port = 55432; container = "siged-lampa-qa-db"; healthy = $true }; backend = @{ url = "http://127.0.0.1:$BackendPort"; pid = $backend.Id; healthy = ($backendHealth.StatusCode -eq 200) }; frontend = @{ url = "http://127.0.0.1:$FrontendPort"; pid = $frontend.Id; healthy = ($frontendHealth.StatusCode -eq 200) } } | ConvertTo-Json -Depth 4 | Set-Content "$runs\qa-service-inventory.json"
@{ backend = @{ status = $backendHealth.StatusCode }; database = @{ status = $databaseHealth.StatusCode; body = ($databaseHealth.Content | ConvertFrom-Json) }; frontend = @{ status = $frontendHealth.StatusCode } } | ConvertTo-Json -Depth 5 | Set-Content "$runs\health-report.json"
Set-Content "$runs\backend-qa.pid" $backend.Id
Set-Content "$runs\frontend-qa.pid" $frontend.Id
