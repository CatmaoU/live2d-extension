@echo off
setlocal enabledelayedexpansion

set "CURSORS_DIR=%~dp0"

echo Scanning cursor folders...

if not exist "%CURSORS_DIR%" (
    echo Error: Cursor directory not found
    pause
    exit /b 1
)

del /f /q "%CURSORS_DIR%\cursors_manifest.json" 2>nul

echo { > "%CURSORS_DIR%\cursors_manifest.json"
echo   "cursors": [ >> "%CURSORS_DIR%\cursors_manifest.json"

set "first=true"

for /d %%d in ("%CURSORS_DIR%\*") do (
    set "folder=%%~nd"
    set "fpath=%%~fd"
    
    dir "%%d\*.cur" "%%d\*.ani" >nul 2>&1
    if not errorlevel 1 (
        if /i not "!folder!"=="__pycache__" (
            echo Found: !folder!
            
            if "!first!"=="false" (
                echo   , >> "%CURSORS_DIR%\cursors_manifest.json"
            )
            set "first=false"
            
            echo   { >> "%CURSORS_DIR%\cursors_manifest.json"
            echo     "id": "!folder!", >> "%CURSORS_DIR%\cursors_manifest.json"
            echo     "folder": "!folder!" >> "%CURSORS_DIR%\cursors_manifest.json"
            echo   } >> "%CURSORS_DIR%\cursors_manifest.json"
            
            if exist "!fpath!\cursors.json" (
                echo   - Config exists, skipping
            ) else (
                (
                    echo {
                    echo   "name": "!folder!",
                    echo   "description": "Custom cursor pack",
                    echo   "normal": "Normal.cur",
                    echo   "pointer": "Link.cur",
                    echo   "text": "Text.cur",
                    echo   "move": "Move.cur",
                    echo   "wait": "Busy.cur",
                    echo   "help": "Help.cur"
                    echo }
                ) > "!fpath!\cursors.json"
                echo   - Created new config
            )
        )
    )
)

echo   ] >> "%CURSORS_DIR%\cursors_manifest.json"
echo } >> "%CURSORS_DIR%\cursors_manifest.json"

echo Done!
pause