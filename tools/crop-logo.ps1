Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Luis Fratta\AppData\Local\Temp\4 (5).png"
$out = "C:\Users\Luis Fratta\Ampy\form\assets\logo.png"

$orig = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap $orig
$orig.Dispose()

$w = $bmp.Width
$h = $bmp.Height

$rect = New-Object System.Drawing.Rectangle 0,0,$w,$h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($data.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$bmp.UnlockBits($data)
$stride = $data.Stride

$minX = $w; $maxX = -1; $minY = $h; $maxY = -1
$threshold = 30

for ($y = 0; $y -lt $h; $y++) {
  $rowOffset = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    $o = $rowOffset + $x * 4
    $b = $bytes[$o]; $g = $bytes[$o+1]; $r = $bytes[$o+2]
    if (($r -gt $threshold) -or ($g -gt $threshold) -or ($b -gt $threshold)) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

"bbox: x=$minX..$maxX y=$minY..$maxY (of $w x $h)"

$pad = 20
$cx0 = [Math]::Max(0, $minX - $pad)
$cy0 = [Math]::Max(0, $minY - $pad)
$cx1 = [Math]::Min($w - 1, $maxX + $pad)
$cy1 = [Math]::Min($h - 1, $maxY + $pad)
$cw = $cx1 - $cx0 + 1
$ch = $cy1 - $cy0 + 1

"crop: x=$cx0 y=$cy0 w=$cw h=$ch"

$cropRect = New-Object System.Drawing.Rectangle $cx0,$cy0,$cw,$ch
$cropped = $bmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bmp.Dispose()

# transparencia: torna o fundo preto transparente, mantendo o verde do logo
$crect = New-Object System.Drawing.Rectangle 0,0,$cw,$ch
$cdata = $cropped.LockBits($crect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cbytes = New-Object byte[] ($cdata.Stride * $ch)
[System.Runtime.InteropServices.Marshal]::Copy($cdata.Scan0, $cbytes, 0, $cbytes.Length)
$cstride = $cdata.Stride

for ($y = 0; $y -lt $ch; $y++) {
  $rowOffset = $y * $cstride
  for ($x = 0; $x -lt $cw; $x++) {
    $o = $rowOffset + $x * 4
    $b = $cbytes[$o]; $g = $cbytes[$o+1]; $r = $cbytes[$o+2]
    $maxc = [Math]::Max($r, [Math]::Max($g, $b))
    if ($maxc -le $threshold) {
      $cbytes[$o+3] = 0
    } elseif ($maxc -lt ($threshold + 25)) {
      # suaviza a borda da forma (anti-serrilhado)
      $alpha = [int](([double]($maxc - $threshold) / 25.0) * 255)
      $cbytes[$o+3] = $alpha
    }
  }
}
[System.Runtime.InteropServices.Marshal]::Copy($cbytes, 0, $cdata.Scan0, $cbytes.Length)
$cropped.UnlockBits($cdata)

$cropped.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()

"saved: $out"
