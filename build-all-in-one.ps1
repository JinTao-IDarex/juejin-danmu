# 构建 all-in-one userscript
#  - 9 张「风格总览图」 -> STYLE_IMAGE_DATA.{pixel,cyberpunk,...}
#  - cyberpunk 10 人 + 5 宠物 -> AVATAR_IMAGE_DATA + STYLE_AVATAR_POOL.cyberpunk
#  - 默认风格固定为 cyberpunk（启动即显示赛博朋克角色集）
#  - 用户要求：移除 flat-vector，已在图片列表跳过
param(
  [string]$Dir = "d:\2workspace\codex\juejin3",
  [string]$OutName = "juejin-message-wall-all-in-one.user.js",
  [string]$Version = "2.3.0"
)
$ErrorActionPreference = "Stop"

# ---- 1. 风格级总览图（9 张） ----
$overviewMap = [ordered]@{
  "01-pixel-8bit.jpg"        = "pixel"
  "02-cyberpunk-neon.jpg"    = "cyberpunk"
  "03-hanfu-chinese.jpg"     = "hanfu"
  "04-chibi-kawaii.jpg"      = "chibi"
  "05-watercolor-soft.jpg"   = "watercolor"
  "06-steampunk.jpg"         = "steampunk"
  "08-streetwear-hiphop.jpg" = "streetwear"
  "09-90s-anime.jpg"         = "anime90s"
  "10-pastel-macaron.jpg"    = "pastel"
}
$styleData = @{}
foreach ($kv in $overviewMap.GetEnumerator()) {
  $p = Join-Path $Dir ("styles\" + $kv.Key)
  if (-not (Test-Path $p)) { Write-Warning ("missing "+$p); continue }
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p))
  $styleData[$kv.Value] = "data:image/jpeg;base64,$b64"
  Write-Host ("  overview {0} -> {1} KB" -f $kv.Value, [math]::Round($styleData[$kv.Value].Length/1KB,0))
}

# ---- 2. Cyberpunk 10 角色头像（全部归 person）+ 5 宠物映射到 cat/dog/rabbit + fox/hamster 备用 ----
$avatarFiles = [ordered]@{
  "cyber-characters\p01_ronin.jpg"        = @{k="cb_p01_ronin";      t="person"}
  "cyber-characters\p02_hacker.jpg"       = @{k="cb_p02_hacker";     t="person"}
  "cyber-characters\p03_corpo.jpg"        = @{k="cb_p03_corpo";      t="person"}
  "cyber-characters\p04_android.jpg"      = @{k="cb_p04_android";    t="person"}
  "cyber-characters\p05_scavenger.jpg"    = @{k="cb_p05_scavenger";  t="person"}
  "cyber-characters\p06_netrunner.jpg"    = @{k="cb_p06_netrunner";  t="person"}
  "cyber-characters\p07_yakuza.jpg"       = @{k="cb_p07_yakuza";     t="person"}
  "cyber-characters\p08_mercenary.jpg"    = @{k="cb_p08_mercenary";  t="person"}
  "cyber-characters\p09_geisha.jpg"       = @{k="cb_p09_geisha";     t="person"}
  "cyber-characters\p10_mechanic.jpg"     = @{k="cb_p10_mechanic";   t="person"}
  "cyber-pets\pt01_cat.jpg"               = @{k="cb_pt01_cat";       t="cat"}
  "cyber-pets\pt02_dog.jpg"               = @{k="cb_pt02_dog";       t="dog"}
  "cyber-pets\pt03_rabbit.jpg"            = @{k="cb_pt03_rabbit";    t="rabbit"}
  "cyber-pets\pt04_fox.jpg"               = @{k="cb_pt04_fox";       t="cat"}   # 没有 fox 型，归入 cat 池
  "cyber-pets\pt05_hamster.jpg"           = @{k="cb_pt05_hamster";   t="rabbit"}# 没有 hamster 型，归入 rabbit 池
}
$avatarData = [ordered]@{}
$pool = [ordered]@{ person=@(); cat=@(); dog=@(); rabbit=@() }
foreach ($kv in $avatarFiles.GetEnumerator()) {
  $p = Join-Path $Dir ("styles\" + $kv.Key)
  if (-not (Test-Path $p)) { Write-Warning ("missing "+$p); continue }
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p))
  $uri = "data:image/jpeg;base64,$b64"
  $avatarData[$kv.Value.k] = $uri
  $t = $kv.Value.t
  $pool[$t] += @($kv.Value.k)
  Write-Host ("  avatar {0,-18} ({1,-6}) -> {2} KB" -f $kv.Value.k, $t, [math]::Round($uri.Length/1KB,0))
}
Write-Host ("pool person={0} cat={1} dog={2} rabbit={3}" -f $pool.person.Count,$pool.cat.Count,$pool.dog.Count,$pool.rabbit.Count) -ForegroundColor Cyan

# ---- 3. 读取源码，把三个「占位常量」整体替换为真实值 ----
$cr  = [IO.File]::ReadAllText((Join-Path $Dir "character-renderer.js"),    [Text.UTF8Encoding]::new($false))
$mwc = [IO.File]::ReadAllText((Join-Path $Dir "message-wall-core.js"),    [Text.UTF8Encoding]::new($false))
$ji  = [IO.File]::ReadAllText((Join-Path $Dir "juejin-integration.js"),   [Text.UTF8Encoding]::new($false))

function ToSqStr([string]$s) { return "'" + $s.Replace("'","\'") + "'" }

# 3a. STYLE_IMAGE_DATA
$order1 = @("default","pixel","cyberpunk","hanfu","chibi","watercolor","steampunk","streetwear","anime90s","pastel")
$sb1 = New-Object System.Text.StringBuilder
[void]$sb1.AppendLine("  const STYLE_IMAGE_DATA = {")
foreach ($k in $order1) {
  $val = if ($styleData.ContainsKey($k)) { $styleData[$k] } else { "" }
  [void]$sb1.AppendLine("    {0}: {1}," -f $k, (ToSqStr $val))
}
[void]$sb1.AppendLine("  };")
$re1 = New-Object System.Text.RegularExpressions.Regex(
  "\r?\n  const STYLE_IMAGE_DATA = \{[\s\S]*?\n  \};\r?\n")
$cr = $re1.Replace($cr, "`r`n" + $sb1.ToString(), 1)
if (-not $cr.Contains("STYLE_IMAGE_DATA = {") -or $cr.Contains("pixel: '',") -and $styleData.ContainsKey("pixel")) {
  throw "STYLE_IMAGE_DATA replace may have failed"
}

# 3b. STYLE_AVATAR_POOL（只填 cyberpunk；其他风格保持 []，避免以后破坏布局）
$sb2 = New-Object System.Text.StringBuilder
[void]$sb2.AppendLine("  const STYLE_AVATAR_POOL = {")
$styles = @("default","pixel","cyberpunk","hanfu","chibi","watercolor","steampunk","streetwear","anime90s","pastel")
foreach ($s in $styles) {
  [void]$sb2.Append("    $s:      { person: [")
  $personArr = if ($s -eq "cyberpunk") { $pool.person } else { @() }
  [void]$sb2.Append((($personArr | ForEach-Object { ToSqStr $_ }) -join ", "))
  [void]$sb2.Append("], cat: [")
  $catArr = if ($s -eq "cyberpunk") { $pool.cat } else { @() }
  [void]$sb2.Append((($catArr | ForEach-Object { ToSqStr $_ }) -join ", "))
  [void]$sb2.Append("], dog: [")
  $dogArr = if ($s -eq "cyberpunk") { $pool.dog } else { @() }
  [void]$sb2.Append((($dogArr | ForEach-Object { ToSqStr $_ }) -join ", "))
  [void]$sb2.Append("], rabbit: [")
  $rabArr = if ($s -eq "cyberpunk") { $pool.rabbit } else { @() }
  [void]$sb2.Append((($rabArr | ForEach-Object { ToSqStr $_ }) -join ", "))
  [void]$sb2.AppendLine("] },")
}
[void]$sb2.AppendLine("  };")
$re2 = New-Object System.Text.RegularExpressions.Regex(
  "\r?\n  const STYLE_AVATAR_POOL = \{[\s\S]*?\n  \};\r?\n")
$cr = $re2.Replace($cr, "`r`n" + $sb2.ToString(), 1)

# 3c. AVATAR_IMAGE_DATA
$sb3 = New-Object System.Text.StringBuilder
[void]$sb3.AppendLine("  const AVATAR_IMAGE_DATA = {")
$akArr = @($avatarData.Keys)
for ($i=0; $i -lt $akArr.Length; $i++) {
  $k = $akArr[$i]; $v = $avatarData[$k];
  $comma = if ($i -eq $akArr.Length-1) { "" } else { "," }
  [void]$sb3.AppendLine("    {0}: {1}{2}" -f $k, (ToSqStr $v), $comma)
}
[void]$sb3.AppendLine("  };")
$re3 = New-Object System.Text.RegularExpressions.Regex(
  "\r?\n  const AVATAR_IMAGE_DATA = \{[\s\S]*?\n  \};\r?\n")
$cr = $re3.Replace($cr, "`r`n" + $sb3.ToString(), 1)

# ---- 4. 组装 userscript（自动默认 cyberpunk） ----
$header = @"
// ==UserScript==
// @name         掘金弹幕 - 赛博朋克10角色+5宠物
// @namespace    http://tampermonkey.net/
// @version      $Version
// @description  透明背景角色行走弹幕墙；赛博朋克风格内置 10 张角色立绘 + 5 张宠物立绘（per-character抽图，避免千篇一律），并提供 9 种可选风格。
// @author       You
// @match        *://juejin.cn/*
// @match        *://*.juejin.cn/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable */
(function () {
  'use strict';

"@
$tail = @"

  // 自动启动（默认即赛博朋克）
  if (window.JuejinMessageWall) {
    window.__JMW_MAIN__ = new window.JuejinMessageWall({
      autoStart: true,
      defaultCharacterCount: 10,
      performanceMode: 'auto',
      targetFPS: 30,
      defaultCharacterStyle: 'cyberpunk',
    });
  }
})();
"@

$out = $header + "`r`n// ===== FILE: character-renderer.js =====`r`n" + $cr +
       "`r`n// ===== FILE: message-wall-core.js =====`r`n" + $mwc +
       "`r`n// ===== FILE: juejin-integration.js =====`r`n" + $ji +
       "`r`n" + $tail
$outPath = Join-Path $Dir $OutName
[IO.File]::WriteAllText($outPath, $out, [Text.UTF8Encoding]::new($false))
$len = (Get-Item $outPath).Length
Write-Host ("WROTE " + $outPath + "  ->  " + [math]::Round($len/1MB,2) + " MB / " + [math]::Round($len/1KB,0) + " KB") -ForegroundColor Green
