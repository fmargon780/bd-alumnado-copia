/* Arranque de «Revisión» de la web nueva (instrucción 138, parte 3): lee de la carpeta privada el índice y el fichero del curso y dibuja la «Revisión» de hoy (avisos, matrícula con el cuadre debajo, cambios para Séneca y oferta de materias),
   y, desde la instrucción 139, «Revisado, no es error», «Hecho» y «Deshacer» se escriben aquí mismo (escritura.js: se deja una petición que la aplicación aplica); editar la oferta sigue en «Cambiar en la app de hoy». Pulsar el nombre de un alumno abre su ficha nueva. Los filtros se recuerdan en
   este navegador con la misma clave que la app de hoy. Las cuentas son de revision-base.js. */
(function () {
  'use strict';
  var C = window.CarpetaWeb, E = window.EntrarWeb, B = window.RevisionBase, X = window.EscrituraWeb;
  var $ = function (id) { return document.getElementById(id); };
  var T0 = performance.now();
  var INDICE = '_revision-indice.json';
  var IND = null, CURSO = '', DATOS = null, POR_NOMBRE = {}, HORA = '', CONTROL = null, REV = null, OF = null;   // REV: la lectura con lo ya pedido por encima; OF: la oferta que se está editando (copia de la del fichero)
  var OF_ERRORES = {}, OF_SUCIO = false, OF_GUARDANDO = false, OF_MENSAJE = '';
  /* Instrucción 149: dentro de una tarea, el paso lo dice la dirección (`?tarea=inicio&paso=avisos`) y la fila de pasos la pinta el menú; sin tarea, quedan las pestañas de siempre. */
  var ENTRADA_VISTA = (function () {
    var q = new URLSearchParams(location.search), tarea = q.get('tarea'), paso = q.get('paso');
    var p = (tarea && window.HoyBase) ? window.HoyBase.pasosDeTarea({}, tarea).filter(function (x) { return x.clave === paso && x.tab === 'revision'; })[0] : null;
    return p ? p.vista : '';
  })();
  var VISTA = ENTRADA_VISTA || 'avisos', TIPO = '', ORDEN = { campo: 'curso', asc: true }, CUADRE_TOCADO = null, FILTRO_OFERTA = null;   // null: todavía no se ha elegido curso en la oferta
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
    var caja = $('pestanas'), cuentas = B.contadores(REV);
    caja.textContent = '';
    caja.hidden = !!ENTRADA_VISTA;   // dentro de una tarea no se ven (los pasos los pinta el menú), pero se siguen poniendo al día
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
    var caja = $('filtros'), op = B.opciones(REV, VISTA);
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
    if (!CONTROL) td.appendChild(enlaceApp(f.revisado ? 'Deshacer en la app de hoy' : accion + ' (en la app de hoy)'));
    else {
      var b = el('button', 'pequeno', f.revisado ? 'Deshacer' : accion);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (f.revisado) { CONTROL.pedir('webRevisionDeshacer', [CURSO, f.tipo, f.clave]); return; }
        var nota = window.prompt('Nota (opcional, una línea):', '') || '';   // como hoy: cancelar es dejarla en blanco
        CONTROL.pedir('webRevisionMarcar', [CURSO, f.tipo, f.clave, nota]);
      });
      td.appendChild(b);
    }
    return tr;
  }

  function pintarCuadre() {
    var det = $('cuadreEnComprobar');
    det.hidden = VISTA !== 'matricula';
    if (VISTA !== 'matricula') return;
    det.open = B.cuadreAbierto(REV, CUADRE_TOCADO);
    $('resumenCuadre').textContent = B.resumenCuadre(REV);
    var cuerpo = $('filasCuadre');
    cuerpo.textContent = '';
    var filas = B.filas(REV, 'cuadre', { curso: FILTROS.curso, unidad: FILTROS.unidad, verRevisados: FILTROS.verRevisados }, ORDEN);
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
    var filas = B.filas(REV, VISTA, { curso: FILTROS.curso, unidad: FILTROS.unidad, tipo: TIPO, verRevisados: FILTROS.verRevisados }, ORDEN);
    $('resumen').textContent = B.resumen(REV, VISTA, filas.length);
    var cuerpo = $('filas');
    cuerpo.textContent = '';
    var trozo = document.createDocumentFragment();
    filas.forEach(function (f) { trozo.appendChild(filaLinea(f, info.accion)); });
    if (!filas.length) { var v = el('tr'); celda(v, 'Nada que revisar aquí.').colSpan = 5; trozo.appendChild(v); }
    cuerpo.appendChild(trozo);
    pintarCuadre();
  }

  /* ---------------------------------------------------------------- la oferta de materias, solo para leer */
  /* Instrucción 139, parte 2: la oferta se edita aquí (como en la app de hoy: añadir fila, quitar fila con confirmación y un solo «Guardar»; si alguna celda no vale no se guarda nada y se marca). */
  function ofertaEditable() { return !!(CONTROL && DATOS.oferta && DATOS.oferta.editable); }
  function ofertaCambia(i, c, valor) {
    OF[i][c] = valor; OF_SUCIO = true; OF_MENSAJE = '';
    if (OF_ERRORES[i] && OF_ERRORES[i][c]) delete OF_ERRORES[i][c];
    var b = $('botonGuardarOferta'); if (b) b.disabled = false;
    var d = $('botonDescartarOferta'); if (d) d.disabled = false;
  }
  function ofertaGuardar() {
    if (OF_GUARDANDO) return;
    /* Las filas enteramente vacías no se mandan (el servidor tampoco las cuenta): así el número de fila de los errores es el de aquí. */
    var indices = [];
    OF.forEach(function (f, i) { if (f.some(function (v) { return String(v).trim() !== ''; })) indices.push(i); });
    var enviar = indices.map(function (i) { return OF[i].slice(); });
    OF_GUARDANDO = true; OF_ERRORES = {}; pintarOferta();
    CONTROL.pedir('webOfertaGuardar', [CURSO, enviar]).then(function (e) {
      OF_GUARDANDO = false;
      if (e.estado !== 'hecha') { OF_MENSAJE = ''; pintarOferta(); window.alert('No he podido guardar la oferta. ' + (e.error || '')); return; }
      var r = e.resultado || {};
      if (!r.ok) {
        (r.errores || []).forEach(function (er) { var real = indices[er.fila]; (OF_ERRORES[real] = OF_ERRORES[real] || {})[er.columna] = er.texto; });
        OF_MENSAJE = 'No se ha guardado nada: hay ' + (r.errores || []).length + ' celda(s) que no valen. Están marcadas en rojo.';
        pintarOferta();
        return;
      }
      OF = enviar.map(function (f) { return f.slice(); });
      DATOS.oferta.filas = enviar.map(function (f) { return f.slice(); });
      OF_SUCIO = false; OF_MENSAJE = 'Guardado. Se aplicará en la próxima actualización de datos.';
      pintarOferta();
    });
  }
  function pintarOfertaEditable(o, tabla, nota) {
    if (!OF) { OF = o.filas.map(function (f) { return f.slice(); }); OF_ERRORES = {}; OF_SUCIO = false; OF_MENSAJE = ''; }
    var viejas = document.querySelectorAll('#tarjetaOferta datalist, #tarjetaOferta .of-botones');
    Array.prototype.forEach.call(viejas, function (x) { x.parentNode.removeChild(x); });
    function lista(id, valores) { var d = el('datalist'); d.id = id; valores.concat(id === 'ofListaQuien' ? ['Solo quienes cursan '] : []).forEach(function (v) { var op = el('option'); op.value = v; d.appendChild(op); }); return d; }
    $('tarjetaOferta').appendChild(lista('ofListaQuien', o.opcionesQuien || []));
    $('tarjetaOferta').appendChild(lista('ofListaColumna', o.columnas || []));
    nota.textContent = 'Aquí se edita la oferta de materias: «Añadir fila», «Quitar» (se confirma) y un solo «Guardar». Se aplica en la próxima actualización de datos.';
    var cab = el('tr');
    o.titulos.forEach(function (t) { cab.appendChild(el('th', '', B.tituloOferta(t))); });
    cab.appendChild(el('th'));
    tabla.appendChild(el('thead')).appendChild(cab);
    var cuerpo = el('tbody');
    OF.forEach(function (f, i) {
      if (FILTRO_OFERTA && f[0] !== FILTRO_OFERTA) return;
      var tr = el('tr');
      f.forEach(function (v, c) {
        var td = el('td'), inp = el('input'), mal = (OF_ERRORES[i] || {})[c];
        inp.type = 'text'; inp.value = v;
        if (c === 2) inp.setAttribute('list', 'ofListaQuien'); else if (c === 6) inp.setAttribute('list', 'ofListaColumna');
        if (mal) { inp.className = 'of-mal'; inp.title = mal; }
        inp.addEventListener('input', function () { ofertaCambia(i, c, inp.value); });
        td.appendChild(inp);
        if (mal) td.appendChild(el('div', 'of-error', mal));
        tr.appendChild(td);
      });
      var tq = el('td'), q = el('button', 'pequeno peligro', '✕');
      q.type = 'button'; q.title = 'Quitar fila';
      q.addEventListener('click', function () {
        if (!window.confirm('¿Quitar la fila «' + (f[1] || 'sin materia') + '» (' + (f[0] || 'sin curso') + ')? No se borra de verdad hasta que pulses «Guardar».')) return;
        OF.splice(i, 1); OF_ERRORES = {}; OF_SUCIO = true; OF_MENSAJE = ''; pintarOferta();
      });
      tq.appendChild(q); tr.appendChild(tq);
      cuerpo.appendChild(tr);
    });
    if (!cuerpo.firstChild) { var v = el('tr'); celda(v, o.existe ? 'Este curso no tiene materias en la oferta.' : 'Todavía no hay oferta de materias escrita: se crea al guardar.').colSpan = o.titulos.length + 1; cuerpo.appendChild(v); }
    tabla.appendChild(cuerpo);
    var barra = el('div', 'fila-botones of-botones');
    var anadir = el('button', 'pequeno', 'Añadir fila'); anadir.type = 'button';
    anadir.addEventListener('click', function () { var n = ['', '', '', '', '', '', '', '']; n[0] = FILTRO_OFERTA || ''; OF.push(n); OF_SUCIO = true; OF_MENSAJE = ''; pintarOferta(); });
    var guardar = el('button', 'principal pequeno', 'Guardar'); guardar.type = 'button'; guardar.id = 'botonGuardarOferta'; guardar.disabled = !(OF_SUCIO && !OF_GUARDANDO);
    guardar.addEventListener('click', ofertaGuardar);
    var descartar = el('button', 'pequeno', 'Descartar los cambios'); descartar.type = 'button'; descartar.id = 'botonDescartarOferta'; descartar.disabled = !OF_SUCIO;
    descartar.addEventListener('click', function () { if (!window.confirm('¿Descartar los cambios sin guardar?')) return; OF = null; pintarOferta(); });
    [anadir, guardar, descartar].forEach(function (b) { barra.appendChild(b); });
    if (Object.keys(OF_ERRORES).length || OF_MENSAJE) barra.appendChild(el('span', Object.keys(OF_ERRORES).length ? 'of-error-resumen' : 'of-nota', OF_MENSAJE));
    $('tarjetaOferta').appendChild(barra);
  }

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
    if (ofertaEditable()) { pintarOfertaEditable(o, tabla, nota); return; }
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

  /* El menú (menu.js) deja pasar sin recargar los pasos que esta pantalla sabe enseñar. */
  window.MenuPasoEnSitio = function (tarea, paso) {
    var p = window.HoyBase.pasosDeTarea({}, tarea).filter(function (x) { return x.clave === paso && x.tab === 'revision'; })[0];
    if (!p || !DATOS) return false;
    VISTA = p.vista; TIPO = '';
    pintar();
    return true;
  };

  function pintar() {
    REV = CONTROL ? B.superponer(DATOS.rev, CONTROL.entradas(), { curso: CURSO, miCorreo: IND.miCorreo || '', hora: HORA }) : DATOS.rev;
    pintarPestanas();
    var oferta = VISTA === 'oferta', excel = VISTA === 'excel';
    $('tarjetaRevision').hidden = oferta || excel;
    $('tarjetaOferta').hidden = !oferta;
    $('tarjetaExcel').hidden = !excel;
    if (excel) { var a = $('enlaceExcel'); if (IND && IND.urlApp) a.href = IND.urlApp; return; }   // el Excel de Jefatura todavía se hace en la app de hoy
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
    HORA = c.hora || IND.hora || '';
    OF = null;
    if (CONTROL) await CONTROL.cargar(HORA);
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
    /* Instrucción 139: se escribe aquí solo si la aplicación ha preparado las subcarpetas de peticiones; si no, quedan los enlaces a la app de hoy. */
    if (await X.preparar()) {
      CONTROL = X.controlador({ alCambiar: function () { if (DATOS) pintar(); }, alMedir: function (ms) { window.MedidasWeb.escribir(ms); },
        alEstado: function (texto, error) { var l = $('escritura'); l.textContent = texto || ''; l.className = 'estado-escritura' + (error ? ' estado-error' : ''); l.hidden = !texto; } });
    }
    await cargarCurso(elegido.curso);
    $('pruebas').hidden = true;
    $('revision').hidden = false;
    window.MedidasWeb.revision(performance.now() - T0);
  }

  window.WebNueva = { resumenMedidas: function () { return window.MedidasWeb.resumen(); } };
  E.empezar(cargar, 'No he podido leer «Revisión». Puede que la aplicación todavía no la haya preparado.');
})();
