$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ProjectDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ShortcutPath = Join-Path $DesktopPath "BUILD-SAFE Lasam.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = (Join-Path $ProjectDir "start-buildsafe.bat")
$Shortcut.WorkingDirectory = $ProjectDir.Path
$Shortcut.IconLocation = (Join-Path $ProjectDir "public\build-safe.ico")
$Shortcut.Description = "Launch BUILD-SAFE Lasam Multi-Hazard GIS Platform"
$Shortcut.Save()
Write-Output "BUILD-SAFE Desktop shortcut successfully created at: $ShortcutPath"
