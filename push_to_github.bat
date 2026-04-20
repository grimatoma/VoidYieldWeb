@echo off
cd /d "C:\Users\grima\Documents\VoidYieldWeb"

echo === VoidYield Git Push Script === > push_log.txt
echo %date% %time% >> push_log.txt
echo. >> push_log.txt

echo [1] Removing stale lock files... >> push_log.txt
if exist .git\index.lock del /f .git\index.lock >> push_log.txt 2>&1
if exist .git\HEAD.lock del /f .git\HEAD.lock >> push_log.txt 2>&1
echo Done. >> push_log.txt

echo. >> push_log.txt
echo [2] Git status: >> push_log.txt
git status >> push_log.txt 2>&1

echo. >> push_log.txt
echo [3] Staging BootScene.ts... >> push_log.txt
git add src/scenes/BootScene.ts >> push_log.txt 2>&1
echo Exit code: %errorlevel% >> push_log.txt

echo. >> push_log.txt
echo [4] Committing... >> push_log.txt
git commit -m "fix: BootScene navigates to planet scene after splash instead of idling" >> push_log.txt 2>&1
echo Exit code: %errorlevel% >> push_log.txt

echo. >> push_log.txt
echo [5] Pushing to origin/main... >> push_log.txt
git push origin main >> push_log.txt 2>&1
echo Exit code: %errorlevel% >> push_log.txt

echo. >> push_log.txt
echo [6] Final git log (last 3 commits): >> push_log.txt
git log --oneline -3 >> push_log.txt 2>&1

echo. >> push_log.txt
echo === DONE === >> push_log.txt
echo Script complete. Check push_log.txt for results.
pause
