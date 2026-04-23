param()

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$versionPath = Join-Path $repoRoot 'js\version.js'

Set-Location $repoRoot

if (-not (Test-Path -LiteralPath $versionPath)) {
    exit 0
}

$stagedFiles = git diff --cached --name-only --diff-filter=ACMR
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Failed to inspect staged files.'
    exit 1
}

$relevantFiles = @($stagedFiles | Where-Object { $_ -and $_ -ne 'js/version.js' })
if ($relevantFiles.Count -eq 0) {
    exit 0
}

$content = Get-Content -LiteralPath $versionPath -Raw
$match = [regex]::Match($content, "NEON_GRAVITY_VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'")

if (-not $match.Success) {
    Write-Error 'Could not find NEON_GRAVITY_VERSION in js/version.js.'
    exit 1
}

$major = [int]$match.Groups[1].Value
$minor = [int]$match.Groups[2].Value
$patch = [int]$match.Groups[3].Value + 1
$newVersion = "$major.$minor.$patch"
$newContent = $content.Replace($match.Value, "NEON_GRAVITY_VERSION = '$newVersion'")

if ($newContent -ne $content) {
    [System.IO.File]::WriteAllText($versionPath, $newContent, [System.Text.UTF8Encoding]::new($false))
    git add -- 'js/version.js' | Out-Null
}
