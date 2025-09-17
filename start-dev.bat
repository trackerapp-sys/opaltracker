@echo off
echo Starting Opal Auction Tracker Server in Development Mode...
echo.

REM Start the development server
echo Starting development server...
set NODE_ENV=development
npx tsx server/index.ts

pause

