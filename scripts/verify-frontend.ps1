param(
    [string]$ExpectedBranch = "uat"
)

$ErrorActionPreference = "Stop"

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

$branch = (git branch --show-current).Trim()

Assert-True `
    ($branch -eq $ExpectedBranch) `
    "Ожидалась ветка '$ExpectedBranch', получена '$branch'."

$requiredFiles = @(
    "index.html",
    "lk/index.html",
    "viewer/index.html",
    "CNAME",
    ".nojekyll",
    ".gitignore",
    "assets/js/config.uat.js",
    "assets/js/api-client.js",
    "assets/js/uat-bootstrap.js",
    "docs/UAT_BASELINE.md",
    ".github/workflows/uat-checks.yml"
)

foreach ($file in $requiredFiles) {
    Assert-True `
        (Test-Path $file) `
        "Отсутствует обязательный файл: $file"
}

$cname = (Get-Content "CNAME" -Raw).Trim()

Assert-True `
    ($cname -eq "bespalovalegal.ru") `
    "Неожиданное значение CNAME: '$cname'"

$excludedFiles = @(
    ".github/workflows/uat-checks.yml",
    "scripts/verify-frontend.ps1"
)

$trackedFiles = @(
    git ls-files |
    Where-Object {
        $_ -notin $excludedFiles -and
        $_ -notlike "docs/*"
    }
)

$forbiddenPatterns = @(
    "SECRET_KEY\s*=",
    "SMTP_PASS\s*=",
    "PRODAMUS_SECRET\s*=",
    "KINESCOPE_API_KEY\s*=",
    "ADMIN_TOTP_SECRET\s*=",
    "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY"
)

foreach ($pattern in $forbiddenPatterns) {
    if ($trackedFiles.Count -eq 0) {
        break
    }

    $matches = Select-String `
        -Path $trackedFiles `
        -Pattern $pattern `
        -ErrorAction SilentlyContinue

    Assert-True `
        (-not $matches) `
        "Обнаружен потенциальный секрет по шаблону: $pattern"
}

Write-Host "FRONTEND_UAT_CHECK_OK"
Write-Host "Branch: $branch"
Write-Host "Commit: $((git rev-parse HEAD).Trim())"
Write-Host "Checked files: $($trackedFiles.Count)"
