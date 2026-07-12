$ErrorActionPreference = "Stop"
$composeFile = "$PSScriptRoot\..\docker-compose.qa.yml"

Write-Host "[qa:stop] Stopping only the SIGED Lampa QA database container..."
docker compose -f $composeFile stop postgres-qa
if ($LASTEXITCODE -ne 0) { throw "docker compose stop failed" }
