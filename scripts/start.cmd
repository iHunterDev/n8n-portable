@echo off
chcp 65001 >nul
setlocal

REM Change to project root directory
cd /d "%~dp0.."

REM Check if Node.js exists, if not, automatically download it
if not exist "bin\node.exe" (
    echo 未检测到 Node.js 运行时，正在自动下载...
    call scripts\download-nodejs.bat
    if errorlevel 1 (
        echo 错误: Node.js 下载失败
        pause
        exit /b 1
    )
)

REM Use portable Node.js to run the start script with auto-installation
bin\node.exe scripts\js\start.js %*

endlocal