/* El puente de «Quién viene» de la web nueva (instrucción 138, parte 5). La pantalla es la de la app de hoy, cargada tal cual (quienviene-*.js, generados por construir-quienviene.mjs); esta pieza pone las pocas cosas de la app
   de hoy que esa pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se pide `webQuienViene` (aquí, un fichero de la carpeta privada que dejó el disparador), qué hacen los botones que están dentro del
   HTML (esta página no admite código dentro del HTML: se atienden desde aquí) y qué pasa con los que escriben. Solo lee: lo que cambia datos (no viene, objetivos, sobres, llamadas, lista de espera...) se cambia en la app de hoy
   (fila 139). Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_quienviene-indice.json';
  var IND = null, FICHEROS = {};

  window.CURSO_VISTO = '';
  window.PESTANA_ACTUAL = 'quienviene';
  window.MEMORIA_ = {};
  window.MI_CORREO = '';
  window.ESTADO = { centro: { nombre: '' }, miPapel: { rol: 'lector' }, abiertos: [] };
  window.PANTALLA_ = { hay: true, nueva: true, latidoCaido: false, web: '', subirAqui: { admision: false, planificacion: false } };
  window.ALUMNADO_POR_CLAVE = {};
  window.escapaHtml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  window.escapaAtributo_ = function (t) { return String(t === null || t === undefined ? '' : t).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  window.mensajeDeError = function (e) { return (e && e.message) ? e.message : String(e); };
  window.pantallaNueva_ = function () { return !!window.PANTALLA_.nueva; };
  window.olvidarLecturas_ = function () {};
  window.pintarCabeceraTarea_ = function () {};
  window.datoLimpio_ = function (d) { return String(d || '').replace(/\s+/g, '_').slice(0, 120); };
  window.cursoVistoInfo_ = function () {
    return window.ESTADO.abiertos.filter(function (c) { return c.curso === window.CURSO_VISTO; })[0] || { curso: window.CURSO_VISTO, estado: 'Cerrado' };
  };

  /* Los avisos y errores de la pantalla (donde la de hoy pone `#mensajes`). */
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
  /* Los pasos de la app de hoy (tarea y paso) y la vista de esta página que enseña cada uno; los demás pasos (Datos y configuración...) se hacen en la app de hoy. */
  var VISTAS = { admision: { resolucion: 'resolucion', admitidos: 'solicitudes', esperados: 'esperados' }, matricula: { cursos: 'cursos', llamar: 'aLlamar', sobres: 'sobres', casos: 'casos' }, espera: { lista: 'listaEspera' } };
  window.irAPaso_ = function (tarea, paso) {
    var v = VISTAS[tarea] && VISTAS[tarea][paso];
    if (v && puente.irAVista) puente.irAVista(v); else soloEnLaApp();
  };

  /* Una ficha: la de la web nueva necesita saber la unidad, y de los alumnos de otro curso no se sabe: no abre nada. */
  window.abrirFicha = function () {};

  function noPreparado(que) { return new Error('Todavía no está preparado ' + que + ': la aplicación lo deja hecho en su vuelta de cada hora.'); }

  /* Lo que la pantalla pide con `llamar`: leer `webQuienViene` es leer el fichero; cualquier otra cosa escribe y se hace en la app de hoy. */
  window.llamar = function (fn) {
    var cu = String(arguments[1] || '');
    if (fn === 'webQuienViene') {
      var d = window.MEMORIA_['webQuienViene' + JSON.stringify([cu])];
      return d ? Promise.resolve(d) : Promise.reject(noPreparado('el curso ' + cu));
    }
    soloEnLaApp();
    return Promise.reject(new Error('Esto se cambia en la app de hoy.'));
  };

  /* ---- Los botones que están dentro del HTML de la pantalla de hoy (`onclick="…"`) ---- */
  /* Solo estos mueven la pantalla sin cambiar datos; cualquier otro escribe y no se ejecuta. */
  var LEER = {};
  ['filtrarPanelAvanceQuienViene_', 'cambiarFiltroQuienVieneCurso_', 'cambiarFiltroSobreQuienViene_', 'cambiarFiltroPrevision_', 'cambiarFiltroEstadoQuienViene_', 'cambiarFiltroResolucion_',
    'abrirListaCursoQV_', 'cerrarListaCursoQV_', 'alternarListaSobres_', 'alternarListaProvisionales_', 'alternarListaPrevisiones_', 'alternarListaOtroCurso_', 'abrirListaOtroCurso_',
    'alternarListaResolucion_', 'filtrarPorSobreQuienViene_', 'filtrarPorProvisional_', 'filtrarPorPrevision_', 'filtrarNoEsperadosPanel_', 'abrirFichaOtroCurso_', 'elegirEsperaPorPosicion_',
    'abrirPanelLlamar_'].forEach(function (n) { LEER[n] = true; });

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

  /* Pasa `onclick="…"` a `data-onclick="…"` (la página no admite código dentro del HTML) y deja quietos los controles que escriben: los botones se esconden, los campos se apagan (el estado que enseñan se sigue viendo). */
  function preparar(raiz) {
    var nodos = raiz.querySelectorAll('[onclick],[onchange],[oninput]');
    Array.prototype.forEach.call(nodos, function (el) {
      var escribe = false;
      EVENTOS.forEach(function (tipo) {
        var t = el.getAttribute('on' + tipo);
        if (t === null) return;
        el.removeAttribute('on' + tipo);
        el.setAttribute('data-on' + tipo, t);
        var m = /^\s*([A-Za-z_$][\w$]*)\(/.exec(t);
        if (!(m && LEER[m[1]]) && t.trim() !== 'event.stopPropagation()') escribe = true;
      });
      if (!escribe) return;
      el.setAttribute('data-escribe', '1');
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') el.disabled = true;
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('input:not([data-on' + 'change]):not([data-oninput]), textarea, select:not([data-onchange])'), function (el) { el.disabled = true; });
  }

  var puente = window.QuienVienePuente = {
    INDICE: INDICE,
    poner: function (indice) { IND = indice; FICHEROS = {}; (indice.cursos || []).forEach(function (c) { FICHEROS[c.curso] = c; }); window.ESTADO.abiertos = indice.abiertos || []; window.ESTADO.centro.nombre = indice.centro || ''; window.MI_CORREO = indice.miCorreo || ''; },
    indice: function () { return IND; },
    ficheros: function () { return FICHEROS; },
    /* Lee el fichero de un curso y lo deja donde la pantalla de hoy lo espera. */
    cargarCurso: async function (curso) {
      var f = FICHEROS[curso];
      if (!f) throw noPreparado('el curso ' + curso);
      var x;
      try { x = await C.leerJson(f.fichero); } catch (e) { throw noPreparado('el curso ' + curso); }
      window.MEMORIA_['webQuienViene' + JSON.stringify([curso])] = x.qv;
      if (x.calendario) window.MEMORIA_['webCalendarioLeer' + JSON.stringify([curso])] = x.calendario;
      return x;
    },
    atender: atiende, preparar: preparar, ejecutar: ejecutar,
    irAVista: null   // la pone quienviene.js: cambia de paso
  };
})();
