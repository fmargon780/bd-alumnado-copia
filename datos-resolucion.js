/* Generado de JsResolucion.html por web/construir-datos.mjs: no se toca a mano. */
var FILTRO_QUIENVIENE_RESOLUCION = '';      // '' | 'admitido' | 'no admitido' | 'sin'
var RESOLUCION_LISTA_ABIERTA_ = false;
var RESOLUCION_NINGUNO_ = '__ninguno__';
var RESOLUCION_OTRO_ = '__otro__';

function resolucionLeida_() { return !!(QUIENVIENE_DATOS && QUIENVIENE_DATOS.resolucion && QUIENVIENE_DATOS.resolucion.leida); }

/* El cuadre como texto de una línea: los avisos en rojo delante y, detrás, cada curso («1º ESO 60 admitidos ✓ · 12 no admitidos»). */
function resolucionTextoCuadre_(cuadre) {
  if (!cuadre) return '';
  var avisos = cuadre.avisos || [];
  var partes = (cuadre.lineas || []).filter(function (l) { return l.nivel !== 'rojo'; }).map(function (l) { return l.corto; });
  return avisos.concat(partes).join(' · ');
}

function resolucionFechaCorta_(iso) {
  var f = iso ? new Date(iso) : null;
  return f && !isNaN(f.getTime()) ? f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '';
}

/* Lo mismo que el texto, pero con el rojo y el gris puestos (para la línea de arriba de «Quién viene» y la tarjeta de Descargas). */
function resolucionCuadreHtml_(cuadre) {
  if (!cuadre) return '';
  var rojos = (cuadre.avisos || []).map(function (t) { return '<span class="res-rojo">' + escapaHtml(t) + '</span>'; });
  var resto = (cuadre.lineas || []).filter(function (l) { return l.nivel !== 'rojo'; }).map(function (l) {
    return '<span class="' + (l.nivel === 'gris' ? 'res-gris' : 'res-ok') + '">' + escapaHtml(l.corto) + '</span>';
  });
  return rojos.concat(resto).join(' · ');
}

/* La línea de arriba, a todo el ancho. */
function pintarBannerResolucion_() {
  var cont = document.getElementById('resolucionQuienViene');
  if (!cont) return;
  if (!resolucionLeida_()) { cont.innerHTML = ''; cont.classList.add('oculto'); return; }
  var r = QUIENVIENE_DATOS.resolucion;
  var fecha = resolucionFechaCorta_(r.fecha);
  cont.classList.remove('oculto');
  cont.innerHTML = '<b>Resolución de admisión' + (fecha ? ' leída el ' + fecha : '') + ':</b> ' + resolucionCuadreHtml_(r.cuadre);
}

/* ---- Filtro y columna de «Solicitudes» ---- */
function filtroResolucionHtml_() {
  if (VISTA_QUIENVIENE !== 'solicitudes' || !resolucionLeida_()) return '';
  var op = [['', 'Todos'], ['admitido', 'Admitido'], ['no admitido', 'No admitido'], ['sin', 'Sin fila en la resolución']];
  return ' <label>Resolución: <select id="filtroResolucion" onchange="cambiarFiltroResolucion_(this.value)">' + op.map(function (o) {
    return '<option value="' + o[0] + '"' + (FILTRO_QUIENVIENE_RESOLUCION === o[0] ? ' selected' : '') + '>' + escapaHtml(o[1]) + '</option>';
  }).join('') + '</select></label>';
}

function cambiarFiltroResolucion_(v) { FILTRO_QUIENVIENE_RESOLUCION = v; pintarQuienViene(); }

function pasaFiltroResolucion_(s) {
  if (!FILTRO_QUIENVIENE_RESOLUCION || !resolucionLeida_()) return true;
  var r = s.resolucion;
  if (FILTRO_QUIENVIENE_RESOLUCION === 'sin') return !r;
  return !!r && r.seccion === FILTRO_QUIENVIENE_RESOLUCION;
}

/* La celda «Resolución» de una solicitud: «Admitido», «No admitido» o vacío; los puntos del PDF si no son los del CSV; «a mano» con su botón. */
function celdaResolucionHtml_(s) {
  var r = s.resolucion;
  if (!r) return '';
  var texto = r.seccion === 'admitido' ? 'Admitido' : 'No admitido';
  var html = '<span class="chip' + (r.seccion === 'admitido' ? ' si' : '') + '">' + texto + '</span>';
  if (r.distintos) html += ' <span class="meta-revisado">(' + escapaHtml(r.puntosTexto) + ' en la resolución)</span>';
  if (s.sinSolicitud) html += ' <span class="meta-revisado">Sin solicitud</span>';
  if (r.origenFila === 'mano') {
    html += ' <span class="meta-revisado" title="' + escapaAtributo_(r.quien || '') + '">a mano</span>';
    if (!esperaCerrado_()) html += ' <button class="pequeno" onclick="quitarDeResolucion_(\'' + escapaAtributo_(r.claveFila) + '\')">Quitar</button>';
  }
  if (r.aMano && !esperaCerrado_()) {
    html += ' <button class="pequeno" title="Se emparejó a mano" onclick="deshacerEmparejarResolucion_(\'' + escapaAtributo_(r.claveEmpareje) + '\')">Deshacer emparejado</button>';
  }
  return html;
}

/* Encima de la tabla de Solicitudes: el botón de añadir y el aviso de las filas sin emparejar. */
function cabeceraResolucionSolicitudesHtml_() {
  if (!resolucionLeida_()) return '';
  /* Instrucción 103: el botón «Añadir a la resolución» es el principal del paso «Resolución de admisión»; aquí solo el aviso de lo sin emparejar. */
  return avisoResolucionSinEmparejarHtml_();
}

/* ---- «Resolución sin emparejar» ---- */
function resolucionSinEmparejar_() { return (QUIENVIENE_DATOS && QUIENVIENE_DATOS.resolucion && QUIENVIENE_DATOS.resolucion.sinEmparejar) || []; }

function avisoResolucionSinEmparejarHtml_() {
  var lista = resolucionSinEmparejar_();
  if (!lista.length) return '';
  var pendientes = lista.filter(function (s) { return !s.ninguno; }).length;
  var ningunos = lista.length - pendientes;
  var texto = pendientes + ' de la resolución sin emparejar' + (ningunos ? ' · ' + ningunos + ' marcado' + (ningunos === 1 ? '' : 's') + ' «no tiene solicitud»' : '') +
    (pendientes ? ' (una fila sin emparejar y su solicitud suelta pueden ser la misma persona y salir dos veces hasta que alguien las empareje)' : '');
  return '<p class="aviso-sobres"><a href="#" id="avisoResolucion" onclick="alternarListaResolucion_();return false">' + escapaHtml(texto) +
    (RESOLUCION_LISTA_ABIERTA_ ? ' (cerrar)' : '') + '</a></p>' + (RESOLUCION_LISTA_ABIERTA_ ? listaResolucionSinEmparejarHtml_(lista) : '');
}

function alternarListaResolucion_() { RESOLUCION_LISTA_ABIERTA_ = !RESOLUCION_LISTA_ABIERTA_; pintarQuienViene(); }

/* Las solicitudes aún libres de su curso, las más parecidas primero y luego el resto por nombre. */
function opcionesResolucionHtml_(s) {
  var libres = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.solicitudes) || []).filter(function (x) { return x.libre && !x.sinSolicitud && x.grado === s.grado; });
  var porId = {};
  libres.forEach(function (x) { porId[x.idSolicitud] = x; });
  var primeros = (s.parecidos || []).filter(function (id) { return porId[id]; });
  var resto = libres.filter(function (x) { return primeros.indexOf(x.idSolicitud) === -1; })
    .sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); }).map(function (x) { return x.idSolicitud; });
  var op = function (id) { return '<option value="' + escapaAtributo_(id) + '">' + escapaHtml(porId[id].nombre) + ' (' + escapaHtml(porId[id].grado) + ')</option>'; };
  return '<option value="">— elige la solicitud —</option>' + primeros.map(op).join('') +
    (resto.length ? '<option disabled>──────────</option>' + resto.map(op).join('') : '') +
    '<option value="' + RESOLUCION_NINGUNO_ + '">No tiene solicitud</option>';
}

function listaResolucionSinEmparejarHtml_(lista) {
  var cerrado = esperaCerrado_();
  var filas = lista.map(function (s, i) {
    var celda = s.ninguno
      ? '<span class="chip">No tiene solicitud</span> ' + (cerrado ? '' : '<button class="pequeno" onclick="deshacerNingunoResolucion_(' + i + ')">Deshacer</button>')
      : '<select class="sel-sobre"' + (cerrado ? ' disabled' : '') + ' onchange="elegirSolicitudResolucion_(' + i + ', this)">' + opcionesResolucionHtml_(s) + '</select>';
    return '<tr' + (s.ninguno ? ' class="fila-revisada"' : '') + '><td>' + escapaHtml(s.nombre) + '</td><td>' + escapaHtml(s.grado) + '</td><td>' +
      (s.seccion === 'admitido' ? 'Admitido' : 'No admitido') + '</td><td>' + escapaHtml(s.puntosTexto) + '</td><td>' + celda + '</td></tr>';
  }).join('');
  return '<table class="listado" id="tablaResolucionSinEmparejar"><thead><tr><th>Nombre en el PDF</th><th>Curso</th><th>En la resolución</th><th>Puntos</th><th>Es…</th></tr></thead><tbody>' +
    filas + '</tbody></table>';
}

/* Elegir la solicitud (o «No tiene solicitud»): cambia al momento y envía por detrás; si falla, vuelve a como estaba. Lo que depende del
   servidor (lista de espera y esperados) se vuelve a pedir al terminar. */
function elegirSolicitudResolucion_(i, select) {
  var r = QUIENVIENE_DATOS.resolucion, lista = resolucionSinEmparejar_(), s = lista[i], valor = select.value;
  if (!s || !valor) return;
  if (valor === RESOLUCION_NINGUNO_) {
    s.ninguno = true; reordenarResolucionSinEmparejar_();
    pintarQuienViene();
    llamar('webResolucionEmparejar', CURSO_VISTO, s.clave, '').then(cargarQuienViene).catch(function (err) {
      s.ninguno = false; reordenarResolucionSinEmparejar_(); pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
    });
    return;
  }
  var antes = lista.slice();
  r.sinEmparejar = lista.filter(function (x) { return x !== s; });
  pintarQuienViene();
  llamar('webResolucionEmparejar', CURSO_VISTO, s.clave, valor).then(cargarQuienViene).catch(function (err) {
    r.sinEmparejar = antes; pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

function reordenarResolucionSinEmparejar_() {
  QUIENVIENE_DATOS.resolucion.sinEmparejar.sort(function (a, b) {
    if (!!a.ninguno !== !!b.ninguno) return a.ninguno ? 1 : -1;
    return (a.grado + '|' + a.nombre) < (b.grado + '|' + b.nombre) ? -1 : 1;
  });
}

function deshacerNingunoResolucion_(i) {
  var s = resolucionSinEmparejar_()[i];
  if (!s) return;
  s.ninguno = false; reordenarResolucionSinEmparejar_();
  pintarQuienViene();
  llamar('webResolucionDeshacerEmparejar', CURSO_VISTO, s.clave).catch(function (err) {
    s.ninguno = true; reordenarResolucionSinEmparejar_(); pintarQuienViene(); avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}

/* Deshacer un emparejado hecho a mano: la fila vuelve a la lista de sin emparejar, que solo conoce el servidor: se vuelve a pedir. */
function deshacerEmparejarResolucion_(claveEmpareje) {
  llamar('webResolucionDeshacerEmparejar', CURSO_VISTO, claveEmpareje).then(cargarQuienViene)
    .catch(function (err) { avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error'); });
}

/* ---- Añadir a mano y quitar ---- */
function gradosDeResolucion_() {
  var gs = [];
  var meter = function (g) { if (g && gs.indexOf(g) === -1) gs.push(g); };
  (((QUIENVIENE_DATOS.resolucion || {}).cuadre || {}).lineas || []).forEach(function (l) { meter(l.grado); });
  (QUIENVIENE_DATOS.solicitudes || []).forEach(function (s) { meter(s.grado); });
  var orden = ['1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º BACH-h', '1º BACH-c', '2º BACH-h', '2º BACH-c', 'Aula específica'];
  return gs.sort(function (a, b) { return (orden.indexOf(a) === -1 ? 99 : orden.indexOf(a)) - (orden.indexOf(b) === -1 ? 99 : orden.indexOf(b)); });
}

function abrirAnadirResolucion_() {
  if (!resolucionLeida_() || esperaCerrado_()) return;
  document.getElementById('selResGrado').innerHTML = gradosDeResolucion_().map(function (g) {
    return '<option value="' + escapaAtributo_(g) + '">' + escapaHtml(g) + '</option>';
  }).join('');
  document.getElementById('selResSeccion').value = 'admitido';
  document.getElementById('inputResNombre').value = '';
  document.getElementById('inputResPuntos').value = '';
  repintarAlumnosResolucion_();
  document.getElementById('modalResolucion').classList.remove('oculto');
}

function cerrarAnadirResolucion_() { document.getElementById('modalResolucion').classList.add('oculto'); }

/* Los alumnos que se pueden elegir: las solicitudes de ese curso que no están ya en la resolución. */
function repintarAlumnosResolucion_() {
  var grado = document.getElementById('selResGrado').value;
  var libres = (QUIENVIENE_DATOS.solicitudes || []).filter(function (s) { return s.libre && !s.sinSolicitud && s.grado === grado; })
    .sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
  document.getElementById('selResAlumno').innerHTML = '<option value="">— elige al alumno —</option>' + libres.map(function (s) {
    return '<option value="' + escapaAtributo_(s.idSolicitud) + '">' + escapaHtml(s.nombre) + '</option>';
  }).join('') + '<option value="' + RESOLUCION_OTRO_ + '">No está en la lista</option>';
  cambiarAlumnoResolucion_();
}

function cambiarAlumnoResolucion_() {
  var v = document.getElementById('selResAlumno').value;
  document.getElementById('inputResNombre').classList.toggle('oculto', v !== RESOLUCION_OTRO_);
  var s = (QUIENVIENE_DATOS.solicitudes || []).filter(function (x) { return x.idSolicitud === v; })[0];
  if (s && s.puntos) document.getElementById('inputResPuntos').value = String(s.puntos).replace('.', ',');
}

function guardarAnadirResolucion_() {
  var v = document.getElementById('selResAlumno').value;
  var s = (QUIENVIENE_DATOS.solicitudes || []).filter(function (x) { return x.idSolicitud === v; })[0];
  var nombre = v === RESOLUCION_OTRO_ ? document.getElementById('inputResNombre').value.trim() : (s ? s.nombre : '');
  var datos = { grado: document.getElementById('selResGrado').value, seccion: document.getElementById('selResSeccion').value,
    nombre: nombre, puntos: document.getElementById('inputResPuntos').value.trim() };
  if (!nombre) { avisar('Elige al alumno o escribe su nombre.', 'error'); return; }
  cerrarAnadirResolucion_();
  limpiarAviso();
  llamar('webResolucionAnadir', CURSO_VISTO, datos).then(cargarQuienViene)
    .catch(function (e) { avisar('No he podido añadirlo. ' + mensajeDeError(e), 'error'); });
}

function quitarDeResolucion_(claveFila) {
  if (!confirm('¿Quitar a este alumno de la resolución? Solo se quitan los añadidos a mano.')) return;
  llamar('webResolucionQuitar', CURSO_VISTO, claveFila).then(cargarQuienViene)
    .catch(function (e) { avisar('No he podido quitarlo. ' + mensajeDeError(e), 'error'); });
}

/* ---- La tarjeta de Descargas ---- */
function pintarFilasResolucion_(d) {
  var cuerpo = document.getElementById('filasResolucion');
  var lista = (d && d.ficheros) || [];
  cuerpo.innerHTML = lista.length ? lista.map(function (f) {
    return '<tr><td><span class="punto ' + f.color + '"></span>' + escapaHtml(f.nombre) + grisCentroDatos_(f) + '</td>' +
      '<td>' + new Date(f.fecha).toLocaleDateString('es-ES') + '</td>' +
      '<td>' + (f.leido ? 'Leído' : (f.centroDatos ? 'Se lee al abrir esta pantalla' : 'Suéltalo aquí para leerlo')) + '</td></tr>';
  }).join('') : '<tr><td colspan="3">Todavía no se ha soltado ninguna.</td></tr>';
  document.getElementById('cuadreResolucionDescargas').innerHTML = d && d.cuadre ? resolucionCuadreHtml_(d.cuadre) : '';
}
