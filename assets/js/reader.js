/* ═══════════════════════════════════════════════
   reader.js — Motor de leitura genérico
   Histórias para Ler Juntos — tgbhubs.github.io
═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Estado ── */
  var book = null;
  var pageIndex = 0;
  var bookId = '';
  var STORAGE_PREFIX = 'historias.progress.';

  /* ── Elementos DOM ── */
  var elTitle    = document.getElementById('reader-title');
  var elPageNum  = document.getElementById('reader-page-num');
  var elProgress = document.getElementById('reader-progress-bar');
  var elStage    = document.getElementById('reader-stage');

  /* ── Init ── */
  function init() {
    var params = new URLSearchParams(window.location.search);
    bookId = params.get('id') || '';

    if (!bookId) {
      showError('Nenhum livro selecionado.');
      return;
    }

    // Load book.json
    fetch('../assets/books/' + bookId + '/book.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Livro não encontrado: ' + bookId);
        return r.json();
      })
      .then(function (data) {
        book = data;
        document.title = book.titulo + ' — Histórias para Ler Juntos';
        elTitle.textContent = book.titulo;
        // Restore progress
        var saved = loadProgress();
        pageIndex = saved !== null ? saved : 0;
        renderPage(pageIndex);
      })
      .catch(function (err) {
        showError(err.message);
      });
  }

  /* ── Render ── */
  function renderPage(idx) {
    var page = book.paginas[idx];
    if (!page) return;

    // Update bar
    elPageNum.textContent = (idx + 1) + ' / ' + book.paginas.length;
    var pct = ((idx + 1) / book.paginas.length * 100).toFixed(1);
    elProgress.style.width = pct + '%';

    // Save progress
    saveProgress(idx);

    // Build page HTML
    var imgSrc = '../assets/books/' + bookId + '/' + page.imagem;
    var altText = page.titulo || ('Página ' + (idx + 1));

    var participacaoHtml = '';
    if (page.participacao) {
      participacaoHtml = '<div class="reader-panel__participacao">' + escHtml(page.participacao) + '</div>';
    }

    var textHtml = '<div class="reader-panel__text">' + escHtml(page.texto || '') + '</div>';

    var actionsHtml = '';

    if (page.final) {
      actionsHtml = renderFinal();
    } else if (page.choices && page.choices.length) {
      actionsHtml = renderChoices(page.choices);
    } else if (page.next) {
      actionsHtml = '<div class="reader-continue">' +
        '<button class="continue-btn" onclick="goTo(\'' + page.next + '\')">' +
        'Continuar <span aria-hidden="true">→</span>' +
        '</button></div>';
    }

    var pageHtml =
      '<div class="reader-page active" id="current-page">' +
        '<div class="reader-page__img-wrap">' +
          '<img class="reader-page__img" src="' + imgSrc + '" alt="' + escAttr(altText) + '" loading="eager">' +
        '</div>' +
        '<div class="reader-panel">' +
          (page.titulo ? '<div class="reader-panel__chapter">' + escHtml(page.titulo) + '</div>' : '') +
          textHtml +
          participacaoHtml +
          actionsHtml +
        '</div>' +
      '</div>';

    // Transition
    var old = document.getElementById('current-page');
    if (old) {
      old.style.opacity = '0';
      old.style.pointerEvents = 'none';
      setTimeout(function () { old.remove(); }, 360);
    }

    elStage.insertAdjacentHTML('beforeend', pageHtml);
  }

  function renderChoices(choices) {
    var html = '<div class="reader-choices">';
    choices.forEach(function (c) {
      html +=
        '<button class="choice-btn" onclick="goTo(\'' + c.target + '\')">' +
          '<span class="choice-btn__emoji" aria-hidden="true">' + (c.emoji || '✦') + '</span>' +
          '<span class="choice-btn__label">' + escHtml(c.label) + '</span>' +
          '<span class="choice-btn__arrow" aria-hidden="true">→</span>' +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderFinal() {
    var pdfPath = book.pdf
      ? '../assets/books/' + bookId + '/' + book.pdf
      : null;

    var pdfBtn = pdfPath
      ? '<a class="btn btn--ghost btn--sm" href="' + pdfPath + '" download>⬇ Baixar PDF</a>'
      : '';

    return (
      '<div class="reader-final">' +
        '<div class="reader-final__title">✨ Fim da aventura!</div>' +
        '<div class="reader-final__actions">' +
          '<button class="btn btn--primary btn--sm" onclick="restart()">↩ Recomeçar</button>' +
          pdfBtn +
          '<a class="btn btn--ghost btn--sm" href="../livros/">Ver outros livros</a>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── Navigation (global) ── */
  window.goTo = function (pageId) {
    var idx = book.paginas.findIndex(function (p) { return p.id === pageId; });
    if (idx === -1) { console.warn('Página não encontrada:', pageId); return; }
    pageIndex = idx;
    renderPage(pageIndex);
    // Scroll panel to top on mobile
    setTimeout(function () {
      var panel = document.querySelector('.reader-panel');
      if (panel) panel.scrollTop = 0;
    }, 50);
  };

  window.restart = function () {
    clearProgress();
    pageIndex = 0;
    renderPage(0);
  };

  window.exitReader = function () {
    window.location.href = '../livros/';
  };

  /* ── Keyboard ── */
  document.addEventListener('keydown', function (e) {
    if (!book) return;
    if (e.key === 'Escape') window.exitReader();
  });

  /* ── localStorage ── */
  function saveProgress(idx) {
    try { localStorage.setItem(STORAGE_PREFIX + bookId, idx); } catch (e) {}
  }

  function loadProgress() {
    try {
      var v = localStorage.getItem(STORAGE_PREFIX + bookId);
      return v !== null ? parseInt(v, 10) : null;
    } catch (e) { return null; }
  }

  function clearProgress() {
    try { localStorage.removeItem(STORAGE_PREFIX + bookId); } catch (e) {}
  }

  /* ── Utils ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  function escAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function showError(msg) {
    elStage.innerHTML =
      '<div style="color:rgba(255,255,255,.7);text-align:center;padding:40px;font-family:Baloo 2,sans-serif">' +
        '<div style="font-size:3rem;margin-bottom:16px">🌲</div>' +
        '<p>' + escHtml(msg) + '</p>' +
        '<a href="../livros/" style="color:#f59e0b;margin-top:16px;display:inline-block">← Voltar à biblioteca</a>' +
      '</div>';
  }

  /* ── Start ── */
  init();
})();
