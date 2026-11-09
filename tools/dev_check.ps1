[CmdletBinding()]
param(
    [switch]$Quick
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (Test-Path -LiteralPath $venvPython) {
    $pythonExe = $venvPython
} else {
    $pythonExe = (Get-Command python -ErrorAction Stop).Source
}

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$env:NODE_NO_WARNINGS = "1"

function Invoke-Step {
    param(
        [Parameter(Mandatory)]
        [string]$Label,
        [Parameter(Mandatory)]
        [string]$Exe,
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    Write-Host "==> $Label"
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

# 1. 內容品質檢查（Node.js 原生腳本）
Invoke-Step -Label "在地化用語檢查 (check-zh-tw-locale.mjs)" -Exe "node" -Arguments @("tools/check-zh-tw-locale.mjs")
Invoke-Step -Label "交叉引用校驗 (check-refs.mjs)" -Exe "node" -Arguments @("tools/check-refs.mjs", "--check")
Invoke-Step -Label "說人話通俗度檢查 (check-plain.mjs)" -Exe "node" -Arguments @("tools/check-plain.mjs")
Invoke-Step -Label "自查頁邏輯檢查 (check-selfcheck.mjs)" -Exe "node" -Arguments @("tools/check-selfcheck.mjs")

# 2. Python 維護工具代碼檢查與測試
Invoke-Step -Label "Ruff check" -Exe $pythonExe -Arguments @("-m", "ruff", "check", ".")
Invoke-Step -Label "Ruff format --check" -Exe $pythonExe -Arguments @("-m", "ruff", "format", "--check", ".")
Invoke-Step -Label "Pytest maintenance suite" -Exe $pythonExe -Arguments @("-m", "pytest", "-q")

# 3. 相對連結校驗
Invoke-Step -Label "Markdown 相對連結校驗 (check_links.py)" -Exe $pythonExe -Arguments @("tools/check_links.py")

# 4. 雙軸上游增量檢查（直接繁中上游 doggy8088 + 根原作上游 eternity4719）
if (-not $Quick) {
    Invoke-Step -Label "直接上游增量檢查 (doggy8088)" -Exe $pythonExe -Arguments @("tools/check_upstream_updates.py", "--baseline", "tools/upstream_baseline.json", "--strict")
    Invoke-Step -Label "根原作上游增量檢查 (eternity4719)" -Exe $pythonExe -Arguments @("tools/check_upstream_updates.py", "--baseline", "tools/upstream_root_baseline.json", "--output", "upstream-root-review-report.md", "--strict")
}

Write-Host "WINDOWS DEV CHECK GREEN"
