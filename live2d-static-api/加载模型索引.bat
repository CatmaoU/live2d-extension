@echo off
chcp 65001 >nul
echo ========================================
echo Live2D模型索引更新工具 v1.0.2
echo ========================================
echo 更新说明：
echo   - 修复了文件中文文件名乱码的问题
echo   - 优先使用自定义 model.json 配置
echo   - 添加了对 VTube Studio 格式模型
echo ========================================
echo.

REM 检查 node 是否存在
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误：未找到 Node.js，请先安装 Node.js
    echo.
    pause
    exit /b 1
)

echo [1/2] 正在运行 build.js...
echo       （检测中文文件名并自动修复中...）
node build.js
if %errorlevel% neq 0 (
    echo 错误：运行 build.js 失败
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] 完成！
echo.
echo 模型索引已成功更新到 indexes 文件夹
echo.
echo 提示：如果模型文件夹中有中文命名的 .model3.json 文件，
echo       已自动创建英文副本以确保兼容性
echo.
pause
