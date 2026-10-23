/* El puente de «Datos y configuración» de la web nueva (instrucción 138, parte 7). La pantalla es la de la app de hoy, cargada tal cual (datos-*.js, generados por construir-datos.mjs); esta pieza pone las pocas cosas de la app de
   hoy que esa pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se piden el centro, quién entra, los cambios, las comprobaciones, las fechas, los ficheros de Séneca y el estado de la app (aquí, ficheros de
   la carpeta privada que dejó el disparador), qué hacen los botones que están dentro del HTML (esta página no admite código dentro del HTML: se atienden desde aquí) y qué pasa con los que escriben. Solo mira: lo que cambia
   datos (fechas, centro, equipo, cursos, ficheros, actualizar) se cambia en la app de hoy (fila 139). Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_datos-indice.json';
  var IND = null, GENERAL = null, CURSOS = {};

  window.CURSO_VISTO = '';
  window.PESTANA_ACTUAL = 'datos';
  window.MEMORIA_ = {};
  window.MI_CORREO = '';
  window.ESTADO = { centro: { nombre: '' }, miPapel: { rol: 'admin', nombre: '', cargo: '', gestor: '' }, abiertos: [], cerrados: [], proximo: '' };
  window.escapaHtml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  window.escapaAtributo_ = function (t) { return String(t === null || t === undefined ? '' : t).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  window.mensajeDeError = function (e) { return (e && e.message) ? e.message : String(e); };
  window.pintarCabeceraTarea_ = function () {};
  window.cursoVistoInfo_ = function () {
    return window.ESTADO.abiertos.filter(function (c) { return c.curso === window.CURSO_VISTO; })[0] || { curso: window.CURSO_VISTO, estado: 'Cerrado' };
  };

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

  /* Lo que escribe se cambia en la app de hoy: se dice y se da el enlace. */
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
  window.irAPaso_ = function () { soloEnLaApp(); };
  window.irADonde_ = function () { soloEnLaApp(); };
  window.recargarTodoTrasCambio_ = function () {};

  function noPreparado(que) { return new Error('Todavía no está preparado ' + que + ': la aplicación lo deja hecho en su vuelta de cada hora.'); }
  var clon = function (x) { return JSON.parse(JSON.stringify(x === undefined ? null : x)); };

  /* Lo que la pantalla pide con `llamar`: leer es leer los ficheros; cualquier otra cosa escribe y se hace en la app de hoy. */
  function responder(fn, args) {
    var cu = String(args[0] || window.CURSO_VISTO), c = CURSOS[cu] || {};
    var dato = function (v, que) { return v ? Promise.resolve(clon(v)) : Promise.reject(noPreparado(que)); };
    switch (fn) {
      case 'webCentroLeer': return dato(GENERAL && GENERAL.centro, 'el centro');
      case 'webEquipoLeer': {
        var e = clon(GENERAL && GENERAL.equipo);
        if (!e) return Promise.reject(noPreparado('quién entra'));
        var yo = String(window.MI_CORREO || '').toLowerCase();
        e.gestores.forEach(function (g) { g.esElMismo = !!yo && String(g.correo).toLowerCase() === yo; });
        return Promise.resolve(e);
      }
      case 'webCambiosLista': return dato(GENERAL && GENERAL.cambios, 'la lista de cambios');
      case 'webComprobacionesEstado': return dato(GENERAL && GENERAL.comprobaciones, 'las comprobaciones');
      case 'webPortada': return dato(c.portada, 'el estado de la app');
      case 'webDescargasEstado': return dato(c.descargas, 'la lista de ficheros');
      case 'webCalendarioLeer': return dato(c.calendario, 'las fechas del curso');
      case 'webJefaturaYaImportada': return Promise.resolve(true);
      case 'webResolucionPdfGuardado': return Promise.resolve({ hay: false });
      case 'webCentroDatosTraer': return Promise.reject(new Error('solo lectura'));
    }
    soloEnLaApp();
    return Promise.reject(new Error('Esto se cambia en la app de hoy.'));
  }
  window.llamar = function (fn) { return responder(fn, [].slice.call(arguments, 1)); };
  window.llamarAlServidor_ = function (fn, args) { return responder(fn, args || []); };

  /* ---- Los botones que están dentro del HTML de la pantalla de hoy (`onclick="…"`) ---- */
  /* Solo estos mueven la pantalla sin cambiar datos; cualquier otro escribe y no se ejecuta. */
  var LEER = {};
  ['cambiosCambiaFiltro_'].forEach(function (n) { LEER[n] = true; });

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

  /* Ejecuta el texto de un `onclick` o `onchange` de la pantalla de hoy: llamadas a funciones de la pantalla con argumentos sencillos, `return false` y `event.stopPropagation()`. */
  function ejecutar(texto, el, ev) {
    var parar = false;
    partir(texto, ';').forEach(function (frase) {
      frase = frase.trim();
      if (!frase) return;
      if (frase === 'return false') { ev.preventDefault(); return; }
      if (frase === 'event.stopPropagation()') { parar = true; return; }
      var m = /^([A-Za-z_$][\w$]*)\((.*)\)$/.exec(frase);
      if (!m || !LEER[m[1]] || typeof window[m[1]] !== 'function') { soloEnLaApp(); return; }
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
      return !frase || frase === 'return false' || frase === 'event.stopPropagation()' || !!(m && LEER[m[1]]);
    });
  }

  /* Pasa `onclick="…"` a `data-onclick="…"` (la página no admite código dentro del HTML), aplica los estilos apartados y deja quietos los controles que escriben: los botones se esconden, los campos se apagan (el
     estado que enseñan se sigue viendo). Solo se dejan vivos los que miran (los filtros de «Cambios»). */
  function preparar(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-estilo]'), function (el) { el.style.cssText = el.getAttribute('data-estilo'); el.removeAttribute('data-estilo'); });
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
      var vivo = ['data-onclick', 'data-onchange', 'data-oninput'].some(function (a) { return el.hasAttribute(a); }) && !el.hasAttribute('data-escribe');
      if (!vivo) el.disabled = true;
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('#botonesPortada button'), function (b) { b.setAttribute('data-escribe', '1'); });
  }

  var puente = window.DatosPuente = {
    INDICE: INDICE,
    poner: function (indice) {
      IND = indice; CURSOS = {};
      window.ESTADO.abiertos = indice.abiertos || []; window.ESTADO.cerrados = indice.cerrados || []; window.ESTADO.proximo = indice.proximo || ''; window.ESTADO.centro.nombre = indice.centro || '';
      window.MI_CORREO = indice.miCorreo || '';
    },
    indice: function () { return IND; },
    cursos: function () { return (IND && IND.ficheros || []).map(function (f) { return f.curso; }); },
    ficheroDe: function (curso) { return ((IND && IND.ficheros) || []).filter(function (f) { return f.curso === curso; })[0] || null; },
    /* Lo que no depende del curso (se lee una sola vez). */
    cargarGeneral: async function () {
      if (GENERAL) return GENERAL;
      try { GENERAL = await C.leerJson(IND.general.fichero); } catch (e) { throw noPreparado('«Datos y configuración»'); }
      return GENERAL;
    },
    /* Lo de un curso, y deja las fechas donde la pantalla de hoy las espera. */
    cargarCurso: async function (curso) {
      if (CURSOS[curso]) return CURSOS[curso];
      var f = puente.ficheroDe(curso);
      if (!f) throw noPreparado('el curso ' + curso);
      var x;
      try { x = await C.leerJson(f.fichero); } catch (e) { throw noPreparado('el curso ' + curso); }
      CURSOS[curso] = x;
      if (x.calendario) window.MEMORIA_['webCalendarioLeer' + JSON.stringify([curso])] = x.calendario;
      if (x.quienviene) window.MEMORIA_['webQuienViene' + JSON.stringify([curso])] = x.quienviene;
      return x;
    },
    horaDe: function (curso) { var f = puente.ficheroDe(curso); return (f && f.hora) || (IND && IND.hora) || ''; },
    atender: atiende, preparar: preparar, ejecutar: ejecutar
  };
})();
