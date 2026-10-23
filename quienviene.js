/* Arranque de «Quién viene» de la web nueva (instrucción 138, parte 5): lee de la carpeta privada el índice y, al elegir curso, el fichero de ese curso, y pone en marcha la pantalla de la app de hoy (cargada tal cual,
   quienviene-*.js generados por construir-quienviene.mjs) con sus ocho pasos: resolución, admitidos, esperados, cómo va cada curso, a quién llamar, sobres, casos a mirar y la lista de espera. Lee y, desde la instrucción 139,
   también escribe por peticiones (quienviene-puente.js). */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, P = window.QuienVienePuente, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now(), MEDIDO = false;
  var GRUPOS = [
    ['Admisión', [['resolucion', 'Resolución de admisión'], ['solicitudes', 'Admitidos y no admitidos por curso'], ['esperados', 'A quién se espera en cada curso']]],
    ['Matrícula', [['cursos', 'Cómo va cada curso'], ['aLlamar', 'A quién llamar'], ['sobres', 'Sobres'], ['casos', 'Casos a mirar']]],
    ['Lista de espera', [['listaEspera', 'La lista y las llamadas']]]
  ];
  var IND = null;

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  /* Se mide cuánto tarda en salir la primera tabla. */
  var pintarOriginal = window.pintarQuienViene;
  window.pintarQuienViene = function () {
    pintarOriginal();
    if (!MEDIDO && window.QUIENVIENE_DATOS) { MEDIDO = true; window.MedidasWeb.quienviene(performance.now() - T0); }
  };

  /* Cada cambio del HTML de la pantalla: sus `onclick` pasan a atenderse desde aquí y lo que escribe se aparta. */
  new MutationObserver(function () { P.preparar($('tab-quienviene')); }).observe($('tab-quienviene'), { childList: true, subtree: true });
  P.atender($('tab-quienviene'));

  function pintarPasos() {
    var caja = $('pasos');
    caja.textContent = '';
    GRUPOS.forEach(function (g) {
      var grupo = document.createElement('div');
      grupo.className = 'grupo';
      var t = document.createElement('b');
      t.textContent = g[0];
      grupo.appendChild(t);
      g[1].forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = p[1]; b.setAttribute('data-vista', p[0]);
        b.className = p[0] === window.VISTA_QUIENVIENE ? 'actual' : '';
        b.addEventListener('click', function () { irA(p[0]); });
        grupo.appendChild(b);
      });
      caja.appendChild(grupo);
    });
  }

  /* Cambiar de paso no arrastra los filtros del anterior (como en la app de hoy). */
  function irA(vista) {
    if (vista !== window.VISTA_QUIENVIENE) window.reiniciarFiltrosQuienViene_();
    window.VISTA_QUIENVIENE = vista;
    pintarPasos();
    if (window.QUIENVIENE_DATOS) window.cargarQuienViene();   // como la app de hoy al cambiar de paso: vuelve a leerlo de la memoria y lo pinta
  }

  P.irAVista = irA;

  function horaDe(curso) { var f = P.ficheros()[curso]; return (f && f.hora) || IND.hora; }

  async function ver(curso) {
    window.CURSO_VISTO = curso;
    $('datos').textContent = E.lineaHora(horaDe(curso));
    window.limpiarAviso();
    try { await P.cargarCurso(curso); } catch (e) { window.avisar(e.message, 'error'); return; }
    window.QUIENVIENE_DATOS = null;
    var info = window.cursoVistoInfo_();
    if (window.VISTA_QUIENVIENE === 'esperados' && info.estado !== 'En preparación') window.VISTA_QUIENVIENE = 'listaEspera';
    window.reiniciarFiltrosQuienViene_();
    pintarPasos();
    window.cargarQuienViene();
  }

  async function cargar() {
    try { IND = await C.leerJson(P.INDICE); } catch (e) { throw new Error('«Quién viene» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    P.poner(IND);
    /* Instrucción 139, parte 3: se escribe aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      P.activarEscritura(X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } }));
      window.ESTADO.miPapel = { rol: 'admin' };
      $('paraCambiar').textContent = 'Para cambiar lo que no se puede aquí:';
    }
    var cursos = (IND.abiertos || []).map(function (c) { return c.curso; }).filter(function (c) { return P.ficheros()[c]; });
    if (!cursos.length) throw new Error('«Quién viene» todavía no está preparado.');
    var prep = (IND.abiertos || []).filter(function (c) { return c.estado === 'En preparación' && P.ficheros()[c.curso]; })[0];
    var elegido = prep ? prep.curso : (cursos.indexOf(IND.enMarcha) !== -1 ? IND.enMarcha : cursos[0]);
    window.VISTA_QUIENVIENE = prep ? 'resolucion' : 'listaEspera';
    if (IND.urlApp) $('enlaceApp').href = IND.urlApp;
    var sel = $('selCurso');
    sel.textContent = '';
    cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = 'Curso ' + c; sel.appendChild(o); });
    sel.value = elegido; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { ver(sel.value); });
    $('pruebas').hidden = true;
    $('quienviene').hidden = false;
    ver(elegido);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Quién viene». Puede que la aplicación todavía no lo haya preparado.');
})();
