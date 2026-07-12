$ErrorActionPreference = "Stop"
$composeFile = "$PSScriptRoot\..\docker-compose.qa.yml"
$envFile = "$PSScriptRoot\..\.env.qa.local"

Write-Host "[qa:destroy] Stopping and removing PostgreSQL QA container..."
docker compose -f $composeFile --env-file $envFile down --volumes --remove-orphans
if ($LASTEXITCODE -ne 0) { throw "docker compose down failed" }

Write-Host "[qa:destroy] Checking port 55432 is free..."
$portCheck = Get-NetTCPConnection -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "[qa:destroy] WARNING: Port 55432 may still be in use"
} else {
    Write-Host "[qa:destroy] Port 55432 is free"
}

Write-Host "[qa:destroy] QA environment cleaned up"
