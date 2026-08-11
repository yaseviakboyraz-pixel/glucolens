# Production smoke test for /api/analyze.
#
# Sends a real meal photo to the deployed backend and reports what came back.
# This is the end-to-end check that matters: it exercises the live
# ANTHROPIC_API_KEY, the model chain, and the JSON contract in one shot —
# no browser, no HEALTH_CHECK_TOKEN needed.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\smoke-analyze.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\smoke-analyze.ps1 -ImagePath "C:\path\to\photo.jpg"

param(
  [string]$BaseUrl   = "https://glucolens-nine.vercel.app",
  [string]$ImagePath = "",
  [string]$Lang      = "tr",
  [string]$UserType  = "healthy"
)

$ErrorActionPreference = "Stop"

# The API returns UTF-8 (Turkish name_local etc). Without this the console
# renders it through the legacy code page and "Tereyağı" prints as "TereyaÃ".
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# The sample folder's name contains non-ASCII characters, and a hardcoded path
# gets mangled when Windows PowerShell reads this file under a non-UTF8 code
# page. Discovering it at runtime keeps those characters out of the source.
if (-not $ImagePath) {
  $desktop = [Environment]::GetFolderPath("Desktop")
  # Prefer a folder whose name starts with the measurement-sample prefix; the
  # Desktop has several unrelated image folders and plain alphabetical order
  # picks UI mockups, which correctly analyse as "no food detected".
  $folder = Get-ChildItem -Path $desktop -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like ([char]0xD6 + "l*m*rnek*") } |
            Select-Object -First 1
  if ($folder) {
    $first = Get-ChildItem -Path $folder.FullName -Filter *.jfif -ErrorAction SilentlyContinue |
             Select-Object -First 1
    if ($first) { $ImagePath = $first.FullName }
  }
}

if (-not $ImagePath) {
  Write-Host "Could not locate a sample .jfif on the Desktop. Pass one explicitly:" -ForegroundColor Red
  Write-Host '  powershell -ExecutionPolicy Bypass -File scripts\smoke-analyze.ps1 -ImagePath "C:\full\path\photo.jpg"'
  exit 1
}

Write-Host "Image : $ImagePath"
Write-Host "Target: $BaseUrl/api/analyze"
Write-Host ""

# The API expects raw base64 JPEG with no data: prefix (see src/lib/image-prep.ts).
$bytes  = [System.IO.File]::ReadAllBytes($ImagePath)
$b64    = [System.Convert]::ToBase64String($bytes)
Write-Host ("Payload: {0:N0} KB base64" -f ($b64.Length / 1KB))

$body = @{
  imageBase64 = $b64
  userType    = $UserType
  lang        = $Lang
} | ConvertTo-Json -Compress

$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $res = Invoke-RestMethod -Uri "$BaseUrl/api/analyze" -Method POST `
                           -ContentType "application/json" -Body $body -TimeoutSec 90
  $sw.Stop()

  # The route wraps its payload: { analysis, processingMs, disclaimer }
  $a = $res.analysis
  if (-not $a) {
    Write-Host "Unexpected response shape - no 'analysis' field:" -ForegroundColor Red
    $res | ConvertTo-Json -Depth 4
    exit 1
  }

  Write-Host ""
  Write-Host "PASS - analysis returned in $([math]::Round($sw.Elapsed.TotalSeconds,1))s (server $($res.processingMs) ms)" -ForegroundColor Green
  Write-Host ""
  Write-Host ("Total GL : {0}" -f $a.total_glycemic_load)
  Write-Host ("Risk     : {0}" -f $a.glucose_risk)
  Write-Host ("Calories : {0}" -f $a.total_calories)
  Write-Host ""
  Write-Host "Detected items:"
  foreach ($f in $a.food_items) {
    Write-Host ("  - {0,-26} GL {1,5}  GI {2,4}  conf {3}" -f $f.name, $f.glycemic_load, $f.glycemic_index, $f.gi_confidence)
  }
  if ($a.food_items -and $a.food_items[0].name_local) {
    Write-Host ""
    Write-Host ("Localised name check ({0}): {1}" -f $Lang, $a.food_items[0].name_local)
  }
}
catch {
  $sw.Stop()
  Write-Host ""
  Write-Host "FAIL after $([math]::Round($sw.Elapsed.TotalSeconds,1))s" -ForegroundColor Red

  $resp = $_.Exception.Response
  if ($resp) {
    Write-Host ("HTTP {0}" -f [int]$resp.StatusCode)
    try {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      Write-Host ("Body: " + $reader.ReadToEnd())
    } catch { }
  } else {
    Write-Host $_.Exception.Message
  }

  Write-Host ""
  Write-Host "How to read this:" -ForegroundColor Yellow
  Write-Host "  500 -> the API key is likely wrong or the model call failed (check Vercel logs)"
  Write-Host "  429 -> rate limited, wait a minute"
  Write-Host "  413 -> image too large, try a smaller one"
  Write-Host "  400 -> payload shape problem, not a key problem"
  exit 1
}
