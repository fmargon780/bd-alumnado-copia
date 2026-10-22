/* El puente de «Estadísticas» de la web nueva (instrucción 138, parte 4). La pantalla es la de la app de hoy, cargada tal cual (estadisticas-*.js, generados por construir-estadisticas.mjs); esta pieza pone las pocas cosas de la app de hoy
   que esa pantalla da por hechas, sin llamar a Apps Script: dónde está el curso, cómo se escapa un texto, cómo se pide un dato al «servidor» (aquí, un fichero de la carpeta privada que dejó el disparador) y cómo se abre una ficha.
   Las consultas se guardan y se borran en la app de hoy (fila 139). Se carga ANTES que la pantalla. */
(function () {
  'use strict';
  var C = window.CarpetaWeb;
  var INDICE = '_estadisticas-indice.json';
  var IND = null, FICHEROS = {};

  window.CURSO_VISTO = '';
  window.PESTANA_ACTUAL = 'estadisticas';
  window.MEMORIA_ = {};
  window.MI_CORREO = '';
  window.ESTADO = { centro: { nombre: '' }, miPapel: { rol: 'lector' } };
  window.PULSO_ = { sello: '' };
  window.ALUMNADO_POR_CLAVE = {};
  window.escapaHtml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  window.miPapel_ = function () { return window.ESTADO.miPapel; };
  window.mensajeDeError = function (e) { return (e && e.message) ? e.message : String(e); };

  /* Una ficha, en otra pestaña (la de la web nueva): el alumno y su curso salen de los datos ya traídos. */
  window.abrirFicha = function (clave) {
    var a = null, P = window.EST_ && window.EST_.P;
    if (P) P.alumnos.some(function (x) { if (x.k === clave) { a = x; return true; } return false; });
    var curso = (a && a.c) || window.CURSO_VISTO || '', unidad = (a && a.u) || '';
    window.open('ficha.html?clave=' + encodeURIComponent(clave) + '&curso=' + encodeURIComponent(curso) + '&unidad=' + encodeURIComponent(unidad), '_blank', 'noopener');
  };

  function noPreparado(que) { return new Error('Todavía no está preparado ' + que + ': la aplicación lo deja hecho en su vuelta de cada hora.'); }

  async function fichero(clave, que) {
    var f = FICHEROS[clave];
    if (!f) throw noPreparado(que);
    var x;
    try { x = await C.leerJson(f.fichero); } catch (e) { throw noPreparado(que); }
    return x.valor;
  }

  /* Los alumnos de un curso con cuaderno se pueden abrir en su ficha. */
  function recordarFichas(d) { if (d && d.tipo === 'cuaderno') (d.alumnos || []).forEach(function (a) { window.ALUMNADO_POR_CLAVE[a.k] = true; }); return d; }

  /* Lo que la pantalla pide al servidor. Las escrituras (guardar o borrar una consulta) no están aquí: se hacen en la app de hoy. */
  window.llamarAlServidor_ = async function (fn, args) {
    var cu = String((args && args[0]) || '');
    if (fn === 'webEstadisticasDatos') {
      var d = await fichero('datos|' + cu, 'el curso ' + cu);
      d.consultas = IND.consultas || []; d.cursos = IND.cursos || [];
      return recordarFichas(d);
    }
    if (fn === 'webEstadisticasCurso') {
      var tipo = (IND.cursos || []).filter(function (c) { return c.curso === cu; })[0];
      return recordarFichas(await fichero((tipo && tipo.tipo === 'historial' ? 'historial|' : 'datos|') + cu, 'el curso ' + cu));
    }
    if (fn === 'webEstadisticasMaterias') return recordarFichas(await fichero('materias|' + cu, 'las materias del curso ' + cu));
    if (fn === 'webEstadisticasConjunto') return fichero(cu + '|' + String(args[1] || ''), 'los datos del curso ' + args[1]);
    throw new Error('Eso se hace por ahora en la app de hoy.');
  };

  window.EstadisticasPuente = {
    INDICE: INDICE,
    poner: function (indice) { IND = indice; FICHEROS = indice.ficheros || {}; window.ESTADO.centro.nombre = indice.centro || ''; },
    indice: function () { return IND; }
  };
})();
