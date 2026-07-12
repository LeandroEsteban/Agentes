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

Write-Host "[qa:verify] Verifying database schema..."
Push-Location $ProjectRoot
try {
    $result = node -e "
    const { verifySchema } = require('./database/scripts/verify-schema');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.QA_DATABASE_URL || process.env.DATABASE_URL });
    verifySchema({ pool }).then(r => { console.log(JSON.stringify(r)); process.exit(r.status === 'ok' ? 0 : 1); }).catch(e => { console.error(e.message); process.exit(1); });
    " 2>&1
    $jsonResult = $result | ConvertFrom-Json
    Write-Host "[qa:verify] Tables: $($jsonResult.functional_tables) (expected 40)"
    Write-Host "[qa:verify] Migrations applied: $($jsonResult.migrations_applied) (expected 17)"
    Write-Host "[qa:verify] Migrations pending: $($jsonResult.migrations_pending) (expected 0)"
    Write-Host "[qa:verify] Checksums valid: $($jsonResult.checksums_valid)"
    Write-Host "[qa:verify] Primary keys: $($jsonResult.primary_keys)"
    Write-Host "[qa:verify] Foreign keys: $($jsonResult.foreign_keys)"
    Write-Host "[qa:verify] Unique constraints: $($jsonResult.unique_constraints)"
    Write-Host "[qa:verify] Indexes: $($jsonResult.indexes)"
    
    if ($jsonResult.status -eq 'ok') {
        Write-Host "[qa:verify] Schema verification PASSED"
        exit 0
    } else {
        Write-Host "[qa:verify] Schema verification FAILED: $($jsonResult.issues -join ', ')"
        exit 1
    }
} finally {
    Pop-Location
}
