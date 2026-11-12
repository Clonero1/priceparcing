@echo off
chcp 65001 >nul
cd /d "%~dp0"
node.exe "src\send-latest-report.js"
pause
