param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\qa-destroy.ps1"
& "$PSScriptRoot\qa-start.ps1" -ProjectRoot $ProjectRoot
& "$PSScriptRoot\qa-migrate.ps1" -ProjectRoot $ProjectRoot
& "$PSScriptRoot\qa-seed.ps1" -ProjectRoot $ProjectRoot
& "$PSScriptRoot\qa-verify.ps1" -ProjectRoot $ProjectRoot
