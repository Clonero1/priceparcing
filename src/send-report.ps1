param(
  [Parameter(Mandatory = $true)][string]$To,
  [Parameter(Mandatory = $true)][string]$Subject,
  [Parameter(Mandatory = $true)][string]$BodyPath,
  [Parameter(Mandatory = $true)][string]$AttachmentPath
)

$outlook = New-Object -ComObject Outlook.Application
$mail = $outlook.CreateItem(0)
$mail.To = $To
$mail.Subject = $Subject
$mail.Body = [System.IO.File]::ReadAllText($BodyPath, [System.Text.Encoding]::UTF8)
[void]$mail.Attachments.Add($AttachmentPath)
$mail.Send()
