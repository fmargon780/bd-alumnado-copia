/* El puente de «Quién viene» de la web nueva (instrucción 138, parte 5). La pantalla es la de la app de hoy, cargada tal cual (quienviene-*.js, generados por construir-quienviene.mjs); esta pieza pone las pocas cosas de la app
   de hoy que esa pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se pide `webQuienViene` (aquí, un fichero de la carpeta privada que dejó el disparador), qué hacen los botones que están dentro del
   HTML (esta página no admite código dentro del HTML: se atienden desde aquí) y qué pasa con los que escriben.
   Instrucción 139, parte 3: si la aplicación ha preparado las subcarpetas de peticiones (`activarEscritura`), lo que cambia datos (no viene, «Repetirá», objetivos, sobres, provisionales, resolución de admisión,
   llamadas y lista de espera, otro curso, falta de optativas) se escribe aquí: `llamar` deja una petición (escritura.js), espera a que la aplicación la aplique, vuelve a leer el fichero del curso (que la aplicación rehace
   con la lectura de verdad ANTES de contestar) y contesta con lo que contestó la función de hoy. La pantalla de hoy sigue como siempre: casi todo lo guarda «sin esperar», cambiando la pantalla al momento. Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_quienviene-indice.json';
  var IND = null, FICHEROS = {}, CONTROL = null;
  /* Lo que se puede escribir desde aquí (función de hoy -> cuántos argumentos lleva; el servidor lo vuelve a comprobar) y las funciones de la pantalla que lo piden. */
  var ESCRIBE = { webContactoGuardar: 4, webEsperaGuardar: 3, webNotaBorrar: 1, webObjetivoGuardar: 4, webOtroCursoDeshacer: 2, webOtroCursoMismo: 4, webOtroCursoRevisado: 3, webPlanificacionDeshacerFalta: 3, webPlanificacionGuardarFalta: 4,
    webPlanificacionQuitarRevisado: 2, webPlanificacionRevisado: 3, webProvisionalDeshacerEmparejar: 2, webProvisionalEmparejar: 3, webQuienVieneDeshacerNoViene: 2, webQuienVieneIncluirNoEsperado: 4, webQuienVieneMarcarNoViene: 4,
    webRepiteMarcar: 2, webRepiteQuitar: 2, webResolucionAnadir: 2, webResolucionDeshacerEmparejar: 2, webResolucionEmparejar: 3, webResolucionQuitar: 2, webSobreDeshacerEmparejar: 2, webSobreEmparejar: 3, webSobreMarcarProblema: 3, webSobreQuitarProblema: 2 };
  var UI_ESCRIBE = {};
  ['alternarProblemaSobre_', 'borrarContactoLlamar_', 'borrarLlamadaEspera_', 'corregirProblemaSobre_', 'deshacerEmparejarProvisional_', 'deshacerEmparejarResolucion_', 'deshacerEmparejarSobre_', 'deshacerNingunoProvisional_', 'deshacerNingunoResolucion_',
    'deshacerNingunoSobre_', 'deshacerNoVieneLlamar_', 'deshacerNoVieneQuienViene_', 'deshacerOtroCurso_', 'deshacerRepitera_', 'editarObjetivo_', 'elegirEsperadoProvisional_', 'elegirEsperadoSobre_', 'elegirSolicitudResolucion_', 'esElMismoOtroCurso_',
    'guardarContactoLlamar_', 'guardarEspera_', 'guardarFaltaSobre_', 'incluirNoEsperadoQuienViene_', 'marcarNoVieneQuienViene_', 'marcarRepitera_', 'quitarDeResolucion_', 'revisadoOtroCurso_', 'revisarSobreDos_', 'entendidoPrevision_'].forEach(function (n) { UI_ESCRIBE[n] = true; });

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
    /* Instrucción 149: un paso de esta pantalla se enseña aquí mismo (y el menú marca la tarea y el paso y cambia la dirección); cualquier otro, en la pantalla que lo enseña. */
    if (v && puente.irAVista) { puente.irAVista(v); if (window.MenuWeb) window.MenuWeb.irA(tarea, paso); }
    else if (window.HoyBase && window.HoyBase.direccionIrAPaso(tarea, paso)) location.href = window.HoyBase.direccionIrAPaso(tarea, paso);
    else soloEnLaApp();
  };

  /* Una ficha: la de la web nueva necesita saber la unidad, y de los alumnos de otro curso no se sabe: no abre nada. */
  window.abrirFicha = function () {};

  function noPreparado(que) { return new Error('Todavía no está preparado ' + que + ': la aplicación lo deja hecho en su vuelta de cada hora.'); }

  /* Lo que la pantalla pide con `llamar`: leer `webQuienViene` es leer el fichero; cualquier otra cosa escribe y se hace en la app de hoy. */
  window.llamar = function (fn) {
    var cu = String(arguments[1] || '');
    if (Object.prototype.hasOwnProperty.call(ESCRIBE, fn)) {
      if (!CONTROL) { soloEnLaApp(); return Promise.reject(new Error('Esto se cambia en la app de hoy.')); }
      var n = ESCRIBE[fn], enviados = [].slice.call(arguments, 1, 1 + n);
      while (enviados.length < n) enviados.push(null);
      var verlo = window.CURSO_VISTO;
      return CONTROL.pedir(fn, enviados).then(function (e) {
        if (e.estado !== 'hecha') throw new Error(e.error || 'No se ha podido guardar.');
        var resultado = JSON.parse(JSON.stringify(e.resultado === undefined ? null : e.resultado));
        /* Los ficheros ya están rehechos; se vuelven a leer sin repintar (la pantalla de hoy ya cambió al momento por su cuenta). */
        return (verlo ? puente.recargarCurso(verlo) : Promise.resolve()).then(function () { return resultado; }, function () { return resultado; });
      });
    }
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
  function vivo(n) { return !!(LEER[n] || (CONTROL && UI_ESCRIBE[n])); }   // con escritura activada, también las que guardan por `llamar`
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
      var asigna = /^([A-Za-z_$][\w$]*)\s*=\s*(true|false)$/.exec(frase);
      if (asigna && CONTROL && /_$/.test(asigna[1])) { window[asigna[1]] = asigna[2] === 'true'; return; }   // «ESPERA_SUCIO_=true» de los campos de la lista de espera
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
        var asigna = CONTROL && /^\s*[A-Za-z_$][\w$]*_\s*=\s*(true|false)\s*$/.test(t);
        if (!(m && vivo(m[1])) && !asigna && t.trim() !== 'event.stopPropagation()') escribe = true;
      });
      if (!escribe) return;
      el.setAttribute('data-escribe', '1');
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') el.disabled = true;
    });
    /* Con la escritura activada los campos de los formularios que se guardan se dejan como los pinta la pantalla de hoy (ella misma los apaga en un curso cerrado). */
    if (!CONTROL) Array.prototype.forEach.call(raiz.querySelectorAll('input:not([data-on' + 'change]):not([data-oninput]), textarea, select:not([data-onchange])'), function (el) { el.disabled = true; });
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
    activarEscritura: function (control) { CONTROL = control; },
    escribe: function () { return !!CONTROL; },
    /* Vuelve a leer el fichero de un curso (la aplicación lo rehace antes de contestar una escritura) y lo deja en la memoria, sin repintar. */
    recargarCurso: async function (curso) {
      IND = await C.leerJson(INDICE);
      puente.poner(IND);
      return puente.cargarCurso(curso);
    },
    atender: atiende, preparar: preparar, ejecutar: ejecutar,
    irAVista: null   // la pone quienviene.js: cambia de paso
  };
})();
