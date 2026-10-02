@echo off
title NetTopology Studio
cd /d "%~dp0"
echo ========================================================
echo   UINFOR - NETTOPOLOGY STUDIO
echo   Iniciando aplicacion y servidor local...
echo ========================================================
set PATH=C:\Program Files\nodejs;%PATH%
start "" "http://localhost:3000/"
call npx vite --port 3000
pause
