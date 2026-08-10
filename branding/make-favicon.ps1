# PENSA favicon generator — renders the shield+tree mark to PNGs and a multi-size ICO
# using only built-in System.Drawing (no external tools).
# Usage: powershell -ExecutionPolicy Bypass -File branding/make-favicon.ps1

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Pt([double]$x, [double]$y) {
    return New-Object System.Drawing.PointF([single]$x, [single]$y)
}

function New-MarkBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = $size / 512.0

    # background rounded square (navy gradient approximated)
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, `
        [System.Drawing.Color]::FromArgb(255, 30, 58, 95), `
        [System.Drawing.Color]::FromArgb(255, 15, 23, 42), 45)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rad = 112 * $s
    $path.AddArc(0, 0, $rad*2, $rad*2, 180, 90)
    $path.AddArc($size-$rad*2, 0, $rad*2, $rad*2, 270, 90)
    $path.AddArc($size-$rad*2, $size-$rad*2, $rad*2, $rad*2, 0, 90)
    $path.AddArc(0, $size-$rad*2, $rad*2, $rad*2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($bgBrush, $path)

    # shield (gold gradient)
    $goldTop = [System.Drawing.Color]::FromArgb(255, 251, 191, 36)
    $goldBottom = [System.Drawing.Color]::FromArgb(255, 217, 119, 6)
    $goldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $goldTop, $goldBottom, 90)

    # shield points (512-space), translated to favicon size
    $pts = @(
        (New-Pt (256*$s) (96*$s)),
        (New-Pt (404*$s) (140*$s)),
        (New-Pt (404*$s) (256*$s)),
        (New-Pt (340*$s) (408*$s)),
        (New-Pt (256*$s) (438*$s)),
        (New-Pt (172*$s) (408*$s)),
        (New-Pt (108*$s) (256*$s)),
        (New-Pt (108*$s) (140*$s))
    )
    $shieldPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shieldPath.AddPolygon($pts)
    $g.FillPath($goldBrush, $shieldPath)

    $navy = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $navy2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 58, 95))

    # trunk
    $g.FillRectangle($navy, 248*$s, 292*$s, 16*$s, 40*$s)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 15, 23, 42), (13*$s))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 256*$s, 240*$s, 256*$s, 212*$s)

    # canopy
    $g.FillEllipse($navy2, (206-34)*$s, (210-34)*$s, 68*$s, 68*$s)
    $g.FillEllipse($navy2, (306-34)*$s, (210-34)*$s, 68*$s, 68*$s)
    $g.FillEllipse($navy, (256-36)*$s, (180-36)*$s, 72*$s, 72*$s)
    $g.FillEllipse($navy, (256-28)*$s, (208-28)*$s, 56*$s, 56*$s)

    # teal leaf (sprouting from the canopy's top-right)
    $teal = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 6, 182, 212))
    $leafPts = @(
        (New-Pt (314*$s) (180*$s)),
        (New-Pt (330*$s) (166*$s)),
        (New-Pt (348*$s) (164*$s)),
        (New-Pt (356*$s) (176*$s)),
        (New-Pt (342*$s) (192*$s)),
        (New-Pt (320*$s) (190*$s))
    )
    $leaf = New-Object System.Drawing.Drawing2D.GraphicsPath
    $leaf.AddPolygon($leafPts)
    $g.FillPath($teal, $leaf)

    $g.Dispose()
    return $bmp
}

# --- PNGs ------------------------------------------------------------------
$sizes = @(16, 32, 48, 64, 128, 180, 256, 512)
$pngs = @{}
foreach ($s in $sizes) {
    $bmp = New-MarkBitmap $s
    $file = Join-Path $outDir "favicon-$s.png"
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngs[$s] = $file
    Write-Host "wrote $file"
}
Copy-Item (Join-Path $outDir "favicon-512.png") (Join-Path $outDir "icon-512.png") -Force
Copy-Item (Join-Path $outDir "favicon-180.png") (Join-Path $outDir "apple-touch-icon.png") -Force

# --- ICO (PNG-embedded entries, Vista+) ------------------------------------
$icoSizes = @(16, 32, 48, 64, 128, 256)
$images = @()
foreach ($s in $icoSizes) {
    $bytes = [System.IO.File]::ReadAllBytes($pngs[$s])
    $images += @{ size = $s; data = $bytes }
}

$count = $images.Count
$header = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($header)
$bw.Write([UInt16]0)      # reserved
$bw.Write([UInt16]1)      # type: icon
$bw.Write([UInt16]$count) # image count

$offset = 6 + (16 * $count)
foreach ($img in $images) {
    $w = if ($img.size -ge 256) { 0 } else { $img.size }
    $bw.Write([Byte]$w)
    $bw.Write([Byte]$w)
    $bw.Write([Byte]0)      # palette
    $bw.Write([Byte]0)      # reserved
    $bw.Write([UInt16]1)    # color planes
    $bw.Write([UInt16]32)   # bits per pixel
    $bw.Write([UInt32]$img.data.Length)
    $bw.Write([UInt32]$offset)
    $offset += $img.data.Length
}
$ico = New-Object System.IO.MemoryStream
$ico.Write($header.ToArray(), 0, $header.ToArray().Length)
foreach ($img in $images) {
    $ico.Write($img.data, 0, $img.data.Length)
}
[System.IO.File]::WriteAllBytes((Join-Path $outDir "favicon.ico"), $ico.ToArray())
Write-Host "wrote favicon.ico ($($ico.Length) bytes)"
Write-Host "done. Assets in $outDir"
