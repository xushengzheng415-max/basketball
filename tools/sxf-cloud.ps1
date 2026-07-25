[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('basketball', 'basketball-target', 'football')]
    [string]$Project,

    [Parameter(Mandatory = $true, Position = 1)]
    [ValidateSet('setup', 'test', 'run')]
    [string]$Action,

    [Parameter(Position = 2, ValueFromRemainingArguments = $true)]
    [string[]]$CloudBaseArgs
)

$ErrorActionPreference = 'Stop'

$profiles = @{
    basketball = @{
        Name = 'SXF Basketball'
        Root = 'E:\Documents\sxf-basketball'
        EnvId = 'sxf-basketball-d9gp6yt0rd1f7be4d'
        CredentialAlias = 'basketball-target'
    }
    'basketball-target' = @{
        Name = 'SXF Basketball Target'
        Root = 'E:\Documents\sxf-basketball'
        EnvId = 'sxf-basketball-d9gp6yt0rd1f7be4d'
        CredentialAlias = 'basketball-target'
    }
    football = @{
        Name = 'SXF Football'
        Root = 'E:\Documents\sxf-football'
        EnvId = 'cloud1-7g8ckb3c7815a011'
        CredentialAlias = 'football'
    }
}

$profile = $profiles[$Project]
$credentialDirectory = Join-Path $env:LOCALAPPDATA 'SxfCloud\credentials'
$credentialPath = Join-Path $credentialDirectory "$($profile.CredentialAlias).dpapi"

function Show-Target {
    Write-Host ''
    Write-Host "Project: $($profile.Name) ($Project)" -ForegroundColor Cyan
    Write-Host "Path:    $($profile.Root)"
    Write-Host "Env ID:  $($profile.EnvId)"
    Write-Host ''
}

function Save-ApiKey {
    Show-Target
    Write-Host 'Enter the CloudBase API Key. Input is hidden.' -ForegroundColor Yellow
    $secureKey = Read-Host 'API Key' -AsSecureString
    $encryptedKey = ConvertFrom-SecureString -SecureString $secureKey

    New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
    [System.IO.File]::WriteAllText($credentialPath, $encryptedKey, [System.Text.UTF8Encoding]::new($false))

    Write-Host "Encrypted for the current Windows user and saved to: $credentialPath" -ForegroundColor Green
    Write-Host 'The key is not stored in either project or in Git.' -ForegroundColor Green
}

function Get-PlainApiKey {
    if (-not (Test-Path -LiteralPath $credentialPath)) {
        throw "No API Key found for $Project. Run setup first."
    }

    $encryptedKey = [System.IO.File]::ReadAllText($credentialPath, [System.Text.Encoding]::UTF8).Trim()
    $secureKey = ConvertTo-SecureString -String $encryptedKey
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Invoke-Npx {
    param([string[]]$Arguments)

    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $npxCliPath = Join-Path (Split-Path -Parent $nodePath) 'node_modules\npm\bin\npx-cli.js'
    if (-not (Test-Path -LiteralPath $npxCliPath)) {
        throw "Unable to locate npx CLI at $npxCliPath."
    }

    function ConvertTo-NativeArgument {
        param([string]$Argument)

        if ($null -eq $Argument -or $Argument.Length -eq 0) {
            return '""'
        }

        $builder = [System.Text.StringBuilder]::new()
        [void]$builder.Append('"')
        $backslashCount = 0
        foreach ($character in $Argument.ToCharArray()) {
            if ($character -eq '\') {
                $backslashCount++
                continue
            }
            if ($character -eq '"') {
                [void]$builder.Append(('\' * (($backslashCount * 2) + 1)))
                [void]$builder.Append('"')
                $backslashCount = 0
                continue
            }
            if ($backslashCount -gt 0) {
                [void]$builder.Append(('\' * $backslashCount))
                $backslashCount = 0
            }
            [void]$builder.Append($character)
        }
        if ($backslashCount -gt 0) {
            [void]$builder.Append(('\' * ($backslashCount * 2)))
        }
        [void]$builder.Append('"')
        return $builder.ToString()
    }

    $commandLine = ((@($npxCliPath) + $Arguments) | ForEach-Object {
        ConvertTo-NativeArgument -Argument $_
    }) -join ' '

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $nodePath
    $startInfo.Arguments = $commandLine
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $startInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $process = [System.Diagnostics.Process]::Start($startInfo)
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdoutTask.Wait()
    $stderrTask.Wait()
    if ($stdoutTask.Result) {
        Write-Output $stdoutTask.Result.TrimEnd()
    }
    if ($stderrTask.Result) {
        Write-Output $stderrTask.Result.TrimEnd()
    }
    $global:LASTEXITCODE = $process.ExitCode
}

function Invoke-CloudBase {
    param([string[]]$Arguments)

    Show-Target
    $apiKey = Get-PlainApiKey
    $oldApiKey = $env:CLOUDBASE_API_KEY
    $oldEnvId = $env:CLOUDBASE_ENV_ID
    $oldUserProfile = $env:USERPROFILE
    $oldXdgConfigHome = $env:XDG_CONFIG_HOME
    $sessionRoot = Join-Path $env:TEMP ("SxfCloud\Session-" + [guid]::NewGuid().ToString('N'))

    try {
        New-Item -ItemType Directory -Path $sessionRoot -Force | Out-Null
        $env:USERPROFILE = $sessionRoot
        $env:XDG_CONFIG_HOME = Join-Path $sessionRoot '.config'
        $env:CLOUDBASE_API_KEY = $apiKey
        $env:CLOUDBASE_ENV_ID = $profile.EnvId
        Push-Location -LiteralPath $profile.Root
        try {
            $previousErrorActionPreference = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                Invoke-Npx -Arguments @('--yes', '--package', '@cloudbase/cli', 'tcb', 'login', '--cloudbase-api-key', $apiKey, '-e', $profile.EnvId)
                $loginExitCode = $LASTEXITCODE
            }
            finally {
                $ErrorActionPreference = $previousErrorActionPreference
            }

            if ($loginExitCode -ne 0) {
                throw "CloudBase API Key login failed with exit code $loginExitCode."
            }

            $npxArguments = @('--yes', '--package', '@cloudbase/cli', 'tcb') + $Arguments
            Invoke-Npx -Arguments $npxArguments
            if ($LASTEXITCODE -ne 0) {
                throw "CloudBase CLI failed with exit code $LASTEXITCODE."
            }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        $env:CLOUDBASE_API_KEY = $oldApiKey
        $env:CLOUDBASE_ENV_ID = $oldEnvId
        $env:USERPROFILE = $oldUserProfile
        $env:XDG_CONFIG_HOME = $oldXdgConfigHome
        $apiKey = $null

        $resolvedSessionRoot = [System.IO.Path]::GetFullPath($sessionRoot)
        $resolvedSessionBase = [System.IO.Path]::GetFullPath((Join-Path $env:TEMP 'SxfCloud\'))
        if ($resolvedSessionRoot.StartsWith($resolvedSessionBase, [System.StringComparison]::OrdinalIgnoreCase) -and
            (Split-Path -Leaf $resolvedSessionRoot).StartsWith('Session-', [System.StringComparison]::OrdinalIgnoreCase) -and
            (Test-Path -LiteralPath $resolvedSessionRoot)) {
            Remove-Item -LiteralPath $resolvedSessionRoot -Recurse -Force
        }
    }
}

switch ($Action) {
    'setup' {
        Save-ApiKey
    }
    'test' {
        Invoke-CloudBase -Arguments @('fn', 'list', '-e', $profile.EnvId)
    }
    'run' {
        if (-not $CloudBaseArgs -or $CloudBaseArgs.Count -eq 0) {
            throw 'CloudBase CLI arguments are required after run, for example: fn list'
        }

        $forbiddenEnvironmentOptions = @('-e', '--env-id', '--envId')
        foreach ($argument in $CloudBaseArgs) {
            if ($forbiddenEnvironmentOptions -contains $argument) {
                throw 'Do not override envId manually. Select the target with basketball or football.'
            }
        }

        Invoke-CloudBase -Arguments @($CloudBaseArgs + @('-e', $profile.EnvId))
    }
}
