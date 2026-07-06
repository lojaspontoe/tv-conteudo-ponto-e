// TV Signage Player — Ponto E

let playlist = [];
let indiceAtual = 0;
let timerProximo = null;
let camadaAtiva = 'a';

const elImagemA = document.getElementById("player-imagem-a");
const elImagemB = document.getElementById("player-imagem-b");
const elVideo   = document.getElementById("player-video");
const elStatus  = document.getElementById("status-texto");

async function buscarArquivosDoGitHub() {
  const url = `https://api.github.com/repos/${CONFIG.repositorioGitHub}/contents/${CONFIG.pastaMidia}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const resposta = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: controller.signal,
    });
    if (!resposta.ok) throw new Error(`GitHub API ${resposta.status}`);
    const arquivos = await resposta.json();
    return arquivos
      .filter(f => f.type === "file" && /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name))
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
      setTimeout(inicializar, 30000);
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
    setTimeout(inicializar, 30000);
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
  const proxima = camadaAtiva === 'a' ? elImagemB : elImagemA;
  const atual   = camadaAtiva === 'a' ? elImagemA : elImagemB;

  function fazerSlide() {
    elVideo.pause();
    elVideo.classList.remove('ativa');

    proxima.classList.remove('ativa', 'saindo');
    camadaAtiva = camadaAtiva === 'a' ? 'b' : 'a';

    // Timer do loop fora do rAF — garante que nunca para mesmo em TVs
    clearTimeout(timerProximo);
    timerProximo = setTimeout(avancar, CONFIG.duracaoFotoSegundos * 1000);

    // Animação visual via rAF (secundário — só afeta aparência)
    void proxima.offsetWidth;
    requestAnimationFrame(() => {
      proxima.classList.add('ativa');
      atual.classList.remove('ativa');
      atual.classList.add('saindo');
      setTimeout(() => atual.classList.remove('saindo'), 600);
    });
  }

  proxima.onload  = fazerSlide;
  proxima.onerror = () => { clearTimeout(timerProximo); timerProximo = setTimeout(avancar, 1000); };
  proxima.src = item.url;

  if (proxima.complete && proxima.naturalWidth > 0) fazerSlide();
}

function exibirVideo(item) {
  // Esconde as imagens, mostra o vídeo
  elImagemA.classList.remove('ativa');
  elImagemB.classList.remove('ativa');

  elVideo.src = item.url;
  elVideo.load();

  elVideo.oncanplaythrough = () => {
    elVideo.classList.add('ativa');
    elVideo.play().catch(() => {
      clearTimeout(timerProximo);
      timerProximo = setTimeout(avancar, CONFIG.duracaoVideoSegundos * 1000);
    });
  };
  elVideo.onended = () => avancar();
  elVideo.onerror = () => { clearTimeout(timerProximo); timerProximo = setTimeout(avancar, 3000); };
}

function avancar() {
  clearTimeout(timerProximo);
  indiceAtual = (indiceAtual + 1) % playlist.length;
  exibirAtual();
}

function mostrarStatus(msg) {
  elStatus.textContent = msg;
  document.getElementById("status-overlay").style.display = "flex";
}
function ocultarStatus() {
  document.getElementById("status-overlay").style.display = "none";
}

function preCarregarProximo() {
  if (playlist.length < 2) return;
  const prox = playlist[(indiceAtual + 1) % playlist.length];
  if (prox.tipo === "imagem") { const img = new Image(); img.src = prox.url; }
}
setInterval(preCarregarProximo, 3000);

// --- Manter tela ativa (impede sleep / Ambient Mode em qualquer TV) ---

function _iniciarKeepAlive() {
  // Canvas animado → MediaStream → <video> oculto
  // O sistema operacional vê "vídeo tocando" e não dorme
  try {
    const cv = document.createElement('canvas');
    cv.width = 2; cv.height = 2;
    const cx = cv.getContext('2d');
    let t = 0;
    (function tick() {
      cx.fillStyle = (++t % 2) ? '#000000' : '#010101';
      cx.fillRect(0, 0, 2, 2);
      requestAnimationFrame(tick);
    })();
    const kv = document.createElement('video');
    kv.srcObject = cv.captureStream(1);
    kv.muted = true;
    kv.playsInline = true;
    kv.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-999';
    document.body.appendChild(kv);
    kv.play().catch(() => {});
  } catch (_) {}

  // AudioContext silencioso — ativa o mixer de áudio do sistema
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const ac = new AC();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      g.gain.value = 0.0001; // inaudível mas "tocando"
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
    }
  } catch (_) {}

  // Wake Lock API — padrão web quando suportado
  (async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      const wl = await navigator.wakeLock.request('screen');
      wl.addEventListener('release', () => setTimeout(_iniciarKeepAlive, 3000));
    } catch (_) {}
  })();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') _iniciarKeepAlive();
});

_iniciarKeepAlive();

// Recarrega a pagina periodicamente para garantir que nunca rode codigo
// desatualizado (TVs com navegador embutido tendem a cachear agressivamente)
setTimeout(() => location.reload(), 60 * 60 * 1000); // 1 hora

inicializar();
