param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path
)

$ErrorActionPreference = "Stop"
$envPath = "$PSScriptRoot\..\.env.qa.local"

Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
    }
}

Write-Host "[qa:seed] Running database seeds..."
Push-Location $ProjectRoot
try {
    node database/scripts/seed.js
    if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
    Write-Host "[qa:seed] Seeds applied successfully"
} finally {
    Pop-Location
}
