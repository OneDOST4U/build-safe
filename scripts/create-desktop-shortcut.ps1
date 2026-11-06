$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "BUILD-SAFE Lasam.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = (Join-Path (Get-Location) "start-buildsafe.bat")
$Shortcut.WorkingDirectory = (Get-Location).Path
$Shortcut.IconLocation = (Join-Path (Get-Location) "public\build-safe.ico")
$Shortcut.Description = "Launch BUILD-SAFE Lasam Multi-Hazard GIS Platform"
$Shortcut.Save()
Write-Output "BUILD-SAFE Desktop shortcut successfully created at: $ShortcutPath"
