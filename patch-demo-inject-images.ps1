$dir = "d:\2workspace\codex\juejin3"
$demo = Join-Path $dir "demo.html"
$part = Join-Path $dir "style-images-injector.html.part"

$src = [IO.File]::ReadAllText($demo, [Text.UTF8Encoding]::new($false))
$inj = [IO.File]::ReadAllText($part, [Text.UTF8Encoding]::new($false))

# Remove any previously injected block (multiline safe)
$re = New-Object System.Text.RegularExpressions.Regex(
    "\r?\n<!-- STYLE IMAGES INJECT BEGIN -->[\s\S]*?<!-- STYLE IMAGES INJECT END -->\r?\n",
    [System.Text.RegularExpressions.RegexOptions]::Multiline
)
$cleanup = $re.Replace($src, "`r`n")

$marker = "<!-- " + [char]0x6838 + [char]0x5FC3 + [char]0x811A + [char]0x672C + " - " + [char]0x76F8 + [char]0x5BF9 + [char]0x8DEF + [char]0x5F84 + [char]0x52A0 + [char]0x8F7D + " -->"
# 上面是为了避免脚本写入乱码，这里简单直接用英文 marker：
$marker2 = "<!-- Core scripts - relative paths -->"
if ($cleanup.IndexOf($marker) -ge 0) {
  $useMarker = $marker
} else {
  # fallback: use whatever Chinese comment line we know exists
  $useMarker = $null
  $lines = $cleanup -split "`r?`n"
  for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -like "*<!--*核心脚本*-->") { $useMarker = $lines[$i]; break }
  }
  if (-not $useMarker) { throw "comment marker containing '核心脚本' not found in demo.html" }
}

$block = "`r`n<!-- STYLE IMAGES INJECT BEGIN -->`r`n" + $inj.TrimEnd() + "`r`n<!-- STYLE IMAGES INJECT END -->`r`n`r`n" + $useMarker

$out = $cleanup.Replace($useMarker, $block)
if ($out -eq $cleanup) { throw "Replace no-op (marker mismatch)" }

[IO.File]::WriteAllText($demo, $out, [Text.UTF8Encoding]::new($false))
Write-Host ("Patched " + $demo + " (size after: " + [math]::Round((Get-Item $demo).Length/1KB,0) + " KB)")
