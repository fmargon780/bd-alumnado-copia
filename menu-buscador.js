/* La caja de buscar alumno del menú de la web nueva (instrucción 149). Es la del buscador de antes (arranque.js), pero siempre a mano en la fila del menú: los ficheros del buscador se leen la primera vez que se toca la caja
   (así ninguna página los carga sin necesitarlos) y los resultados salen en un desplegable bajo la caja. Pulsar a un alumno abre su ficha (ficha.html) en otra pestaña. Solo lee. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, B = window.BuscarWeb;
  var ACTUALES = [], ANTIGUOS = [], MARCADO = -1, ULTIMOS = [], CARGA = null;

  function enlace(a) {
    var q = 'clave=' + encodeURIComponent(a.clave);
    return 'ficha.html?' + q + (a.antiguo ? '&antiguo=1' : '&curso=' + encodeURIComponent(a.ce || '') + '&unidad=' + encodeURIComponent(a.unidad || ''));
  }

  /* Lee el índice y el fichero del curso en marcha (y el de antiguos). Una sola vez por página. */
  function cargarDatos() {
    if (CARGA) return CARGA;
    CARGA = (async function () {
      var indice = await C.leerJson(C.INDICE);
      var cursos = (indice.cursos || []).filter(function (c) { return c.curso === indice.enMarcha; });
      if (!cursos.length && indice.cursos && indice.cursos.length) cursos = [indice.cursos[0]];
      var lecturas = await Promise.all(cursos.map(function (c) { return C.leerJson(c.fichero); }).concat(indice.antiguos ? [C.leerJson(indice.antiguos.fichero)] : []));
      lecturas.forEach(function (f, i) {
        if (i < cursos.length) ACTUALES = ACTUALES.concat(B.preparar(f.alumnos, false).map(function (x) { x.ce = cursos[i].curso; return x; })); else ANTIGUOS = B.preparar(f.alumnos, true);
      });
      if (window.MedidasWeb) window.MedidasWeb.abrir(performance.now());   // desde que se abre la página hasta que la caja puede buscar
    })();
    CARGA.catch(function () { CARGA = null; });
    return CARGA;
  }

  function montar(caja) {
    var entrada = caja.querySelector('input'), lista = caja.querySelector('.menu-resultados');

    function pintar(r) {
      lista.textContent = '';
      ULTIMOS = r.lista;
      if (r.corto) { lista.hidden = true; return; }
      lista.hidden = false;
      if (!r.lista.length) { var v = document.createElement('div'); v.className = 'vacio'; v.textContent = 'Sin resultados.'; lista.appendChild(v); return; }
      r.lista.forEach(function (a, i) {
        var x = document.createElement('a');
        x.href = enlace(a); x.target = '_blank'; x.rel = 'noopener'; x.dataset.i = i;
        if (i === MARCADO) x.className = 'marcado';
        x.appendChild(document.createTextNode(a.nombre));
        var u = document.createElement('div'); u.className = 'u';
        u.textContent = (a.unidad || a.curso) + (a.idEscolar ? ' · Nº ' + a.idEscolar : '') + (a.antiguo ? ' · antiguo alumno' : '');
        x.appendChild(u);
        lista.appendChild(x);
      });
      if (r.hayMas) { var m = document.createElement('div'); m.className = 'vacio'; m.textContent = r.porNumero ? 'Hay más: escribe más cifras' : 'Hay más: escribe más letras'; lista.appendChild(m); }
    }

    entrada.addEventListener('focus', function () { if (window.CarpetaWeb.hayCarpeta()) cargarDatos(); });
    entrada.addEventListener('input', function () {
      var t0 = performance.now();
      if (!window.CarpetaWeb.hayCarpeta()) return;
      cargarDatos().then(function () {
        MARCADO = -1;
        var r = B.buscar(entrada.value, ACTUALES, ANTIGUOS);
        if (r.lista.length) MARCADO = 0;
        pintar(r);
        if (!r.corto && window.MedidasWeb) window.MedidasWeb.buscar(performance.now() - t0);
      }, function () { lista.hidden = false; lista.textContent = 'No he podido leer los ficheros del buscador.'; });
    });
    entrada.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { lista.hidden = true; return; }
      if (!ULTIMOS.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); MARCADO = Math.min(MARCADO + 1, ULTIMOS.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); MARCADO = Math.max(MARCADO - 1, 0); }
      else if (e.key === 'Enter') { e.preventDefault(); if (MARCADO !== -1) window.open(enlace(ULTIMOS[MARCADO]), '_blank', 'noopener'); return; }
      else return;
      pintar({ lista: ULTIMOS, hayMas: false });
    });
    document.addEventListener('click', function (e) { if (!caja.contains(e.target)) lista.hidden = true; });
  }

  window.MenuBuscador = { montar: montar, cargarDatos: cargarDatos };
})();
