@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem clean_browser_cache_keep_login.bat
rem Place this file in the browser data root that contains "Data" and/or "Cache".
rem It removes rebuildable Chromium cache files while keeping login-related data:
rem Cookies, Local Storage, IndexedDB, Session Storage, WebStorage, Login Data,
rem Preferences, Secure Preferences, Extensions, profile Service Worker,
rem profile Code Cache, and extension local settings.
rem
rem Usage:
rem   clean_browser_cache_keep_login.bat
rem   clean_browser_cache_keep_login.bat --dry-run

set "DRYRUN=0"
set /a DELETED=0
set /a FAILED=0
set /a SKIPPED=0

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--dry-run" (
    set "DRYRUN=1"
    shift
    goto parse_args
)
if /i "%~1"=="--help" goto show_help
if /i "%~1"=="-h" goto show_help
echo [ERROR] Unknown option: %~1
goto show_help

:args_done
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%.") do set "ROOT=%%~fI"
set "DATA=%ROOT%\Data"
set "CACHE=%ROOT%\Cache"
set "ROOT_PREFIX=%ROOT%\"
call :strlen ROOT_PREFIX ROOT_PREFIX_LEN
call :detect_browser_exe

if not exist "%DATA%\" if not exist "%CACHE%\" (
    echo [ERROR] This script must be in a browser data root containing Data or Cache.
    echo         Current root: "%ROOT%"
    exit /b 2
)

echo Browser data root:
echo   "%ROOT%"
echo.
echo Login data kept:
echo   Cookies, Local Storage, IndexedDB, Session Storage, WebStorage,
echo   Login Data, Preferences, Secure Preferences, Extensions.
echo.
echo Extension/plugin data always kept:
echo   Extensions, Extension State, Extension Rules, Extension Scripts,
echo   Local Extension Settings, Managed Extension Settings,
echo   profile Service Worker, profile Code Cache,
echo   component_crx_cache, extensions_crx_cache, Webstore Downloads.
echo.
echo Root Cache folder will be cleaned entirely; Data profile runtime data is protected.
echo.
echo Deep clean is enabled by default, but extension runtime data is protected.
echo.

if "%DRYRUN%"=="1" (
    echo [DRY-RUN] No files will be deleted.
    echo.
)

if "%DRYRUN%"=="0" (
    call :abort_if_browser_running
    if errorlevel 1 exit /b !ERRORLEVEL!
    if exist "%DATA%\lockfile" (
        echo [WARN] "%DATA%\lockfile" exists. The browser may still be running.
    )
    if exist "%DATA%\SingletonLock" (
        echo [WARN] "%DATA%\SingletonLock" exists. The browser may still be running.
    )
    echo Close the browser that uses this directory, then press any key to continue.
    pause >nul
)

if exist "%CACHE%\" (
    call :delete_path "%CACHE%"
    if "%DRYRUN%"=="0" if not exist "%CACHE%\" mkdir "%CACHE%" >nul 2>nul
)

if exist "%DATA%\" (
    call :delete_path "%DATA%\BrowserMetrics"
    call :delete_path "%DATA%\BrowserMetrics-spare.pma"
    call :delete_path "%DATA%\Crashpad\reports"
    call :delete_path "%DATA%\Crashpad\attachments"
    call :delete_path "%DATA%\GPUCache"
    call :delete_path "%DATA%\GraphiteDawnCache"
    call :delete_path "%DATA%\GrShaderCache"
    call :delete_path "%DATA%\ShaderCache"
    call :delete_path "%DATA%\DawnGraphiteCache"
    call :delete_path "%DATA%\DawnWebGPUCache"
    call :delete_path "%DATA%\Local Traces"

    if exist "%DATA%\Default\" call :clean_profile "%DATA%\Default"
    if exist "%DATA%\Guest Profile\" call :clean_profile "%DATA%\Guest Profile"
    if exist "%DATA%\System Profile\" call :clean_profile "%DATA%\System Profile"
    for /d %%P in ("%DATA%\Profile *") do call :clean_profile "%%~fP"
)

echo.
echo Done. Deleted: %DELETED%, failed: %FAILED%, skipped: %SKIPPED%.
if "%FAILED%"=="0" (
    exit /b 0
) else (
    echo Some files could not be removed. Close the browser and run again.
    exit /b 1
)

:clean_profile
set "PROFILE=%~1"
if not exist "%PROFILE%\" exit /b 0
echo.
echo Profile:
echo   "%PROFILE%"

call :delete_path "%PROFILE%\Cache"
call :delete_path "%PROFILE%\GPUCache"
call :delete_path "%PROFILE%\Media Cache"
call :delete_path "%PROFILE%\GraphiteDawnCache"
call :delete_path "%PROFILE%\GrShaderCache"
call :delete_path "%PROFILE%\ShaderCache"
call :delete_path "%PROFILE%\DawnCache"
call :delete_path "%PROFILE%\DawnGraphiteCache"
call :delete_path "%PROFILE%\DawnWebGPUCache"
call :delete_path "%PROFILE%\JumpListIconsMostVisited"
call :delete_path "%PROFILE%\JumpListIconsRecentClosed"
call :delete_path "%PROFILE%\VideoDecodeStats"
call :delete_path "%PROFILE%\Shared Dictionary\cache"
exit /b 0

:delete_path
set "TARGET_IN=%~1"
if "%TARGET_IN%"=="" exit /b 0
for %%I in ("%TARGET_IN%") do set "TARGET=%%~fI"

if /i "!TARGET!"=="%ROOT%" (
    echo [SKIP] Refusing to delete root: "!TARGET!"
    set /a SKIPPED+=1
    exit /b 1
)

if /i not "!TARGET:~0,%ROOT_PREFIX_LEN%!"=="%ROOT_PREFIX%" (
    echo [SKIP] Outside browser data root: "!TARGET!"
    set /a SKIPPED+=1
    exit /b 1
)

echo(!TARGET!| findstr /i /c:"\Extensions" /c:"\Extension State" /c:"\Extension Rules" /c:"\Extension Scripts" /c:"\Local Extension Settings" /c:"\Managed Extension Settings" /c:"\Service Worker" /c:"\Code Cache" /c:"\component_crx_cache" /c:"\extensions_crx_cache" /c:"\Webstore Downloads" >nul
if not errorlevel 1 (
    echo [KEEP] Extension/plugin related path: "!TARGET!"
    set /a SKIPPED+=1
    exit /b 0
)

if not exist "!TARGET!\" if not exist "!TARGET!" exit /b 0

if "%DRYRUN%"=="1" (
    echo [DRY] "!TARGET!"
    exit /b 0
)

if exist "!TARGET!\" (
    rmdir /s /q "!TARGET!" 2>nul
    if exist "!TARGET!\" (
        echo [FAIL] Directory locked or not removable: "!TARGET!"
        set /a FAILED+=1
        exit /b 1
    ) else (
        echo [OK] Deleted directory: "!TARGET!"
        set /a DELETED+=1
        exit /b 0
    )
)

del /f /q "!TARGET!" >nul 2>nul
if exist "!TARGET!" (
    echo [FAIL] File locked or not removable: "!TARGET!"
    set /a FAILED+=1
    exit /b 1
) else (
    echo [OK] Deleted file: "!TARGET!"
    set /a DELETED+=1
    exit /b 0
)

:strlen
setlocal EnableDelayedExpansion
set "S=!%~1!"
set /a L=0
:strlen_loop
if defined S (
    set "S=!S:~1!"
    set /a L+=1
    goto strlen_loop
)
endlocal & set "%~2=%L%"
exit /b 0

:detect_browser_exe
set "BROWSER_EXE="
if exist "%DATA%\Last Browser" (
    for /f "usebackq delims=" %%B in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-Content -Raw -Encoding Unicode -LiteralPath '%DATA%\Last Browser' -ErrorAction SilentlyContinue; if ($p) { [IO.Path]::GetFileName($p.Trim([char]0, [char]13, [char]10, ' ')) }"`) do set "BROWSER_EXE=%%B"
)
if not defined BROWSER_EXE if exist "%ROOT%\..\..\catsxp_portable\catsxp.exe" set "BROWSER_EXE=catsxp.exe"
exit /b 0

:abort_if_browser_running
powershell -NoProfile -ExecutionPolicy Bypass -Command "$names = @('catsxp'); $exe = '%BROWSER_EXE%'; if ($exe) { $names += [IO.Path]::GetFileNameWithoutExtension($exe) }; foreach ($name in ($names | Select-Object -Unique)) { $p = Get-Process -Name $name -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { Write-Host ('[ERROR] ' + $p.ProcessName + '.exe is still running. PID=' + $p.Id); Write-Host '        Fully exit the browser first, then run this script again.'; exit 3 } }; exit 0"
if errorlevel 1 exit /b %ERRORLEVEL%
exit /b 0

:show_help
echo Usage:
echo   clean_browser_cache_keep_login.bat [--dry-run]
echo.
echo Options:
echo   --dry-run             Print what would be deleted.
echo   --help, -h            Show this help.
exit /b 0
