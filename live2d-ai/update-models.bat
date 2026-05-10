@echo off
setlocal

echo ==============================================
echo         Live2D 模型配置自动更新脚本
echo ==============================================
echo.

:: 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误：未找到 Python，请先安装 Python
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 检查 requests 库是否安装
python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo 正在安装 requests 库...
    pip install requests
    if errorlevel 1 (
        echo 错误：requests 安装失败！
        pause
        exit /b 1
    )
    echo requests 安装成功
)

:: 运行更新脚本
echo 正在运行更新脚本...
python update-models.py

echo.
echo ==============================================
pause