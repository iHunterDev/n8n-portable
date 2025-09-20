@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Default Node.js version
set DEFAULT_NODE_VERSION=22.19.0

REM Get Node.js version from parameter or use default
if "%1"=="" (
    set NODE_VERSION=%DEFAULT_NODE_VERSION%
    echo 使用默认 Node.js 版本: %NODE_VERSION%
) else (
    set NODE_VERSION=%1
    echo 使用指定 Node.js 版本: %NODE_VERSION%
)

REM Change to project root directory
cd /d "%~dp0.."

REM Check if Node.js already exists
if exist "bin\node.exe" (
    echo 检测到已存在的 Node.js 运行时
    for /f "tokens=*" %%i in ('bin\node.exe --version 2^>nul') do set CURRENT_VERSION=%%i
    if defined CURRENT_VERSION (
        set CURRENT_VERSION=!CURRENT_VERSION:v=!
        echo 当前版本: !CURRENT_VERSION!
        if "!CURRENT_VERSION!"=="%NODE_VERSION%" (
            echo Node.js 版本已是最新，无需下载
            exit /b 0
        ) else (
            echo 版本不匹配，将下载新版本
        )
    )
)

echo =======================================
echo      下载 Node.js 便携版 v%NODE_VERSION%
echo =======================================

REM Create temp directory if not exists
if not exist "temp" mkdir temp

REM Set download URL and filename
set DOWNLOAD_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-win-x64.zip
set ZIP_FILE=temp\node-v%NODE_VERSION%-win-x64.zip

echo 正在下载 Node.js v%NODE_VERSION%...
echo 下载地址: %DOWNLOAD_URL%

REM Download using PowerShell
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing; Write-Host '下载完成'; } catch { Write-Host '下载失败:' $_.Exception.Message; exit 1; }}"

if not exist "%ZIP_FILE%" (
    echo 错误: 下载失败
    exit /b 1
)

echo 正在解压 Node.js...

REM Remove existing bin directory if it exists
if exist "bin" (
    echo 清理旧版本...
    rmdir /s /q "bin" 2>nul
)

REM Extract using PowerShell
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; try { [System.IO.Compression.ZipFile]::ExtractToDirectory('%ZIP_FILE%', 'temp'); Write-Host '解压完成'; } catch { Write-Host '解压失败:' $_.Exception.Message; exit 1; }}"

REM Move extracted files to bin directory
if exist "temp\node-v%NODE_VERSION%-win-x64" (
    move "temp\node-v%NODE_VERSION%-win-x64" "bin" >nul
    echo Node.js 安装完成
) else (
    echo 错误: 解压后找不到预期的目录
    exit /b 1
)

REM Clean up
if exist "%ZIP_FILE%" del "%ZIP_FILE%" >nul
if exist "temp\node-v%NODE_VERSION%-win-x64" rmdir /s /q "temp\node-v%NODE_VERSION%-win-x64" 2>nul

REM Verify installation
if exist "bin\node.exe" (
    echo =======================================
    echo Node.js 下载安装成功!
    for /f "tokens=*" %%i in ('bin\node.exe --version') do echo 版本: %%i
    for /f "tokens=*" %%i in ('bin\npm.cmd --version') do echo npm 版本: %%i
    echo =======================================
) else (
    echo 错误: Node.js 安装失败
    exit /b 1
)

endlocal