$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$BackendDir = Join-Path $Root 'online-exam-system-backend'
$EnvFile = Join-Path $BackendDir 'env.local'
$JarPath = Join-Path $BackendDir 'target\exam-1.0-SNAPSHOT.jar'

. (Join-Path $Root 'scripts\dev-common.ps1')

Set-Location $BackendDir
Import-EnvLocal -EnvFilePath $EnvFile

$Host.UI.RawUI.WindowTitle = 'Online Exam Backend :8080'
Write-Host ('Backend: ' + $BackendDir) -ForegroundColor Cyan
Write-Host 'env.local loaded' -ForegroundColor Green
Write-Host ('java -jar ' + $JarPath) -ForegroundColor Cyan
Write-Host 'Ctrl+C to stop' -ForegroundColor DarkGray
Write-Host ''

if (-not (Test-Path $JarPath)) {
    Write-Host 'ERROR: JAR not found. Run .\start-all.ps1 from repo root first.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}

java -jar $JarPath
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Host ('Backend exited with code ' + $exitCode) -ForegroundColor Red
}
Write-Host ''
Read-Host 'Press Enter to close this window'
exit $exitCode
