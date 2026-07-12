$ErrorActionPreference = "Stop"
$env:VITE_API_BASE_URL = "http://127.0.0.1:3001"
$env:VITE_DATA_MODE = "real"
$env:VITE_ENABLE_DEMO_FALLBACK = "false"
Set-Location "C:\Users\lmata\Documents\Universidad\Agentes\Nueva Fabrica Software Web\project\siged-lampa\versions\v0002\frontend"
$logFile = "C:\Users\lmata\Documents\Universidad\Agentes\Nueva Fabrica Software Web\runs\phase7ar1\frontend-qa.log"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx vite --port 5173 --host 127.0.0.1 > `"$logFile`" 2>&1" -NoNewWindow
Write-Host "Frontend QA starting..."
