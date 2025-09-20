@echo off
chcp 65001 >nul
REM 简单的 .env 文件加载器 - 安全增强版
if not exist "config\.env" (
    echo Error: config\.env file not found
    exit /b 1
)

echo Loading environment variables from config\.env...
echo.

REM 计数器
set var_count=0

REM 安全地加载环境变量
for /f "usebackq eol=# delims=" %%a in ("config\.env") do (
    REM 跳过空行
    if not "%%a"=="" (
        REM 检查行是否包含等号且不是以等号开头
        echo "%%a" | findstr /r "^[^=]*=.*" >nul
        if errorlevel 0 (
            REM 安全地分割变量名和值
            for /f "tokens=1,* delims==" %%b in ("%%a") do (
                REM 移除变量名可能的空格
                set "var_name=%%b"
                call set "var_name=%%var_name: =%%"
                
                REM 设置环境变量（安全方式）
                set "%%b=%%c"
                
                REM 显示设置信息（保护敏感信息）
                echo %%b | findstr /i "PASSWORD SECRET KEY" >nul
                if errorlevel 1 (
                    echo   Set: %%b=%%c
                ) else (
                    echo   Set: %%b=******
                )
                
                REM 增加计数
                set /a var_count+=1
            )
        ) else (
            echo Skip: "%%a" (invalid format)
        )
    )
)

echo.
if %var_count% gtr 0 (
    echo Success: %var_count% environment variables loaded.
) else (
    echo Warning: No valid environment variables found in .env file.
    echo Check the file format: each line should be VARIABLE_NAME=value
)
exit /b 0