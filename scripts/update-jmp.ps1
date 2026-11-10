[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [Parameter(Mandatory = $true)]
    [string]$VersionDate,

    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Deliberate update only: never search archives for a "latest" draft.
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$source = (Resolve-Path -LiteralPath $SourcePath).Path
$target = Join-Path $root 'papers/Lamproye_JMP.pdf'
$variables = Join-Path $root '_variables.yml'
$sourceInfo = Get-Item -LiteralPath $source
if ($sourceInfo.PSIsContainer -or $sourceInfo.Extension -ine '.pdf') {
    throw 'SourcePath must identify a PDF file.'
}
if ($sourceInfo.Length -lt 100 -or $sourceInfo.Length -ge 100MB) {
    throw 'Unexpected PDF size. Inspect the source before publishing it.'
}

$date = [datetime]::ParseExact(
    $VersionDate, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture
)
$displayDate = $date.ToString('d MMMM yyyy', [Globalization.CultureInfo]::InvariantCulture)

# Minimal format checks, not a substitute for opening the finished manuscript.
$stream = [IO.File]::OpenRead($source)
try {
    $header = New-Object byte[] 5
    if ($stream.Read($header, 0, 5) -ne 5 -or
        [Text.Encoding]::ASCII.GetString($header) -ne '%PDF-') {
        throw 'The source does not have a PDF signature.'
    }
    $tailLength = [int][Math]::Min(2048, $stream.Length)
    [void]$stream.Seek(-$tailLength, [IO.SeekOrigin]::End)
    $tail = New-Object byte[] $tailLength
    [void]$stream.Read($tail, 0, $tailLength)
    if ([Text.Encoding]::ASCII.GetString($tail) -notmatch '%%EOF') {
        throw 'The PDF appears incomplete: no trailing EOF marker was found.'
    }
} finally {
    $stream.Dispose()
}

$sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
$targetHash = if (Test-Path -LiteralPath $target) {
    (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
} else { '' }

$oldVariables = [IO.File]::ReadAllText($variables, [Text.Encoding]::UTF8)
$pattern = '(?m)^jmp-updated:[^\r\n]*'
if ([regex]::Matches($oldVariables, $pattern).Count -ne 1) {
    throw '_variables.yml must contain exactly one jmp-updated value.'
}
$newVariables = [regex]::Replace(
    $oldVariables, $pattern, ('jmp-updated: "' + $displayDate + '"')
)
$copyNeeded = $sourceHash -ne $targetHash
$dateNeeded = $newVariables -cne $oldVariables

Write-Output ('Source: ' + $source)
Write-Output ('Public URL: https://lamproye.com/papers/Lamproye_JMP.pdf')
Write-Output ('Version label: ' + $displayDate)
Write-Output ('SHA-256: ' + $sourceHash)
Write-Output ('Replace website PDF: ' + $copyNeeded)
Write-Output ('Update website date: ' + $dateNeeded)

if ($CheckOnly) {
    Write-Output 'Check only. No files changed.'
    return
}
if (-not $copyNeeded -and -not $dateNeeded) {
    Write-Output 'The website copy and version label already match. No files changed.'
    return
}
if (-not $PSCmdlet.ShouldProcess($root, 'Update the website JMP copy and version label')) {
    return
}

if ($copyNeeded) {
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $target))
    Copy-Item -LiteralPath $source -Destination $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $sourceHash) {
        throw 'Copy verification failed. Do not publish.'
    }
}
if ($dateNeeded) {
    [IO.File]::WriteAllText($variables, $newVariables, (New-Object Text.UTF8Encoding($false)))
}

Write-Output 'Local update verified. Render and review before publishing through GitHub.'
Write-Output 'No commit, push or publication was performed.'
