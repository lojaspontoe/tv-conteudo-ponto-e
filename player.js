// TV Signage Player — Ponto E

let playlist = [];
let indiceAtual = 0;
let timerProximo = null;

const elImagem = document.getElementById("player-imagem");
const elVideo  = document.getElementById("player-video");
const elStatus = document.getElementById("status-texto");

async function buscarArquivosDoGitHub() {
  const url = `https://api.github.com/repos/${CONFIG.repositorioGitHub}/contents/${CONFIG.pastaMidia}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
  try {
    const resposta = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: controller.signal,
    });
    if (!resposta.ok) throw new Error(`GitHub API ${resposta.status}`);
    const arquivos = await resposta.json();
    return arquivos
      .filter(f => f.type === "file" && /\.(jpe?g|png|gif|webp|svg|mp4|mov|webm)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map(f => ({
        url: f.download_url,
        tipo: /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name) ? "imagem" : "video",
        nome: f.name,
      }));
  } finally {
    clearTimeout(timeout);
  }
}

async function inicializar() {
  if (playlist.length === 0) mostrarStatus("Carregando...");
  try {
    const novos = await buscarArquivosDoGitHub();
    if (novos.length === 0) {
      mostrarStatus("Nenhum arquivo na pasta media/.");
      setTimeout(inicializar, 30000); // tenta de novo em 30s
      return;
    }
    if (playlist.length === 0) {
      playlist = novos; indiceAtual = 0; ocultarStatus(); exibirAtual();
    } else {
      playlist = novos;
      if (indiceAtual >= playlist.length) indiceAtual = 0;
    }
  } catch (err) {
    console.error(err);
    mostrarStatus("Sem conexão. Tentando novamente...");
    setTimeout(inicializar, 30000); // tenta de novo em 30s
    return;
  }
  setTimeout(inicializar, CONFIG.intervaloAtualizacaoMinutos * 60 * 1000);
}

function exibirAtual() {
  if (!playlist.length) return;
  const item = playlist[indiceAtual];
  item.tipo === "imagem" ? exibirImagem(item) : exibirVideo(item);
}

function exibirImagem(item) {
  const img = new Image();
  img.onload = () => {
    elVideo.pause(); elVideo.style.display = "none";
    elImagem.style.display = "block"; elImagem.src = item.url;
    clearTimeout(timerProximo);
    timerProximo = setTimeout(avancar, CONFIG.duracaoFotoSegundos * 1000);
  };
  img.onerror = () => avancar(); // pula se não conseguir carregar
  img.src = item.url;
}

function exibirVideo(item) {
  elImagem.style.display = "none"; elVideo.style.display = "block";
  elVideo.src = item.url; elVideo.load();
  elVideo.onended = () => avancar();
  elVideo.oncanplaythrough = () => {
    elVideo.play().catch(() => {
      clearTimeout(timerProximo);
      timerProximo = setTimeout(avancar, CONFIG.duracaoVideoSegundos * 1000);
    });
  };
  elVideo.onerror = () => { clearTimeout(timerProximo); timerProximo = setTimeout(avancar, 3000); };
}

function avancar() {
  clearTimeout(timerProximo);
  indiceAtual = (indiceAtual + 1) % playlist.length;
  exibirAtual();
}

function mostrarStatus(msg) { elStatus.textContent = msg; document.getElementById("status-overlay").style.display = "flex"; }
function ocultarStatus()    { document.getElementById("status-overlay").style.display = "none"; }

function preCarregarProximo() {
  if (playlist.length < 2) return;
  const prox = playlist[(indiceAtual + 1) % playlist.length];
  if (prox.tipo === "imagem") { const img = new Image(); img.src = prox.url; }
}
setInterval(preCarregarProximo, 3000);

inicializar();
