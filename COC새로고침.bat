
@echo off
chcp 65001 >nul
title CoC 새로고침 감시

cd /d "%~dp0"

echo ============================
echo   CoC 새로고침 감시 실행 중
echo ============================
echo.
echo 이 창을 닫으면 감시가 종료됩니다.
echo.

node watch.js

echo.
echo 프로그램이 종료되었습니다.
pause
