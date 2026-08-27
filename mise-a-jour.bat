@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

(
    cd /d "%~dp0"

    where powershell.exe >nul 2>&1
    if errorlevel 1 (
        echo PowerShell est introuvable.
        pause
        exit /b 1
    )

    set "UPDATE_HELPER=!TEMP!\EasyBreaking-update-!RANDOM!-!RANDOM!.ps1"
    copy /y "mise-a-jour.ps1" "!UPDATE_HELPER!" >nul
    if errorlevel 1 (
        echo Le fichier mise-a-jour.ps1 est introuvable.
        pause
        exit /b 1
    )

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "!UPDATE_HELPER!" -AppDirectory "!CD!"
    set "UPDATE_EXIT=!ERRORLEVEL!"
    del /q "!UPDATE_HELPER!" >nul 2>&1

    echo.
    if not "!UPDATE_EXIT!"=="0" (
        echo Echec de la mise a jour.
        pause
        exit /b !UPDATE_EXIT!
    )

    echo L'application est a jour.
    pause
    exit /b 0
)
