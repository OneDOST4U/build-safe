$WshShell = New-Object -ComObject WScript.Shell
$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TargetBat = Join-Path $ProjectDir "start-buildsafe.bat"
$IconPath = Join-Path $ProjectDir "public\build-safe.ico"

# Discover all active Desktop folders (Standard, SpecialFolders, OneDrive redirected)
$DesktopPaths = [System.Collections.Generic.HashSet[string]]::new()

try {
    $wscriptDesktop = $WshShell.SpecialFolders.Item('Desktop')
    if ($wscriptDesktop -and (Test-Path $wscriptDesktop)) { [void]$DesktopPaths.Add($wscriptDesktop) }
} catch {}

try {
    $envDesktop = [System.Environment]::GetFolderPath('Desktop')
    if ($envDesktop -and (Test-Path $envDesktop)) { [void]$DesktopPaths.Add($envDesktop) }
} catch {}

if ($env:USERPROFILE) {
    $userProfileDesktop = Join-Path $env:USERPROFILE "Desktop"
    if (Test-Path $userProfileDesktop) { [void]$DesktopPaths.Add($userProfileDesktop) }
}

if ($env:OneDrive) {
    $oneDriveDesktop = Join-Path $env:OneDrive "Desktop"
    if (Test-Path $oneDriveDesktop) { [void]$DesktopPaths.Add($oneDriveDesktop) }
}

if ($DesktopPaths.Count -eq 0) {
    Write-Warning "Could not find desktop directory."
    exit 1
}

foreach ($dest in $DesktopPaths) {
    try {
        $shortcutPath = Join-Path $dest "BUILD-SAFE Lasam.lnk"
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $TargetBat
        $shortcut.WorkingDirectory = $ProjectDir
        $shortcut.IconLocation = $IconPath
        $shortcut.Description = "Launch BUILD-SAFE Lasam Multi-Hazard GIS Platform"
        $shortcut.Save()
        Write-Output "BUILD-SAFE Desktop shortcut created at: $shortcutPath"
    } catch {
        Write-Warning "Failed to write shortcut to $dest : $_"
    }
}
