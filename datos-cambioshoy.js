/* Generado de JsCambiosHoy.html por web/construir-datos.mjs: no se toca a mano. */
var CAMBIOS_HOY_MAX_ = 5, CAMBIOS_HOY_DIAS_ = 7;
var MESES_ABREV_ = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* «hace un momento», «hace 10 min», «hace 3 h», «ayer», «hace 4 días». */
function haceCuanto_(iso) {
  var t = Date.parse(iso);
  if (isNaN(t)) return '';
  var m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'hace un momento';
  if (m < 60) return 'hace ' + m + ' min';
  if (m < 60 * 24) return 'hace ' + Math.round(m / 60) + ' h';
  var d = Math.round(m / 1440);
  return d === 1 ? 'ayer' : 'hace ' + d + ' días';
}

/* «hoy 10:32», «ayer», «3-oct». */
function cuandoCorto_(iso) {
  var t = new Date(iso);
  if (isNaN(t.getTime())) return '';
  var hoy = new Date(), ayer = new Date(Date.now() - 86400000);
  var mismo = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
  if (mismo(t, hoy)) return 'hoy ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
  if (mismo(t, ayer)) return 'ayer';
  return t.getDate() + '-' + MESES_ABREV_[t.getMonth()];
}

/* «Nombre, hoy 10:32» de lo último apuntado para ese dato, o '' si nadie lo ha tocado (o antes de la instrucción 66). */
function cambiadoPorTexto_(dato) {
  var e = CAMBIOS_.porDato[dato];
  return e ? nombreDePersona_(e.c) + ', ' + cuandoCorto_(e.h) : '';
}

/* La línea gris «Cambiado por <Nombre>, hoy 10:32» de un dato, o nada si nadie lo ha tocado (o fue antes de la instrucción 66). */
function lineaCambiadoPor_(dato) {
  var t = cambiadoPorTexto_(dato);
  return t ? '<span class="cambiado-por">Cambiado por ' + escapaHtml(t) + '</span>' : '';
}

/* La lista entera de los últimos 60 días, una vez por sesión y solo cuando una pantalla la necesita (nunca al abrir la web). */
function cambiosAsegurarLista_() {
  if (CAMBIOS_.listaCompleta) return Promise.resolve();
  if (CAMBIOS_.pidiendoLista) return CAMBIOS_.pidiendoLista;
  CAMBIOS_.pidiendoLista = llamarAlServidor_('webCambiosLista', [], { sinBoton: true, sinTiempos: true }).then(function (r) {
    CAMBIOS_.listaCompleta = (r && r.lista) || [];
    CAMBIOS_.listaCompleta.slice().reverse().forEach(function (e) { cambiosRecordar_(e); });
    CAMBIOS_.pidiendoLista = null;
  }).catch(function () { CAMBIOS_.pidiendoLista = null; });
  return CAMBIOS_.pidiendoLista;
}

/* Pone en el elemento `id` la línea «Cambiado por…» de ese dato; si aún no se sabe, la pide por detrás y la pone al llegar. */
function cambiadoPorEn_(id, dato) {
  var poner = function () { var el = document.getElementById(id); if (el) el.innerHTML = lineaCambiadoPor_(dato); };
  poner();
  cambiosAsegurarLista_().then(poner);
}

/* Las líneas de «Últimos cambios»: de los demás, de los últimos siete días, lo más nuevo arriba, y los seguidos de la misma persona y el mismo tipo en una sola. */
function lineasUltimosCambios_() {
  var limite = Date.now() - CAMBIOS_HOY_DIAS_ * 86400000;
  var otros = CAMBIOS_.lista.filter(function (e) { return e.c !== MI_CORREO && Date.parse(e.h) >= limite; }).sort(function (a, b) { return b.n - a.n; });
  var lineas = [];
  otros.forEach(function (e) {
    var ult = lineas[lineas.length - 1];
    if (ult && ult.c === e.c && ult.t === e.t) { ult.veces++; return; }
    lineas.push({ c: e.c, q: e.q, t: e.t, x: e.x, h: e.h, w: e.w, veces: 1 });
  });
  return lineas.slice(0, CAMBIOS_HOY_MAX_);
}

function pintarUltimosCambios_() {
  var el = document.getElementById('hoyCambios');
  if (!el) return;
  var lineas = lineasUltimosCambios_();
  if (!lineas.length) { el.className = 'caja oculto'; el.innerHTML = ''; return; }
  el.className = 'caja ultimos-cambios';
  el.innerHTML = '<div class="etq gris">Últimos cambios</div>' + lineas.map(function (l, i) {
    return '<div class="linea-cambio-hoy" onclick="irADondeCambio_(' + i + ')" title="' + escapaHtml(l.x) + '"><b>' + escapaHtml(l.q) + '</b> · ' +
      escapaHtml(l.x) + (l.veces > 1 ? ' (' + l.veces + ' veces)' : '') + ' · <span>' + escapaHtml(haceCuanto_(l.h)) + '</span></div>';
  }).join('') + '<a href="#" class="ver-todos-cambios" onclick="irAPaso_(\'datos\', \'cambios\'); return false">Ver todos</a>';
}

function irADondeCambio_(i) {
  var l = lineasUltimosCambios_()[i];
  if (l) irADonde_(l.w);
}

/* ---------------------------------------------------------------- «Datos y configuración» › «Cambios» */

var CAMBIOS_FILTRO_ = { persona: '', tarea: '' };

function cargarCambios_() {
  var cont = document.getElementById('contenidoCambios');
  if (!cont) return;
  if (!CAMBIOS_.listaCompleta) cont.innerHTML = '<p class="vacio-hoy">Trayendo los cambios…</p>';
  llamarAlServidor_('webCambiosLista', [], { sinBoton: true, sinTiempos: true }).then(function (r) {
    CAMBIOS_.listaCompleta = (r && r.lista) || [];
    CAMBIOS_.listaCompleta.slice().reverse().forEach(function (e) { cambiosRecordar_(e); });
    pintarCambios_();
  }).catch(function (e) { cont.innerHTML = '<p class="vacio-hoy">No he podido traer la lista. ' + escapaHtml(mensajeDeError(e)) + '</p>'; });
}

function cambiosCambiaFiltro_(que, valor) { CAMBIOS_FILTRO_[que] = valor; pintarCambios_(); }

function pintarCambios_() {
  var cont = document.getElementById('contenidoCambios');
  if (!cont || !CAMBIOS_.listaCompleta) return;
  var lista = CAMBIOS_.listaCompleta;
  var personas = {}, tareas = {};
  lista.forEach(function (e) { personas[e.c] = e.q; if (e.w) tareas[e.w.split('|')[0]] = true; });
  var nombreTarea = function (k) { var t = tareaPorClave_(k); return t ? t.nombre : k; };
  var visibles = lista.filter(function (e) {
    return (!CAMBIOS_FILTRO_.persona || e.c === CAMBIOS_FILTRO_.persona) && (!CAMBIOS_FILTRO_.tarea || (e.w || '').split('|')[0] === CAMBIOS_FILTRO_.tarea);
  });
  cont.innerHTML = '<div class="fila-botones" style="margin:0 0 8px;align-items:center">' +
    '<label>Persona <select id="filtroCambiosPersona" onchange="cambiosCambiaFiltro_(\'persona\', this.value)"><option value="">Todas</option>' +
      Object.keys(personas).map(function (c) { return '<option value="' + escapaHtml(c) + '"' + (CAMBIOS_FILTRO_.persona === c ? ' selected' : '') + '>' + escapaHtml(personas[c]) + '</option>'; }).join('') + '</select></label> ' +
    '<label>Tarea <select id="filtroCambiosTarea" onchange="cambiosCambiaFiltro_(\'tarea\', this.value)"><option value="">Todas</option>' +
      Object.keys(tareas).map(function (k) { return '<option value="' + escapaHtml(k) + '"' + (CAMBIOS_FILTRO_.tarea === k ? ' selected' : '') + '>' + escapaHtml(nombreTarea(k)) + '</option>'; }).join('') + '</select></label>' +
    '<span class="cal-nota">' + visibles.length + ' cambios de los últimos 60 días</span></div>' +
    '<table class="listado tabla-hoy" id="tablaCambios"><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th></th></tr></thead><tbody>' +
    (visibles.map(function (e, i) {
      return '<tr><td>' + escapaHtml(cuandoCorto_(e.h)) + '</td><td>' + escapaHtml(e.q) + '</td><td>' + escapaHtml(e.x) + '</td>' +
        '<td>' + (e.w ? '<button class="pequeno" onclick="irADonde_(\'' + escapaAtributo_(e.w) + '\')">Ir</button>' : '') + '</td></tr>';
    }).join('') || '<tr><td colspan="4">Todavía no hay ningún cambio apuntado.</td></tr>') + '</tbody></table>';
}
