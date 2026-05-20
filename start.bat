@echo off
setlocal
title KPI Studio

cd /d "%~dp0"

echo.
echo ==============================
echo        KPI Studio
echo ==============================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nu este instalat sau nu este disponibil in PATH.
  echo Instaleaza Node.js de la https://nodejs.org/ si ruleaza din nou acest fisier.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nu este disponibil in PATH.
  echo Reinstaleaza Node.js si bifeaza optiunea de adaugare in PATH.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalez dependentele...
  call npm install
  if errorlevel 1 (
    echo.
    echo Instalarea dependentelor a esuat.
    pause
    exit /b 1
  )
)

echo Construiesc aplicatia...
call npm run build
if errorlevel 1 (
  echo.
  echo Build-ul aplicatiei a esuat.
  pause
  exit /b 1
)

echo.
echo Pornesc KPI Studio la http://127.0.0.1:5174/
echo Pentru oprire, inchide aceasta fereastra sau apasa Ctrl+C.
echo.

set PORT=5174
set OPEN_BROWSER=1
node "%~dp0scripts\serve-dist.mjs"

echo.
pause
