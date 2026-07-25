[CmdletBinding()]
param(
    [string]$LauncherPath = 'E:\Documents\sxf-basketball\tools\sxf-cloud.ps1',
    [string]$SourceProject = 'basketball',
    [string]$TargetProject = 'basketball-target',
    [string]$SourceEnvId = 'cloudbase-d4g93f0re5f3274c1',
    [string]$TargetEnvId = 'sxf-basketball-d9gp6yt0rd1f7be4d',
    [string]$StartCollection = '',
    [Parameter(Mandatory = $true)]
    [string]$BackupRoot,
    [string]$SourceCloudPrefix = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/',
    [string]$TargetCloudPrefix = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/'
)

$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

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

function Invoke-DatabaseCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Project,
        [Parameter(Mandatory = $true)][string]$CommandJson,
        [Parameter(Mandatory = $true)][string]$LogName
    )

    $logPath = Join-Path $script:LogDirectory "$LogName.log"
    $envId = if ($Project -eq $SourceProject) { $SourceEnvId } else { $TargetEnvId }
    $parsedCommands = ConvertFrom-Json -InputObject $CommandJson
    $requestBody = [ordered]@{
        EnvId = $envId
        MgoCommands = [object[]]$parsedCommands
    } | ConvertTo-Json -Depth 100 -Compress
    Invoke-LauncherWithRetry -Arguments @(
        $Project, 'run', 'api', 'tcb', 'RunCommands',
        '--api-version', '2018-06-08',
        '--body', $requestBody,
        '--json'
    ) -LogPath $logPath
    $payload = Read-JsonPayload -Path $logPath
    $results = [System.Collections.ArrayList]::new()
    foreach ($item in @($payload.data.Data)) {
        $parsed = [object[]](ConvertFrom-Json -InputObject $item)
        $deepParsed = [System.Collections.ArrayList]::new()
        foreach ($entry in $parsed) {
            if ($entry -is [string]) {
                try {
                    [void]$deepParsed.Add(($entry | ConvertFrom-Json))
                }
                catch {
                    [void]$deepParsed.Add($entry)
                }
            }
            else {
                [void]$deepParsed.Add($entry)
            }
        }
        [void]$results.Add($deepParsed.ToArray())
    }
    return [pscustomobject]@{
        data = [pscustomobject]@{
            results = $results
        }
    }
}

function Invoke-TcbApi {
    param(
        [Parameter(Mandatory = $true)][string]$Project,
        [Parameter(Mandatory = $true)][string]$Action,
        [Parameter(Mandatory = $true)]$Body,
        [Parameter(Mandatory = $true)][string]$LogName
    )

    $logPath = Join-Path $script:LogDirectory "$LogName.log"
    $bodyJson = ConvertTo-Json -InputObject $Body -Depth 100 -Compress
    Invoke-LauncherWithRetry -Arguments @(
        $Project, 'run', 'api', 'tcb', $Action,
        '--api-version', '2018-06-08',
        '--body', $bodyJson,
        '--json'
    ) -LogPath $logPath
    return Read-JsonPayload -Path $logPath
}

function New-CommandJson {
    param(
        [Parameter(Mandatory = $true)][string]$Collection,
        [Parameter(Mandatory = $true)][ValidateSet('QUERY', 'INSERT', 'COMMAND')][string]$Type,
        [Parameter(Mandatory = $true)]$Command
    )

    $inner = $Command | ConvertTo-Json -Depth 100 -Compress
    $commands = @(
        [ordered]@{
            TableName = $Collection
            CommandType = $Type
            Command = $inner
        }
    )
    return ConvertTo-Json -InputObject $commands -Depth 100 -Compress
}

$databaseRoot = Join-Path $BackupRoot 'database'
$sourceDirectory = Join-Path $databaseRoot 'source'
$targetDirectory = Join-Path $databaseRoot 'target'
$script:LogDirectory = Join-Path $databaseRoot 'logs'
New-Item -ItemType Directory -Path $sourceDirectory, $targetDirectory, $script:LogDirectory -Force | Out-Null

$listCommand = New-CommandJson -Collection '_collections' -Type COMMAND -Command ([ordered]@{
    listCollections = 1
    nameOnly = $true
})
$listResult = Invoke-DatabaseCommand -Project $SourceProject -CommandJson $listCommand -LogName 'source-list-collections'
$collections = @($listResult.data.results[0] | ForEach-Object { $_.name } | Where-Object { $_ } | Sort-Object)
if ($collections.Count -eq 0) {
    throw 'No source collections found.'
}
if ($StartCollection) {
    $startIndex = [Array]::IndexOf([string[]]$collections, $StartCollection)
    if ($startIndex -lt 0) {
        throw "Start collection not found: $StartCollection"
    }
    $collections = [string[]]$collections[$startIndex..($collections.Count - 1)]
}

$targetListResult = Invoke-DatabaseCommand -Project $TargetProject -CommandJson $listCommand -LogName 'target-list-collections'
$targetCollections = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
foreach ($targetCollection in @($targetListResult.data.results[0] | ForEach-Object { $_.name } | Where-Object { $_ })) {
    [void]$targetCollections.Add($targetCollection)
}

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

$manifest = @()
foreach ($collection in $collections) {
    if (-not $targetCollections.Contains($collection)) {
        $aclTag = $permissionByCollection[$collection]
        if (-not $aclTag) {
            $aclTag = 'ADMINONLY'
        }
        [void](Invoke-TcbApi -Project $TargetProject -Action 'CreateTable' -LogName "target-create-$collection" -Body ([ordered]@{
            EnvId = $TargetEnvId
            TableName = $collection
            PermissionInfo = [ordered]@{
                EnvId = $TargetEnvId
                AclTag = $aclTag
            }
        }))
        [void]$targetCollections.Add($collection)
    }

    $countCommand = New-CommandJson -Collection $collection -Type COMMAND -Command ([ordered]@{
        count = $collection
        query = [ordered]@{}
    })
    $countResult = Invoke-DatabaseCommand -Project $SourceProject -CommandJson $countCommand -LogName "source-count-$collection"
    $expectedCount = [int64]$countResult.data.results[0][0].n.'$numberInt'
    if (-not $expectedCount) {
        $expectedCount = [int64]$countResult.data.results[0][0].n.'$numberLong'
    }

    $documents = [System.Collections.ArrayList]::new()
    $batchSize = 20
    for ($skip = 0; $skip -lt $expectedCount; $skip += $batchSize) {
        $findCommand = New-CommandJson -Collection $collection -Type QUERY -Command ([ordered]@{
            find = $collection
            filter = [ordered]@{}
            sort = [ordered]@{ _id = 1 }
            skip = $skip
            limit = $batchSize
        })
        $findResult = Invoke-DatabaseCommand -Project $SourceProject -CommandJson $findCommand -LogName "source-find-$collection-$skip"
        foreach ($document in @($findResult.data.results[0])) {
            [void]$documents.Add($document)
        }
    }

    if ($documents.Count -ne $expectedCount) {
        throw "Source export count mismatch for ${collection}: expected $expectedCount, got $($documents.Count)."
    }

    $sourceJson = ConvertTo-Json -InputObject ([object[]]$documents.ToArray()) -Depth 100
    $sourcePath = Join-Path $sourceDirectory "$collection.extended.json"
    [System.IO.File]::WriteAllText($sourcePath, $sourceJson, [System.Text.UTF8Encoding]::new($false))

    $targetJson = $sourceJson.Replace($SourceCloudPrefix, $TargetCloudPrefix)
    $targetPath = Join-Path $targetDirectory "$collection.extended.json"
    [System.IO.File]::WriteAllText($targetPath, $targetJson, [System.Text.UTF8Encoding]::new($false))
    $targetDocuments = [object[]](ConvertFrom-Json -InputObject $targetJson)

    $preImportCountResult = Invoke-DatabaseCommand -Project $TargetProject -CommandJson $countCommand -LogName "target-pre-count-$collection"
    $preImportCount = [int64]$preImportCountResult.data.results[0][0].n.'$numberInt'
    if (-not $preImportCount) {
        $preImportCount = [int64]$preImportCountResult.data.results[0][0].n.'$numberLong'
    }
    $documentsToInsert = [object[]]$targetDocuments
    if ($preImportCount -ne 0 -and $preImportCount -ne $expectedCount) {
        $existingDocumentIds = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
        for ($targetSkip = 0; $targetSkip -lt $preImportCount; $targetSkip += 20) {
            $targetFindCommand = New-CommandJson -Collection $collection -Type QUERY -Command ([ordered]@{
                find = $collection
                filter = [ordered]@{}
                projection = [ordered]@{ _id = 1 }
                sort = [ordered]@{ _id = 1 }
                skip = $targetSkip
                limit = 20
            })
            $targetFindResult = Invoke-DatabaseCommand -Project $TargetProject -CommandJson $targetFindCommand -LogName "target-resume-find-$collection-$targetSkip"
            foreach ($document in @($targetFindResult.data.results[0])) {
                $idKey = ConvertTo-Json -InputObject $document._id -Depth 20 -Compress
                [void]$existingDocumentIds.Add($idKey)
            }
        }
        if ($existingDocumentIds.Count -ne $preImportCount) {
            throw "Unable to enumerate all existing target document IDs for ${collection}: expected $preImportCount, got $($existingDocumentIds.Count)."
        }
        $documentsToInsert = [object[]]@($targetDocuments | Where-Object {
            $idKey = ConvertTo-Json -InputObject $_._id -Depth 20 -Compress
            -not $existingDocumentIds.Contains($idKey)
        })
        if ($documentsToInsert.Count -ne ($expectedCount - $preImportCount)) {
            throw "Target resume set mismatch for ${collection}: expected $($expectedCount - $preImportCount) missing documents, got $($documentsToInsert.Count)."
        }
    }

    if ($preImportCount -ne $expectedCount) {
        $importBatches = [System.Collections.ArrayList]::new()
        $currentBatch = [System.Collections.ArrayList]::new()
        foreach ($document in $documentsToInsert) {
            $candidate = [object[]]@($currentBatch.ToArray() + $document)
            $candidateJsonLength = (ConvertTo-Json -InputObject $candidate -Depth 100 -Compress).Length
            if ($currentBatch.Count -gt 0 -and ($candidate.Count -gt 5 -or $candidateJsonLength -gt 12000)) {
                [void]$importBatches.Add([object[]]$currentBatch.ToArray())
                $currentBatch = [System.Collections.ArrayList]::new()
            }
            [void]$currentBatch.Add($document)
        }
        if ($currentBatch.Count -gt 0) {
            [void]$importBatches.Add([object[]]$currentBatch.ToArray())
        }

        $offset = 0
        foreach ($insertDocuments in $importBatches) {
            $insertCommand = New-CommandJson -Collection $collection -Type INSERT -Command ([ordered]@{
                insert = $collection
                documents = [object[]]$insertDocuments
                ordered = $true
            })
            [void](Invoke-DatabaseCommand -Project $TargetProject -CommandJson $insertCommand -LogName "target-insert-$collection-$offset")
            $offset += @($insertDocuments).Count
        }
    }

    $verifyCommand = New-CommandJson -Collection $collection -Type COMMAND -Command ([ordered]@{
        count = $collection
        query = [ordered]@{}
    })
    $verifyResult = Invoke-DatabaseCommand -Project $TargetProject -CommandJson $verifyCommand -LogName "target-count-$collection"
    $targetCount = [int64]$verifyResult.data.results[0][0].n.'$numberInt'
    if (-not $targetCount) {
        $targetCount = [int64]$verifyResult.data.results[0][0].n.'$numberLong'
    }
    if ($targetCount -ne $expectedCount) {
        throw "Target import count mismatch for ${collection}: expected $expectedCount, got $targetCount."
    }

    $verifiedTargetDocuments = [System.Collections.ArrayList]::new()
    for ($targetSkip = 0; $targetSkip -lt $targetCount; $targetSkip += 20) {
        $targetFindCommand = New-CommandJson -Collection $collection -Type QUERY -Command ([ordered]@{
            find = $collection
            filter = [ordered]@{}
            sort = [ordered]@{ _id = 1 }
            skip = $targetSkip
            limit = 20
        })
        $targetFindResult = Invoke-DatabaseCommand -Project $TargetProject -CommandJson $targetFindCommand -LogName "target-verify-find-$collection-$targetSkip"
        foreach ($document in @($targetFindResult.data.results[0])) {
            [void]$verifiedTargetDocuments.Add($document)
        }
    }
    $verifiedTargetJson = ConvertTo-Json -InputObject ([object[]]$verifiedTargetDocuments.ToArray()) -Depth 100
    $verifiedTargetPath = Join-Path $targetDirectory "$collection.verified.extended.json"
    [System.IO.File]::WriteAllText($verifiedTargetPath, $verifiedTargetJson, [System.Text.UTF8Encoding]::new($false))
    if ($verifiedTargetJson -ne $targetJson) {
        throw "Target content verification mismatch for ${collection}. See $targetPath and $verifiedTargetPath."
    }

    $manifest += [ordered]@{
        collection = $collection
        sourceCount = $expectedCount
        targetCount = $targetCount
        contentVerified = $true
    }
    Write-Output "$collection=$expectedCount"
}

$manifestPath = Join-Path $databaseRoot 'migration-manifest.json'
[System.IO.File]::WriteAllText(
    $manifestPath,
    ($manifest | ConvertTo-Json -Depth 10),
    [System.Text.UTF8Encoding]::new($false)
)

Write-Output "CollectionCount=$($collections.Count)"
Write-Output "DocumentCount=$(($manifest | Measure-Object -Property sourceCount -Sum).Sum)"
Write-Output "Manifest=$manifestPath"
