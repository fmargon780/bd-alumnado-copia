/* Piezas comunes de la ficha de la web nueva (instrucción 136): construir elementos uno a uno (la página no admite código dentro del HTML), los campos de siempre,
   el enlace «Cambiar en la app de hoy», el texto que se copia y el reparto de los ficheros por trozos (la misma cuenta que hace el disparador, FichaWeb.gs). Solo lee. */
(function (raiz) {
  'use strict';
  var PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'van', 'von', 'di', 'el'];

  /* h('div', 'clase', [hijos]): un hijo puede ser texto, un elemento, o null (se salta). */
  function h(etiqueta, clase, hijos) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    (hijos == null ? [] : [].concat(hijos)).forEach(function (x) {
      if (x == null || x === false) return;
      e.appendChild(typeof x === 'object' ? x : document.createTextNode(String(x)));
    });
    return e;
  }
  function p(hijos, clase) { return h('p', clase, hijos); }
  function campo(etiqueta, valor) { return p([h('span', 'campo', etiqueta + ':'), ' ' + (valor === '' || valor == null ? '?' : valor)]); }
  function recuadro(titulo, hijos, clase) { return h('div', 'ficha-recuadro' + (clase ? ' ' + clase : ''), [h('h3', '', titulo)].concat(hijos)); }

  /* El mismo reparto que FichaWeb.gs (fichaWebTrozo_): una cuenta sencilla sobre las letras. */
  function trozo(texto, n) {
    var t = String(texto == null ? '' : texto), x = 5381;
    for (var i = 0; i < t.length; i++) x = (Math.imul(x, 33) + t.charCodeAt(i)) >>> 0;
    return x % n;
  }

  function mayusculaInicial(palabra) { return palabra.replace(/(^|[-'’])([^-'’])/g, function (m, pre, c) { return pre + c.toUpperCase(); }); }
  function nombrePropio(t) {
    return String(t == null ? '' : t).toLowerCase().split(/\s+/).filter(Boolean).map(function (w, i) { return (i > 0 && PARTICULAS.indexOf(w) !== -1) ? w : mayusculaInicial(w); }).join(' ');
  }
  /* «DE LA CRUZ GÓMEZ, MARÍA DEL CARMEN» -> «De la Cruz Gómez, María del Carmen», más el número: lo mismo que copia la ficha de hoy. */
  function textoNombreNumero(nombre, id) {
    var t = String(nombre == null ? '' : nombre).trim(), coma = t.indexOf(','), i = String(id == null ? '' : id).trim();
    var n = coma === -1 ? nombrePropio(t) : nombrePropio(t.slice(0, coma)) + ', ' + nombrePropio(t.slice(coma + 1));
    return n + (i ? ' ' + i : '');
  }
  function copiarTexto(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function cajaCopiar(nombre, id) {
    var texto = textoNombreNumero(nombre, id);
    var campoTexto = h('input'), boton = h('button', '', 'Copiar');
    campoTexto.type = 'text'; campoTexto.readOnly = true; campoTexto.value = texto;
    boton.type = 'button';
    var volver = function () { setTimeout(function () { boton.textContent = 'Copiar'; }, 1500); };
    var copiado = function () { boton.textContent = 'Copiado ✓'; volver(); };
    var noPude = function () { campoTexto.focus(); campoTexto.select(); boton.textContent = 'Selecciónalo y copia'; volver(); };
    var copiar = function () {
      if (copiarTexto(texto)) { copiado(); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(copiado, noPude); else noPude();
    };
    campoTexto.addEventListener('click', copiar);
    boton.addEventListener('click', copiar);
    return h('div', 'copiar-nn', [h('span', 'copiar-et', 'Para asuntos y ficheros'), campoTexto, boton]);
  }

  /* El enlace a la ficha del alumno en la app de hoy (la web nueva solo lee: escribir se hace allí). */
  function enlaceApp(ctx, texto, clase) {
    var a = h('a', clase || 'cambiar-app', texto || 'Cambiar en la app de hoy');
    if (ctx.urlApp) a.href = ctx.urlApp + (ctx.urlApp.indexOf('?') === -1 ? '?' : '&') + 'ficha=' + encodeURIComponent(ctx.clave) + (ctx.antiguo ? '&antiguo=1' : '');
    a.target = '_blank'; a.rel = 'noopener';
    return a;
  }
  function filaCambiar(ctx) { return h('div', 'fila-cambiar', [enlaceApp(ctx)]); }

  function fecha(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES'); }
  function esBachillerato(a) { return /BACH/i.test(String(a.curso || '')); }

  raiz.FichaBase = { h: h, p: p, campo: campo, recuadro: recuadro, trozo: trozo, textoNombreNumero: textoNombreNumero, cajaCopiar: cajaCopiar, enlaceApp: enlaceApp, filaCambiar: filaCambiar, fecha: fecha, esBachillerato: esBachillerato };
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.FichaBase;
})(typeof window !== 'undefined' ? window : globalThis);
