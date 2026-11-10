[CmdletBinding()]
param(
    [ValidateSet('preview', 'render')]
    [string]$Action = 'preview'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

# Use the same fixed Quarto release as the workspace's VS Code extension.
# The native launcher also avoids quoting problems in quarto.cmd under Program Files.
$pinned = Join-Path $root '.tools/quarto-1.10.20/bin/quarto.exe'
$installed = Get-Command quarto.exe -ErrorAction SilentlyContinue
$launcher = if (Test-Path -LiteralPath $pinned) { $pinned }
elseif ($installed) { $installed.Source }
else { throw 'Quarto is not installed. Restore the project-local Quarto 1.10.20 installation.' }

$versionText = (& $launcher --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $versionText -notmatch '^\d+\.\d+\.\d+') {
    throw 'Could not determine the Quarto version.'
}
if ([version]$Matches[0] -lt [version]'1.10.0') {
    throw ('Quarto ' + $versionText + ' has a known preview-cache bug. Use the project-local Quarto 1.10.20 installation.')
}
Write-Output ('Using Quarto ' + $versionText + ': ' + $launcher)

Push-Location -LiteralPath $root
try {
    if ($Action -eq 'preview') {
        Write-Output 'Preview URL (once ready): http://127.0.0.1:5511/'
        & $launcher preview --host 127.0.0.1 --port 5511 --no-browser
    } else {
        & $launcher render
    }
    if ($LASTEXITCODE -ne 0) {
        throw ('Quarto exited with code ' + $LASTEXITCODE + '. See the output above.')
    }
} finally {
    Pop-Location
}
