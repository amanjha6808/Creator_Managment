@echo off
echo ================================
echo  Influencer Campaign Manager
echo  Starting Frontend (Next.js)
echo ================================

cd /d "%~dp0frontend"

echo.
echo  Available on:
echo    http://localhost:3000
echo    http://192.168.x.x:3000  (your LAN IP)
echo.
npm run dev
