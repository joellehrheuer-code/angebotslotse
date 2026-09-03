param(
  [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Write-AwinLocalSecret {
  param(
    [Parameter(Mandatory)] [string]$Token,
    [Parameter(Mandatory)] [string]$Target
  )

  if ([string]::IsNullOrWhiteSpace($Token)) { return $false }
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Target, "AWIN_PUBLISHER_ID=3045061`nAWIN_API_TOKEN=$Token`n", $utf8NoBom)
  if ($IsWindows -or $env:OS -eq 'Windows_NT') {
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls.exe $Target /inheritance:r /grant:r "${currentUser}:(R,W)" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Dateiberechtigungen konnten nicht eingeschränkt werden.' }
  }
  return $true
}

if ($SelfTest) {
  $testTarget = Join-Path ([System.IO.Path]::GetTempPath()) ("awin-dialog-test-{0}.env" -f [guid]::NewGuid())
  try {
    $dummy = 'local-self-test-value'
    if (-not (Write-AwinLocalSecret -Token $dummy -Target $testTarget)) { throw 'Nichtleerer Wert wurde nicht erkannt.' }
    $written = [System.IO.File]::ReadAllText($testTarget)
    if (-not $written.Contains('AWIN_PUBLISHER_ID=3045061')) { throw 'Publisher-ID wurde nicht geschrieben.' }
    if (-not $written.Contains('AWIN_API_TOKEN=')) { throw 'Token-Feld wurde nicht geschrieben.' }
    if (Write-AwinLocalSecret -Token '   ' -Target $testTarget) { throw 'Leerwertprüfung ist fehlerhaft.' }
    Write-Output 'Dialog-Selbsttest bestanden.'
  } finally {
    if (Test-Path -LiteralPath $testTarget) { Remove-Item -LiteralPath $testTarget -Force }
    $dummy = $null
    $written = $null
  }
  exit 0
}

$form = [System.Windows.Forms.Form]::new()
$form.Text = 'Awin sicher verbinden'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = [System.Drawing.Size]::new(520, 190)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true

$title = [System.Windows.Forms.Label]::new()
$title.Text = 'Awin API-Token'
$title.Font = [System.Drawing.Font]::new('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = [System.Drawing.Point]::new(24, 20)
$form.Controls.Add($title)

$hint = [System.Windows.Forms.Label]::new()
$hint.Text = 'Publisher-ID 3045061 · Der Token bleibt lokal und wird nicht angezeigt.'
$hint.AutoSize = $true
$hint.Location = [System.Drawing.Point]::new(27, 55)
$form.Controls.Add($hint)

$tokenBox = [System.Windows.Forms.TextBox]::new()
$tokenBox.UseSystemPasswordChar = $true
$tokenBox.Location = [System.Drawing.Point]::new(28, 84)
$tokenBox.Size = [System.Drawing.Size]::new(462, 28)
$form.Controls.Add($tokenBox)

$save = [System.Windows.Forms.Button]::new()
$save.Text = 'Sicher speichern'
$save.Location = [System.Drawing.Point]::new(340, 130)
$save.Size = [System.Drawing.Size]::new(150, 34)
$form.AcceptButton = $save
$form.Controls.Add($save)

$save.Add_Click({
  $tokenValue = $tokenBox.Text
  if ([string]::IsNullOrWhiteSpace($tokenValue)) {
    [System.Windows.Forms.MessageBox]::Show('Bitte den neuen Token einfügen.', 'Awin', 'OK', 'Warning') | Out-Null
    return
  }
  $projectRoot = Split-Path -Parent $PSScriptRoot
  $target = Join-Path $projectRoot '.env.local'
  if (-not (Write-AwinLocalSecret -Token $tokenValue -Target $target)) { return }
  $tokenBox.Clear()
  $tokenValue = $null
  $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Close()
})

$result = $form.ShowDialog()
if ($result -ne [System.Windows.Forms.DialogResult]::OK) { exit 1 }
