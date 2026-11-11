@echo off
chcp 65001 >nul
cd /d "%~dp0"
node.exe "src\background.js" watch
pause

