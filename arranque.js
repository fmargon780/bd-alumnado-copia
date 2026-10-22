/* Arranque de la web nueva (instrucción 135): elige la carpeta privada, lee los ficheros del buscador y busca mientras se escribe.
   Solo lee. Pulsar a un alumno abre su ficha en la aplicación de hoy, en otra pestaña (la fila 136 lo cambia por la ficha nueva). */
(function () {
  'use strict';
  var C = window.CarpetaWeb, B = window.BuscarWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var DESDE_DISCO = location.protocol === 'file:';
  var ACTUALES = [], ANTIGUOS = [], URL_APP = '', MARCADO = -1, ULTIMOS = [];

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (DESDE_DISCO ? ' · copia sin internet' : '');

  function dosCifras(n) { return String(n).padStart(2, '0'); }
  /* «Datos de las 10:32»; si son de otro día, «Datos de ayer, 18:05» o la fecha corta. */
  function lineaHora(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var hoy = new Date(), ayer = new Date(hoy.getTime() - 86400000);
    var mismo = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
    var hm = dosCifras(d.getHours()) + ':' + dosCifras(d.getMinutes());
    if (mismo(d, hoy)) return 'Datos de las ' + hm;
    if (mismo(d, ayer)) return 'Datos de ayer, ' + hm;
    return 'Datos del ' + d.getDate() + '/' + (d.getMonth() + 1) + ', ' + hm;
  }

  function problema(texto) { $('problema').textContent = texto; $('problema').hidden = !texto; }

  async function cargarDatos() {
    var t0 = performance.now();
    var indice = await C.leerJson(C.INDICE);
    URL_APP = String(indice.urlApp || '');
    var cursos = (indice.cursos || []).filter(function (c) { return c.curso === indice.enMarcha; });
    if (!cursos.length && indice.cursos && indice.cursos.length) cursos = [indice.cursos[0]];
    var lecturas = await Promise.all(cursos.map(function (c) { return C.leerJson(c.fichero); }).concat(indice.antiguos ? [C.leerJson(indice.antiguos.fichero)] : []));
    ACTUALES = []; ANTIGUOS = [];
    lecturas.forEach(function (f, i) {
      if (i < cursos.length) ACTUALES = ACTUALES.concat(B.preparar(f.alumnos, false)); else ANTIGUOS = B.preparar(f.alumnos, true);
    });
    $('datos').textContent = lineaHora(indice.hora);
    $('pruebas').hidden = true;
    $('buscador').hidden = false;
    $('texto').focus();
    window.MedidasWeb.abrir(performance.now() - T0);
    void t0;
  }

  async function usar(handle) {
    if (!(await C.abrir(handle))) {
      problema(DESDE_DISCO ? 'En este ordenador no encuentro esa carpeta. Para usar la copia hace falta Google Drive para ordenador.' : 'Esa carpeta no es la buena.');
      return false;
    }
    problema('');
    try { await C.guardada(handle); } catch (e) { /* sin recordarla: se pedirá otra vez */ }
    try { await cargarDatos(); } catch (e) { problema('No he podido leer los ficheros del buscador. Puede que la aplicación todavía no los haya preparado.'); return false; }
    return true;
  }

  function pedirElegir() {
    $('pedir').hidden = false;
    $('elegir').onclick = async function () {
      var h;
      try { h = await window.showDirectoryPicker({ id: 'bd-web-pagina', mode: 'readwrite' }); } catch (e) { return; }
      await usar(h);
    };
  }

  async function empezar() {
    if (typeof window.showDirectoryPicker !== 'function') { problema('Este navegador no puede abrir la carpeta: hace falta Google Chrome.'); return; }
    var h = null;
    try { h = await C.guardada(); } catch (e) { h = null; }
    if (!h) { pedirElegir(); return; }
    var permiso = 'prompt';
    try { permiso = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { permiso = 'prompt'; }
    if (permiso === 'granted' && (await usar(h))) return;
    $('pedir').hidden = false;
    $('elegir').textContent = permiso === 'granted' ? 'Elegir la carpeta' : 'Dar permiso';
    $('elegir').onclick = async function () {
      var r = 'denied';
      if (permiso !== 'granted') { try { r = await h.requestPermission({ mode: 'readwrite' }); } catch (e) { r = 'denied'; } if (r === 'granted' && (await usar(h))) return; }
      var n;
      try { n = await window.showDirectoryPicker({ id: 'bd-web-pagina', mode: 'readwrite' }); } catch (e) { return; }
      await usar(n);
    };
  }

  function enlace(a) {
    if (!URL_APP) return '#';
    return URL_APP + (URL_APP.indexOf('?') === -1 ? '?' : '&') + 'ficha=' + encodeURIComponent(a.clave) + (a.antiguo ? '&antiguo=1' : '');
  }

  function pintar(r) {
    var caja = $('resultados');
    caja.textContent = '';
    ULTIMOS = r.lista;
    if (r.corto) return;
    if (!r.lista.length) { var v = document.createElement('div'); v.className = 'vacio'; v.textContent = 'Sin resultados.'; caja.appendChild(v); return; }
    r.lista.forEach(function (a, i) {
      var x = document.createElement('a');
      x.href = enlace(a); x.target = '_blank'; x.rel = 'noopener'; x.dataset.i = i;
      if (i === MARCADO) x.className = 'marcado';
      x.appendChild(document.createTextNode(a.nombre));
      var u = document.createElement('div'); u.className = 'u';
      u.textContent = (a.unidad || a.curso) + (a.idEscolar ? ' · Nº ' + a.idEscolar : '') + (a.antiguo ? ' · antiguo alumno' : '');
      x.appendChild(u);
      caja.appendChild(x);
    });
    if (r.hayMas) { var m = document.createElement('div'); m.className = 'vacio'; m.textContent = r.porNumero ? 'Hay más: escribe más cifras' : 'Hay más: escribe más letras'; caja.appendChild(m); }
  }

  $('texto').addEventListener('input', function () {
    var t0 = performance.now();
    MARCADO = -1;
    var r = B.buscar($('texto').value, ACTUALES, ANTIGUOS);
    if (r.lista.length) MARCADO = 0;
    pintar(r);
    if (!r.corto) window.MedidasWeb.buscar(performance.now() - t0);
  });
  $('texto').addEventListener('keydown', function (e) {
    if (!ULTIMOS.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); MARCADO = Math.min(MARCADO + 1, ULTIMOS.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); MARCADO = Math.max(MARCADO - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); if (MARCADO !== -1 && URL_APP) window.open(enlace(ULTIMOS[MARCADO]), '_blank', 'noopener'); return; }
    else return;
    pintar({ lista: ULTIMOS, hayMas: false });
  });

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  empezar();
})();
