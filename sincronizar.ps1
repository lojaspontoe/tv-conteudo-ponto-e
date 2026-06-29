# Sincronizador automatico — verifica mudancas a cada 30 segundos
# Adiciona marcacao de rotacao aos videos verticais (sem recodificar pixels,
# sem mudar dimensoes) para que o navegador da TV exiba na orientacao correta

$pastaRepo = $PSScriptRoot
$ffmpeg  = "C:\Users\CLIENTE\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
$ffprobe = "C:\Users\CLIENTE\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffprobe.exe"

Set-Location $pastaRepo

function ConverterVideosVerticais {
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
                    $jaTemRotacao = & $ffprobe -v error -select_streams v:0 -show_entries side_data=rotation -of csv=p=0 $caminho 2>$null
                    if ($altura -gt $largura -and -not $jaTemRotacao) {
                        Write-Host "Adicionando marcacao de rotacao: $arquivo"
                        $temp = "$caminho.tmp.mp4"
                        & $ffmpeg -y -display_rotation:0 -90 -i $caminho -c copy $temp 2>$null
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
        ConverterVideosVerticais
        $data = Get-Date -Format "dd/MM/yyyy HH:mm"
        git add media/
        git commit -m "Atualizacao de conteudo - $data"
        git push origin main
    }
    Start-Sleep -Seconds 30
}
