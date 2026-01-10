@echo off
title EstateManager
echo ============================================
echo          EstateManager - Startup
echo ============================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

:: Start the development server
echo [INFO] Starting EstateManager development server...
echo [INFO] The app will be available at http://localhost:5000
echo.
echo Press Ctrl+C to stop the server.
echo ============================================
echo.

call npm run dev

pause
