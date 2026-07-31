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
Assert-True ($branch -eq $ExpectedBranch) `
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
    Assert-True (Test-Path $file) "Отсутствует обязательный файл: $file"
}

$cname = (Get-Content "CNAME" -Raw).Trim()
Assert-True ($cname -eq "bespalovalegal.ru") `
    "Неожиданное значение CNAME: '$cname'"

$forbiddenPatterns = @(
    "SECRET_KEY\s*=",
    "SMTP_PASS\s*=",
    "PRODAMUS_SECRET\s*=",
    "KINESCOPE_API_KEY\s*=",
    "ADMIN_TOTP_SECRET\s*=",
    "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY"
)

$trackedFiles = git ls-files

foreach ($pattern in $forbiddenPatterns) {
    $matches = Select-String `
        -Path $trackedFiles `
        -Pattern $pattern `
        -ErrorAction SilentlyContinue

    Assert-True (-not $matches) `
        "Обнаружен потенциальный секрет по шаблону: $pattern"
}

Write-Host "FRONTEND_UAT_CHECK_OK"
Write-Host "Branch: $branch"
Write-Host "Commit: $((git rev-parse HEAD).Trim())"
Write-Host "Tracked files: $($trackedFiles.Count)"
