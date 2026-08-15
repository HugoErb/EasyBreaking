@echo off
chcp 65001 >nul

cd /d "%~dp0"
npm i

if errorlevel 1 (
	echo.
	echo Échec de l'installation des dépendances.
	pause
	exit /b 1
)

echo.
echo Dépendances installées ! Quittez cette invite de commande et lancez le programme.
pause >nul
