# Removes stale git lock and commits the BootScene navigation fix
# Run from VoidYieldWeb root: .\fix-commit.ps1

$lockFile = Join-Path $PSScriptRoot ".git\index.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Host "Removed stale .git/index.lock"
}

git add src/scenes/BootScene.ts
git commit -m "fix: BootScene navigates to saved planet after splash

The boot screen was showing 'VOIDYIELD / Save loaded.' then hanging
forever — nothing listened to the 'game:loaded' event to navigate
into the game.

Add an 800 ms splash pause then emit 'scene:travel' to
'planet_\${gameState.currentPlanet}' (defaults to planet_a1 for new
saves, respects current_planet for returning players)."

Write-Host ""
Write-Host "Done. Run 'git push' to deploy."
