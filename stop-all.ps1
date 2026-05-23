$ErrorActionPreference = 'SilentlyContinue'
. (Join-Path $PSScriptRoot 'scripts\dev-common.ps1')

Write-Host 'Stopping backend (8080) and frontend (9527)...' -ForegroundColor Yellow
Stop-PortListener -Port 8080
Stop-PortListener -Port 9527
Start-Sleep -Seconds 1

if (Test-PortListening -Port 8080) { Write-Host 'WARN: port 8080 still in use' -ForegroundColor Red }
else { Write-Host 'Backend stopped' -ForegroundColor Green }

if (Test-PortListening -Port 9527) { Write-Host 'WARN: port 9527 still in use' -ForegroundColor Red }
else { Write-Host 'Frontend stopped' -ForegroundColor Green }
