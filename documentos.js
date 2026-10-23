/* Arranque de «Documentos» de la web nueva (instrucción 140, parte 1): lee de la carpeta privada el índice y, al elegir curso, el fichero de ese curso, y pone en marcha la pantalla de la app de hoy (cargada tal cual,
   documentos-*.js generados por construir-documentos.mjs) con sus tres pasos: Documentos (informes, relaciones de pendientes, hojas de «enterado» y de seguimiento, texto de las hojas y avisos de los informes), Listados
   por grupo y Enviar a los tutores. Los PDF los sigue haciendo la aplicación con la cola de siempre; esta página los pide por peticiones (documentos-puente.js) y los abre desde sus enlaces de Drive. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, P = window.DocumentosPuente, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now(), MEDIDO = false;
  var IND = null, PASO = 'documentos';
  var PASOS = [['documentos', 'Documentos'], ['listados', 'Listados por grupo'], ['enviar', 'Enviar a los tutores']];

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  /* Cada cambio del HTML de la pantalla: sus `onclick` pasan a atenderse desde aquí y lo que escribe se aparta. */
  new MutationObserver(function () { P.preparar($('tab-documentos')); }).observe($('tab-documentos'), { childList: true, subtree: true });
  P.atender($('tab-documentos'));

  /* Se mide cuánto tarda en salir la primera pantalla. */
  function medir() { if (!MEDIDO) { MEDIDO = true; window.MedidasWeb.documentos(performance.now() - T0); } }

  function etiquetaDe(paso) { return PASOS.filter(function (p) { return p[0] === paso; })[0][1]; }

  function pintarPasos() {
    var caja = $('pasos');
    caja.textContent = '';
    PASOS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = p[1]; b.setAttribute('data-paso', p[0]);
      b.className = p[0] === PASO ? 'actual' : '';
      b.addEventListener('click', function () { irA(p[0]); });
      caja.appendChild(b);
    });
  }

  /* El botón de arriba, como el de la cabecera de la tarea de hoy: «Generar lo que falta (3)», «Generando…», «Seguir», «Nada que generar» o «Enviar a los tutores». Sin escritura no hay botón. */
  function pintarCabecera() {
    $('tituloPaso').textContent = etiquetaDe(PASO);
    var b = $('botonPrincipalPaso'), d;
    if (!P.escribe()) d = { oculto: true };
    else if (PASO === 'enviar') {
      var D = window.docDatos_();
      d = { texto: 'Enviar a los tutores', oculto: !!(D && D.soloLectura) };
    } else d = window.documentosBotonPaso_(PASO);
    b.hidden = !!d.oculto;
    b.textContent = d.texto || '';
    b.disabled = !!d.apagado;
  }
  window.pintarCabeceraTarea_ = pintarCabecera;

  $('botonPrincipalPaso').addEventListener('click', function () {
    if (PASO === 'enviar') window.documentosEnviar(); else window.documentosPrincipal_(PASO);
  });

  /* Lo que `irAPaso_('inicio', 'documentos')` hace en la app de hoy: cambiar de paso. */
  function irA(paso) {
    PASO = paso;
    window.PASO_DOCUMENTOS_WEB = paso;
    window.limpiarAviso();
    pintarPasos();
    pintarCabecera();
    if (window.DOCUMENTOS_) window.pintarDocumentos_(); else window.cargarDocumentos();
    medir();
  }
  window.irAPaso_ = function (tarea, paso) { if (PASOS.some(function (p) { return p[0] === paso; })) irA(paso); else P.soloEnLaApp(); };

  async function ver(curso) {
    window.CURSO_VISTO = curso;
    window.DOCUMENTOS_ = null;
    window.MEMORIA_ = {};
    $('datos').textContent = E.lineaHora(P.horaDe(curso));
    window.limpiarAviso();
    irA(PASO);
  }

  async function cargar() {
    try { IND = await C.leerJson(P.INDICE); } catch (e) { throw new Error('«Documentos» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    P.poner(IND);
    var cursos = P.cursos();
    if (!cursos.length) throw new Error('«Documentos» todavía no está preparado.');
    /* Instrucción 140: se escribe aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      P.activarEscritura(X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } }));
      $('soloMirar').textContent = 'Los PDF los hace la aplicación (tarda un poco): aquí se piden, se sigue cómo van y se abren.';
    }
    var elegido = cursos.indexOf(IND.enMarcha) !== -1 ? IND.enMarcha : cursos[0];
    if (IND.urlApp) $('enlaceApp').href = IND.urlApp;
    var sel = $('selCurso');
    cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = 'Curso ' + c; sel.appendChild(o); });
    sel.value = elegido; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { ver(sel.value); });
    $('pruebas').hidden = true;
    $('documentosWeb').hidden = false;
    ver(elegido);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Documentos». Puede que la aplicación todavía no lo haya preparado.');
})();
