$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($env:SRC_DOC, $false, $true)
    $doc.SaveAs2($env:DST_DOCX, 16)
    $doc.Close()
}
finally {
    $word.Quit()
}
