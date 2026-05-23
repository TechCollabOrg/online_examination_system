# One-click dev startup (backend + frontend)
# Usage:
#   .\start-all.ps1
#   .\start-all.ps1 -Rebuild
#   .\start-all.ps1 -Restart
#   .\start-all.ps1 -BackendOnly | -FrontendOnly | -NoBuild
#   .\start-all.ps1 -NoBrowser          # do not open browser

param(
    [switch]$Rebuild,
    [switch]$Restart,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$NoBuild,
    [switch]$NoBrowser,
    [string]$OpenUrl = 'http://localhost:9527'
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$BackendDir = Join-Path $Root 'online-exam-system-backend'
$FrontendDir = Join-Path $Root 'online-exam-system-frontend'
$CommonScript = Join-Path $Root 'scripts\dev-common.ps1'
$EnvFile = Join-Path $BackendDir 'env.local'
$JarPath = Join-Path $BackendDir 'target\exam-1.0-SNAPSHOT.jar'
$RunBackendScript = Join-Path $Root 'scripts\run-backend.ps1'
$RunFrontendScript = Join-Path $Root 'scripts\run-frontend.ps1'

. $CommonScript

$startBackend = -not $FrontendOnly
$startFrontend = -not $BackendOnly
$backendReady = -not $startBackend

Write-Host ''
Write-Host '========== Online Exam Dev Startup ==========' -ForegroundColor Cyan
Write-Host ''

if ($Restart) {
    Write-Host '(stop) Freeing ports 8080 and 9527...' -ForegroundColor Yellow
    Stop-PortListener -Port 8080
    Stop-PortListener -Port 9527
    Start-Sleep -Seconds 2
}

if ($startBackend) {
    if (-not (Test-Path $BackendDir)) {
        throw ('Backend folder not found: ' + $BackendDir)
    }
    Import-EnvLocal -EnvFilePath $EnvFile

    $backendUp = $false
    if ((Test-PortListening -Port 8080) -and -not $Restart) {
        if (Test-HttpOk -Url 'http://127.0.0.1:8080/api/auths/captcha/json') {
            Write-Host '(backend) Already running on 8080, skip' -ForegroundColor Green
            $backendUp = $true
        } else {
            Write-Host '(backend) Port 8080 busy but API down, restarting...' -ForegroundColor Yellow
            Stop-PortListener -Port 8080
            Start-Sleep -Seconds 2
        }
    }

    if (-not $backendUp) {
        if ($Rebuild) {
            Build-Backend -BackendDir $BackendDir
        } elseif (-not $NoBuild) {
            if (Test-BackendNeedsBuild -BackendDir $BackendDir -JarPath $JarPath) {
                Build-Backend -BackendDir $BackendDir
            } else {
                Write-Host '(backend) Reuse existing JAR, skip Maven build' -ForegroundColor Green
            }
        } elseif (-not (Test-Path $JarPath)) {
            throw 'JAR missing. Run without -NoBuild first.'
        }

        Write-Host '(backend) Starting in new window (title: Online Exam Backend :8080)...' -ForegroundColor Cyan
        Start-Process -FilePath 'powershell.exe' -ArgumentList @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $RunBackendScript
        ) | Out-Null
        $backendReady = Wait-Service -Name 'backend' -Url 'http://127.0.0.1:8080/api/auths/captcha/json' -MaxWaitSec 180
        if (-not $backendReady) {
            Write-Host '' 
            Write-Host '(backend) NOT READY after 180s.' -ForegroundColor Red
            Write-Host '  Check the backend window for MySQL/Redis errors.' -ForegroundColor Yellow
            Write-Host '  Ensure MySQL (db_exam) and Redis are running; env.local passwords must match.' -ForegroundColor Yellow
        }
    } else {
        $backendReady = $true
    }
}

if ($startFrontend) {
    if ($startBackend -and -not $backendReady) {
        Write-Host '(frontend) Skipped: backend did not start. Fix backend first, then run start-all again.' -ForegroundColor Red
        Write-Host ''
        exit 1
    }
    if (-not (Test-Path $FrontendDir)) {
        throw ('Frontend folder not found: ' + $FrontendDir)
    }

    $frontendUp = $false
    if ((Test-PortListening -Port 9527) -and -not $Restart) {
        if (Test-HttpOk -Url 'http://127.0.0.1:9527') {
            Write-Host '(frontend) Already running on 9527, skip' -ForegroundColor Green
            $frontendUp = $true
        } else {
            Stop-PortListener -Port 9527
            Start-Sleep -Seconds 1
        }
    }

    if (-not $frontendUp) {
        $nodeModules = Join-Path $FrontendDir 'node_modules'
        if (-not (Test-Path $nodeModules)) {
            Write-Host '(frontend) First run: npm install...' -ForegroundColor Cyan
            Push-Location $FrontendDir
            try {
                & npm install
                if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
            } finally {
                Pop-Location
            }
        }

        Write-Host '(frontend) Starting dev server in new window...' -ForegroundColor Cyan
        Start-Process -FilePath 'powershell.exe' -ArgumentList @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $RunFrontendScript
        ) | Out-Null
        Wait-Service -Name 'frontend' -Url 'http://127.0.0.1:9527' -MaxWaitSec 120 | Out-Null
    }
}

Write-Host ''
if ($startBackend -and -not $backendReady) {
    Write-Host '---------- Startup FAILED (backend) ----------' -ForegroundColor Red
    exit 1
}

Write-Host '---------- Ready ----------' -ForegroundColor Green
if ($startFrontend) { Write-Host '  Frontend: http://localhost:9527' }
if ($startBackend) { Write-Host '  Backend:  http://127.0.0.1:8080' }
Write-Host '  Login:    teacher / admin / student  password: 123456'
Write-Host ''
Write-Host '  Stop:     .\stop-all.ps1' -ForegroundColor DarkGray
Write-Host ''

if ($startFrontend -and -not $NoBrowser) {
    Open-DevBrowser -Url $OpenUrl
}
