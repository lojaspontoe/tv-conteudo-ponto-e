# Sincronizador automatico — verifica mudancas a cada 30 segundos
# Envia arquivos da pasta media/ exatamente como estao, sem nenhuma conversao

$pastaRepo = $PSScriptRoot
Set-Location $pastaRepo

while ($true) {
    $status = git status --porcelain media/
    if ($status) {
        $data = Get-Date -Format "dd/MM/yyyy HH:mm"
        git add media/
        git commit -m "Atualizacao de conteudo - $data"
        git push origin main
    }
    Start-Sleep -Seconds 30
}
