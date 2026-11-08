@echo off
chcp 65001 > nul
title Golf Swing Compare 自動化部署工具
echo ==================================================
echo   🚀 Golf Swing Compare 一鍵內網自動化部署
echo ==================================================
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\deploy.ps1"

echo.
echo 部署作業完成，按下任意鍵結束窗口...
pause > nul

