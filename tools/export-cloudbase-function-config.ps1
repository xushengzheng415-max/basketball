[CmdletBinding()]
param(
    [string]$LauncherPath = 'E:\Documents\sxf-basketball\tools\sxf-cloud.ps1',
    [string]$SourceProject = 'basketball',
    [string]$TargetEnvId = 'sxf-basketball-d9gp6yt0rd1f7be4d',
    [Parameter(Mandatory = $true)]
    [string]$BackupRoot
)

$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

function Read-JsonPayload {
    param([Parameter(Mandatory = $true)][string]$Path)

    $lines = Get-Content -LiteralPath $Path
    $dataLine = (Select-String -LiteralPath $Path -Pattern '^  "data": \{' | Select-Object -Last 1).LineNumber
    if (-not $dataLine) {
        throw "No JSON data payload found in $Path."
    }

    $start = $dataLine - 2
    for ($end = $lines.Count - 1; $end -ge $start; $end--) {
        if ($lines[$end] -ne '}') {
            continue
        }
        try {
            return (($lines[$start..$end] -join "`n") | ConvertFrom-Json)
        }
        catch {
            continue
        }
    }
    throw "Unable to parse JSON payload from $Path."
}

$detailDirectory = Join-Path $BackupRoot 'function-details'
New-Item -ItemType Directory -Path $detailDirectory -Force | Out-Null

$functionNames = @(
    'sx-beta-registration-bot',
    'sxGeneratePeriodReport',
    'sxGenerateMatchReportPdf',
    'sxGetAudioUrl',
    'sxSyncRoster',
    'sxGetAudioLibrary',
    'sxSaveAudioLibrary',
    'sxCreateRedeemCode',
    'sxRedeemCode',
    'sxWxPayNotify',
    'sxCreateWxPayOrder',
    'sxCreateScoreVoice',
    'sxCheckEntitlement',
    'sxSubmitFeedback',
    'sxSaveUser',
    'sxSaveMatchResult',
    'sxLogin',
    'sxAdminDashboard',
    'sxCreateOrder'
)

$functions = foreach ($name in $functionNames) {
    $rawPath = Join-Path $detailDirectory "$name.json.log"
    & $LauncherPath $SourceProject run fn detail $name --json *> $rawPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read function detail for $name."
    }

    $detail = (Read-JsonPayload -Path $rawPath).data
    $envVariables = [ordered]@{}
    foreach ($variable in @($detail.Environment.Variables)) {
        if ($variable.Key) {
            $envVariables[$variable.Key] = $variable.Value
        }
    }

    $config = [ordered]@{
        name = $detail.FunctionName
        runtime = $detail.Runtime
        handler = $detail.Handler
        timeout = [int]$detail.Timeout
        memorySize = [int]$detail.MemorySize
    }
    if ($detail.Description) {
        $config.description = $detail.Description
    }
    if ($envVariables.Count -gt 0) {
        $config.envVariables = $envVariables
    }
    $config
}

$configDocument = [ordered]@{
    '$schema' = 'https://static.cloudbase.net/cli/cloudbaserc.schema.json'
    envId = $TargetEnvId
    functionRoot = (Join-Path $BackupRoot 'remote-functions')
    functions = @($functions)
}

$configPath = Join-Path $BackupRoot 'target-cloudbaserc.private.json'
[System.IO.File]::WriteAllText(
    $configPath,
    ($configDocument | ConvertTo-Json -Depth 20),
    [System.Text.UTF8Encoding]::new($false)
)

Write-Output "FunctionCount=$($functions.Count)"
Write-Output "PrivateConfig=$configPath"
Write-Output "EnvironmentVariableFunctions=$(@($functions | Where-Object { $_.envVariables }).Count)"
