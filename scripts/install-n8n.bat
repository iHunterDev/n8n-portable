@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Default n8n version (empty means latest)
set DEFAULT_N8N_VERSION=

REM Get n8n version from parameter or use default
if "%1"=="" (
    set N8N_VERSION=%DEFAULT_N8N_VERSION%
    if "!N8N_VERSION!"=="" (
        echo 使用最新版本的 n8n
        set N8N_PACKAGE=n8n
    ) else (
        echo 使用指定 n8n 版本: !N8N_VERSION!
        set N8N_PACKAGE=n8n@!N8N_VERSION!
    )
) else (
    set N8N_VERSION=%1
    echo 使用指定 n8n 版本: %N8N_VERSION%
    set N8N_PACKAGE=n8n@%N8N_VERSION%
)

REM Change to project root directory
cd /d "%~dp0.."

REM Check if Node.js runtime exists, download if not
if not exist "bin\node.exe" (
    echo 未检测到 Node.js 运行时，正在下载...
    call scripts\download-nodejs.bat
    if errorlevel 1 (
        echo 错误: Node.js 下载失败，无法安装 n8n
        exit /b 1
    )
)

echo =======================================
echo           安装 n8n 便携版
echo =======================================

REM Create required directories
if not exist "lib" mkdir lib
if not exist "temp" mkdir temp

REM Set npm environment for portable installation
set NPM_CONFIG_PREFIX=%CD%\lib
set NPM_CONFIG_CACHE=%CD%\temp\npm-cache
set PATH=%CD%\bin;%PATH%

REM Check if n8n is already installed
if exist "lib\node_modules\n8n\package.json" (
    echo 检测到已安装的 n8n
    for /f "tokens=2 delims=:" %%i in ('findstr "version" "lib\node_modules\n8n\package.json"') do (
        set CURRENT_VERSION=%%i
        set CURRENT_VERSION=!CURRENT_VERSION: =!
        set CURRENT_VERSION=!CURRENT_VERSION:"=!
        set CURRENT_VERSION=!CURRENT_VERSION:,=!
        echo 当前版本: !CURRENT_VERSION!
    )
    
    if not "!N8N_VERSION!"=="" (
        if "!CURRENT_VERSION!"=="!N8N_VERSION!" (
            echo n8n 版本已是目标版本，无需重新安装
            exit /b 0
        ) else (
            echo 版本不匹配，将重新安装
        )
    ) else (
        echo 如需更新到最新版本，请重新运行安装脚本
        exit /b 0
    )
)

echo 正在配置 npm 环境...
echo   NPM 前缀: %NPM_CONFIG_PREFIX%
echo   缓存目录: %NPM_CONFIG_CACHE%
echo.

REM Initialize package.json if it doesn't exist
if not exist "lib\package.json" (
    echo 创建 package.json...
    echo { > "lib\package.json"
    echo   "dependencies": { >> "lib\package.json"
    echo   } >> "lib\package.json"
    echo } >> "lib\package.json"
)

echo 正在安装 n8n...
echo 安装包: %N8N_PACKAGE%
echo.

REM Change to lib directory for npm install
cd /d "%CD%\lib"

REM Install n8n
"%CD%\..\bin\npm.cmd" install %N8N_PACKAGE% --save --no-audit --no-fund --progress=true

if errorlevel 1 (
    echo 错误: n8n 安装失败
    cd /d "%~dp0.."
    exit /b 1
)

REM Return to project root
cd /d "%~dp0.."

REM Verify installation
if exist "lib\node_modules\n8n\package.json" (
    echo =======================================
    echo n8n 安装成功!
    
    REM Get installed version
    for /f "tokens=2 delims=:" %%i in ('findstr "version" "lib\node_modules\n8n\package.json"') do (
        set INSTALLED_VERSION=%%i
        set INSTALLED_VERSION=!INSTALLED_VERSION: =!
        set INSTALLED_VERSION=!INSTALLED_VERSION:"=!
        set INSTALLED_VERSION=!INSTALLED_VERSION:,=!
        echo 安装版本: !INSTALLED_VERSION!
    )
    
    REM Check if n8n binary exists
    if exist "lib\node_modules\n8n\bin\n8n" (
        echo n8n 可执行文件: lib\node_modules\n8n\bin\n8n
    ) else (
        echo 警告: 找不到 n8n 可执行文件
    )
    
    echo =======================================
    echo.
    echo 安装完成! 现在可以运行 scripts\start.bat 启动 n8n
) else (
    echo 错误: n8n 安装验证失败
    exit /b 1
)

endlocal