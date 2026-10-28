/* El puente de «Documentos» de la web nueva (instrucción 140, parte 1). La pantalla es la de la app de hoy, cargada tal cual (documentos-*.js, generados por construir-documentos.mjs); esta pieza pone las pocas cosas de la app
   de hoy que esa pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se pide el estado de los documentos y el de la cola de generación (aquí, ficheros de la carpeta privada que deja la aplicación:
   `_documentos-indice.json` y `_documentos-<curso>.json`, DocumentosWeb.gs), qué hacen los botones que están dentro del HTML (esta página no admite código dentro del HTML: se atienden desde aquí) y qué pasa con los que escriben.
   Si la aplicación ha preparado las subcarpetas de peticiones (`activarEscritura`), «Generar lo que falta», «Seguir», guardar un tutor, «Enviar a los tutores», el texto de las hojas y «Revisado, no es error» de los avisos de
   los informes se escriben aquí: `llamar` deja una petición (escritura.js), espera a que la aplicación la aplique, vuelve a leer los ficheros (que la aplicación ha rehecho antes de contestar) y contesta con lo que
   contestó la función de hoy; la pantalla de hoy sigue como siempre. Los PDF los hace la aplicación con la cola de siempre. Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_documentos-indice.json';
  var PARADA_MS = 10 * 60 * 1000;   // igual que DOC_PARADA_MS_ de DocumentosEstado.gs
  var IND = null, CONTROL = null;
  /* Lo que se puede escribir desde aquí (nombre de la función de hoy -> cuántos argumentos lleva; el servidor lo vuelve a comprobar). */
  var ESCRIBE = { webDocumentosGenerarLoQueFalta: 2, webDocumentosVolverAGenerar: 2, webDocumentosSeguir: 0, webDocumentosTutorGuardar: 5, webDocumentosEnviarPreguntar: 1, webDocumentosEnviar: 2, webPlantillaGuardar: 2, webRevisionMarcar: 4, webRevisionDeshacer: 3 };
  /* Las funciones de la pantalla que guardan algo por `llamar` (con la escritura activada están vivas) y las que solo mueven la pantalla. */
  var UI_ESCRIBE = { guardarTextoHojas_: 1, documentosGuardarTutor: 1, documentosVolverAGenerar: 1, avisoInformeMarcar_: 1, avisoInformeDeshacer_: 1 };
  var LEER = { abrirTextoHojas_: 1, cerrarTextoHojas_: 1, cambiaTextoHojas_: 1, irAPaso_: 1 };
  var CAMPOS = '[id^="docNombre_"], [id^="docCorreo_"], [id^="docTrato_"]';   // los campos que se pueden guardar

  window.CURSO_VISTO = '';
  window.PESTANA_ACTUAL = 'documentos';
  window.MEMORIA_ = {};
  window.MI_CORREO = '';
  window.PASO_DOCUMENTOS_WEB = 'documentos';
  window.TAREA_ACTUAL = { clave: 'inicio' };
  window.pasoActual_ = function () { return { clave: window.PASO_DOCUMENTOS_WEB }; };
  window.escapaHtml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  window.escapaAtributo_ = function (t) { return String(t === null || t === undefined ? '' : t).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  window.mensajeDeError = function (e) { return (e && e.message) ? e.message : String(e); };
  window.fraseDatos_ = function (t) { return t; };
  window.datoHoy_ = function (fn, curso) { return window.MEMORIA_[fn + JSON.stringify([curso])]; };
  window.olvidarLecturas_ = function (prefijos) {
    if (prefijos === '*' || prefijos === undefined) { window.MEMORIA_ = {}; return; }
    Object.keys(window.MEMORIA_).forEach(function (k) { if (prefijos.some(function (p) { return k.indexOf(p) === 0; })) delete window.MEMORIA_[k]; });
  };
  window.pintarCabeceraTarea_ = function () {};   // la sustituye documentos.js

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

  /* La cola de generación tal como está ahora: el índice dice cómo estaba al escribirlo y, desde entonces, el reloj sigue. */
  function generacionAhora() {
    var g = clon((IND && IND.generacion) || { enCurso: false });
    var ahora = Date.now();
    g.ahora = ahora;
    g.sinAvanzarMs = g.enCurso && g.latido ? Math.max(0, ahora - g.latido) : 0;
    g.parada = !!g.enCurso && g.sinAvanzarMs > PARADA_MS;
    return g;
  }

  /* Vuelve a leer el índice (la cola de generación y qué ficheros hay). */
  async function leerIndice() {
    try { IND = await C.leerJson(INDICE); } catch (e) { throw noPreparado('«Documentos»'); }
    return IND;
  }

  /* El estado de un curso, como lo da `webDocumentosEstado` de hoy: el fichero del curso más la cola de generación del índice. */
  async function estadoDe(curso) {
    await leerIndice();
    var f = puente.ficheroDe(curso);
    if (!f) throw noPreparado('el curso ' + curso);
    var x;
    try { x = await C.leerJson(f.fichero); } catch (e) { throw noPreparado('el curso ' + curso); }
    if (!x.estado) throw noPreparado('los documentos del curso ' + curso);
    var e = clon(x.estado);
    e.generacion = generacionAhora();
    window.MEMORIA_['webDocumentosEstado' + JSON.stringify([curso])] = e;
    puente.ultimaHora = x.hora || '';
    puente.plantilla = x.plantilla || null;
    return e;
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
    switch (fn) {
      case 'webDocumentosEstado': return estadoDe(cu);
      case 'webDocumentosEstadoGeneracion': return leerIndice().then(generacionAhora);
      /* La cola sigue sola con su disparador: la web nueva no necesita empujarla. */
      case 'webDocumentosEmpujar': return Promise.resolve({ ok: true, nada: true });
      case 'webPlantillaLeer': return estadoDe(cu).then(function () { return puente.plantilla ? clon(puente.plantilla) : Promise.reject(noPreparado('el texto de las hojas')); });
    }
    soloEnLaApp();
    return Promise.reject(new Error('Esto se cambia en la app de hoy.'));
  }
  window.llamar = function (fn) { return responder(fn, [].slice.call(arguments, 1)); };
  window.llamarAlServidor_ = function (fn, args) { return responder(fn, args || []); };

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

  /* Ejecuta el texto de un `onclick` o `oninput` de la pantalla de hoy: llamadas a funciones de la pantalla con argumentos sencillos, `return false` y `event.stopPropagation()`. */
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
        /* Los enlaces que eran `javascript:void(0)` no navegan. */
        if (tipo === 'click' && ev.target.closest && ev.target.closest('a[data-sinir]')) ev.preventDefault();
        /* Como el navegador con un `onclick` de verdad: del elemento pulsado hacia arriba, hasta que alguno pare la subida. */
        for (var el = ev.target; el && el !== raiz.parentNode; el = el.parentNode) {
          var t = el.getAttribute ? el.getAttribute('data-on' + tipo) : null;
          if (t !== null && ejecutar(t, el, ev)) break;
        }
      });
    });
    /* El desplegable «Abrir…» de un documento con varias unidades abre el PDF elegido en otra pestaña. */
    raiz.addEventListener('change', function (ev) {
      var s = ev.target;
      if (s && s.getAttribute && s.getAttribute('data-abrir') !== null && s.value) { window.open(s.value, '_blank', 'noopener'); s.value = ''; }
    });
    /* Los avisos de los informes recuerdan si estaban abiertos (`ontoggle` de la pantalla de hoy). `toggle` no sube: se escucha al bajar. */
    raiz.addEventListener('toggle', function (ev) {
      var d = ev.target;
      if (d && d.closest && d.closest('#avisosInformesDoc')) window.AVISOS_INFORMES_ABIERTO_ = !!d.open;
    }, true);
  }

  function soloMira(t) {
    return partir(t, ';').every(function (frase) {
      frase = frase.trim();
      var m = /^([A-Za-z_$][\w$]*)\(/.exec(frase);
      return !frase || frase === 'return false' || frase === 'event.stopPropagation()' || !!(m && vivo(m[1]));
    });
  }

  /* Pasa `onclick="…"` a `data-onclick="…"` (la página no admite código dentro del HTML), aplica los estilos apartados y deja quietos los controles que escriben: los botones se esconden, los campos se apagan (el
     estado que enseñan se sigue viendo). Con la escritura activada quedan vivos los campos de los tutores y los botones que guardan. */
  function preparar(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-estilo]'), function (el) { el.style.cssText = el.getAttribute('data-estilo'); el.removeAttribute('data-estilo'); });
    Array.prototype.forEach.call(raiz.querySelectorAll('a[href^="javascript:"]'), function (a) { a.setAttribute('href', '#'); a.setAttribute('data-sinir', '1'); });
    Array.prototype.forEach.call(raiz.querySelectorAll('[ontoggle]'), function (el) { el.removeAttribute('ontoggle'); });
    Array.prototype.forEach.call(raiz.querySelectorAll('select[onchange]'), function (s) {
      if (/window\.open\(this\.value/.test(s.getAttribute('onchange'))) { s.removeAttribute('onchange'); s.setAttribute('data-abrir', '1'); }
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('[onclick],[onchange],[oninput],[onkeydown]'), function (el) {
      var escribe = false;
      el.removeAttribute('onkeydown');
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
      var activo = el.hasAttribute('data-abrir') || (['data-onclick', 'data-onchange', 'data-oninput'].some(function (a) { return el.hasAttribute(a); }) && !el.hasAttribute('data-escribe')) || !!(CONTROL && el.matches(CAMPOS));
      if (!activo) el.disabled = true;
    });
  }

  var puente = window.DocumentosPuente = {
    INDICE: INDICE, ultimaHora: '', plantilla: null,
    /* Activa la escritura con el control de escritura.js (la aplicación ha preparado las subcarpetas de peticiones). */
    activarEscritura: function (control) { CONTROL = control; },
    escribe: function () { return !!CONTROL; },
    pedir: function (fn, args) { return CONTROL.pedir(fn, args); },
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
