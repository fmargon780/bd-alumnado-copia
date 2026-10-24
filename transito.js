/* Arranque de «Tránsito» de Jefatura de la web nueva (instrucción 149, parte 2): lee de la carpeta privada el índice y, al elegir curso, el fichero de ese curso, y pone en marcha la pantalla de la app de hoy (cargada tal cual,
   transito-pantalla.js, generado por construir-transito.mjs) con sus tres pasos: tutores de 6º y plazo, seguimiento de las fichas y revisar y aprobar. El paso lo dice la dirección (`?tarea=transito&paso=seguimiento`) y la fila
   de pasos la pinta el menú. Lee y escribe por peticiones (transito-puente.js). El tránsito solo tiene sentido en el curso en preparación: sin ninguno, esta página lleva a Inicio, como la app de hoy. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, P = window.TransitoPuente, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now(), MEDIDO = false;
  var IND = null;
  var PASOS = ['tutores', 'seguimiento', 'bandeja'];
  var paso = new URLSearchParams(location.search).get('paso');

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');
  window.VISTA_TRANSITO = PASOS.indexOf(paso) !== -1 ? paso : 'tutores';

  /* Cada cambio del HTML de la pantalla: sus `onclick` pasan a atenderse desde aquí y lo que escribe se aparta. */
  ['tab-transito', 'modalFicha', 'modalReenviarCorreo'].forEach(function (id) {
    new MutationObserver(function () { P.preparar($(id)); }).observe($(id), { childList: true, subtree: true });
    P.atender($(id));
  });
  /* Pulsar fuera de la ventana la cierra, como en la app de hoy. */
  $('modalFicha').addEventListener('click', function (ev) { if (ev.target === $('modalFicha')) window.cerrarFicha(); });
  $('modalReenviarCorreo').addEventListener('click', function (ev) { if (ev.target === $('modalReenviarCorreo')) window.cerrarReenviarCorreo_(); });

  /* Se mide cuánto tarda en salir la primera pantalla. */
  var pintarOriginal = { tutores: window.pintarTransitoTutores_, seguimiento: window.pintarTransitoSeguimiento_, bandeja: window.pintarTransitoBandeja_ };
  window.pintarTransitoTutores_ = function () { pintarOriginal.tutores(); medir(); };
  window.pintarTransitoSeguimiento_ = function () { pintarOriginal.seguimiento(); medir(); };
  window.pintarTransitoBandeja_ = function () { pintarOriginal.bandeja(); medir(); };
  function medir() { if (!MEDIDO) { MEDIDO = true; window.MedidasWeb.transito(performance.now() - T0); } }

  /* El menú (menu.js) deja pasar sin recargar los pasos de esta pantalla. */
  window.MenuPasoEnSitio = function (tarea, paso) {
    if (tarea !== 'transito' || PASOS.indexOf(paso) === -1 || !window.CURSO_VISTO) return false;
    window.VISTA_TRANSITO = paso;
    window.limpiarAviso();
    window.cargarTransitoJefatura();
    return true;
  };

  function ver(curso) {
    window.CURSO_VISTO = curso;
    $('datos').textContent = E.lineaHora(P.horaDe(curso));
    window.limpiarAviso();
    window.cargarTransitoJefatura();
  }

  async function cargar() {
    try { IND = await C.leerJson(P.INDICE); } catch (e) { throw new Error('«Tránsito» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    P.poner(IND);
    /* Se escribe aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      P.activarEscritura(X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } }));
      $('soloMirar').textContent = 'Los tutores, el plazo, los correos y las fichas se cambian aquí; no hace falta la app de hoy.';
    }
    var cursos = P.cursos();
    /* Sin curso en preparación no hay tránsito que seguir: como la app de hoy, se vuelve a Inicio. */
    if (!cursos.length) { location.replace('hoy.html'); return; }
    var elegido = cursos.indexOf(IND.enMarcha) !== -1 ? IND.enMarcha : cursos[0];
    if (IND.urlApp) $('enlaceApp').href = IND.urlApp;
    var sel = $('selCurso');
    cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = 'Curso ' + c; sel.appendChild(o); });
    sel.value = cursos.indexOf(elegido) !== -1 ? elegido : cursos[0]; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { ver(sel.value); });
    $('pruebas').hidden = true;
    $('transitoWeb').hidden = false;
    ver(sel.value);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Tránsito». Puede que la aplicación todavía no lo haya preparado.');
})();
