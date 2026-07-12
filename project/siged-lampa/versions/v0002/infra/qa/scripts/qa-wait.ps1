param(
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$maxRetries = [math]::Floor($TimeoutSeconds / 2)

Write-Host "[qa:wait] Waiting for PostgreSQL QA to be healthy..."
for ($i = 0; $i -lt $maxRetries; $i++) {
    $health = docker inspect --format='{{json .State.Health.Status}}' siged-lampa-qa-db 2>$null
    if ($health -eq '"healthy"') {
        Write-Host "[qa:wait] PostgreSQL is healthy!"
        exit 0
    }
    Start-Sleep -Seconds 2
}

docker logs siged-lampa-qa-db 2>$null
Write-Host "[qa:wait] ERROR: PostgreSQL did not become healthy within $TimeoutSeconds seconds"
exit 1
