param(
    [Parameter(Mandatory = $true)][string]$DatabaseHost,
    [Parameter(Mandatory = $true)][string]$Email,
    [switch]$Rotate
)

$ErrorActionPreference = 'Stop'
if (Test-Path Env:ADMIN_BOOTSTRAP_PASSWORD) {
    throw 'Use an isolated Vercel env run without a bootstrap environment variable.'
}

$repo = Split-Path -Parent $PSScriptRoot
$tsx = Join-Path $repo 'node_modules/tsx/dist/cli.mjs'
$bootstrap = Join-Path $PSScriptRoot 'bootstrap-production-admin.ts'
$operation = if ($Rotate) { '--rotate-first-admin' } else { '--create-first-admin' }
if (-not (Test-Path -LiteralPath $tsx)) { throw 'Install the locked project dependencies first.' }

$securePassword = Read-Host 'Enter a new randomly generated password (20–200 printable ASCII characters, no spaces)' -AsSecureString
$passwordBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBuffer) |
        & node $tsx $bootstrap $operation "--host=$DatabaseHost" "--email=$Email"
    $bootstrapExit = $LASTEXITCODE
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBuffer)
    $securePassword.Dispose()
}
exit $bootstrapExit
