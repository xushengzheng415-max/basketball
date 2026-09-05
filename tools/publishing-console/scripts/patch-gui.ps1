param(
  [Parameter(Mandatory = $true)]
  [string]$ExePath
)

$resolved = (Resolve-Path -LiteralPath $ExePath).Path
$bytes = [System.IO.File]::ReadAllBytes($resolved)
$peOffset = [BitConverter]::ToInt32($bytes, 0x3C)

if ($bytes[$peOffset] -ne 0x50 -or $bytes[$peOffset + 1] -ne 0x45) {
  throw "Invalid PE executable: $resolved"
}

$subsystemOffset = $peOffset + 24 + 0x44
$bytes[$subsystemOffset] = 2
$bytes[$subsystemOffset + 1] = 0
[System.IO.File]::WriteAllBytes($resolved, $bytes)

if ([BitConverter]::ToUInt16([System.IO.File]::ReadAllBytes($resolved), $subsystemOffset) -ne 2) {
  throw "Failed to set Windows GUI subsystem"
}
