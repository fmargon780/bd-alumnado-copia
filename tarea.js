/* Entrar en una tarea (instrucción 149): `tarea.html?tarea=<clave>` lleva al paso que se vio la última vez en esta tarea o, si no, al primero que toca (como `irATarea` de la app de hoy);
   si todavía no se puede saber (sin datos), al primero. La dirección a la que lleva es la de la pantalla del paso, con la tarea y el paso (`quienviene.html?tarea=matricula&paso=llamar`). */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, B = window.HoyBase;
  var $ = function (id) { return document.getElementById(id); };
  var TAREA = new URLSearchParams(location.search).get('tarea') || '';
  var T = B.TAREAS.filter(function (t) { return t.clave === TAREA; })[0];
  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');
  if (!T) { E.problema('No conozco esa tarea. Elige una en el menú.'); $('pruebas').hidden = false; return; }
  $('titulo').textContent = T.nombre;

  function ir(paso) { location.replace(B.direccionPaso(TAREA, paso)); }

  var recordado = '';
  try { recordado = (window.localStorage && window.localStorage.getItem('bd-paso-' + TAREA)) || ''; } catch (e) { recordado = ''; }
  var pasos = B.pasosDeTarea({}, TAREA);
  if (recordado && pasos.some(function (p) { return p.clave === recordado; })) { ir(recordado); return; }

  async function cargar() {
    var ind = await C.leerJson('_hoy-indice.json');
    var m = { abiertos: ind.abiertos || [], cursoVisto: ind.enMarcha, centro: ind.centro, datos: {} };
    (ind.cursos || []).forEach(function (c) { m.datos[c.curso] = { calendario: c.calendario }; });
    var hoy = B.hoyIso(), curso = B.cursoDeTarea(m, TAREA, hoy);
    var f = (ind.cursos || []).filter(function (c) { return c.curso === curso; })[0];
    if (!f) { ir(pasos[0].clave); return; }
    m.datos[curso] = (await C.leerJson(f.fichero)).lecturas || {};
    var primero = B.estadoPasosDe(m, TAREA, curso, hoy).filter(function (r) { return r.s === 'toca'; })[0];
    ir(primero ? primero.paso.clave : pasos[0].clave);
  }
  E.empezar(function () { return cargar().catch(function () { ir(pasos[0].clave); }); }, 'No he podido abrir la tarea.');
})();
