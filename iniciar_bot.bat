@echo off
title Kitsune Bot - Auto Restarter
color 0a
echo ==============================================
echo       KITSUNE V2 BOT - INICIALIZANDO...
echo ==============================================
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

:loop
echo [%date% %time%] Iniciando Kitsune Bot...
node index.js
echo.
echo [AVISO] O processo do bot foi encerrado!
echo Reiniciando automaticamente em 5 segundos... (Pressione Ctrl+C para encerrar)
timeout /t 5 /nobreak >nul
goto loop
