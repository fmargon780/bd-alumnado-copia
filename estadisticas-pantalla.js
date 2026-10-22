/* Generado de JsEstadisticas.html por web/construir-estadisticas.mjs: no se toca a mano. */
var EST_ = { vista: 'tabla', lista: null, curso: '', sello: '', datos: null, P: null, cargando: false, error: '', consultas: [], idConsulta: '', def: null, res: null, construida: false, pop: '', ancla: null, cuenta: 0 };
var EST_MEMORIA_CONSULTAS_ = 'webEstadisticasConsultas';

function estAttr(t) { return escapaHtml(t).replace(/"/g, '&quot;'); }
function estSinTildes_(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function estCampo_(clave) { return EST_.P && EST_.P.cat[clave] ? EST_.P.cat[clave].c : null; }

function estadConstruirPantalla_() {
  if (EST_.construida) return;
  EST_.construida = true;
  document.getElementById('tab-estadisticas').innerHTML =
    '<div class="est-pantalla" id="estPantalla">' +
    '<section class="est-datos"><div class="est-cabz"><label class="est-quecuenta" for="estConjunto">Qué se cuenta</label><select id="estConjunto"><option value="alumnado">Alumnos</option><option value="materias">Materias de cada alumno</option><option value="solicitudes">Solicitudes de admisión</option><option value="esperados">Alumnado esperado</option><option value="transito">Fichas de tránsito</option></select><h2>Datos del sistema</h2><input type="text" id="estBuscar" placeholder="Buscar un dato" autocomplete="off"></div><div class="est-lista" id="estLista"></div></section>' +
    '<section class="est-obra">' +
    '<div class="est-caja est-barra"><label for="estConsulta">Consulta</label><select id="estConsulta"></select><span class="est-modificada oculto" id="estModificada">con cambios sin guardar</span>' +
    '<button id="estBorrar" class="oculto">Borrar</button><button id="estGuardar">Guardar como…</button><label class="est-conpdf"><input type="checkbox" id="estGPdf" checked> Con gráfico en el PDF</label><button id="estPdf" class="destacado">PDF</button><button id="estExcel" class="destacado">Excel</button></div>' +
    '<div id="estAvisos"></div>' +
    '<div class="est-zonas"><div class="est-caja est-zona"><h3>Filas</h3><p>Cómo se agrupa, con subtotales.</p><div class="est-chips" id="estFilas"></div></div>' +
    '<div class="est-caja est-zona"><h3>Columnas</h3><p>Un dato para cruzar.</p><div class="est-chips" id="estColumna"></div></div>' +
    '<div class="est-caja est-zona"><h3>Qué se calcula</h3><p>Número, porcentaje, media o suma.</p><div class="est-chips" id="estCalculos"></div></div>' +
    '<div class="est-caja est-zona"><h3>A quién se incluye</h3><p id="estPistaFiltros">Sin nada elegido entra todo el curso.</p><div class="est-chips" id="estFiltros"></div></div></div>' +
    '<div class="est-caja est-resultado"><div class="est-pie"><span class="est-vistas"><button id="estVTabla" data-est-vista="tabla" class="si">Tabla</button><button id="estVGrafico" data-est-vista="grafico">Gráfico</button></span><span id="estCuenta"></span><span id="estPista">Pulsa una cifra para ver a esos alumnos.</span><span id="estCtrlGrafico" class="oculto"><select id="estGCalc" aria-label="Qué se pinta"></select><select id="estGTipo" aria-label="Tipo de gráfico"><option value="barras">Barras</option><option value="sectores">Sectores</option></select></span><span id="estNotaLista" class="oculto"></span><span id="estNotaCursos" class="oculto"></span><span id="estNotaNotas" class="oculto"></span><span class="est-dcha"><label for="estOrdenCol">Ordenar por</label></span>' +
    '<select id="estOrdenCol"></select><select id="estOrdenDir" aria-label="Sentido del orden"><option value="1">De menor a mayor</option><option value="-1">De mayor a menor</option></select></div>' +
    '<div class="est-rejilla" id="estRejilla"></div><div class="est-grafico oculto" id="estGrafico"></div></div></section><aside class="est-cajon oculto" id="estCajon"></aside></div>' +
    '<div class="est-pop oculto" id="estPop"></div><div class="est-tostada oculto" id="estTostada" role="status"></div>';
  var raiz = document.getElementById('tab-estadisticas');
  raiz.addEventListener('click', estadClic_);
  raiz.addEventListener('change', estadCambio_);
  document.getElementById('estBuscar').addEventListener('input', estadPintarLista_);
  document.addEventListener('click', function (ev) {
    if (!EST_.pop) return;
    var camino = ev.composedPath ? ev.composedPath() : [];   // el camino de antes de que la ventanita cambie de contenido
    var dentro = camino.some(function (el) { return el === document.getElementById('estPop') || el === EST_.ancla; });
    if (!dentro) estadCerrarPop_();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { estadCerrarPop_(); if (typeof estadCerrarLista_ === 'function' && PESTANA_ACTUAL === 'estadisticas') estadCerrarLista_(); } });
  window.addEventListener('resize', estadAjustarAlto_);
}

/* La pantalla ocupa lo que queda de la ventana, para verse entera sin bajar con la rueda: la lista y la tabla se desplazan por dentro. */
function estadAjustarAlto_() {
  var p = document.getElementById('estPantalla');
  if (!p || PESTANA_ACTUAL !== 'estadisticas') return;
  var arriba = p.getBoundingClientRect().top + (window.pageYOffset || 0);
  var main = document.querySelector('main'), abajo = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  p.style.height = Math.max(380, window.innerHeight - arriba - abajo - 6) + 'px';
}

function estadDefLimpia_() { return { conjunto: 'alumnado', filas: [], columna: '', calculos: [], filtros: {}, orden: { columna: -1, sentido: 1 } }; }

/* ---------------------------------------------------------------- pintar */

function estadPintarTodo_() {
  var rejilla = document.getElementById('estRejilla');
  if (!rejilla) return;
  if (EST_.cargando || EST_.error || EST_.errorCarga || !EST_.P) {
    if (EST_.error) rejilla.innerHTML = '<div class="est-vacio">No he podido traer los datos. ' + escapaHtml(EST_.error) + ' <a class="enlace-cabecera" onclick="cargarEstadisticas()">Reintentar</a></div>';
    else if (EST_.errorCarga) rejilla.innerHTML = '<div class="est-vacio">No he podido traer ' + escapaHtml(EST_.trayendo || 'los datos que faltan') + '. ' + escapaHtml(EST_.errorCarga) + ' <a class="enlace-cabecera" onclick="estadAsegurarYPintar_()">Reintentar</a></div>';
    else rejilla.innerHTML = '<div class="est-vacio">' + (EST_.trayendo ? 'Trayendo ' + escapaHtml(EST_.trayendo) + '…' : 'Trayendo los datos del curso…') + '</div>';
    return;
  }
  estadPintarLista_(); estadPintarConsultas_(); estadPintarZonas_(); estadPintarTabla_();
}

/* «solo desde 26-27»: un dato que no existe en alguno de los cursos elegidos (los anteriores solo traen lo que sabe el historial de Séneca). */
function estadSoloDesde_(c) {
  if (c.hist || !EST_.P || EST_.def.conjunto !== 'alumnado') return '';
  var hay = estadCursosNecesarios_().some(function (cu) { var x = EST_.cursos.filter(function (y) { return y.curso === cu; })[0]; return x && x.tipo === 'historial'; });
  if (!hay) return '';
  var cuaderno = EST_.cursos.filter(function (y) { return y.tipo === 'cuaderno'; }).map(function (y) { return y.curso; });
  return cuaderno.length ? 'solo desde ' + cuaderno[0] : '';
}

function estadPintarLista_() {
  var el = document.getElementById('estLista');
  if (!el || !EST_.P) return;
  var q = estSinTildes_(document.getElementById('estBuscar').value.trim()), ap = '', h = '';
  EST_.P.lista.forEach(function (c) {
    if (q && estSinTildes_(c.etiqueta).indexOf(q) === -1) return;
    if (c.apartado !== ap) { ap = c.apartado; h += '<div class="est-ap">' + escapaHtml(ap) + '</div>'; }
    h += '<button class="est-campo" data-est-campo="' + estAttr(c.clave) + '">' + escapaHtml(c.etiqueta) + (c.tipo === 'numero' ? ' <small>(número)</small>' : '') + (estadSoloDesde_(c) ? ' <small class="solo">' + escapaHtml(estadSoloDesde_(c)) + '</small>' : '') + '</button>';
  });
  el.innerHTML = h || '<div class="est-vacio">Ningún dato se llama así.</div>';
}

function estadPintarConsultas_() {
  var sel = document.getElementById('estConsulta');
  var h = EST_.idConsulta ? '' : '<option value="">Estadística sin guardar</option>';
  EST_.consultas.forEach(function (c) { h += '<option value="' + estAttr(c.id) + '">' + escapaHtml(c.nombre) + '</option>'; });
  sel.innerHTML = h;
  sel.value = EST_.idConsulta;
  document.getElementById('estConjunto').value = EST_.def ? EST_.def.conjunto : 'alumnado';
  var c = estadConsulta_(EST_.idConsulta);
  var puede = c && !c.base && (String(c.quien).toLowerCase() === String(MI_CORREO || '').toLowerCase() || miPapel_().rol === 'admin');
  document.getElementById('estBorrar').classList.toggle('oculto', !puede);
  document.getElementById('estModificada').classList.toggle('oculto', !(c && estadEsModificada_()));
}

function estadChip_(texto, quita, extra, edita) {
  return '<span class="est-chip">' + (edita ? '<button class="txt" title="Cambiar" ' + edita + '>' + escapaHtml(texto) + '</button>' : '<span>' + escapaHtml(texto) + '</span>') + (extra || '') +
    '<button title="Quitar" aria-label="Quitar" ' + quita + '>×</button></span>';
}

function estadPintarZonas_() {
  var d = EST_.def, h = '';
  d.filas.forEach(function (k, i) {
    var c = estCampo_(k);
    h += estadChip_((i + 1) + '. ' + (c ? c.etiqueta : k), 'data-est-quita-fila="' + i + '"', i > 0 ? '<button title="Agrupar antes por este dato" aria-label="Subir" data-est-sube-fila="' + i + '">↑</button>' : '');
  });
  document.getElementById('estFilas').innerHTML = h + '<button class="est-mas" data-est-mas="fila">+ Añadir</button>';
  document.getElementById('estColumna').innerHTML = (d.columna ? estadChip_(estCampo_(d.columna).etiqueta, 'data-est-quita-col="1"') : '') +
    '<button class="est-mas" data-est-mas="col">' + (d.columna ? 'Cambiar' : '+ Añadir') + '</button>';
  h = '';
  d.calculos.forEach(function (c, i) { h += estadChip_(estadEtiquetaCalculo(EST_.P, c), 'data-est-quita-calc="' + i + '"', '', 'data-est-edita-calc="' + i + '"'); });
  document.getElementById('estCalculos').innerHTML = h + '<button class="est-mas" data-est-mas="calc">+ Añadir cálculo</button>';
  h = '';
  Object.keys(d.filtros).forEach(function (k) {
    var v = d.filtros[k].map(function (x) { return x === '@ultimoConNotas' ? 'el último curso con notas' : x; }), c = estCampo_(k);
    h += estadChip_((c ? c.etiqueta : k) + ': ' + (v.length <= 3 ? v.join(', ') : v.length + ' valores'), 'data-est-quita-filtro="' + estAttr(k) + '"', '', 'data-est-filtro="' + estAttr(k) + '"');
  });
  document.getElementById('estFiltros').innerHTML = h + '<button class="est-mas" data-est-mas="filtro">+ Añadir</button>';
  document.getElementById('estPistaFiltros').textContent = 'Sin nada elegido entra todo el curso ' + EST_.curso + '.';
}

function estadPintarTabla_() {
  var d = EST_.def, rejilla = document.getElementById('estRejilla');
  var t0 = Date.now();
  var res = EST_.res = estadCalcular(EST_.P, d);
  var plural = { alumnado: ['alumno incluido', 'alumnos incluidos'], solicitudes: ['solicitud incluida', 'solicitudes incluidas'], esperados: ['alumno esperado incluido', 'alumnos esperados incluidos'], transito: ['ficha incluida', 'fichas incluidas'] }[d.conjunto];
  if (d.conjunto === 'materias') document.getElementById('estCuenta').innerHTML = '<b>' + estadMiles(res.incluidos) + '</b> ' + (res.incluidos === 1 ? 'materia' : 'materias') + ' de <b>' + estadMiles(res.alumnosDistintos) + '</b> ' + (res.alumnosDistintos === 1 ? 'alumno' : 'alumnos');
  else document.getElementById('estCuenta').innerHTML = '<b>' + estadMiles(res.incluidos) + '</b> ' + plural[res.incluidos === 1 ? 0 : 1];
  var cursosEn = {}; res.ids.forEach(function (i) { cursosEn[EST_.P.alumnos[i].c] = true; });
  var variosCursos = d.conjunto !== 'materias' && Object.keys(cursosEn).length > 1 && d.filas.indexOf('cursoEscolar') === -1 && d.columna !== 'cursoEscolar';
  var nc2 = document.getElementById('estNotaCursos');
  nc2.classList.toggle('oculto', !variosCursos);
  nc2.textContent = 'Un alumno que estuvo en varios de los cursos cuenta una vez en cada uno.';
  var conNotas = d.conjunto === 'materias' && res.ids.some(function (i) { return EST_.P.alumnos[i].v[EST_.P.cat.queEs.i] === 'Nota de un curso pasado'; });
  var nn = document.getElementById('estNotaNotas');
  nn.classList.toggle('oculto', !conNotas);
  nn.textContent = 'Solo cuenta al alumnado que sigue en el centro.';
  var nota = document.getElementById('estNotaLista');
  nota.classList.toggle('oculto', !res.hayLista);
  nota.textContent = 'Un alumno con varios valores cuenta en cada uno; los subtotales y el total cuentan alumnos distintos.';
  var nc = d.calculos.length, op = '<option value="-1">' + escapaHtml(d.filas.length ? d.filas.map(function (k) { return estCampo_(k).etiqueta; }).join(' y ') : 'Sin agrupar') + '</option>';
  res.columnas.forEach(function (cv, a) {
    res.calculos.forEach(function (c, b) { op += '<option value="' + (a * nc + b) + '">' + escapaHtml(c.etiqueta + (d.columna ? ' · ' + (cv === null ? 'Total' : cv) : '')) + '</option>'; });
  });
  var sel = document.getElementById('estOrdenCol');
  sel.innerHTML = op; sel.value = String(d.orden.columna); document.getElementById('estOrdenDir').value = String(d.orden.sentido);
  if (!EST_.P.alumnos.length) rejilla.innerHTML = '<div class="est-vacio">' + escapaHtml(estadEsOtro_(d.conjunto) && EST_.vacio ? EST_.vacio : 'Este curso todavía no tiene alumnado cargado.') + '</div>';
  else if (res.columnaDemasiada) rejilla.innerHTML = '<div class="est-vacio">«' + escapaHtml(estCampo_(d.columna).etiqueta) + '» tiene ' + res.columnaDemasiada + ' valores distintos: es demasiado para columnas. Va mejor en las filas.</div>';
  else if (!nc) rejilla.innerHTML = '<div class="est-vacio">Añade algún cálculo en «Qué se calcula» para ver la tabla.</div>';
  else rejilla.innerHTML = estadTablaHtml(EST_.P, d, res);
  estadPintarGrafico_();
  EST_.ultimoMs = Date.now() - t0;
}

/* La vista «Tabla» o «Gráfico», los desplegables del gráfico y el dibujo (sin llamar al servidor). */
function estadPintarGrafico_() {
  var d = EST_.def, res = EST_.res, g = d.grafico, graf = document.getElementById('estGrafico'), enGrafico = EST_.vista === 'grafico';
  document.getElementById('estRejilla').classList.toggle('oculto', enGrafico);
  graf.classList.toggle('oculto', !enGrafico);
  document.getElementById('estCtrlGrafico').classList.toggle('oculto', !enGrafico);
  document.getElementById('estPista').classList.toggle('oculto', enGrafico);
  document.getElementById('estVTabla').classList.toggle('si', !enGrafico);
  document.getElementById('estVGrafico').classList.toggle('si', enGrafico);
  if (g.calculo >= res.calculos.length) g.calculo = 0;
  document.getElementById('estGPdf').checked = g.enPdf;
  var sel = document.getElementById('estGCalc');
  sel.innerHTML = res.calculos.map(function (c, i) { return '<option value="' + i + '">' + escapaHtml(c.etiqueta) + '</option>'; }).join('');
  sel.value = String(g.calculo); document.getElementById('estGTipo').value = g.tipo;
  if (!enGrafico) return;
  if (!EST_.P.alumnos.length || res.columnaDemasiada || !res.calculos.length) { graf.innerHTML = '<div class="est-vacio">Primero tiene que haber una tabla que pintar.</div>'; return; }
  var r = estadGrafico(EST_.P, d, res, g);
  graf.innerHTML = r.aviso ? '<div class="est-vacio">' + escapaHtml(r.aviso) + '</div>' : (r.nota ? '<div class="est-nota">' + escapaHtml(r.nota) + '</div>' : '') + r.svg;
}

function estadCambiaDef_() {
  estadCerrarLista_();
  EST_.res = null;
  estadAsegurarYPintar_();   // pide lo que falte (otro curso, las materias); si no falta nada, solo repinta
}

function estadTostada_(texto) {
  var e = document.getElementById('estTostada');
  e.textContent = texto; e.classList.remove('oculto');
  clearTimeout(EST_.tt);
  EST_.tt = setTimeout(function () { e.classList.add('oculto'); }, 4200);
}
