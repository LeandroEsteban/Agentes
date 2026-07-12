param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path
)

$ErrorActionPreference = "Stop"
$envPath = "$PSScriptRoot\..\.env.qa.local"

# Load env vars
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
    }
}

Write-Host "[qa:migrate] Running database migrations..."
Push-Location $ProjectRoot
try {
    node database/scripts/migrate.js
    if ($LASTEXITCODE -ne 0) { throw "Migration failed" }
    Write-Host "[qa:migrate] Migrations applied successfully"
} finally {
    Pop-Location
}
