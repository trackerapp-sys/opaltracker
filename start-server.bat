@echo off
echo Starting Opal Auction Tracker Server...
echo.

REM Check if dist directory exists
if not exist "dist" (
    echo Building project first...
    call npm run build
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
)

REM Start the server
echo Starting server...
set NODE_ENV=production
node dist/index.js

pause

