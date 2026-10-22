/* Arranque de la web nueva (instrucción 135): elige la carpeta privada, lee los ficheros del buscador y busca mientras se escribe.
   Solo lee. Pulsar a un alumno abre su ficha nueva (ficha.html, instrucción 136) en otra pestaña; desde ella se llega a la ficha de la app de hoy para cambiar algo. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, B = window.BuscarWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var E = window.EntrarWeb, DESDE_DISCO = E.DESDE_DISCO;
  var ACTUALES = [], ANTIGUOS = [], MARCADO = -1, ULTIMOS = [];

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (DESDE_DISCO ? ' · copia sin internet' : '');

  async function cargarDatos() {
    var t0 = performance.now();
    var indice = await C.leerJson(C.INDICE);
    var cursos = (indice.cursos || []).filter(function (c) { return c.curso === indice.enMarcha; });
    if (!cursos.length && indice.cursos && indice.cursos.length) cursos = [indice.cursos[0]];
    var lecturas = await Promise.all(cursos.map(function (c) { return C.leerJson(c.fichero); }).concat(indice.antiguos ? [C.leerJson(indice.antiguos.fichero)] : []));
    ACTUALES = []; ANTIGUOS = [];
    lecturas.forEach(function (f, i) {
      if (i < cursos.length) ACTUALES = ACTUALES.concat(B.preparar(f.alumnos, false).map(function (x) { x.ce = cursos[i].curso; return x; })); else ANTIGUOS = B.preparar(f.alumnos, true);
    });
    $('datos').textContent = E.lineaHora(indice.hora);
    $('pruebas').hidden = true;
    $('buscador').hidden = false;
    $('texto').focus();
    window.MedidasWeb.abrir(performance.now() - T0);
    void t0;
  }

  function enlace(a) {
    var q = 'clave=' + encodeURIComponent(a.clave);
    return 'ficha.html?' + q + (a.antiguo ? '&antiguo=1' : '&curso=' + encodeURIComponent(a.ce || '') + '&unidad=' + encodeURIComponent(a.unidad || ''));
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
    else if (e.key === 'Enter') { e.preventDefault(); if (MARCADO !== -1) window.open(enlace(ULTIMOS[MARCADO]), '_blank', 'noopener'); return; }
    else return;
    pintar({ lista: ULTIMOS, hayMas: false });
  });

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargarDatos, 'No he podido leer los ficheros del buscador. Puede que la aplicación todavía no los haya preparado.');
})();
