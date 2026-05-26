@echo off
cd /d "%~dp0"
if exist dist\kospi-server.exe (
    dist\kospi-server.exe
) else (
    echo kospi-server.exe not found. Run build_exe.sh first.
)
pause
