/* El puente de la mesa de la web nueva (instrucción 138, parte 6). La pantalla es la de la app de hoy, cargada tal cual (mesa-*.js, generados por construir-mesa.mjs); esta pieza pone las pocas cosas de la app de hoy que esa
   pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se piden la lista de niveles y la mesa de un nivel (aquí, un fichero de la carpeta privada que dejó el disparador), qué hacen los botones que están
   dentro del HTML (esta página no admite código dentro del HTML: se atienden desde aquí) y qué pasa con los que escriben. Solo mira: lo que cambia datos (arrastrar, modelos, reglas, reparto, bloques, preferencias) se cambia en la
   app de hoy (fila 139). Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_mesa-indice.json';
  var IND = null, CURSOS = {}, FICHEROS = {}, CARGADOS = {};

  window.CURSO_VISTO = '';
  window.PESTANA_ACTUAL = 'mesa';
  window.MEMORIA_ = {};
  window.MI_CORREO = '';
  window.ESTADO = { centro: { nombre: '' }, miPapel: { rol: 'lector' }, abiertos: [] };
  window.PULSO_ = { presentes: [], sello: '' };
  window.pulsoDonde_ = function () { return ''; };
  window.escapaHtml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  window.mensajeDeError = function (e) { return (e && e.message) ? e.message : String(e); };
  window.datoLimpio_ = function (d) { return String(d || '').replace(/\s+/g, '_').slice(0, 120); };
  window.nombreGrado_ = function (g) {
    g = String(g || '');
    if (g === '1º BACH') return '1º Bachillerato';
    if (g === '2º BACH') return '2º Bachillerato';
    if (/^\dº$/.test(g)) return g + ' ESO';
    return g;
  };
  /* Esta página no admite estilos dentro del HTML (`style="…"`): la pantalla de hoy los trae en el HTML que pinta, así que antes de ponerlo se guardan en `data-estilo` y `preparar` los aplica por el estilo del propio elemento. */
  var INNER = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true, enumerable: INNER.enumerable, get: INNER.get,
    set: function (h) { INNER.set.call(this, typeof h === 'string' ? h.replace(/(\s)style=(["'])/g, '$1data-estilo=$2') : h); }
  });
  /* La biblioteca de arrastrar no está (la página no carga nada de fuera) y aquí no se arrastra. */
  window.Sortable = function () { this.destroy = function () {}; };

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
  window.irAPestana = function () { soloEnLaApp(); };

  /* La ficha: la de la web nueva, en otra pestaña (solo del curso en marcha: de quien aún no es alumno no hay ficha). Mira en lo ya leído, no en las variables de la pantalla. */
  window.abrirFicha = function (clave) {
    var a = null, estado = '';
    Object.keys(CARGADOS).forEach(function (k) {
      var d = CARGADOS[k];
      if (d.datos.cursoEscolar !== window.CURSO_VISTO || a) return;
      a = d.datos.alumnos.filter(function (x) { return x.clave === clave; })[0] || null;
      estado = d.datos.estadoCurso;
    });
    if (!a || estado !== 'marcha' || !a.grupo) { soloEnLaApp(); return; }
    window.open('ficha.html?clave=' + encodeURIComponent(clave) + '&curso=' + encodeURIComponent(window.CURSO_VISTO) + '&unidad=' + encodeURIComponent(a.grupo), '_blank', 'noopener');
  };

  function noPreparado(que) { return new Error('Todavía no está preparado ' + que + ': la aplicación lo deja hecho en su vuelta de cada hora.'); }
  var clon = function (x) { return JSON.parse(JSON.stringify(x === undefined ? null : x)); };

  /* Lo que la pantalla pide con `llamar`: leer es leer los ficheros; cualquier otra cosa escribe y se hace en la app de hoy. */
  window.llamar = function (fn, ce, nivel, id) {
    ce = String(ce || '');
    if (fn === 'mesaListarCursos') {
      var c = CURSOS[ce];
      return c ? Promise.resolve({ cursoEscolar: ce, estadoCurso: c.estadoCurso, cursos: c.niveles.map(function (n) { return n.nivel; }) }) : Promise.reject(noPreparado('la mesa del curso ' + ce));
    }
    if (fn === 'mesaObtenerCurso') return puente.cargarNivel(ce, nivel).then(function (d) { return elegirModelo(d, id); });
    if (fn === 'mesaObtenerModelo') {
      var m = null;
      Object.keys(CARGADOS).forEach(function (k) {
        var d = CARGADOS[k];
        if (d.datos.cursoEscolar !== ce || m) return;
        if (d.datos.modelo.id === nivel) m = d.datos.modelo; else if (d.otros[nivel]) m = d.otros[nivel].modelo;
      });
      return m ? Promise.resolve(clon(m)) : Promise.reject(new Error('Ese modelo no está en lo que la página ha leído.'));
    }
    soloEnLaApp();
    return Promise.reject(new Error('Esto se cambia en la app de hoy.'));
  };

  /* La mesa de un nivel con el modelo pedido (el primero, si no se pide ninguno): siempre una copia, que la pantalla la cambia. */
  function elegirModelo(d, id) {
    var salida = clon(d.datos);
    if (id && id !== salida.modelo.id && d.otros[id]) { salida.modelo = clon(d.otros[id].modelo); salida.fuera = clon(d.otros[id].fuera); }
    return salida;
  }

  /* ---- Los botones que están dentro del HTML de la pantalla de hoy (`onclick="…"`) ---- */
  /* Solo estos mueven la pantalla sin cambiar datos; cualquier otro escribe y no se ejecuta. */
  var LEER = {};
  ['abrirNivel', 'cambiarPestana', 'alternarFiltroPreferencias', 'alternarFilasMaterias_', 'clicTarjeta', 'abrirFichaMesa', 'cerrarFichaMesa_', 'alternarPanelLateral', 'compararModelos', 'mesaVerSinGrupo_',
    'abrirFicha'].forEach(function (n) { LEER[n] = true; });

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

  /* Ejecuta el texto de un `onclick` o `onchange` de la pantalla de hoy: llamadas a funciones de la pantalla con argumentos sencillos, `return false`, `event.stopPropagation()` y «si se pulsa el propio fondo». */
  function ejecutar(texto, el, ev) {
    var parar = false;
    var fondo = /^\s*if \(event\.target === this\) (.*)$/.exec(texto);
    if (fondo) { if (ev.target !== el) return false; texto = fondo[1]; }
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

  /* Un texto de `onclick` que solo mira (todas sus llamadas son del `LEER`) o que cierra al pulsar el fondo. */
  function soloMira(t) {
    t = t.replace(/^\s*if \(event\.target === this\) /, '');
    return partir(t, ';').every(function (frase) {
      frase = frase.trim();
      var m = /^([A-Za-z_$][\w$]*)\(/.exec(frase);
      return !frase || frase === 'return false' || frase === 'event.stopPropagation()' || !!(m && LEER[m[1]]);
    });
  }

  /* Pasa `onclick="…"` a `data-onclick="…"` (la página no admite código dentro del HTML) y deja quietos los controles que escriben: los botones se esconden, los campos se apagan (el estado que enseñan se sigue viendo).
     Las tarjetas de alumno dejan de ser arrastrables. */
  function preparar(raiz) {
    var nodos = raiz.querySelectorAll('[onclick],[onchange],[oninput],[onkeydown]');
    Array.prototype.forEach.call(nodos, function (el) {
      var escribe = false;
      el.removeAttribute('onkeydown');
      EVENTOS.forEach(function (tipo) {
        var t = el.getAttribute('on' + tipo);
        if (t === null) return;
        el.removeAttribute('on' + tipo);
        el.setAttribute('data-on' + tipo, t);
        if (!soloMira(t)) escribe = true;
      });
      if (!escribe) return;
      el.setAttribute('data-escribe', '1');
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') el.disabled = true;
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-estilo]'), function (el) { el.style.cssText = el.getAttribute('data-estilo'); el.removeAttribute('data-estilo'); });
    Array.prototype.forEach.call(raiz.querySelectorAll('#vistaBloquesMesa input, #vistaBloquesMesa select, #vistaBloquesMesa textarea, #panelLateralMesa input[type=text]'), function (el) { el.disabled = true; });
    Array.prototype.forEach.call(raiz.querySelectorAll('.tarjeta-alumno[draggable]'), function (el) { el.setAttribute('draggable', 'false'); });
  }

  var puente = window.MesaPuente = {
    INDICE: INDICE,
    poner: function (indice) {
      IND = indice; CURSOS = {}; FICHEROS = {}; CARGADOS = {};
      (indice.cursos || []).forEach(function (c) { CURSOS[c.curso] = c; c.niveles.forEach(function (n) { FICHEROS[c.curso + '|' + n.nivel] = n; }); });
      window.ESTADO.abiertos = indice.abiertos || []; window.MI_CORREO = indice.miCorreo || '';
    },
    indice: function () { return IND; },
    cursos: function () { return CURSOS; },
    ficheros: function () { return FICHEROS; },
    /* Lee el fichero de un nivel (una sola vez) y lo deja en memoria. */
    cargarNivel: async function (ce, nivel) {
      var k = ce + '|' + nivel;
      if (CARGADOS[k]) return CARGADOS[k];
      var f = FICHEROS[k];
      if (!f) throw noPreparado('la mesa de ' + nivel);
      var x;
      try { x = await C.leerJson(f.fichero); } catch (e) { throw noPreparado('la mesa de ' + nivel); }
      CARGADOS[k] = x;
      return x;
    },
    atender: atiende, preparar: preparar, ejecutar: ejecutar
  };
})();
