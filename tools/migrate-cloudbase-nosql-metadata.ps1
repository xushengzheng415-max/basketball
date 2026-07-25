[CmdletBinding()]
param(
    [string]$LauncherPath = 'E:\Documents\sxf-basketball\tools\sxf-cloud.ps1',
    [string]$SourceProject = 'basketball',
    [string]$TargetProject = 'basketball-target',
    [string]$SourceEnvId = 'cloudbase-d4g93f0re5f3274c1',
    [string]$TargetEnvId = 'sxf-basketball-d9gp6yt0rd1f7be4d',
    [Parameter(Mandatory = $true)]
    [string]$BackupRoot
)

$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$collections = @(
    'sx_daily_reports',
    'sx_entitlements',
    'sx_feedback',
    'sx_match_results',
    'sx_mc_audio_library',
    'sx_orders',
    'sx_period_report_jobs',
    'sx_period_reports',
    'sx_redeem_codes',
    'sx_users',
    'sx_voice_logs'
)

$permissionByCollection = @{
    sx_orders = 'READONLY'
    sx_redeem_codes = 'READONLY'
    sx_daily_reports = 'PRIVATE'
    sx_period_report_jobs = 'PRIVATE'
    sx_match_results = 'READONLY'
    sx_entitlements = 'READONLY'
    sx_feedback = 'READONLY'
    sx_voice_logs = 'READONLY'
    sx_period_reports = 'PRIVATE'
    sx_users = 'READONLY'
    sx_mc_audio_library = 'READONLY'
}

$metadataRoot = Join-Path $BackupRoot 'database\metadata'
New-Item -ItemType Directory -Path $metadataRoot -Force | Out-Null

function Read-JsonPayload {
    param([Parameter(Mandatory = $true)][string]$Path)

    $raw = Get-Content -LiteralPath $Path -Raw
    $rootMatches = [regex]::Matches($raw, '(?m)^\{\r?\n\s*"data"\s*:')
    if ($rootMatches.Count -eq 0) {
        throw "No JSON data payload found in $Path."
    }
    $start = $rootMatches[$rootMatches.Count - 1].Index
    for ($end = $raw.Length - 1; $end -gt $start; $end--) {
        if ($raw[$end] -ne '}') {
            continue
        }
        try {
            return ($raw.Substring($start, $end - $start + 1) | ConvertFrom-Json)
        }
        catch {
            continue
        }
    }
    throw "Unable to parse JSON payload from $Path."
}

function Invoke-LauncherWithRetry {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$LogPath,
        [int]$MaxAttempts = 4
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            & $LauncherPath @Arguments *> $LogPath
            if ($LASTEXITCODE -eq 0) {
                return
            }
            $failure = "exit code $LASTEXITCODE"
        }
        catch {
            $failure = $_.Exception.Message
        }
        if ($attempt -eq $MaxAttempts) {
            throw "CloudBase launcher failed after $MaxAttempts attempts ($failure). See $LogPath."
        }
        Start-Sleep -Seconds (2 * $attempt)
    }
}

function Invoke-TcbApi {
    param(
        [Parameter(Mandatory = $true)][string]$Project,
        [Parameter(Mandatory = $true)][string]$Action,
        [Parameter(Mandatory = $true)]$Body,
        [Parameter(Mandatory = $true)][string]$LogName
    )

    $logPath = Join-Path $metadataRoot "$LogName.log"
    $bodyJson = ConvertTo-Json -InputObject $Body -Depth 100 -Compress
    Invoke-LauncherWithRetry -Arguments @(
        $Project, 'run', 'api', 'tcb', $Action,
        '--api-version', '2018-06-08',
        '--body', $bodyJson,
        '--json'
    ) -LogPath $logPath
    return Read-JsonPayload -Path $logPath
}

function New-ListIndexCommands {
    $commands = foreach ($collection in $collections) {
        [ordered]@{
            TableName = $collection
            CommandType = 'COMMAND'
            Command = (ConvertTo-Json -InputObject ([ordered]@{
                listIndexes = $collection
                cursor = [ordered]@{}
            }) -Depth 20 -Compress)
        }
    }
    return [object[]]$commands
}

function Convert-IndexKey {
    param([Parameter(Mandatory = $true)]$Key)

    $normalized = [ordered]@{}
    foreach ($property in $Key.PSObject.Properties) {
        $value = $property.Value
        if ($null -ne $value.'$numberInt') {
            $value = [int]$value.'$numberInt'
        }
        elseif ($null -ne $value.'$numberLong') {
            $value = [int64]$value.'$numberLong'
        }
        elseif ($null -ne $value.'$numberDouble') {
            $value = [double]$value.'$numberDouble'
        }
        $normalized[$property.Name] = $value
    }
    return $normalized
}

function Read-IndexesByCollection {
    param([Parameter(Mandatory = $true)]$Payload)

    $result = [ordered]@{}
    $items = @($Payload.data.Data)
    if ($items.Count -ne $collections.Count) {
        throw "Index result count mismatch: expected $($collections.Count), got $($items.Count)."
    }

    for ($index = 0; $index -lt $collections.Count; $index++) {
        $parsed = [object[]](ConvertFrom-Json -InputObject $items[$index])
        $indexes = @()
        foreach ($entry in $parsed) {
            $indexInfo = if ($entry -is [string]) {
                ConvertFrom-Json -InputObject $entry
            }
            else {
                $entry
            }
            if ($indexInfo.name -eq '_id_') {
                continue
            }
            $indexes += [ordered]@{
                name = $indexInfo.name
                key = Convert-IndexKey -Key $indexInfo.key
                unique = [bool]$indexInfo.unique
                sparse = [bool]$indexInfo.sparse
            }
        }
        $result[$collections[$index]] = [object[]]$indexes
    }
    return $result
}

$sourceIndexPayload = Invoke-TcbApi -Project $SourceProject -Action 'RunCommands' -LogName 'source-indexes' -Body ([ordered]@{
    EnvId = $SourceEnvId
    MgoCommands = New-ListIndexCommands
})
$sourceIndexes = Read-IndexesByCollection -Payload $sourceIndexPayload

$createIndexCommands = @()
foreach ($collection in $collections) {
    $indexes = @($sourceIndexes[$collection])
    if ($indexes.Count -eq 0) {
        continue
    }
    $specs = foreach ($indexInfo in $indexes) {
        $spec = [ordered]@{
            key = $indexInfo.key
            name = $indexInfo.name
        }
        if ($indexInfo.unique) {
            $spec.unique = $true
        }
        if ($indexInfo.sparse) {
            $spec.sparse = $true
        }
        $spec
    }
    $createIndexCommands += [ordered]@{
        TableName = $collection
        CommandType = 'COMMAND'
        Command = (ConvertTo-Json -InputObject ([ordered]@{
            createIndexes = $collection
            indexes = [object[]]$specs
        }) -Depth 40 -Compress)
    }
}

if ($createIndexCommands.Count -gt 0) {
    [void](Invoke-TcbApi -Project $TargetProject -Action 'RunCommands' -LogName 'target-create-indexes' -Body ([ordered]@{
        EnvId = $TargetEnvId
        MgoCommands = [object[]]$createIndexCommands
    }))
}

foreach ($collection in $collections) {
    [void](Invoke-TcbApi -Project $TargetProject -Action 'ModifyDatabaseACL' -LogName "target-acl-$collection" -Body ([ordered]@{
        EnvId = $TargetEnvId
        CollectionName = $collection
        AclTag = $permissionByCollection[$collection]
    }))
}

$targetIndexPayload = Invoke-TcbApi -Project $TargetProject -Action 'RunCommands' -LogName 'target-indexes' -Body ([ordered]@{
    EnvId = $TargetEnvId
    MgoCommands = New-ListIndexCommands
})
$targetIndexes = Read-IndexesByCollection -Payload $targetIndexPayload

$targetPermissionPayload = Invoke-TcbApi -Project $TargetProject -Action 'DescribeResourcePermission' -LogName 'target-permissions' -Body ([ordered]@{
    EnvId = $TargetEnvId
    ResourceType = 'collection'
    Resources = [object[]]$collections
})
$actualPermissions = @{}
foreach ($permission in @($targetPermissionPayload.data.Data.PermissionList)) {
    $actualPermissions[$permission.Resource] = $permission.Permission
}

$verification = foreach ($collection in $collections) {
    $sourceIndexJson = ConvertTo-Json -InputObject ([object[]]$sourceIndexes[$collection]) -Depth 40 -Compress
    $targetIndexJson = ConvertTo-Json -InputObject ([object[]]$targetIndexes[$collection]) -Depth 40 -Compress
    [ordered]@{
        collection = $collection
        permission = $actualPermissions[$collection]
        expectedPermission = $permissionByCollection[$collection]
        permissionMatches = $actualPermissions[$collection] -eq $permissionByCollection[$collection]
        indexCount = @($targetIndexes[$collection]).Count
        indexesMatch = $sourceIndexJson -eq $targetIndexJson
    }
}

$manifestPath = Join-Path $metadataRoot 'metadata-migration-manifest.json'
[System.IO.File]::WriteAllText(
    $manifestPath,
    (ConvertTo-Json -InputObject ([object[]]$verification) -Depth 20),
    [System.Text.UTF8Encoding]::new($false)
)

if (@($verification | Where-Object { -not $_.permissionMatches -or -not $_.indexesMatch }).Count -gt 0) {
    throw "Database metadata verification failed. See $manifestPath."
}

Write-Output "CollectionCount=$($collections.Count)"
Write-Output "IndexCount=$(($verification | Measure-Object -Property indexCount -Sum).Sum)"
Write-Output "Manifest=$manifestPath"
