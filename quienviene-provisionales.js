/* Generado de JsQuienVieneProvisionales.html por web/construir-quienviene.mjs: no se toca a mano. */
var FILTRO_QUIENVIENE_ESTADO = '';      // '' o un estado: Matriculado, Pendiente, Matrícula provisional, No viene
var PROVISIONALES_LISTA_ABIERTA_ = false;
var PROVISIONALES_NINGUNO_ = '__ninguno__';

function cambiarFiltroEstadoQuienViene_(v) { FILTRO_QUIENVIENE_ESTADO = v; pintarQuienViene(); }

/* El desplegable «Estado:» al lado de los demás (solo en Esperados). */
function filtroEstadoHtml_() {
  if (!vistaListaEsperados_()) return '';
  var op = [['', 'Todos'], ['Matriculado', 'Matriculado'], ['Pendiente', 'Pendiente'], ['Matrícula provisional', 'Matrícula provisional'], ['No viene', 'No viene']];
  return ' <label>Estado: <select id="filtroEstado" onchange="cambiarFiltroEstadoQuienViene_(this.value)">' + op.map(function (o) {
    return '<option value="' + escapaAtributo_(o[0]) + '"' + (FILTRO_QUIENVIENE_ESTADO === o[0] ? ' selected' : '') + '>' + escapaHtml(o[1]) + '</option>';
  }).join('') + '</select></label>';
}

function pasaFiltroEstado_(e) {
  if (!FILTRO_QUIENVIENE_ESTADO) return true;
  return (e.noViene ? 'No viene' : e.estado) === FILTRO_QUIENVIENE_ESTADO;
}

/* Detrás de «X matriculados de Y esperados»: «N con matrícula provisional», un enlace que abre Esperados con ese curso y ese estado.
   En un curso sin provisionales no se enseña nada (ni un cero). */
function cifraProvisionalPanelHtml_(p) {
  if (!p.provisionales) return '';
  return ' · <a href="#" class="cifra-sobre" onclick="filtrarPorProvisional_(\'' + escapaAtributo_(p.curso) + '\');return false">' +
    p.provisionales + ' con matrícula provisional</a>';
}

/* Instrucción 103: la cifra de matrícula provisional lleva a Matrícula › Casos a mirar. */
function filtrarPorProvisional_(curso) {
  irAPaso_('matricula', 'casos');
}

/* Lo que se añade en la celda de estado: la fecha de la provisional o por qué sigue pendiente quien tuvo una. */
function etiquetaProvisionalHtml_(e) {
  if (e.noViene) return '';
  var p = e.provisional, html = '';
  if (e.estado === 'Matrícula provisional' && p) {
    html += ' <span class="meta-revisado">desde ' + escapaHtml(p.fecha || 'fecha sin indicar') + '</span>';
  }
  if (e.provisionalEtiqueta) html += ' <span class="chip aviso-sobre">' + escapaHtml(e.provisionalEtiqueta) + '</span>';
  if (p && p.claveProv) {
    html += ' <button class="pequeno" title="Esta matrícula provisional se emparejó a mano" onclick="deshacerEmparejarProvisional_(\'' +
      escapaAtributo_(p.claveProv) + '\')">Deshacer emparejado</button>';
  }
  return html;
}

/* ---- «Provisionales sin emparejar» ---- */
function provisionalesSinEmparejar_() { return (QUIENVIENE_DATOS && QUIENVIENE_DATOS.provisionalesSinEmparejar) || []; }

function avisoProvisionalesSinEmparejarHtml_() {
  var lista = provisionalesSinEmparejar_();
  if (!lista.length) { PROVISIONALES_LISTA_ABIERTA_ = false; return ''; }
  var pendientes = lista.filter(function (s) { return !s.ninguno; }).length;
  var ningunos = lista.length - pendientes;
  var texto = pendientes + ' matrícula' + (pendientes === 1 ? '' : 's') + ' provisional' + (pendientes === 1 ? '' : 'es') + ' sin emparejar' +
    (ningunos ? ' · ' + ningunos + ' marcada' + (ningunos === 1 ? '' : 's') + ' «no es ninguno»' : '');
  return '<p class="aviso-sobres"><a href="#" id="avisoProvisionales" onclick="alternarListaProvisionales_();return false">' + escapaHtml(texto) +
    (PROVISIONALES_LISTA_ABIERTA_ ? ' (cerrar)' : '') + '</a></p>' + (PROVISIONALES_LISTA_ABIERTA_ ? listaProvisionalesHtml_(lista) : '');
}

function alternarListaProvisionales_() { PROVISIONALES_LISTA_ABIERTA_ = !PROVISIONALES_LISTA_ABIERTA_; pintarQuienViene(); }

function candidatoProvisional_(e) {
  return e.curso === '2º BACH' || (e.origen === 'previsión' && e.cursoActual === '1º BACH');
}

/* Los candidatos (1º de Bachillerato del curso en marcha y los previstos en 2º), los más parecidos primero y luego el resto por nombre. */
function opcionesProvisionalHtml_(s) {
  var todos = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || []).filter(candidatoProvisional_);
  var porClave = {};
  todos.forEach(function (e) { porClave[e.clave] = e; });
  var primeros = (s.parecidos || []).filter(function (c) { return porClave[c]; });
  var resto = todos.filter(function (e) { return primeros.indexOf(e.clave) === -1; })
    .sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); }).map(function (e) { return e.clave; });
  var op = function (c) { return '<option value="' + escapaAtributo_(c) + '">' + escapaHtml(porClave[c].nombre) + ' (' + escapaHtml(porClave[c].curso) + ')</option>'; };
  return '<option value="">— elige al alumno —</option>' + primeros.map(op).join('') +
    (resto.length ? '<option disabled>──────────</option>' + resto.map(op).join('') : '') +
    '<option value="' + PROVISIONALES_NINGUNO_ + '">No es ninguno de estos</option>';
}

function listaProvisionalesHtml_(lista) {
  var filas = lista.map(function (s, i) {
    var celda = s.ninguno
      ? '<span class="chip">No es ninguno de estos</span> <button class="pequeno" onclick="deshacerNingunoProvisional_(' + i + ')">Deshacer</button>'
      : '<select class="sel-provisional" onchange="elegirEsperadoProvisional_(' + i + ', this)">' + opcionesProvisionalHtml_(s) + '</select>';
    return '<tr' + (s.ninguno ? ' class="fila-revisada"' : '') + '><td>' + escapaHtml(s.nombre) + '</td><td>' + escapaHtml(s.modalidad === 'h' ? 'Humanidades' : s.modalidad === 'c' ? 'Ciencias' : '') +
      '</td><td>' + escapaHtml(s.fecha || '') + '</td><td>' + escapaHtml(s.posteriormente || '') + '</td><td>' + celda + '</td></tr>';
  }).join('');
  return '<table class="listado" id="tablaProvisionalesSinEmparejar"><thead><tr><th>Nombre en el fichero</th><th>Modalidad</th><th>Fecha</th><th>¿Se matricula después?</th><th>Es…</th></tr></thead><tbody>' +
    filas + '</tbody></table>';
}

/* El estado que tendría ese esperado con esa provisional (lo mismo que MatriculaJulio.gs, estadoDeEsperado_). */
function aplicarProvisionalLocal_(e, s, claveProv) {
  var noSe = String(s.posteriormente || '').trim().toLowerCase() === 'no';
  e.provisional = { fecha: s.fecha, posteriormente: s.posteriormente, claveProv: claveProv, noSeMatriculo: noSe };
  if (e.estado !== 'Pendiente' || e.noViene) return;
  if (noSe) { e.provisionalEtiqueta = 'Tuvo matrícula provisional y no se matriculó después'; return; }
  if (e.curso === '2º BACH') {
    e.estado = 'Matrícula provisional'; e.provisionalEtiqueta = '';
    var f = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.panel) || []).filter(function (p) { return p.curso === e.curso; })[0];
    if (f) f.provisionales = (f.provisionales || 0) + 1;
    e.sobre = null;   // de un esperado con matrícula provisional no se enseña nada del sobre
  } else {
    e.provisionalEtiqueta = e.prevision === 'repite_mano' ? 'Tiene matrícula provisional de 2º y está marcado «Repetirá»'
      : 'Tiene matrícula provisional de 2º y Séneca dice que repite';
  }
}

/* Elegir al alumno (o «no es ninguno»): cambia al momento y envía por detrás; si falla, vuelve a como estaba. */
function elegirEsperadoProvisional_(i, select) {
  var d = QUIENVIENE_DATOS, lista = provisionalesSinEmparejar_(), s = lista[i], valor = select.value;
  if (!s || !valor) return;
  if (valor === PROVISIONALES_NINGUNO_) {
    s.ninguno = true; reordenarProvisionales_();
    pintarQuienViene();
    llamar('webProvisionalEmparejar', CURSO_VISTO, s.clave, '').catch(function (err) {
      s.ninguno = false; reordenarProvisionales_(); pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
    });
    return;
  }
  var e = esperadoPorClaveSobre_(valor);
  if (!e) return;
  var antesLista = lista.slice();
  var antes = { provisional: e.provisional, etiqueta: e.provisionalEtiqueta, estado: e.estado, sobre: e.sobre };
  var f = (d.panel || []).filter(function (p) { return p.curso === e.curso; })[0];
  var antesPanel = f ? { prov: f.provisionales, sobres: f.sobres ? JSON.parse(JSON.stringify(f.sobres)) : null } : null;
  d.provisionalesSinEmparejar = lista.filter(function (x) { return x !== s; });
  aplicarProvisionalLocal_(e, s, s.clave);
  if (antes.sobre && !e.sobre && f && f.sobres) {
    if (antes.sobre.estado === 'sin_revisar') f.sobres.sinRevisar--;
    else if (antes.sobre.estado === 'con_problema') f.sobres.conProblema--;
    else if (antes.sobre.estado === 'anulado') f.sobres.anulados--;
  }
  pintarQuienViene();
  llamar('webProvisionalEmparejar', CURSO_VISTO, s.clave, valor).catch(function (err) {
    d.provisionalesSinEmparejar = antesLista;
    e.provisional = antes.provisional; e.provisionalEtiqueta = antes.etiqueta; e.estado = antes.estado; e.sobre = antes.sobre;
    if (f && antesPanel) { f.provisionales = antesPanel.prov; if (antesPanel.sobres) f.sobres = antesPanel.sobres; }
    pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

function reordenarProvisionales_() {
  QUIENVIENE_DATOS.provisionalesSinEmparejar.sort(function (a, b) {
    if (!!a.ninguno !== !!b.ninguno) return a.ninguno ? 1 : -1;
    return String(a.nombre).toLowerCase() < String(b.nombre).toLowerCase() ? -1 : 1;
  });
}

function deshacerNingunoProvisional_(i) {
  var s = provisionalesSinEmparejar_()[i];
  if (!s) return;
  s.ninguno = false; reordenarProvisionales_();
  pintarQuienViene();
  llamar('webProvisionalDeshacerEmparejar', CURSO_VISTO, s.clave).catch(function (err) {
    s.ninguno = true; reordenarProvisionales_(); pintarQuienViene(); avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}

/* Deshacer un emparejado hecho a mano: la fila vuelve a «sin emparejar», que solo conoce el servidor: se vuelve a cargar. */
function deshacerEmparejarProvisional_(claveProv) {
  llamar('webProvisionalDeshacerEmparejar', CURSO_VISTO, claveProv).then(cargarQuienViene)
    .catch(function (err) { avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error'); });
}
