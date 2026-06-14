@echo off
REM Admin Access Management Script for African Reel Reviews
REM 
REM This batch file makes it easy to run the admin access script on Windows
REM 
REM Usage:
REM   grant-admin.bat <user-email>
REM   grant-admin.bat <user-email> moderator
REM   grant-admin.bat list
REM 
REM Examples:
REM   grant-admin.bat john@example.com
REM   grant-admin.bat jane@example.com moderator
REM   grant-admin.bat list

if "%1"=="" (
    echo.
    echo 🔧 African Reel Reviews - Admin Access Management
    echo.
    echo Usage:
    echo   grant-admin.bat ^<user-email^>
    echo   grant-admin.bat ^<user-email^> ^<role^>
    echo   grant-admin.bat list
    echo.
    echo Examples:
    echo   grant-admin.bat john@example.com
    echo   grant-admin.bat jane@example.com moderator
    echo   grant-admin.bat list
    echo.
    echo Available roles: user, moderator, admin
    echo.
    pause
    exit /b 1
)

if "%1"=="list" (
    node grant-admin-access.js --list
) else if "%2"=="" (
    node grant-admin-access.js %1
) else (
    node grant-admin-access.js %1 --role %2
)

pause
