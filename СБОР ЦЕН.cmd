@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "src\update.ps1" -Quiet
if not exist ".data\browser-state\impart.json" goto authorize
if not exist ".data\browser-state\autopiter.json" goto authorize
goto start

:authorize
node.exe "src\authorize.js"
if errorlevel 1 goto authorization_failed
goto start

:authorization_failed
echo Authorization failed. Collection was not started.
pause
exit /b 1

:start
node.exe "src\background.js" start

