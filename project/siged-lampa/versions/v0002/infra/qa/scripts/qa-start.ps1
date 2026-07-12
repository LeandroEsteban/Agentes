param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path
)

$ErrorActionPreference = "Stop"
$composeFile = "$PSScriptRoot\..\docker-compose.qa.yml"
$envFile = "$PSScriptRoot\..\.env.qa.local"

Write-Host "[qa:start] Starting PostgreSQL QA container..."
docker compose -f $composeFile --env-file $envFile up -d postgres-qa
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

Write-Host "[qa:start] Waiting for PostgreSQL to be healthy..."
$maxRetries = 30
$retryCount = 0
do {
    $health = docker inspect --format='{{json .State.Health.Status}}' siged-lampa-qa-db 2>$null
    if ($health -eq '"healthy"') {
        Write-Host "[qa:start] PostgreSQL is healthy!"
        break
    }
    $retryCount++
    if ($retryCount -ge $maxRetries) {
        docker logs siged-lampa-qa-db 2>$null
        throw "PostgreSQL did not become healthy within $maxRetries attempts"
    }
    Start-Sleep -Seconds 2
} while ($true)

Write-Host "[qa:start] PostgreSQL QA container is ready on port 55432"
