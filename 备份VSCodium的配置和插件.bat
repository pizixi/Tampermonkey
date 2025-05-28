@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 设置颜色
color 0A

echo =====================================================
echo           VSCodium 配置和插件备份工具
echo =====================================================
echo.

:: 获取当前日期时间作为备份文件名
for /f "tokens=2 delims==" %%I in ('wmic OS Get localdatetime /value') do set "dt=%%I"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

:: 定义路径变量
set "VSCODIUM_CONFIG=%APPDATA%\VSCodium"
set "VSCODIUM_USER_DATA=%APPDATA%\VSCodium\User"
set "VSCODIUM_EXTENSIONS=%USERPROFILE%\.vscode-oss\extensions"
set "BACKUP_DIR=%~dp0VSCodium_Backup_%timestamp%"
set "BACKUP_ARCHIVE=%~dp0VSCodium_Backup_%timestamp%.7z"

echo [信息] 开始备份 VSCodium 配置...
echo [信息] 备份时间: %YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%
echo.

:: 检查VSCodium配置目录是否存在
if not exist "%VSCODIUM_CONFIG%" (
    echo [错误] VSCodium 配置目录不存在: %VSCODIUM_CONFIG%
    echo [建议] 请确认 VSCodium 已正确安装并至少运行过一次
    pause
    exit /b 1
)

:: 创建临时备份目录
echo [步骤1] 创建备份目录...
mkdir "%BACKUP_DIR%" 2>nul
if not exist "%BACKUP_DIR%" (
    echo [错误] 无法创建备份目录: %BACKUP_DIR%
    pause
    exit /b 1
)
echo [完成] 备份目录已创建: %BACKUP_DIR%

:: 备份用户配置文件
echo.
echo [步骤2] 备份用户配置文件...
if exist "%VSCODIUM_USER_DATA%" (
    robocopy "%VSCODIUM_USER_DATA%" "%BACKUP_DIR%\User" /E /XD logs /XF *.log workspaceStorage /NFL /NDL /NJH /NJS
    if !errorlevel! leq 1 (
        echo [完成] 用户配置文件备份完成
    ) else (
        echo [警告] 用户配置文件备份可能不完整
    )
) else (
    echo [警告] 用户配置目录不存在: %VSCODIUM_USER_DATA%
)

:: 备份插件目录
echo.
echo [步骤3] 备份插件目录...
if exist "%VSCODIUM_EXTENSIONS%" (
    robocopy "%VSCODIUM_EXTENSIONS%" "%BACKUP_DIR%\extensions" /E /NFL /NDL /NJH /NJS
    if !errorlevel! leq 1 (
        echo [完成] 插件目录备份完成
    ) else (
        echo [警告] 插件目录备份可能不完整
    )
) else (
    echo [警告] 插件目录不存在: %VSCODIUM_EXTENSIONS%
)

:: 导出已安装插件列表（可选步骤，如果失败会跳过）
echo.
echo [步骤4] 导出插件列表...
where codium >nul 2>&1
if !errorlevel! equ 0 (
    codium --list-extensions > "%BACKUP_DIR%\installed_extensions.txt" 2>nul
    if exist "%BACKUP_DIR%\installed_extensions.txt" (
        echo [完成] 插件列表已导出
    ) else (
        echo [跳过] 插件列表导出失败，继续备份
    )
) else (
    echo [跳过] 未找到codium命令，继续备份
)

:: 创建备份信息文件
echo.
echo [步骤5] 创建备份信息文件...
echo VSCodium配置备份信息 > "%BACKUP_DIR%\backup_info.txt"
echo ======================== >> "%BACKUP_DIR%\backup_info.txt"
echo 备份时间: %YYYY%-%MM%-%DD% %HH%:%Min%:%Sec% >> "%BACKUP_DIR%\backup_info.txt"
echo 备份版本: 1.0 >> "%BACKUP_DIR%\backup_info.txt"
echo 操作系统: %OS% >> "%BACKUP_DIR%\backup_info.txt"
echo 用户名: %USERNAME% >> "%BACKUP_DIR%\backup_info.txt"
echo 计算机名: %COMPUTERNAME% >> "%BACKUP_DIR%\backup_info.txt"
echo. >> "%BACKUP_DIR%\backup_info.txt"
echo 备份内容: >> "%BACKUP_DIR%\backup_info.txt"
echo - 用户配置文件 >> "%BACKUP_DIR%\backup_info.txt"
echo - 已安装插件 >> "%BACKUP_DIR%\backup_info.txt"
echo - 插件列表 >> "%BACKUP_DIR%\backup_info.txt"
echo. >> "%BACKUP_DIR%\backup_info.txt"
echo 恢复说明: >> "%BACKUP_DIR%\backup_info.txt"
echo. 1. 解压备份文件到临时目录 >> "%BACKUP_DIR%\backup_info.txt"
echo. 2. 将User文件夹内容复制到AppData\Roaming\VSCodium\User >> "%BACKUP_DIR%\backup_info.txt"
echo. 3. 将extensions文件夹内容复制到用户目录\.vscode-oss\extensions >> "%BACKUP_DIR%\backup_info.txt"
echo. 4. 重新启动VSCodium >> "%BACKUP_DIR%\backup_info.txt"
echo [完成] 备份信息文件已创建

:: 检查7z是否可用
echo.
echo [步骤6] 压缩备份文件...
where 7z >nul 2>&1
if !errorlevel! equ 0 (
    set "ZIP_CMD=7z"
) else (
    where 7za >nul 2>&1
    if !errorlevel! equ 0 (
        set "ZIP_CMD=7za"
    ) else (
        echo [警告] 未找到 7z 或 7za 命令
        echo [提示] 请安装 7-Zip 并确保已添加到系统 PATH 中
        echo [提示] 备份文件夹已创建，但未压缩: %BACKUP_DIR%
        goto :skip_compress
    )
)

:: 使用7z压缩备份文件
echo [信息] 正在压缩备份文件...
!ZIP_CMD! a -t7z -mx=5 "%BACKUP_ARCHIVE%" "%BACKUP_DIR%\*" >nul 2>&1

if !errorlevel! equ 0 (
    echo [完成] 备份文件已压缩: %BACKUP_ARCHIVE%
    
    :: 获取压缩文件大小
    for %%F in ("%BACKUP_ARCHIVE%") do set "archive_size=%%~zF"
    set /a "archive_size_mb=!archive_size!/1024/1024"
    echo [信息] 压缩文件大小: !archive_size_mb! MB
    
    :: 删除临时目录
    echo [清理] 删除临时备份目录...
    rmdir /s /q "%BACKUP_DIR%"
    echo [完成] 临时文件已清理
) else (
    echo [错误] 压缩过程中出现错误
    echo [保留] 临时备份目录: %BACKUP_DIR%
)

:skip_compress

echo.
echo =====================================================
echo                   备份完成
echo =====================================================
if exist "%BACKUP_ARCHIVE%" (
    echo [成功] 备份文件: %BACKUP_ARCHIVE%
) else (
    echo [成功] 备份目录: %BACKUP_DIR%
)
echo [时间] %YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%
echo.
echo [恢复说明~请看备份压缩文件中的backup_info.txt]

echo 按任意键退出...
pause >nul