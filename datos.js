/* Arranque de «Datos y configuración» de la web nueva (instrucción 138, parte 7): lee de la carpeta privada el índice y, al elegir curso, el fichero de ese curso, y pone en marcha las pantallas de la app de hoy (cargadas tal
   cual, datos-*.js generados por construir-datos.mjs) con sus siete pasos: fechas del curso, el centro, quién entra, cambios, ficheros de Séneca, cómo está la app y cursos. Solo mira: lo que cambia datos se cambia en la
   app de hoy (datos-puente.js). */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, P = window.DatosPuente, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now(), MEDIDO = false;
  /* Instrucción 149: «Configuración» abre el apartado de la dirección (`datos.html?paso=estado`); el paso «Datos de Séneca» de una tarea (`?tarea=matricula&paso=datos`) enseña los ficheros de esa tarea (JsDescargasTarea.html). */
  var Q = new URLSearchParams(location.search), TAREA_DATOS = Q.get('tarea') || '';
  var IND = null, PASO = (TAREA_DATOS && window.HoyBase && window.HoyBase.pasosDeTarea({}, TAREA_DATOS).some(function (p) { return p.clave === Q.get('paso') && p.tab === 'descargas'; })) ? 'ficheros'
    : (window.PANTALLA_DATOS_.pasos.some(function (p) { return p.clave === Q.get('paso'); }) ? Q.get('paso') : 'fechas');
  /* Cada paso: en qué zona de la pantalla de hoy vive. */
  var ZONA = { fechas: 'tab-datos', centro: 'tab-datos', equipo: 'tab-datos', cambios: 'tab-datos', ficheros: 'tab-descargas', estado: 'tab-portada', cursos: 'tab-portada' };

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  /* Cada cambio del HTML de la pantalla: sus `onclick` pasan a atenderse desde aquí y lo que escribe se aparta. */
  ['tab-datos', 'tab-portada', 'tab-descargas'].forEach(function (id) {
    new MutationObserver(function () { P.preparar($(id)); }).observe($(id), { childList: true, subtree: true });
    P.atender($(id));
  });

  /* Se mide cuánto tarda en salir la primera pantalla. */
  function medir() { if (!MEDIDO) { MEDIDO = true; window.MedidasWeb.datos(performance.now() - T0); } }

  function pintarPasos() {
    var caja = $('pasos');
    caja.textContent = '';
    if (TAREA_DATOS) { caja.hidden = true; return; }   // dentro de una tarea no hay apartados de Configuración: la fila de pasos es la del menú
    window.PANTALLA_DATOS_.pasos.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = p.etiqueta; b.setAttribute('data-paso', p.clave);
      b.className = p.clave === PASO ? 'actual' : '';
      b.addEventListener('click', function () { irA(p.clave); });
      caja.appendChild(b);
    });
  }

  /* El paso «Datos de Séneca» de una tarea lleva el botón «Abrir el Centro de datos» (el principal del paso en la app de hoy); sin dirección del Centro de datos, sin botón. */
  var aplicarPantallaOriginal = window.aplicarPantalla_;
  window.aplicarPantalla_ = function (p) {
    aplicarPantallaOriginal(p);
    $('botonCentroDatos').classList.toggle('oculto', !(TAREA_DATOS && window.PANTALLA_.nueva && window.PANTALLA_.web));
  };
  $('abrirCentroDatos').addEventListener('click', function () { window.abrirCentroDatos_(); });

  /* Enseña la zona del paso y le dice a la pantalla de hoy qué vista toca, como `irAPaso_` de la app de hoy. */
  function irA(paso) {
    PASO = paso;
    window.limpiarAviso();
    ['tab-datos', 'tab-portada', 'tab-descargas'].forEach(function (id) { $(id).classList.toggle('oculto', id !== ZONA[paso]); });
    window.VISTA_DATOS_ = paso;
    window.DESCARGAS_TAREA_ = TAREA_DATOS;   // vacío: «Ficheros de Séneca» de Configuración los enseña todos; con tarea, solo los de esa tarea
    $('rehacer').hidden = !(P.escribe() && paso === 'estado');
    pintarPasos();
    if (ZONA[paso] === 'tab-datos') window.cargarDatosYConfiguracion_();
    else if (ZONA[paso] === 'tab-descargas') window.cargarDescargas();
    else window.cargarPortada();
    medir();
  }

  /* Un enlace a un apartado de Configuración se abre aquí mismo (y cambia la dirección); a una tarea, en su pantalla. */
  window.irAPaso_ = function (tarea, paso) {
    var d = window.HoyBase && window.HoyBase.direccionIrAPaso(tarea, paso);
    if (tarea === 'datos' && !TAREA_DATOS && window.PANTALLA_DATOS_.pasos.some(function (p) { return p.clave === paso; })) { irA(paso); if (window.MenuWeb) window.MenuWeb.irA('datos', paso); }
    else if (d) location.href = d;
    else P.soloEnLaApp();
  };
  window.irATareaPaso_ = window.irAPaso_;

  async function ver(curso) {
    window.CURSO_VISTO = curso;
    $('datos').textContent = E.lineaHora(P.horaDe(curso));
    window.limpiarAviso();
    try { await P.cargarCurso(curso); } catch (e) { window.avisar(e.message, 'error'); }
    irA(PASO);
  }

  async function cargar() {
    try { IND = await C.leerJson(P.INDICE); } catch (e) { throw new Error('«Datos y configuración» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    P.poner(IND);
    var cursos = P.cursos();
    if (!cursos.length) throw new Error('«Datos y configuración» todavía no está preparado.');
    /* Instrucción 139, parte 2: se escribe aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      P.activarEscritura(X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } }));
      $('soloMirar').textContent = 'Las fechas, el centro, quién entra, los objetivos y los cursos se cambian aquí; subir ficheros y la contraseña de GitHub, no.';
      $('rehacerBoton').addEventListener('click', function () { window.rehacerTodoNuevo_(); });
    }
    try { await P.cargarGeneral(); } catch (e) { window.avisar(e.message, 'error'); }
    var elegido = cursos.indexOf(IND.enMarcha) !== -1 ? IND.enMarcha : cursos[0];
    if (IND.urlApp) $('enlaceApp').href = IND.urlApp;
    var sel = $('selCurso');
    function rellenarSelector() {
      var actual = sel.value || elegido, lista = P.cursos();
      sel.textContent = '';
      lista.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = 'Curso ' + c; sel.appendChild(o); });
      sel.value = lista.indexOf(actual) !== -1 ? actual : lista[0]; sel.hidden = lista.length < 2;
    }
    P.alCambiarCursos = rellenarSelector;
    rellenarSelector();
    sel.addEventListener('change', function () { ver(sel.value); });
    $('pruebas').hidden = true;
    $('datosYConfiguracion').hidden = false;
    ver(elegido);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Datos y configuración». Puede que la aplicación todavía no lo haya preparado.');
})();
