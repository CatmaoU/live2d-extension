@echo off
title Live2D 模型索引更新
echo ================================================
echo        Live2D 模型索引更新
echo ================================================
echo.
echo     模型索引文件
echo     动作/表情缓存 (assets)
echo     自动修复表情文件名
echo.
echo  支持的模型格式：
echo    Cubism 2.0 / 3.0+ / VTS
echo.
echo ================================================
echo.

where node >nul 2>nul
if not %errorlevel% == 0 (
    echo [错误] 未找到 Node.js
    pause
    exit /b 1
)

echo [步骤 1/2] 运行 build.js...
node build.js
if not %errorlevel% == 0 (
    echo [错误] build.js 运行失败
    pause
    exit /b 1
)

echo.
echo [步骤 2/2] 完成！
echo.
echo 索引: indexes\
echo 缓存: assets\（按游戏/角色）
echo.
echo 提示:
echo   添加新模型后请重新运行
echo   Cubism3-only: node build.js fromBasePath=models_Cubism3
echo   Cubism2-only: node build.js fromBasePath=models_Cubism2
echo ================================================
echo.
pause
