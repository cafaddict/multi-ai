# Optional Codex recovery profile only. Install the skill with the skills CLI.
param([string]$CodexConfigHome = $env:CODEX_HOME)

$ErrorActionPreference = 'Stop'
$source = Get-Item -LiteralPath $PSScriptRoot
$sourcePath = $source.FullName
if ($source.LinkType) { $sourcePath = [IO.Path]::GetFullPath(@($source.Target)[0]) }
foreach ($file in @('SKILL.md', 'policy.yaml', 'codex-profile.toml', 'prompts/recover.md')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourcePath $file) -PathType Leaf)) {
        throw "Missing $file beside the installer; use a complete repository clone."
    }
}
if (-not $CodexConfigHome) {
    $CodexConfigHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex'
}
$profilePath = Join-Path ([IO.Path]::GetFullPath($CodexConfigHome)) 'multi-ai.config.toml'
$profileDirectory = Split-Path $profilePath
# Encode only our literal file-read command to avoid nested shell/path quoting.
$skillPathLiteral = $sourcePath.Replace("'", "''")
$recoveryPathLiteral = (Join-Path $sourcePath 'prompts/recover.md').Replace("'", "''")
$readCommand = "[Console]::OutputEncoding = [Text.UTF8Encoding]::new(`$false); [Console]::WriteLine('Multi-AI skill directory: $skillPathLiteral'); Get-Content -Raw -Encoding UTF8 -LiteralPath '$recoveryPathLiteral' -ErrorAction Stop"
$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($readCommand))
$hookCommand = "powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand $encodedCommand"
$profile = [IO.File]::ReadAllText((Join-Path $sourcePath 'codex-profile.toml')).TrimEnd() + "`ncommand = " + (ConvertTo-Json -InputObject $hookCommand -Compress) + "`n"
# Never replace an existing profile or modify the base configuration.
if ((Test-Path -LiteralPath $profileDirectory) -and -not (Test-Path -LiteralPath $profileDirectory -PathType Container)) {
    throw "Not a Codex configuration directory: $profileDirectory. Left unchanged."
}
if ($profilePath.StartsWith($sourcePath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The Codex profile must be outside this repository.'
}
$existingProfile = Get-Item -LiteralPath $profilePath -Force -ErrorAction SilentlyContinue
if ($existingProfile -and ($existingProfile.PSIsContainer -or $existingProfile.LinkType -or [IO.File]::ReadAllText($profilePath).Replace("`r`n", "`n") -cne $profile.Replace("`r`n", "`n"))) {
    throw "Already exists with different content: $profilePath. Left unchanged."
}
if (-not $existingProfile) {
    New-Item -ItemType Directory -Path $profileDirectory -Force | Out-Null
    [IO.File]::WriteAllText($profilePath, $profile, [Text.UTF8Encoding]::new($false))
}
Write-Output "Codex recovery profile: $profilePath"
Write-Output 'Add --profile multi-ai to the saved Codex launcher. Review/trust this hook once in /hooks, then start a new session.'
