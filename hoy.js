/* Arranque de «Hoy» de la web nueva (instrucción 138, parte 2): lee de la carpeta privada el índice y el fichero de cada curso abierto y dibuja la portada de hoy (HoyDibujo). Solo lee. Donde la app de hoy lleva a una pantalla
   que aún no está aquí, hay un enlace a la app de hoy. La fecha es la del ordenador, como en la app de hoy. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, D = window.HoyDibujo;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var INDICE = '_hoy-indice.json';

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  /* Un nodo de hoy-dibujo.js (texto, o { t, a, c }) como elemento de la página: solo `createElement` y `textContent`, nunca HTML. */
  function aDom(n) {
    if (typeof n === 'string') return document.createTextNode(n);
    var el = document.createElement(n.t);
    Object.keys(n.a).forEach(function (k) { if (k === 'href' && n.a[k] !== '#' && !/^https:\/\//.test(n.a[k])) return; el.setAttribute(k, n.a[k]); });
    n.c.forEach(function (x) { el.appendChild(aDom(x)); });
    return el;
  }
  function aplanar(l) { return (Array.isArray(l) ? l : [l]).reduce(function (a, x) { return x === null || x === undefined ? a : a.concat(Array.isArray(x) ? aplanar(x) : [x]); }, []); }

  function poner(id, nodos, oculto, clase) {
    var el = $(id);
    el.textContent = '';
    aplanar(nodos).forEach(function (n) { el.appendChild(aDom(n)); });
    if (clase !== undefined) el.className = oculto ? clase + ' oculto' : clase;
    else el.classList.toggle('oculto', !!oculto);
  }

  function pintar(m) {
    var s = D.pintar(m);
    poner('hoyToca', s.toca, false);
    poner('hoyTambien', s.tambien.nodos, s.tambien.oculto, 'caja');
    poner('hoyAtencion', s.atencion.nodos, s.atencion.oculto, 'caja');
    poner('hoyFechas', s.fechas, false);
    poner('hoyPorMirar', s.porMirar.nodos, s.porMirar.oculto, s.porMirar.oculto ? 'caja' : 'caja por-mirar');
    poner('hoyCambios', s.cambios.nodos, s.cambios.oculto, s.cambios.oculto ? 'caja' : 'caja ultimos-cambios');
    $('pieHoy').textContent = s.pie;
  }

  async function cargar() {
    var ind;
    try { ind = await C.leerJson(INDICE); } catch (e) { throw new Error('«Hoy» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    var cursos = ind.cursos || [];
    if (!cursos.length) throw new Error('«Hoy» todavía no está preparado.');
    var datos = {};
    await Promise.all(cursos.map(async function (c) { var f = await C.leerJson(c.fichero); datos[c.curso] = f.lecturas || {}; }));
    var visto = ind.enMarcha && datos[ind.enMarcha] ? ind.enMarcha : cursos[0].curso;
    pintar({ abiertos: ind.abiertos || [], cursoVisto: visto, centro: ind.centro, porMirar: ind.porMirar, cambios: ind.cambios, miCorreo: ind.miCorreo, urlApp: ind.urlApp, datos: datos });
    $('datos').textContent = E.lineaHora(ind.hora);
    $('pruebas').hidden = true;
    $('hoy').hidden = false;
    window.MedidasWeb.hoy(performance.now() - T0);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Hoy». Puede que la aplicación todavía no lo haya preparado.');
})();
