@echo off
echo ========================================
echo   Afro AI Backend Server Startup
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please:
    echo 1. Copy env.example.txt to .env
    echo 2. Add your API keys to .env
    echo 3. See SETUP_GUIDE.md for details
    echo.
    pause
    exit /b 1
)

REM Check API configuration
echo Checking API configuration...
call npm run check-apis
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if MongoDB is configured
echo Starting server...
echo.
echo Make sure MongoDB is running if using local database!
echo Press Ctrl+C to stop the server
echo.

REM Start the server
call npm run dev












