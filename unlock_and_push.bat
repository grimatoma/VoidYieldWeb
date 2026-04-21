@echo off
cd /d C:\Users\grima\Documents\VoidYieldWeb
echo Clearing git lock files...
del .git\index.lock 2>nul
del .git\HEAD.lock 2>nul
del .git\refs\heads\main.lock 2>nul
echo Merging engine-fixes branch...
git merge engine-fixes --ff-only
echo Pushing to GitHub...
git push origin main
echo Done!
git log --oneline -6
pause
