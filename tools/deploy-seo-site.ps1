[CmdletBinding()]
param(
    [switch]$SkipPublicReadback
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot 'sxf-cloud.ps1'
$validator = Join-Path $PSScriptRoot 'validate-seo-site.js'
$officialOrigin = 'https://sxfbasketball.cn'
$cloudOrigin = 'https://sxf-basketball-d9gp6yt0rd1f7be4d-1419431905.tcloudbaseapp.com'

if (-not (Test-Path -LiteralPath $launcher)) {
    throw "CloudBase launcher not found: $launcher"
}

Push-Location -LiteralPath $projectRoot
try {
    & node $validator
    if ($LASTEXITCODE -ne 0) {
        throw 'SEO validation failed. Deployment stopped.'
    }

    $deployments = @(
        @{ Local = 'index.html'; Cloud = 'index.html' },
        @{ Local = 'robots.txt'; Cloud = 'robots.txt' },
        @{ Local = 'sitemap.xml'; Cloud = 'sitemap.xml' },
        @{ Local = 'llms.txt'; Cloud = 'llms.txt' },
        @{ Local = 'baidu_verify_codeva-kUSgCMgBRs.html'; Cloud = 'baidu_verify_codeva-kUSgCMgBRs.html' },
        @{ Local = 'baidu_verify_codeva-pjLRzwcEHf.html'; Cloud = 'baidu_verify_codeva-pjLRzwcEHf.html' },
        @{ Local = 'articles'; Cloud = 'articles' },
        @{ Local = 'guides'; Cloud = 'guides' },
        @{ Local = 'website-assets'; Cloud = 'website-assets' },
        @{
            Local = 'native-dist\assets\home\basketball-icon.png'
            Cloud = 'native-dist/assets/home/basketball-icon.png'
        }
    )

    foreach ($deployment in $deployments) {
        $localPath = Join-Path $projectRoot $deployment.Local
        if (-not (Test-Path -LiteralPath $localPath)) {
            throw "Required website path not found: $localPath"
        }

        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher `
            basketball run hosting deploy $localPath $deployment.Cloud `
            --retry-count 3 --retry-interval 1000
        if ($LASTEXITCODE -ne 0) {
            throw "CloudBase deployment failed: $($deployment.Local)"
        }
    }

    if (-not $SkipPublicReadback) {
        $paths = @('/', '/articles/', '/sitemap.xml', '/robots.txt', '/llms.txt', '/baidu_verify_codeva-kUSgCMgBRs.html', '/baidu_verify_codeva-pjLRzwcEHf.html')
        $articleExpectations = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'articles\posts') `
            -Filter '*.html' -File | ForEach-Object {
                $html = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
                $titleMatch = [regex]::Match($html, '<title>(.*?)</title>', 'IgnoreCase,Singleline')
                $canonicalMatch = [regex]::Match(
                    $html,
                    '<link\s+rel="canonical"\s+href="([^"]+)"',
                    'IgnoreCase'
                )
                @{
                    Path = "/articles/posts/$($_.Name)"
                    Title = $titleMatch.Groups[1].Value
                    Canonical = $canonicalMatch.Groups[1].Value
                }
            }

        foreach ($origin in @($cloudOrigin, $officialOrigin)) {
            foreach ($path in $paths) {
                $url = "$origin$path"
                try {
                    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
                    if ($response.StatusCode -ne 200) {
                        throw "Unexpected HTTP status $($response.StatusCode)"
                    }
                    Write-Host "Verified $url" -ForegroundColor Green
                }
                catch {
                    throw "Public readback failed for $url. $($_.Exception.Message)"
                }
            }

            foreach ($article in $articleExpectations) {
                $url = "$origin$($article.Path)"
                try {
                    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
                    if ($response.StatusCode -ne 200) {
                        throw "Unexpected HTTP status $($response.StatusCode)"
                    }
                    $publicHtml = [System.Text.Encoding]::UTF8.GetString(
                        $response.RawContentStream.ToArray()
                    )
                    $publicTitle = [regex]::Match(
                        $publicHtml,
                        '<title>(.*?)</title>',
                        'IgnoreCase,Singleline'
                    ).Groups[1].Value
                    $publicCanonical = [regex]::Match(
                        $publicHtml,
                        '<link\s+rel="canonical"\s+href="([^"]+)"',
                        'IgnoreCase'
                    ).Groups[1].Value
                    if ($publicTitle -ne $article.Title) {
                        throw 'Deployed title does not match the local article.'
                    }
                    if ($publicCanonical -ne $article.Canonical) {
                        throw 'Deployed canonical does not match the local article.'
                    }
                    Write-Host "Verified article $url" -ForegroundColor Green
                }
                catch {
                    throw "Article readback failed for $url. $($_.Exception.Message)"
                }
            }
        }
    }
}
finally {
    Pop-Location
}
