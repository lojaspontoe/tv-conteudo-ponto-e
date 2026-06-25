# Sincronizador automatico da pasta media/
# Fica rodando em segundo plano e faz commit+push quando detecta mudancas

$pastaMedia = "$PSScriptRoot\media"
$pastaRepo  = $PSScriptRoot

Write-Host "Monitorando pasta: $pastaMedia" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar." -ForegroundColor Gray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path   = $pastaMedia
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents   = $true

$mudancaDetectada = $false
$timerDebounce    = $null

$acao = {
    $script:mudancaDetectada = $true
}

Register-ObjectEvent $watcher "Created" -Action $acao | Out-Null
Register-ObjectEvent $watcher "Deleted" -Action $acao | Out-Null
Register-ObjectEvent $watcher "Renamed" -Action $acao | Out-Null

while ($true) {
    Start-Sleep -Seconds 5

    if ($mudancaDetectada) {
        $mudancaDetectada = $false

        Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Mudanca detectada. Aguardando 15s para garantir que o upload terminou..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Enviando para o servidor..." -ForegroundColor Cyan

        Set-Location $pastaRepo
        git add media/
        $status = git status --porcelain
        if ($status) {
            $data = Get-Date -Format "dd/MM/yyyy HH:mm"
            git commit -m "Atualizacao de conteudo - $data"
            git push origin main

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pronto! TV vai atualizar em ~2 minutos." -ForegroundColor Green
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Nenhuma alteracao para enviar." -ForegroundColor Gray
        }
    }
}
