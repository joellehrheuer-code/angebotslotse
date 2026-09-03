param(
  [string]$PublisherId
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot '.env.local'
if ([string]::IsNullOrWhiteSpace($PublisherId)) {
  $PublisherId = Read-Host 'Awin Publisher-ID [3045061]'
  if ([string]::IsNullOrWhiteSpace($PublisherId)) { $PublisherId = '3045061' }
}
if ($PublisherId -notmatch '^\d+$') { throw 'Die Publisher-ID darf nur Ziffern enthalten.' }

$secureToken = Read-Host 'Awin API-Token (Eingabe bleibt unsichtbar)' -AsSecureString
$credential = [System.Net.NetworkCredential]::new('', $secureToken)
$plainToken = $credential.Password
if ([string]::IsNullOrWhiteSpace($plainToken)) { throw 'Der Token darf nicht leer sein.' }

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($target, "AWIN_PUBLISHER_ID=$PublisherId`nAWIN_API_TOKEN=$plainToken`n", $utf8NoBom)

if ($IsWindows) {
  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls.exe $target /inheritance:r /grant:r "${currentUser}:(R,W)" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Dateiberechtigungen konnten nicht eingeschränkt werden.' }
}

$plainToken = $null
$credential = $null
$secureToken.Dispose()
Write-Host 'Gespeichert. Der Token wurde nicht angezeigt und .env.local wird von Git ignoriert.'
