# Sincronizador automatico — verifica mudancas a cada 30 segundos
# Videos verticais (portrait) sao recodificados com rotacao de pixels
# para exibicao correta na TV Samsung (que nao aplica CSS transforms em video)

$pastaRepo = $PSScriptRoot
$ffmpeg  = "C:\Users\CLIENTE\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
$ffprobe = "C:\Users\CLIENTE\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffprobe.exe"

Set-Location $pastaRepo

function ProcessarVideosNovos {
    $arquivosAlterados = git status --porcelain media/ | ForEach-Object { $_.Substring(3).Trim('"') }
    foreach ($arquivo in $arquivosAlterados) {
        if ($arquivo -match '\.(mp4|mov|webm)$') {
            $caminho = Join-Path $pastaRepo $arquivo
            if (Test-Path $caminho) {
                $dim = & $ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 $caminho 2>$null
                if ($dim) {
                    $partes = $dim -split ','
                    $largura = [int]$partes[0]
                    $altura  = [int]$partes[1]
                    if ($altura -gt $largura) {
                        Write-Host "Girando pixels (portrait -> landscape): $arquivo"
                        $temp = "$caminho.tmp.mp4"
                        & $ffmpeg -y -i $caminho -vf "transpose=2" -c:a copy $temp 2>$null
                        if (Test-Path $temp) {
                            Move-Item -Force $temp $caminho
                        }
                    }
                }
            }
        }
    }
}

while ($true) {
    $status = git status --porcelain media/
    if ($status) {
        ProcessarVideosNovos
        $data = Get-Date -Format "dd/MM/yyyy HH:mm"
        git add media/
        git commit -m "Atualizacao de conteudo - $data"
        git push origin main
    }
    Start-Sleep -Seconds 30
}
