@echo off
chcp 65001 >nul
setlocal

REM Change to project root directory
cd /d "%~dp0.."

REM Use portable Node.js
if exist "bin\node.exe" (
    bin\node.exe scripts\js\stop.js %*
) else (
    echo 错误: 未找到 Node.js 运行时
    echo 正在尝试使用系统命令停止 n8n...
    taskkill /f /im node.exe 2>nul
    if errorlevel 0 (
        echo n8n 已停止
    ) else (
        echo 未找到运行中的 n8n 进程
    )
    pause
    exit /b 0
)

endlocal