/* Arranque de «Estadísticas» de la web nueva (instrucción 138, parte 4): lee de la carpeta privada el índice y, al pedirlo la pantalla (la de la app de hoy, cargada tal cual), el fichero del curso. Pone en su sitio las tres
   cosas de la pantalla de hoy que esta página no puede hacer igual: las bibliotecas del PDF y del Excel (de la propia página, no de internet), el dibujo del gráfico para el PDF (con una dirección «data:») y los dos enlaces
   «Reintentar» (esta página no admite código dentro del HTML). Lee y, desde la instrucción 139, guardar y borrar consultas se escribe por peticiones. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, P = window.EstadisticasPuente, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now(), MEDIDO = false;

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  window.EST_LIBS_ = { pdf: ['lib/jspdf.umd.min.js', 'lib/jspdf.plugin.autotable.min.js'], excel: ['lib/exceljs.min.js'] };

  /* El SVG del gráfico como imagen PNG con fondo blanco, igual que en la app de hoy; la imagen se pide con una dirección «data:» (la página solo admite imágenes así). */
  window.estadSvgAImagen_ = function (graf) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () {
        var escala = 2, c = document.createElement('canvas');
        c.width = graf.ancho * escala; c.height = graf.alto * escala;
        var cx = c.getContext('2d');
        cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height);
        cx.drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      im.onerror = function () { reject(new Error('no he podido dibujar el gráfico')); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(graf.svg);
    });
  };

  /* Los dos «Reintentar» de la pantalla de hoy llevan `onclick` dentro del HTML: aquí se atienden por su texto. */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('[onclick]') : null;
    if (!a) return;
    var t = a.getAttribute('onclick') || '';
    if (t === 'cargarEstadisticas()') window.cargarEstadisticas();
    else if (t === 'estadAsegurarYPintar_()') window.estadAsegurarYPintar_();
  });

  /* Se mide cuánto tarda en salir la primera tabla. */
  var pintarOriginal = window.estadPintarTodo_;
  window.estadPintarTodo_ = function () {
    pintarOriginal();
    if (!MEDIDO && window.EST_.P) { MEDIDO = true; window.MedidasWeb.estadisticas(performance.now() - T0); }
  };

  function horaDe(ind, curso) { var f = (ind.ficheros || {})['datos|' + curso]; return (f && f.hora) || ind.hora; }

  function ver(curso, ind) {
    window.CURSO_VISTO = curso;
    $('datos').textContent = E.lineaHora(horaDe(ind, curso));
    window.cargarEstadisticas();
  }

  async function cargar() {
    var ind;
    try { ind = await C.leerJson(P.INDICE); } catch (e) { throw new Error('«Estadísticas» todavía no está preparado: la aplicación lo deja hecho en su vuelta de cada hora.'); }
    P.poner(ind);
    /* Instrucción 139, parte 5: se guarda y se borra aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      P.activarEscritura(X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } }));
      $('paraCambiar').textContent = 'Las consultas se guardan y se borran aquí; para lo demás:';
    }
    var cursos = (ind.abiertos || []).map(function (c) { return c.curso; }).filter(function (c) { return (ind.ficheros || {})['datos|' + c]; });
    if (!cursos.length) throw new Error('«Estadísticas» todavía no está preparado.');
    var elegido = cursos.indexOf(ind.enMarcha) !== -1 ? ind.enMarcha : cursos[0];
    if (ind.urlApp) $('enlaceApp').href = ind.urlApp;
    var sel = $('selCurso');
    sel.textContent = '';
    cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = 'Curso ' + c; sel.appendChild(o); });
    sel.value = elegido; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { ver(sel.value, ind); });
    $('pruebas').hidden = true;
    $('estadisticas').hidden = false;
    ver(elegido, ind);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Estadísticas». Puede que la aplicación todavía no lo haya preparado.');
})();
