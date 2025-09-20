@echo off
chcp 65001 >nul
title n8n 便携版
echo =======================================
echo           n8n 便携版 启动器
echo =======================================
echo 正在启动 n8n 便携版...

REM Change to project root directory
cd /d "%~dp0.."

REM Check if Node.js runtime exists, download if not
if not exist "bin\node.exe" (
    echo 未检测到 Node.js 运行时，正在下载...
    call scripts\download-nodejs.bat
    if errorlevel 1 (
        echo 错误: Node.js 下载失败，无法启动 n8n
        pause
        exit /b 1
    )
)

REM Check if n8n is installed, install if not
if not exist "lib\node_modules\n8n\bin\n8n" (
    echo 未检测到 n8n 安装，正在安装...
    call scripts\install-n8n.bat
    if errorlevel 1 (
        echo 错误: n8n 安装失败，无法启动
        pause
        exit /b 1
    )
)

REM Set basic environment
set NODE_PATH=%CD%\lib\node_modules
set PATH=%CD%\bin;%PATH%

REM Load environment variables from .env file if it exists
if exist "config\.env" (
    echo 从 config\.env 加载配置...
    call scripts\load-env.bat
) else (
    echo 使用默认配置...
    REM Set default values
    set N8N_HOST=localhost
    set N8N_PORT=5678
    set N8N_PROTOCOL=http
    set N8N_USER_FOLDER=./data
    set DB_TYPE=sqlite
    set DB_SQLITE_DATABASE=./data/database/n8n.sqlite
    set N8N_SECURE_COOKIE=false
    set N8N_ENCRYPTION_KEY=portable-n8n-key-change-this
    set N8N_LOG_LEVEL=info
    set N8N_LOG_OUTPUT=file
    set N8N_LOG_FILE_LOCATION=./data/logs
    set N8N_DISABLE_UI=false
    set N8N_SKIP_ASSETS_CACHE=true
    set N8N_DEFAULT_BINARY_DATA_MODE=filesystem
    set N8N_BINARY_DATA_STORAGE_PATH=./data/binary-data
)

if not exist "data" mkdir data

echo.
echo n8n 配置信息:
echo   主机地址: %N8N_HOST%
echo   端口号:   %N8N_PORT%
echo   数据目录: %N8N_USER_FOLDER%
echo   数据库:   %DB_SQLITE_DATABASE%
echo.
echo =======================================
echo 启动完成后可访问: http://%N8N_HOST%:%N8N_PORT%
echo =======================================
echo.
echo 使用指南:
echo   - 按 Ctrl+C 停止服务
echo   - 或运行 scripts\stop.bat 停止服务
echo   - 更多帮助请查看项目文档
echo.

REM Start n8n
"%CD%\bin\node.exe" "%CD%\lib\node_modules\n8n\bin\n8n" start

pause