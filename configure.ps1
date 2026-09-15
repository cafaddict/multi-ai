# Configure host-local Multi-AI routing without editing the installed skill.
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('show', 'engineer')]
    [string]$Command = 'show',

    [Parameter(Position = 1)]
    [ValidateSet('default', 'codex', 'claude')]
    [string]$Family
)

$ErrorActionPreference = 'Stop'

if ($Command -eq 'show' -and $Family) {
    throw 'Usage: configure.ps1 show | configure.ps1 engineer <default|codex|claude>'
}
if ($Command -eq 'engineer' -and -not $Family) {
    throw 'Usage: configure.ps1 engineer <default|codex|claude>'
}

$configHome = $env:MULTI_AI_CONFIG_HOME
if (-not $configHome) {
    $configHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.multi-ai'
}
$configHome = [IO.Path]::GetFullPath($configHome)
$configPath = Join-Path $configHome 'policy.yaml'

if ($Command -eq 'show') {
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
        Write-Output 'engineer: default'
        Write-Output "Host policy: $configPath (not created)"
        return
    }
    $match = [regex]::Match([IO.File]::ReadAllText($configPath), '(?m)^  engineer: (default|codex|claude)\s*$')
    if (-not $match.Success) { throw "Invalid host policy: $configPath" }
    Write-Output "engineer: $($match.Groups[1].Value)"
    Write-Output "Host policy: $configPath"
    return
}

if ((Test-Path -LiteralPath $configHome) -and -not (Test-Path -LiteralPath $configHome -PathType Container)) {
    throw "Not a configuration directory: $configHome"
}
$existing = Get-Item -LiteralPath $configPath -Force -ErrorAction SilentlyContinue
if ($existing -and ($existing.PSIsContainer -or $existing.LinkType)) {
    throw "Refusing to replace a directory or link: $configPath"
}

New-Item -ItemType Directory -Path $configHome -Force | Out-Null
$content = "# Host-local Multi-AI routing preference.`nversion: 1`nrole_families:`n  engineer: $Family`n"
$temporaryPath = Join-Path $configHome ('.policy.yaml.' + [guid]::NewGuid().ToString('N') + '.tmp')
try {
    [IO.File]::WriteAllText($temporaryPath, $content, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporaryPath -Destination $configPath -Force
} finally {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath -Force
    }
}

Write-Output "engineer: $Family"
Write-Output "Host policy: $configPath"
Write-Output 'Start a new Lead session, or ask the active Lead to re-read the host policy.'
