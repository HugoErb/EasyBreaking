@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
    echo Git est introuvable. Installez Git puis relancez ce fichier.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo npm est introuvable. Installez Node.js puis relancez ce fichier.
    pause
    exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo Ce dossier n'est pas une copie Git de l'application.
    pause
    exit /b 1
)

for /f "delims=" %%I in ('git status --porcelain') do (
    echo Mise a jour annulee : des fichiers locaux ont ete modifies.
    echo Sauvegardez ou annulez ces modifications avant de recommencer.
    pause
    exit /b 1
)

for /f "delims=" %%I in ('git branch --show-current') do set "BRANCHE=%%I"
if /i not "%BRANCHE%"=="main" (
    echo Mise a jour annulee : la branche active doit etre main.
    pause
    exit /b 1
)

echo Recherche de la derniere version...
git fetch origin main
if errorlevel 1 goto :erreur

git merge --ff-only origin/main
if errorlevel 1 goto :erreur

echo Mise a jour des dependances...
call npm install
if errorlevel 1 goto :erreur

echo.
echo L'application est a jour.
pause
exit /b 0

:erreur
echo.
echo Echec de la mise a jour.
pause
exit /b 1
