@echo off
title BUILD-SAFE Lasam - Multi-Hazard GIS Platform
cd /d "%~dp0"

echo ======================================================================
echo   BUILD-SAFE: Multi-Hazard Site Intelligence & Land-Use Assessment
echo   Lasam, Cagayan (DOST Region II ^& LGU Lasam)
echo ======================================================================
echo.
echo   [*] Starting local server...
echo   [*] Opening default web browser automatically...
echo.
echo   [!] Keep this window open while using the application.
echo   [!] To stop the app, press Ctrl + C or simply close this window.
echo.
echo ======================================================================
echo.

npm run dev -- --open

if errorlevel 1 (
  echo.
  echo   [ERROR] Failed to start server. Please ensure Node.js and npm are installed.
  echo.
  pause
)
