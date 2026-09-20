/* site.js — comportamento condiviso di Virtua Cycling.
   Le traduzioni dei testi dinamici stanno in window.VC_I18N, definito
   dalla pagina prima di caricare questo file. La lingua iniziale è già
   impostata da uno script inline nel <head> (nessun flash). */
(function () {
  'use strict'

  var LANGS = ['it', 'en', 'fr', 'es']
  var KEY = 'vc-lang'
  var root = document.documentElement
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ── Piattaforma: ordina gli store e punta la CTA allo store giusto ─ */
  var ua = navigator.userAgent || ''
  var os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios'
    : /Android/.test(ua) ? 'android' : 'desktop'
  root.setAttribute('data-os', os)
  document.querySelectorAll('[data-store-cta]').forEach(function (a) {
    var href = os === 'ios' ? a.dataset.ios : os === 'android' ? a.dataset.android : ''
    if (href) { a.setAttribute('href', href); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener') }
  })

  /* ── Elementi che compaiono dopo l'hero e spariscono sul download ── */
  document.querySelectorAll('[data-show-after]').forEach(function (el) {
    var trigger = document.querySelector(el.dataset.showAfter)
    var hideOn = el.dataset.hideOn ? document.querySelector(el.dataset.hideOn) : null
    if (!trigger || !('IntersectionObserver' in window)) return
    var past = false, over = false
    function update() { el.classList.toggle('is-visible', past && !over) }
    new IntersectionObserver(function (es) {
      past = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; update()
    }).observe(trigger)
    if (hideOn) new IntersectionObserver(function (es) {
      over = es[0].isIntersecting || es[0].boundingClientRect.bottom < 0; update()  // resta nascosta anche dopo il download
    }).observe(hideOn)
  })

  /* ── Lingua ─────────────────────────────────────────────────── */
  function applyLang(lang) {
    var dict = (window.VC_I18N && (window.VC_I18N[lang] || window.VC_I18N.it)) || {}
    root.lang = lang

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      var on = btn.dataset.setLang === lang
      btn.classList.toggle('active', on)
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
    document.querySelectorAll('[data-key]').forEach(function (el) {
      var v = dict[el.dataset.key]
      if (v != null) el.textContent = v
    })
    document.querySelectorAll('[data-alt]').forEach(function (el) {
      var v = dict[el.dataset.alt]
      if (v != null) el.setAttribute('alt', v)
    })
    if (dict.title) document.title = dict.title
  }

  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.setLang
      applyLang(lang)
      try { localStorage.setItem(KEY, lang) } catch (e) { /* storage non disponibile */ }
    })
  })
  var initial = LANGS.indexOf(root.lang) > -1 ? root.lang : 'it'
  applyLang(initial)

  /* ── Reveal on scroll ───────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal')
  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in-view') })
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            io.unobserve(entry.target)
          }
        })
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
      reveals.forEach(function (el) { io.observe(el) })
    }
  }

  /* ── Tilt 3D sugli elementi [data-tilt] (solo mouse) ────────── */
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (fineHover && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var rect = null
      var max = 8
      el.addEventListener('pointerenter', function () { rect = el.getBoundingClientRect() })
      el.addEventListener('pointermove', function (e) {
        if (!rect) rect = el.getBoundingClientRect()
        var px = (e.clientX - rect.left) / rect.width
        var py = (e.clientY - rect.top) / rect.height
        el.style.transform = 'perspective(800px) rotateX(' + ((0.5 - py) * max * 2) + 'deg) rotateY(' +
          ((px - 0.5) * max * 2) + 'deg) scale(1.03)'
      })
      el.addEventListener('pointerleave', function () { el.style.transform = ''; rect = null })
    })
  }

  /* ── Indice: FAB "torna all'indice" + sezione attiva ────────── */
  var toc = document.getElementById('toc')
  var fab = document.getElementById('tocFab')
  var tocLinks = document.querySelectorAll('.toc a')
  var sections = document.querySelectorAll('.doc .section[id]')
  if ('IntersectionObserver' in window) {
    if (toc && fab) {
      new IntersectionObserver(function (entries) {
        fab.classList.toggle('visible', !entries[0].isIntersecting)
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(toc)
    }
    if (sections.length && tocLinks.length) {
      var linkById = {}
      tocLinks.forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a })
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var link = linkById[entry.target.id]
          if (!link || !entry.isIntersecting) return
          tocLinks.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current') })
          link.classList.add('active')
          link.setAttribute('aria-current', 'true')
        })
      }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 })
      sections.forEach(function (s) { spy.observe(s) })
    }
  }

  /* ── FAQ (supporto) ─────────────────────────────────────────── */
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.closest('.faq-item').classList.toggle('open')
      btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  })
})()
