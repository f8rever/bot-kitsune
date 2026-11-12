@echo off
title Kitsune Painel & API - Auto Restarter
color 0b
echo ==============================================
echo   KITSUNE V2 - PAINEL WEB & GIFT API (PORTA 5000)
echo ==============================================
cd /d "%~dp0\python_backend"

:loop
echo [%date% %time%] Iniciando Servidor Flask (main_backend.py)...
python -u main_backend.py
echo.
echo [AVISO] O servidor do painel foi encerrado!
echo Reiniciando automaticamente em 5 segundos... (Pressione Ctrl+C para encerrar)
timeout /t 5 /nobreak >nul
goto loop
