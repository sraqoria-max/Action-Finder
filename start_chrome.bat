@echo off
title Action Finder - Chrome Launcher
echo ========================================================
echo Starting Action Finder on http://localhost:8000
echo ========================================================

:: Check if port 8000 is running, if not start background python server
netstat -ano | findstr :8000 >nul
if %errorlevel% neq 0 (
    echo Starting local web server...
    start /b python -m http.server 8000
    timeout /t 2 /nobreak >nul
)

echo Opening Google Chrome...
start "" "chrome" "http://localhost:8000"
if %errorlevel% neq 0 (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
)

echo Done! If Chrome did not open automatically, visit:
echo http://localhost:8000
