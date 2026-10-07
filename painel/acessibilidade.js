/*
 * Painel de Acessibilidade Web
 * --------------------------------------------------------------
 * Componente independente: basta incluir acessibilidade.css e
 * acessibilidade.js em qualquer página HTML. O script cria o botão
 * flutuante, o painel e aplica os recursos adicionando classes no
 * elemento <html>. As preferências ficam salvas no localStorage.
 *
 * Recursos (8):
 *   1. Tamanho do texto (aumentar / diminuir)
 *   2. Alto contraste
 *   3. Fonte legível
 *   4. Espaçamento do texto
 *   5. Destacar links
 *   6. Guia de leitura
 *   7. Leitura em voz alta
 *   8. Pausar animações
 */
(function () {
  'use strict';

  // Evita criar o painel duas vezes se o script for incluído repetido
  if (window.PainelAcessibilidade) return;

  var CHAVE_STORAGE = 'painel-acessibilidade';
  var FONTE_MIN = 80;
  var FONTE_MAX = 200;
  var FONTE_PASSO = 10;

  // Seletor dos elementos que podem ser lidos em voz alta ao clicar
  var SELETOR_LEITURA = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, th, dt, dd, label, summary';

  // Recursos do tipo liga/desliga. O tamanho do texto é tratado à parte
  var RECURSOS = [
    { id: 'contraste', classe: 'a11y-contraste', titulo: 'Alto contraste', icone: '◐' },
    { id: 'fonteLegivel', classe: 'a11y-fonte-legivel', titulo: 'Fonte legível', icone: 'Aa' },
    { id: 'espacamento', classe: 'a11y-espacamento', titulo: 'Espaçamento do texto', icone: '↕' },
    { id: 'links', classe: 'a11y-links', titulo: 'Destacar links', icone: '🔗' },
    { id: 'guia', classe: 'a11y-guia-ativa', titulo: 'Guia de leitura', icone: '▤' },
    { id: 'leitura', classe: 'a11y-leitura', titulo: 'Leitura em voz alta', icone: '🔊' },
    { id: 'semAnimacao', classe: 'a11y-sem-animacao', titulo: 'Pausar animações', icone: '⏸' }
  ];

  var PADRAO = {
    fonte: 100,
    contraste: false,
    fonteLegivel: false,
    espacamento: false,
    links: false,
    guia: false,
    leitura: false,
    semAnimacao: false
  };

  var raiz = document.documentElement;
  var suportaVoz = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var estado = carregarEstado();
  var el = {}; // referências aos elementos do painel

  /* ---------- Persistência ---------- */

  function carregarEstado() {
    var salvo = null;
    try {
      salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
    } catch (e) { /* storage bloqueado ou JSON inválido: usa o padrão */ }

    var inicial = Object.assign({}, PADRAO);
    if (salvo && typeof salvo === 'object') {
      Object.keys(PADRAO).forEach(function (k) {
        if (typeof salvo[k] === typeof PADRAO[k]) inicial[k] = salvo[k];
      });
    } else if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Primeira visita: respeita a preferência do sistema operacional
      inicial.semAnimacao = true;
    }
    inicial.fonte = limitar(inicial.fonte, FONTE_MIN, FONTE_MAX);
    return inicial;
  }

  function salvarEstado() {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
    } catch (e) { /* sem storage: a preferência vale só para esta visita */ }
  }

  function limitar(valor, min, max) {
    return Math.min(max, Math.max(min, valor));
  }

  /* ---------- Montagem da interface ---------- */

  function montar() {
    var container = document.createElement('div');
    container.id = 'a11y-root';

    var cartoes = RECURSOS.map(function (r) {
      return (
        '<button type="button" class="a11y-cartao" data-recurso="' + r.id + '" aria-pressed="false">' +
          '<span class="a11y-icone" aria-hidden="true">' + r.icone + '</span>' +
          '<span class="a11y-nome">' + r.titulo + '</span>' +
          '<span class="a11y-estado" aria-hidden="true">Desligado</span>' +
        '</button>'
      );
    }).join('');

    container.innerHTML =
      '<button type="button" class="a11y-botao" aria-expanded="false" aria-controls="a11y-painel" ' +
        'aria-label="Abrir painel de acessibilidade (Alt + A)" title="Acessibilidade (Alt + A)">' +
        '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false">' +
          '<circle cx="12" cy="4" r="2" fill="currentColor"/>' +
          '<path fill="currentColor" d="M20 8.5c-2.6.6-5.3.9-8 .9s-5.4-.3-8-.9l-.5 1.9c1.9.4 3.8.7 5.7.9V22h2v-5h1.6v5h2V11.3c1.9-.2 3.8-.5 5.7-.9L20 8.5z"/>' +
        '</svg>' +
      '</button>' +
      '<div id="a11y-painel" class="a11y-painel" role="dialog" aria-labelledby="a11y-titulo" hidden>' +
        '<div class="a11y-cabecalho">' +
          '<h2 id="a11y-titulo">Acessibilidade</h2>' +
          '<button type="button" class="a11y-fechar" aria-label="Fechar painel">&times;</button>' +
        '</div>' +
        '<div class="a11y-corpo">' +
          '<div class="a11y-fonte" role="group" aria-labelledby="a11y-fonte-rotulo">' +
            '<span id="a11y-fonte-rotulo" class="a11y-rotulo"><span aria-hidden="true">🔠</span> Tamanho do texto</span>' +
            '<div class="a11y-fonte-controles">' +
              '<button type="button" data-acao="diminuir" aria-label="Diminuir texto">A−</button>' +
              '<output id="a11y-fonte-valor" aria-live="polite">100%</output>' +
              '<button type="button" data-acao="aumentar" aria-label="Aumentar texto">A+</button>' +
            '</div>' +
          '</div>' +
          '<div class="a11y-grade">' + cartoes + '</div>' +
          '<button type="button" class="a11y-redefinir" data-acao="redefinir">Redefinir tudo</button>' +
          '<p class="a11y-dica">Atalho: <kbd>Alt</kbd> + <kbd>A</kbd> abre e fecha · <kbd>Esc</kbd> fecha</p>' +
        '</div>' +
      '</div>' +
      '<div class="a11y-guia" aria-hidden="true"></div>' +
      '<div class="a11y-anuncio" role="status" aria-live="polite"></div>';

    document.body.appendChild(container);

    el.root = container;
    el.botao = container.querySelector('.a11y-botao');
    el.painel = container.querySelector('.a11y-painel');
    el.fechar = container.querySelector('.a11y-fechar');
    el.fonteValor = container.querySelector('#a11y-fonte-valor');
    el.diminuir = container.querySelector('[data-acao="diminuir"]');
    el.aumentar = container.querySelector('[data-acao="aumentar"]');
    el.guia = container.querySelector('.a11y-guia');
    el.anuncio = container.querySelector('.a11y-anuncio');

    if (!suportaVoz) {
      var cartaoVoz = container.querySelector('[data-recurso="leitura"]');
      cartaoVoz.disabled = true;
      cartaoVoz.title = 'Seu navegador não suporta síntese de voz';
      estado.leitura = false;
    }
  }

  /* ---------- Aplicação dos recursos ---------- */

  function aplicarTudo() {
    aplicarFonte();
    RECURSOS.forEach(function (r) { aplicarRecurso(r.id); });
  }

  // 1. Tamanho do texto: altera o font-size do <html>; tudo que usa rem/em acompanha
  function aplicarFonte() {
    raiz.style.fontSize = estado.fonte === 100 ? '' : estado.fonte + '%';
    el.fonteValor.textContent = estado.fonte + '%';
    el.diminuir.disabled = estado.fonte <= FONTE_MIN;
    el.aumentar.disabled = estado.fonte >= FONTE_MAX;
  }

  function aplicarRecurso(id) {
    var recurso = RECURSOS.filter(function (r) { return r.id === id; })[0];
    var ativo = estado[id];

    raiz.classList.toggle(recurso.classe, ativo);

    var cartao = el.root.querySelector('[data-recurso="' + id + '"]');
    cartao.setAttribute('aria-pressed', String(ativo));
    cartao.querySelector('.a11y-estado').textContent = ativo ? 'Ligado' : 'Desligado';

    if (id === 'fonteLegivel' && ativo) carregarFonteLegivel();
    if (id === 'guia') alternarGuia(ativo);
    if (id === 'leitura') alternarLeitura(ativo);
    if (id === 'semAnimacao') alternarAnimacoes(ativo);
  }

  // 3. Fonte legível: carrega a Atkinson Hyperlegible só quando o recurso é usado
  function carregarFonteLegivel() {
    if (document.getElementById('a11y-fonte-link')) return;
    var link = document.createElement('link');
    link.id = 'a11y-fonte-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  // 6. Guia de leitura: faixa horizontal que acompanha o ponteiro
  function moverGuia(evento) {
    var y = evento.touches ? evento.touches[0].clientY : evento.clientY;
    el.guia.style.transform = 'translateY(' + (y - el.guia.offsetHeight / 2) + 'px)';
  }

  function alternarGuia(ativo) {
    if (ativo) {
      document.addEventListener('mousemove', moverGuia);
      document.addEventListener('touchmove', moverGuia, { passive: true });
    } else {
      document.removeEventListener('mousemove', moverGuia);
      document.removeEventListener('touchmove', moverGuia);
    }
  }

  // 7. Leitura em voz alta: clicar num bloco de texto lê o conteúdo (Web Speech API)
  function vozPortugues() {
    var vozes = window.speechSynthesis.getVoices();
    return vozes.filter(function (v) { return v.lang === 'pt-BR'; })[0] ||
      vozes.filter(function (v) { return v.lang.indexOf('pt') === 0; })[0] || null;
  }

  function falar(texto) {
    if (!suportaVoz || !texto) return;
    window.speechSynthesis.cancel();
    var fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    var voz = vozPortugues();
    if (voz) fala.voice = voz;
    fala.rate = 1;
    window.speechSynthesis.speak(fala);
  }

  function aoClicarParaLer(evento) {
    if (el.root.contains(evento.target)) return;

    // Se o usuário selecionou um trecho, lê só a seleção
    var selecao = String(window.getSelection ? window.getSelection() : '').trim();
    if (selecao) { falar(selecao); return; }

    var bloco = evento.target.closest(SELETOR_LEITURA);
    if (bloco) falar(bloco.innerText.trim());
  }

  function alternarLeitura(ativo) {
    if (!suportaVoz) return;
    if (ativo) {
      document.addEventListener('click', aoClicarParaLer);
    } else {
      document.removeEventListener('click', aoClicarParaLer);
      window.speechSynthesis.cancel();
    }
  }

  // 8. Pausar animações: o CSS zera animações/transições; aqui pausamos vídeos
  function alternarAnimacoes(ativo) {
    document.querySelectorAll('video').forEach(function (video) {
      if (ativo) {
        video.dataset.a11yAutoplay = video.autoplay ? '1' : '';
        video.autoplay = false;
        video.pause();
      } else if (video.dataset.a11yAutoplay === '1') {
        video.autoplay = true;
        video.play().catch(function () {});
      }
    });
  }

  /* ---------- Ações ---------- */

  function mudarFonte(delta) {
    var nova = limitar(estado.fonte + delta, FONTE_MIN, FONTE_MAX);
    if (nova === estado.fonte) return;
    estado.fonte = nova;
    aplicarFonte();
    salvarEstado();
  }

  function alternarRecurso(id) {
    estado[id] = !estado[id];
    aplicarRecurso(id);
    salvarEstado();

    var recurso = RECURSOS.filter(function (r) { return r.id === id; })[0];
    var msg = recurso.titulo + (estado[id] ? ' ligado' : ' desligado');
    if (id === 'leitura' && estado[id]) msg += '. Clique em um texto para ouvi-lo.';
    anunciar(msg);
  }

  function redefinir() {
    estado = Object.assign({}, PADRAO);
    aplicarTudo();
    salvarEstado();
    anunciar('Configurações de acessibilidade redefinidas');
  }

  // Mensagem para leitores de tela (região aria-live)
  function anunciar(msg) {
    el.anuncio.textContent = '';
    setTimeout(function () { el.anuncio.textContent = msg; }, 50);
  }

  function abrir() {
    el.painel.hidden = false;
    el.botao.setAttribute('aria-expanded', 'true');
    el.botao.setAttribute('aria-label', 'Fechar painel de acessibilidade (Alt + A)');
    el.fechar.focus();
  }

  function fechar(devolverFoco) {
    if (el.painel.hidden) return;
    el.painel.hidden = true;
    el.botao.setAttribute('aria-expanded', 'false');
    el.botao.setAttribute('aria-label', 'Abrir painel de acessibilidade (Alt + A)');
    if (devolverFoco) el.botao.focus();
  }

  function alternarPainel() {
    if (el.painel.hidden) abrir(); else fechar(true);
  }

  /* ---------- Eventos ---------- */

  function registrarEventos() {
    el.botao.addEventListener('click', alternarPainel);
    el.fechar.addEventListener('click', function () { fechar(true); });

    el.painel.addEventListener('click', function (e) {
      var alvo = e.target.closest('button');
      if (!alvo) return;
      if (alvo.dataset.recurso) alternarRecurso(alvo.dataset.recurso);
      else if (alvo.dataset.acao === 'aumentar') mudarFonte(FONTE_PASSO);
      else if (alvo.dataset.acao === 'diminuir') mudarFonte(-FONTE_PASSO);
      else if (alvo.dataset.acao === 'redefinir') redefinir();
    });

    document.addEventListener('keydown', function (e) {
      if (e.altKey && e.code === 'KeyA') {
        e.preventDefault();
        alternarPainel();
      } else if (e.key === 'Escape' && !el.painel.hidden) {
        fechar(true);
      }
    });

    // Clique fora do painel fecha
    document.addEventListener('click', function (e) {
      if (!el.painel.hidden && !el.root.contains(e.target)) fechar(false);
    });
  }

  /* ---------- Inicialização ---------- */

  function iniciar() {
    montar();
    aplicarTudo();
    registrarEventos();
  }

  // API pública para quem integrar o painel
  window.PainelAcessibilidade = {
    abrir: function () { abrir(); },
    fechar: function () { fechar(false); },
    redefinir: function () { redefinir(); },
    estado: function () { return Object.assign({}, estado); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
