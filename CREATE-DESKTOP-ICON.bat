@echo off
title BUILD-SAFE - Create Desktop Shortcut
cd /d "%~dp0"

echo ======================================================================
echo   BUILD-SAFE Lasam: Desktop Shortcut Setup
echo ======================================================================
echo.
echo   [*] Creating BUILD-SAFE desktop shortcut on this computer...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"

echo.
echo ======================================================================
echo   [OK] Setup complete! You can now launch BUILD-SAFE from your Desktop.
echo ======================================================================
echo.
pause
