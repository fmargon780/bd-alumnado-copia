/* El puente de «Tránsito» de Jefatura de la web nueva (instrucción 149, parte 2). La pantalla es la de la app de hoy, cargada tal cual (transito-pantalla.js, generado por construir-transito.mjs); esta pieza pone las pocas cosas de
   la app de hoy que esa pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se pide cada lista (aquí, ficheros de la carpeta privada que deja la aplicación: `_transito-indice.json` y
   `_transito-<curso>.json`, TransitoWeb.gs), qué hacen los botones que están dentro del HTML (esta página no admite código dentro del HTML: se atienden desde aquí) y qué pasa con los que escriben.
   Si la aplicación ha preparado las subcarpetas de peticiones (`activarEscritura`), dar de alta o de baja a un tutor, reenviarle el correo, guardar el plazo, mandar un recordatorio y aprobar una ficha se escriben aquí: `llamar`
   deja una petición (escritura.js), espera a que la aplicación la aplique, vuelve a leer los ficheros (que la aplicación ha rehecho antes de contestar) y contesta con lo que contestó la función de hoy. La pantalla de los
   tutores de 6º (Transito.html) sigue en la app de Google. Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_transito-indice.json';
  var IND = null, CONTROL = null;
  /* Lo que se puede escribir desde aquí (nombre de la función de hoy -> cuántos argumentos lleva sin el correo, que pone la aplicación; el servidor lo vuelve a comprobar). */
  var ESCRIBE = { webTransitoTutorAlta: 1, webTransitoTutorBaja: 1, webTransitoTutorReenviar: 2, webTransitoPlazoGeneral: 2, webTransitoPlazoReabrir: 3, webTransitoRecordatorio: 2, webTransitoAprobar: 4 };
  /* Las funciones de la pantalla que guardan algo por `llamar` (con la escritura activada están vivas) y las que solo mueven la pantalla. */
  var UI_ESCRIBE = { transitoGuardarPlazoGeneral: 1, transitoTutorAlta: 1, transitoTutorBaja: 1, enviarReenvioCorreo_: 1, transitoRecordatorio: 1, transitoAprobarFicha: 1 };
  var LEER = { transitoReenviarCorreo: 1, cerrarReenviarCorreo_: 1, transitoAbrirRevision: 1, cerrarFicha: 1 };
  /* La lectura de hoy -> la parte del fichero del curso que la guarda. */
  var LECTURAS = { webTransitoColegiosEsperados: 'colegios', webTransitoTutoresListar: 'tutores', webTransitoSeguimiento: 'seguimiento', webTransitoBandeja: 'bandeja' };

  window.CURSO_VISTO = '';
  window.MI_CORREO = '';
  window.escapaHtml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  window.escapaAtributo_ = function (t) { return String(t === null || t === undefined ? '' : t).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  window.mensajeDeError = function (e) { return (e && e.message) ? e.message : String(e); };

  /* Esta página no admite estilos dentro del HTML (`style="…"`): la pantalla de hoy los trae en el HTML que pinta, así que antes de ponerlo se guardan en `data-estilo` y `preparar` los aplica por el estilo del propio elemento. */
  var INNER = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true, enumerable: INNER.enumerable, get: INNER.get,
    set: function (h) { INNER.set.call(this, typeof h === 'string' ? h.replace(/(\s)style=(["'])/g, '$1data-estilo=$2') : h); }
  });

  window.avisar = function (texto, clase) {
    var m = document.getElementById('mensajes');
    if (!m) return;
    m.textContent = '';
    var d = document.createElement('div');
    d.className = clase || 'aviso';
    d.textContent = texto;
    m.appendChild(d);
  };
  window.limpiarAviso = function () { var m = document.getElementById('mensajes'); if (m) m.textContent = ''; };
  window.cerrarFicha = function () { document.getElementById('modalFicha').classList.add('oculto'); };

  /* Lo que escribe y no está activado se cambia en la app de hoy: se dice y se da el enlace. */
  function soloEnLaApp() {
    var m = document.getElementById('mensajes');
    if (!m) return;
    m.textContent = '';
    var d = document.createElement('div');
    d.className = 'aviso';
    d.appendChild(document.createTextNode('Esto se cambia en la app de hoy. '));
    if (IND && IND.urlApp) {
      var a = document.createElement('a');
      a.href = IND.urlApp; a.target = '_blank'; a.rel = 'noopener'; a.className = 'cambiar-app';
      a.textContent = 'Cambiar en la app de hoy';
      d.appendChild(a);
    }
    m.appendChild(d);
  }

  function noPreparado(que) { return new Error('Todavía no está preparado ' + que + ': la aplicación lo deja hecho en su vuelta de cada hora.'); }
  var clon = function (x) { return JSON.parse(JSON.stringify(x === undefined ? null : x)); };

  /* Vuelve a leer el índice (qué cursos hay y cuándo se rehicieron). */
  async function leerIndice() {
    try { IND = await C.leerJson(INDICE); } catch (e) { throw noPreparado('«Tránsito»'); }
    return IND;
  }

  /* Una parte del fichero de un curso, como la daba la función de hoy. Cada lectura vuelve al fichero: tras una escritura la aplicación lo ha rehecho antes de contestar. */
  async function leerParte(curso, parte) {
    await leerIndice();
    var f = puente.ficheroDe(curso);
    if (!f) throw noPreparado('el curso ' + curso);
    var x;
    try { x = await C.leerJson(f.fichero); } catch (e) { throw noPreparado('el curso ' + curso); }
    if (x[parte] === null || x[parte] === undefined) throw noPreparado('el tránsito del curso ' + curso);
    return clon(x[parte]);
  }

  /* Lo que la pantalla pide con `llamar`: leer es leer los ficheros; escribir deja una petición. */
  function responder(fn, args) {
    var cu = String(args[0] || window.CURSO_VISTO);
    if (Object.prototype.hasOwnProperty.call(ESCRIBE, fn)) {
      if (!CONTROL) { soloEnLaApp(); return Promise.reject(new Error('Esto se cambia en la app de hoy.')); }
      var n = ESCRIBE[fn], enviados = args.slice(0, n);
      while (enviados.length < n) enviados.push(null);
      return CONTROL.pedir(fn, enviados).then(function (e) {
        if (e.estado !== 'hecha') throw new Error(e.error || 'No se ha podido guardar.');
        var resultado = clon(e.resultado);
        return leerIndice().then(function () { return resultado; }, function () { return resultado; });
      });
    }
    if (Object.prototype.hasOwnProperty.call(LECTURAS, fn)) return leerParte(cu, LECTURAS[fn]);
    soloEnLaApp();
    return Promise.reject(new Error('Esto se cambia en la app de hoy.'));
  }
  window.llamar = function (fn) { return responder(fn, [].slice.call(arguments, 1)); };

  /* ---- Los botones que están dentro del HTML de la pantalla de hoy (`onclick="…"`) ---- */
  function vivo(n) { return !!(LEER[n] || (CONTROL && UI_ESCRIBE[n])); }   // con escritura activada, también las que guardan por `llamar`

  /* Parte un texto por un separador que no esté entre comillas simples. */
  function partir(texto, sep) {
    var salida = [], actual = '', dentro = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto.charAt(i);
      if (dentro && c === '\\') { actual += c + texto.charAt(++i); continue; }
      if (c === "'") dentro = !dentro;
      if (c === sep && !dentro) { salida.push(actual); actual = ''; } else actual += c;
    }
    salida.push(actual);
    return salida;
  }

  function valor(token, el, ev) {
    token = token.trim();
    if (token === 'this') return el;
    if (token === 'this.value') return el.value;
    if (token === 'this.checked') return el.checked;
    if (token === 'event') return ev;
    if (token === 'true') return true;
    if (token === 'false') return false;
    if (token === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    if (token.charAt(0) === "'" && token.charAt(token.length - 1) === "'") return token.slice(1, -1).replace(/\\(.)/g, '$1');
    throw new Error('no entiendo ' + token);
  }

  /* Ejecuta el texto de un `onclick` de la pantalla de hoy: llamadas a funciones de la pantalla con argumentos sencillos, `return false` y `event.stopPropagation()`. */
  function ejecutar(texto, el, ev) {
    var parar = false;
    partir(texto, ';').forEach(function (frase) {
      frase = frase.trim();
      if (!frase) return;
      if (frase === 'return false') { ev.preventDefault(); return; }
      if (frase === 'event.stopPropagation()') { parar = true; return; }
      var m = /^([A-Za-z_$][\w$]*)\((.*)\)$/.exec(frase);
      if (!m || !vivo(m[1]) || typeof window[m[1]] !== 'function') { soloEnLaApp(); return; }
      var args;
      try { args = m[2].trim() === '' ? [] : partir(m[2], ',').map(function (t) { return valor(t, el, ev); }); } catch (e) { soloEnLaApp(); return; }
      window[m[1]].apply(null, args);
    });
    return parar;
  }

  var EVENTOS = ['click', 'change', 'input'];
  function atiende(raiz) {
    EVENTOS.forEach(function (tipo) {
      raiz.addEventListener(tipo, function (ev) {
        /* Como el navegador con un `onclick` de verdad: del elemento pulsado hacia arriba, hasta que alguno pare la subida. */
        for (var el = ev.target; el && el !== raiz.parentNode; el = el.parentNode) {
          var t = el.getAttribute ? el.getAttribute('data-on' + tipo) : null;
          if (t !== null && ejecutar(t, el, ev)) break;
        }
      });
    });
  }

  function soloMira(t) {
    return partir(t, ';').every(function (frase) {
      frase = frase.trim();
      var m = /^([A-Za-z_$][\w$]*)\(/.exec(frase);
      return !frase || frase === 'return false' || frase === 'event.stopPropagation()' || !!(m && vivo(m[1]));
    });
  }

  /* Pasa `onclick="…"` a `data-onclick="…"` (la página no admite código dentro del HTML), aplica los estilos apartados y deja quietos los controles que escriben: los botones se esconden, los campos se apagan (el
     estado que enseñan se sigue viendo). Con la escritura activada quedan vivos todos los campos y botones de Tránsito. */
  function preparar(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-estilo]'), function (el) { el.style.cssText = el.getAttribute('data-estilo'); el.removeAttribute('data-estilo'); });
    Array.prototype.forEach.call(raiz.querySelectorAll('[onclick],[onchange],[oninput]'), function (el) {
      var escribe = false;
      EVENTOS.forEach(function (tipo) {
        var t = el.getAttribute('on' + tipo);
        if (t === null) return;
        el.removeAttribute('on' + tipo);
        el.setAttribute('data-on' + tipo, t);
        if (!soloMira(t)) escribe = true;
      });
      if (escribe) el.setAttribute('data-escribe', '1');
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('input, select, textarea'), function (el) {
      if (el.closest('#modalReenviarCorreo') || el.closest('#modalFicha')) { if (!CONTROL) el.disabled = true; return; }
      if (!CONTROL) el.disabled = true;
    });
  }

  var puente = window.TransitoPuente = {
    INDICE: INDICE,
    /* Activa la escritura con el control de escritura.js (la aplicación ha preparado las subcarpetas de peticiones). */
    activarEscritura: function (control) { CONTROL = control; },
    escribe: function () { return !!CONTROL; },
    poner: function (indice) {
      IND = indice;
      window.MI_CORREO = indice.miCorreo || '';
    },
    leerIndice: leerIndice,
    indice: function () { return IND; },
    cursos: function () { return (IND && IND.ficheros || []).map(function (f) { return f.curso; }); },
    ficheroDe: function (curso) { return ((IND && IND.ficheros) || []).filter(function (f) { return f.curso === curso; })[0] || null; },
    horaDe: function (curso) { var f = puente.ficheroDe(curso); return (f && f.hora) || (IND && IND.hora) || ''; },
    atender: atiende, preparar: preparar, ejecutar: ejecutar, soloEnLaApp: soloEnLaApp
  };
})();
