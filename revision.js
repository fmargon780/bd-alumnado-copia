/* Arranque de «Revisión» de la web nueva (instrucción 138, parte 3): lee de la carpeta privada el índice y el fichero del curso y dibuja la «Revisión» de hoy (avisos, matrícula con el cuadre debajo, cambios para Séneca y oferta de materias),
   solo para leer. Donde la de hoy tiene un botón que escribe («Revisado, no es error», «Hecho», «Deshacer», editar la oferta) esta pone «Cambiar en la app de hoy». Pulsar el nombre de un alumno abre su ficha nueva. Los filtros se recuerdan en
   este navegador con la misma clave que la app de hoy. Las cuentas son de revision-base.js. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, B = window.RevisionBase;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var INDICE = '_revision-indice.json';
  var IND = null, CURSO = '', DATOS = null, POR_NOMBRE = {};
  var VISTA = 'avisos', TIPO = '', ORDEN = { campo: 'curso', asc: true }, CUADRE_TOCADO = null, FILTRO_OFERTA = null;   // null: todavía no se ha elegido curso en la oferta
  var FILTROS = filtrosGuardados();

  $('version').textContent = window.VERSION_WEB + ' · ' + (window.COMMIT_WEB || 'sin-marca') + (E.DESDE_DISCO ? ' · copia sin internet' : '');

  function filtrosGuardados() { try { var g = localStorage.getItem('bdAlumnado_filtrosRevision'); return g ? JSON.parse(g) : { curso: '', unidad: '', verRevisados: false }; } catch (e) { return { curso: '', unidad: '', verRevisados: false }; } }
  function guardarFiltros() { try { localStorage.setItem('bdAlumnado_filtrosRevision', JSON.stringify(FILTROS)); } catch (e) { /* no pasa nada */ } }

  function el(t, clase, texto) { var e = document.createElement(t); if (clase) e.className = clase; if (texto !== undefined && texto !== null) e.textContent = texto; return e; }
  function celda(fila, hijo, clase) { var td = el('td', clase); if (typeof hijo === 'string') td.textContent = hijo; else if (hijo) td.appendChild(hijo); fila.appendChild(td); return td; }
  function enlaceApp(texto) {
    var a = el('a', 'cambiar-app', texto || 'Cambiar en la app de hoy');
    if (IND && IND.urlApp) a.href = IND.urlApp;
    a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  /* ---------------------------------------------------------------- pestañas y filtros */
  function pintarPestanas() {
    var caja = $('pestanas'), cuentas = B.contadores(DATOS.rev);
    caja.textContent = '';
    B.VISTAS.forEach(function (v) {
      var b = el('button', v.clave === VISTA ? 'actual' : '', v.etiqueta);
      b.type = 'button';
      if (!v.pantalla) {
        var n = (cuentas[v.clave] || 0) + (v.clave === 'matricula' ? (cuentas.cuadre || 0) : 0);
        b.appendChild(el('span', 'cuenta' + (n ? '' : ' cero'), String(n)));
      }
      b.addEventListener('click', function () { VISTA = v.clave; TIPO = ''; pintar(); });
      caja.appendChild(b);
    });
  }

  function select(opciones, valor, todos, alCambiar) {
    var s = el('select');
    var o0 = el('option', '', todos); o0.value = ''; s.appendChild(o0);
    opciones.forEach(function (x) { var o = el('option', '', x); o.value = x; s.appendChild(o); });
    s.value = valor || '';
    s.addEventListener('change', function () { alCambiar(s.value); });
    return s;
  }
  function etiqueta(texto, hijo) { var l = el('label'); l.appendChild(document.createTextNode(texto)); l.appendChild(hijo); return l; }

  function pintarFiltros() {
    var caja = $('filtros'), op = B.opciones(DATOS.rev, VISTA);
    caja.textContent = '';
    caja.appendChild(etiqueta('Curso: ', select(op.cursos, FILTROS.curso, 'Todos', function (v) { FILTROS.curso = v; guardarFiltros(); pintar(); })));
    caja.appendChild(etiqueta('Unidad: ', select(op.unidades, FILTROS.unidad, 'Todas', function (v) { FILTROS.unidad = v; guardarFiltros(); pintar(); })));
    if (VISTA === 'avisos') caja.appendChild(etiqueta('Tipo de aviso: ', select(op.tipos, TIPO, 'Todos', function (v) { TIPO = v; pintar(); })));
    var i = el('input'); i.type = 'checkbox'; i.checked = !!FILTROS.verRevisados;
    i.addEventListener('change', function () { FILTROS.verRevisados = i.checked; guardarFiltros(); pintar(); });
    var l = el('label'); l.appendChild(i); l.appendChild(document.createTextNode(' Ver también los revisados'));
    caja.appendChild(l);
  }

  /* ---------------------------------------------------------------- las listas */
  function filaLinea(f, accion) {
    var tr = el('tr', f.revisado ? 'fila-revisada' : '');
    celda(tr, f.curso); celda(tr, f.unidad);
    var alumno = null;
    if (f.alumno) {
      var k = POR_NOMBRE[B.normalizar(f.alumno)];
      if (k) {
        alumno = el('a', '', f.alumno);
        alumno.href = 'ficha.html?clave=' + encodeURIComponent(k.clave) + '&curso=' + encodeURIComponent(CURSO) + '&unidad=' + encodeURIComponent(k.unidad || '');
        alumno.target = '_blank'; alumno.rel = 'noopener';
      } else alumno = f.alumno;
    }
    celda(tr, alumno || '—');
    celda(tr, f.frase, 'frase-revision');
    var td = celda(tr, null);
    if (f.revisado) td.appendChild(el('span', 'meta-revisado', B.textoRevisado(f.revisado, IND.nombres) + ' '));
    td.appendChild(enlaceApp(f.revisado ? 'Deshacer en la app de hoy' : accion + ' (en la app de hoy)'));
    return tr;
  }

  function pintarCuadre() {
    var det = $('cuadreEnComprobar');
    det.hidden = VISTA !== 'matricula';
    if (VISTA !== 'matricula') return;
    det.open = B.cuadreAbierto(DATOS.rev, CUADRE_TOCADO);
    $('resumenCuadre').textContent = B.resumenCuadre(DATOS.rev);
    var cuerpo = $('filasCuadre');
    cuerpo.textContent = '';
    var filas = B.filas(DATOS.rev, 'cuadre', { curso: FILTROS.curso, unidad: FILTROS.unidad, verRevisados: FILTROS.verRevisados }, ORDEN);
    filas.forEach(function (f) { cuerpo.appendChild(filaLinea(f, B.ACCION_CUADRE)); });
    if (!filas.length) { var v = el('tr'); celda(v, 'Nada que no cuadre.').colSpan = 5; cuerpo.appendChild(v); }
    var tablas = $('tablasCuadre');
    tablas.textContent = '';
    if (!(DATOS.rev.cuadreTablas || []).length) return;
    tablas.appendChild(el('h3', 'cuadre-titulo', 'Las tres tablas del cuadre, enteras'));
    DATOS.rev.cuadreTablas.forEach(function (t) {
      var d = el('details', 'cuadre-tabla'), s = el('summary', '', t.subtipo + ' ');
      s.appendChild(el('span', 'cuadre-estado' + (t.noCuadran ? ' no' : ''), '· ' + B.estadoTablaCuadre(t)));
      d.appendChild(s);
      var e = (DATOS.cuadre || []).filter(function (x) { return x.subtipo === t.subtipo; })[0];
      d.appendChild(tablaCuadre(e));
      tablas.appendChild(d);
    });
  }

  function tablaCuadre(t) {
    if (!t || !t.titulos.length) return el('p', 'cuadre-vacio', 'Todavía no hay nada en esta tabla: se escribe con «Actualizar los datos».');
    var caja = el('div', 'caja-tabla'), tabla = el('table', 'listado cuadre-t'), cab = el('tr');
    t.titulos.forEach(function (x) { cab.appendChild(el('th', '', x)); });
    cab.appendChild(el('th'));
    tabla.appendChild(el('thead')).appendChild(cab);
    var cuerpo = el('tbody');
    t.filas.forEach(function (f) {
      var tr = el('tr', f.no ? 'cuadre-no' : '');
      f.v.forEach(function (v) { celda(tr, v); });
      celda(tr, f.no ? '⚠ no cuadra' : '', f.no ? 'cuadre-marca' : '');
      cuerpo.appendChild(tr);
    });
    tabla.appendChild(cuerpo); caja.appendChild(tabla);
    return caja;
  }

  function ordenarPor(campo) { if (ORDEN.campo === campo) ORDEN.asc = !ORDEN.asc; else { ORDEN.campo = campo; ORDEN.asc = true; } pintar(); }

  function pintarLista() {
    var info = B.VISTAS.filter(function (v) { return v.clave === VISTA; })[0];
    var cab = $('cabecera');
    cab.textContent = '';
    [['curso', 'Curso'], ['unidad', 'Unidad'], ['alumno', 'Alumno/a'], ['frase', 'Qué pasa']].forEach(function (c) {
      var th = el('th', 'ordena', c[1]);
      th.addEventListener('click', function () { ordenarPor(c[0]); });
      cab.appendChild(th);
    });
    cab.appendChild(el('th'));
    pintarFiltros();
    var filas = B.filas(DATOS.rev, VISTA, { curso: FILTROS.curso, unidad: FILTROS.unidad, tipo: TIPO, verRevisados: FILTROS.verRevisados }, ORDEN);
    $('resumen').textContent = B.resumen(DATOS.rev, VISTA, filas.length);
    var cuerpo = $('filas');
    cuerpo.textContent = '';
    var trozo = document.createDocumentFragment();
    filas.forEach(function (f) { trozo.appendChild(filaLinea(f, info.accion)); });
    if (!filas.length) { var v = el('tr'); celda(v, 'Nada que revisar aquí.').colSpan = 5; trozo.appendChild(v); }
    cuerpo.appendChild(trozo);
    pintarCuadre();
  }

  /* ---------------------------------------------------------------- la oferta de materias, solo para leer */
  function pintarOferta() {
    var o = DATOS.oferta, tabla = $('tablaOferta');
    tabla.textContent = '';
    var sel = $('selOferta');
    sel.textContent = '';
    var todos = el('option', '', 'Todos'); todos.value = ''; sel.appendChild(todos);
    ((o && o.cursos) || []).forEach(function (c) { var x = el('option', '', c); x.value = c; sel.appendChild(x); });
    if (FILTRO_OFERTA === null) FILTRO_OFERTA = (o && o.cursos && o.cursos.length) ? o.cursos[0] : '';
    sel.value = FILTRO_OFERTA;
    var nota = $('notaOferta');
    nota.textContent = '';
    if (!o) { nota.textContent = 'La oferta todavía no está preparada: la aplicación la deja hecha en su vuelta de cada hora.'; return; }
    nota.appendChild(document.createTextNode('Para cambiar la oferta de materias: '));
    nota.appendChild(enlaceApp('Cambiar en la app de hoy'));
    var cab = el('tr');
    o.titulos.forEach(function (t) { cab.appendChild(el('th', '', B.tituloOferta(t))); });
    tabla.appendChild(el('thead')).appendChild(cab);
    var cuerpo = el('tbody');
    var filas = B.filasOferta(o, FILTRO_OFERTA);
    filas.forEach(function (f) { var tr = el('tr'); f.forEach(function (v) { celda(tr, v); }); cuerpo.appendChild(tr); });
    if (!filas.length) { var v = el('tr'); celda(v, o.existe ? 'Este curso no tiene materias en la oferta.' : 'Todavía no hay oferta de materias escrita.').colSpan = o.titulos.length; cuerpo.appendChild(v); }
    tabla.appendChild(cuerpo);
  }

  function pintar() {
    pintarPestanas();
    var oferta = VISTA === 'oferta';
    $('tarjetaRevision').hidden = oferta;
    $('tarjetaOferta').hidden = !oferta;
    if (oferta) pintarOferta(); else pintarLista();
  }

  async function cargarCurso(curso) {
    var c = (IND.cursos || []).filter(function (x) { return x.curso === curso; })[0];
    if (!c) throw new Error('No encuentro ese curso entre las revisiones preparadas.');
    DATOS = await C.leerJson(c.fichero);
    CURSO = curso; CUADRE_TOCADO = null; FILTRO_OFERTA = null;
    POR_NOMBRE = {};
    try { var b = await C.leerJson('_buscador-' + curso + '.json'); POR_NOMBRE = B.indicePorNombre(b.alumnos); } catch (e) { /* sin buscador, los nombres salen sin enlace */ }
    $('datos').textContent = E.lineaHora(c.hora || IND.hora);
    pintar();
  }

  async function cargar() {
    try { IND = await C.leerJson(INDICE); } catch (e) { throw new Error('«Revisión» todavía no está preparada: la aplicación la deja hecha en su vuelta de cada hora.'); }
    var cursos = IND.cursos || [];
    if (!cursos.length) throw new Error('«Revisión» todavía no está preparada.');
    var elegido = cursos.filter(function (c) { return c.curso === IND.enMarcha; })[0] || cursos[0];
    var sel = $('selCurso');
    sel.textContent = '';
    cursos.forEach(function (c) { var o = el('option', '', 'Curso ' + c.curso); o.value = c.curso; sel.appendChild(o); });
    sel.value = elegido.curso; sel.hidden = cursos.length < 2;
    sel.addEventListener('change', function () { FILTROS.curso = ''; FILTROS.unidad = ''; cargarCurso(sel.value).then(null, function (e) { E.problema(e.message); }); });
    $('selOferta').addEventListener('change', function () { FILTRO_OFERTA = $('selOferta').value; pintarOferta(); });
    $('resumenCuadre').addEventListener('click', function () { CUADRE_TOCADO = !$('cuadreEnComprobar').open; });   // como hoy: lo que la persona toca manda
    await cargarCurso(elegido.curso);
    $('pruebas').hidden = true;
    $('revision').hidden = false;
    window.MedidasWeb.revision(performance.now() - T0);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Revisión». Puede que la aplicación todavía no la haya preparado.');
})();
