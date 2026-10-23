/* Arranque de la mesa de la web nueva (instrucción 138, parte 6): lee de la carpeta privada el índice y, al abrir un nivel, el fichero de ese nivel, y pone en marcha la pantalla de la app de hoy (cargada tal cual, mesa-*.js
   generados por construir-mesa.mjs) con sus niveles, modelos, grupos, tabla de equilibrio, bloques y «Comparar modelos». Lee y, desde la instrucción 139, también escribe por peticiones (mesa-puente.js). */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, P = window.MesaPuente, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now(), MEDIDO = false;
  var IND = null;

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  /* Se mide cuánto tarda en salir el primer reparto en columnas. */
  var pintarColumnasOriginal = window.pintarColumnas;
  window.pintarColumnas = function () {
    pintarColumnasOriginal();
    if (!MEDIDO) { MEDIDO = true; window.MedidasWeb.mesa(performance.now() - T0); }
  };

  /* La ficha breve de un alumno solo enseña: los campos y el botón de guardar no se pueden tocar. */
  var abrirFichaOriginal = window.abrirFichaMesa;
  window.abrirFichaMesa = function (clave) {
    abrirFichaOriginal(clave);
    if (P.escribe()) return;   // con la escritura activada (instrucción 139, parte 4) la ficha breve guarda las preferencias
    Array.prototype.forEach.call($('fichaMesaFondo').querySelectorAll('input, select, textarea'), function (el) { el.disabled = true; });
  };

  /* Cada cambio del HTML de la pantalla: sus `onclick` pasan a atenderse desde aquí y lo que escribe se aparta. */
  new MutationObserver(function () { P.preparar($('tab-mesa')); }).observe($('tab-mesa'), { childList: true, subtree: true });
  P.atender($('tab-mesa'));

  function horaDe(curso) {
    var c = P.cursos()[curso], horas = c ? c.niveles.map(function (n) { return n.hora; }).filter(String).sort() : [];
    return horas[0] || IND.hora;
  }

  function ver(curso) {
    window.CURSO_VISTO = curso;
    $('datos').textContent = E.lineaHora(horaDe(curso));
    window.limpiarAviso();
    window.cargarMesa();
  }

  async function cargar() {
    try { IND = await C.leerJson(P.INDICE); } catch (e) { throw new Error('La mesa todavía no está preparada: la aplicación la deja hecha en su vuelta de cada hora.'); }
    P.poner(IND);
    /* Instrucción 139, parte 4: se escribe aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, queda el enlace a la app de hoy. */
    if (await X.preparar()) {
      P.activarEscritura(X.controlador({ alCambiar: function () {}, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } }));
      window.ESTADO.miPapel = { rol: 'admin' };
      $('paraCambiar').textContent = 'Para cambiar lo que no se puede aquí:';
    }
    var cursos = (IND.cursos || []).map(function (c) { return c.curso; });
    if (!cursos.length) throw new Error('La mesa todavía no está preparada.');
    var elegido = cursos.indexOf(IND.enMarcha) !== -1 ? IND.enMarcha : cursos[0];
    if (IND.urlApp) $('enlaceApp').href = IND.urlApp;
    var sel = $('selCurso');
    sel.textContent = '';
    cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = 'Curso ' + c; sel.appendChild(o); });
    sel.value = elegido; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { ver(sel.value); });
    $('pruebas').hidden = true;
    $('mesa').hidden = false;
    ver(elegido);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer la mesa. Puede que la aplicación todavía no la haya preparado.');
})();
