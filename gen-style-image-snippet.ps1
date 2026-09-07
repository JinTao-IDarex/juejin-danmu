$dir = "d:\2workspace\codex\juejin3"
$jpgToKey = [ordered]@{
  "01-pixel-8bit.jpg"         = "pixel"
  "02-cyberpunk-neon.jpg"     = "cyberpunk"
  "03-hanfu-chinese.jpg"      = "hanfu"
  "04-chibi-kawaii.jpg"       = "chibi"
  "05-watercolor-soft.jpg"    = "watercolor"
  "06-steampunk.jpg"          = "steampunk"
  "08-streetwear-hiphop.jpg"  = "streetwear"
  "09-90s-anime.jpg"          = "anime90s"
  "10-pastel-macaron.jpg"     = "pastel"
}
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("<script>")
[void]$sb.AppendLine("  (function () { var map = {};")
foreach ($kv in $jpgToKey.GetEnumerator()) {
  $path = Join-Path $dir ("styles\" + $kv.Key)
  if (-not (Test-Path $path)) { continue }
  $bytes = [IO.File]::ReadAllBytes($path)
  $b64 = [Convert]::ToBase64String($bytes)
  $dataUri = "data:image/jpeg;base64,$b64"
  [void]$sb.AppendLine(("    map['{0}'] = '{1}';" -f $kv.Value, $dataUri))
}
[void]$sb.AppendLine("    if (typeof window !== 'undefined') window.__JMW_STYLE_IMAGES__ = map;")
[void]$sb.AppendLine("  })();")
[void]$sb.AppendLine("</script>")

$outFile = Join-Path $dir "style-images-injector.html.part"
[IO.File]::WriteAllText($outFile, $sb.ToString(), [Text.UTF8Encoding]::new($false))
Write-Host ("WROTE " + $outFile + "  ->  " + [math]::Round((Get-Item $outFile).Length/1KB,0) + " KB")
