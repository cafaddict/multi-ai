param([string]$UserHome = [Environment]::GetFolderPath('UserProfile'))

$ErrorActionPreference = 'Stop'
$source = Get-Item -LiteralPath $PSScriptRoot
$sourcePath = $source.FullName
if ($source.LinkType) { $sourcePath = [IO.Path]::GetFullPath(@($source.Target)[0]) }
foreach ($file in @('SKILL.md', 'policy.yaml')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourcePath $file) -PathType Leaf)) {
        throw "Missing $file beside the installer; use a complete repository clone."
    }
}
$userPath = (Get-Item -LiteralPath $UserHome).FullName
$targets = @('.agents/skills/multi-ai', '.claude/skills/multi-ai') |
    ForEach-Object { Join-Path $userPath $_ }
$junctionTarget = $sourcePath
# Windows PowerShell treats -Target as a wildcard path; modern PowerShell does not.
if ($PSVersionTable.PSVersion.Major -le 5) {
    $junctionTarget = [WildcardPattern]::Escape($sourcePath)
}

# Check both destinations before creating either link. Never replace existing data.
foreach ($target in $targets) {
    if ($target.StartsWith($sourcePath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Install destinations must be outside this repository.'
    }
    $existing = Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
    if ($existing) {
        if ($existing.LinkType -notin @('Junction', 'SymbolicLink')) {
            throw "Already exists: $target. Left unchanged."
        }
        $linkedPath = @($existing.Target)[0]
        if (-not [IO.Path]::IsPathRooted($linkedPath)) {
            $linkedPath = Join-Path (Split-Path $target) $linkedPath
        }
        if ([IO.Path]::GetFullPath($linkedPath) -ne $sourcePath) {
            throw "Already links elsewhere: $target. Left unchanged."
        }
    }
}
foreach ($target in $targets) {
    if (-not (Test-Path -LiteralPath $target)) {
        New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
        New-Item -ItemType Junction -Path $target -Target $junctionTarget | Out-Null
    }
    Write-Output "Linked $target -> $sourcePath"
}
Write-Output 'Start a new Codex/Claude session to discover multi-ai. Keep this clone; git pull updates the skill.'
