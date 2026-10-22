/* Arranque del listado de la web nueva (instrucción 138, parte 1): lee de la carpeta privada el fichero del curso y dibuja el listado de hoy (curso, unidad, once filtros, orden por nombre o unidad, etiquetas).
   Solo lee. Pulsar a un alumno abre su ficha nueva (ficha.html) en otra pestaña. Los filtros se recuerdan en este navegador, como en la app de hoy. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, L = window.ListadoBase;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var INDICE = '_listado-indice.json';
  var ALUMNOS = [], CURSO = '', INDICE_DATOS = null;
  var ORDEN = { campo: 'nombre', asc: true };
  var FILTROS = filtrosGuardados();

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  function filtrosGuardados() { try { var g = localStorage.getItem('bdAlumnado_filtros'); return g ? JSON.parse(g) : {}; } catch (e) { return {}; } }
  function guardarFiltros() { try { localStorage.setItem('bdAlumnado_filtros', JSON.stringify(FILTROS)); } catch (e) { /* no pasa nada */ } }

  function celda(fila, hijo) { var td = document.createElement('td'); if (typeof hijo === 'string') td.textContent = hijo; else if (hijo) td.appendChild(hijo); fila.appendChild(td); return td; }
  function enlace(a) { return 'ficha.html?clave=' + encodeURIComponent(a.clave) + '&curso=' + encodeURIComponent(CURSO) + '&unidad=' + encodeURIComponent(a.unidad || ''); }

  function pintarFiltros() {
    var caja = $('filtros');
    caja.textContent = '';
    L.BANDERAS.forEach(function (b) {
      var l = document.createElement('label'), i = document.createElement('input');
      i.type = 'checkbox'; i.checked = !!FILTROS[b[0]];
      i.addEventListener('change', function () { if (i.checked) FILTROS[b[0]] = true; else delete FILTROS[b[0]]; guardarFiltros(); pintar(); });
      l.appendChild(i); l.appendChild(document.createTextNode(b[1]));
      caja.appendChild(l);
    });
  }

  function pintarUnidades() {
    var sel = $('selUnidad');
    sel.textContent = '';
    var todo = document.createElement('option'); todo.value = ''; todo.textContent = 'Todo el centro'; sel.appendChild(todo);
    L.unidades(ALUMNOS).forEach(function (u) { var o = document.createElement('option'); o.value = u; o.textContent = u; sel.appendChild(o); });
  }

  function pintar() {
    var filas = L.ordenar(L.filtrar(ALUMNOS, $('selUnidad').value, FILTROS), ORDEN.campo, ORDEN.asc);
    $('resumen').textContent = L.resumen(filas.length);
    var cuerpo = $('filas');
    cuerpo.textContent = '';
    if (!filas.length) { var v = document.createElement('tr'); var td = celda(v, 'Nadie cumple estos filtros.'); td.colSpan = 3; cuerpo.appendChild(v); return; }
    var trozo = document.createDocumentFragment();
    filas.forEach(function (a) {
      var tr = document.createElement('tr');
      tr.className = 'fila-alumno'; tr.dataset.href = enlace(a);
      var x = document.createElement('a'); x.href = enlace(a); x.target = '_blank'; x.rel = 'noopener'; x.textContent = a.nombre;
      celda(tr, x); celda(tr, a.unidad);
      var chips = celda(tr, null);
      L.etiquetas(a).forEach(function (t) { var s = document.createElement('span'); s.className = 'chip si'; s.textContent = t; chips.appendChild(s); });
      trozo.appendChild(tr);
    });
    cuerpo.appendChild(trozo);
  }

  function ordenarPor(campo) {
    if (ORDEN.campo === campo) ORDEN.asc = !ORDEN.asc; else { ORDEN.campo = campo; ORDEN.asc = true; }
    pintar();
  }

  async function cargarCurso(curso) {
    var c = (INDICE_DATOS.cursos || []).filter(function (x) { return x.curso === curso; })[0];
    if (!c) throw new Error('No encuentro ese curso entre los listados preparados.');
    var f = await C.leerJson(c.fichero);
    CURSO = curso;
    ALUMNOS = L.preparar(f.alumnos);
    $('datos').textContent = E.lineaHora(c.hora || INDICE_DATOS.hora);
    pintarUnidades();
    pintar();
  }

  async function cargar() {
    try { INDICE_DATOS = await C.leerJson(INDICE); } catch (e) { throw new Error('Los listados todavía no están preparados: la aplicación los deja hechos en su vuelta de cada hora.'); }
    var cursos = INDICE_DATOS.cursos || [];
    if (!cursos.length) throw new Error('Los listados todavía no están preparados.');
    var elegido = cursos.filter(function (c) { return c.curso === INDICE_DATOS.enMarcha; })[0] || cursos[0];
    var sel = $('selCurso');
    sel.textContent = '';
    cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c.curso; o.textContent = 'Curso ' + c.curso; sel.appendChild(o); });
    sel.value = elegido.curso; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { cargarCurso(sel.value).then(null, function (e) { E.problema(e.message); }); });
    $('selUnidad').addEventListener('change', pintar);
    $('porNombre').className = 'ordena'; $('porUnidad').className = 'ordena';
    $('porNombre').addEventListener('click', function () { ordenarPor('nombre'); });
    $('porUnidad').addEventListener('click', function () { ordenarPor('unidad'); });
    $('filas').addEventListener('click', function (e) {
      var tr = e.target.closest && e.target.closest('tr.fila-alumno');
      if (tr && !(e.target.closest && e.target.closest('a'))) window.open(tr.dataset.href, '_blank', 'noopener');
    });
    pintarFiltros();
    await cargarCurso(elegido.curso);
    $('pruebas').hidden = true;
    $('listado').hidden = false;
    window.MedidasWeb.listado(performance.now() - T0);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer el listado. Puede que la aplicación todavía no lo haya preparado.');
})();
