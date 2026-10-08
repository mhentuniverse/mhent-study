@echo off
title Build MHEnt Study Desktop .exe Installer
echo =========================================================
echo   MHEnt Study — Dong goi ung dung .exe cho Windows
echo =========================================================
echo Dang dong goi thanh ban Installer va ban Portable...
set "PATH=C:\Program Files\nodejs;%PATH%"
call npm.cmd run dist
echo.
echo =========================================================
echo  HOAN TAT! File cai dat da san sang trong thu muc dist/
echo =========================================================
pause
