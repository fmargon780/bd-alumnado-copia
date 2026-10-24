/* Arranque de «Hoy» de la web nueva (instrucción 138, parte 2): lee de la carpeta privada el índice y el fichero de cada curso abierto y dibuja la portada de hoy (HoyDibujo). Lee y, desde la instrucción 139, contesta «Está bien» de «Por mirar». Donde la app de hoy lleva a una pantalla
   que aún no está aquí, hay un enlace a la app de hoy. La fecha es la del ordenador, como en la app de hoy. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, D = window.HoyDibujo, X = window.EscrituraWeb;
  var CONTROL = null, ULTIMO = null, CONTESTADAS = {};   // CONTESTADAS: las líneas de «Por mirar» contestadas aquí (se quitan al momento)
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var INDICE = '_hoy-indice.json';

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  /* Un nodo de hoy-dibujo.js (texto, o { t, a, c }) como elemento de la página: solo `createElement` y `textContent`, nunca HTML. */
  function aDom(n) {
    if (typeof n === 'string') return document.createTextNode(n);
    var el = document.createElement(n.t);
    Object.keys(n.a).forEach(function (k) { if (k === 'href' && n.a[k] !== '#' && !/^https:\/\//.test(n.a[k]) && !/^[a-z]+\.html(\?[A-Za-z0-9=&_.-]*)?$/.test(n.a[k])) return; el.setAttribute(k, n.a[k]); });
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
    ULTIMO = m;
    var vista = Object.assign({}, m, { escribe: !!CONTROL });
    if (m.porMirar && m.porMirar.lista) vista.porMirar = { lista: m.porMirar.lista.filter(function (e) { return !CONTESTADAS[e.id]; }) };
    var s = D.pintar(vista);
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
    try { ind = await C.leerJson(INDICE); } catch (e) { throw new Error('«Inicio» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    var cursos = ind.cursos || [];
    if (!cursos.length) throw new Error('«Inicio» todavía no está preparado.');
    /* Instrucción 139, parte 5: «Está bien» de «Por mirar» se contesta aquí si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      CONTROL = X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } });
      $('hoyPorMirar').addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('button[data-por-mirar]') : null;
        if (!b || !ULTIMO) return;
        var id = b.getAttribute('data-por-mirar'), resp = b.getAttribute('data-respuesta');
        CONTESTADAS[id] = true;   // la línea desaparece al momento; si la aplicación no la guarda, vuelve
        var m = ULTIMO;
        pintar(m);
        CONTROL.pedir('webPorMirarResponder', [id, resp, String(m.miCorreo || '')]).then(function (e) {
          if (e.estado !== 'hecha') { delete CONTESTADAS[id]; pintar(ULTIMO); }
        });
      });
    }
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
  E.empezar(cargar, 'No he podido leer «Inicio». Puede que la aplicación todavía no lo haya preparado.');
})();
