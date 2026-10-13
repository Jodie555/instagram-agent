@echo off
echo Running Instagram Agent setup...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0setup-claude-desktop.ps1"
echo.
echo === Script finished. See any errors above. ===
pause
