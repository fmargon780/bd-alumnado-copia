/* Generado de JsQuienVieneSobres.html por web/construir-quienviene.mjs: no se toca a mano. */
var FILTRO_QUIENVIENE_SOBRE = '';        // '' o un estado de sobre: sin_revisar, con_problema, anulado, tramitado
var SOBRES_LISTA_ABIERTA_ = false;
var SOBRES_NINGUNO_ = '__ninguno__';

var SOBRE_ETIQUETAS_ = {
  sin_revisar: 'Sobre sin revisar', con_problema: 'Con problema', anulado: 'Anuló el sobre', tramitado: 'Sobre tramitado'
};

/* ---- Lo mismo que Sobres.gs: qué sobre cuenta de los de una persona (para emparejar sin esperar al servidor) ---- */
function valorNormalSobre_(v) {
  var t = String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return (t === 'presentado' || t === 'finalizado' || t === 'anulado') ? t : '';
}

function fechaMsSobre_(texto) {
  var m = String(texto || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : 0;
}

function sobreQueCuentaJs_(filas) {
  var orden = filas.slice().sort(function (a, b) { return (fechaMsSobre_(a.fecha) - fechaMsSobre_(b.fecha)) || (a.orden - b.orden); });
  var vivos = orden.filter(function (s) { return valorNormalSobre_(s.valor) !== 'anulado'; });
  return (vivos.length ? vivos : orden).slice(-1)[0];
}

/* El `sobre` de un esperado «Pendiente» a partir de sus filas; `problema` es la marca a mano que ya tuviera. */
function sobreDesdeFilas_(filas, problema, claveSobre) {
  var s = sobreQueCuentaJs_(filas), v = valorNormalSobre_(s.valor);
  var estado = v === 'anulado' ? 'anulado' : v === 'finalizado' ? 'tramitado' :
    v === 'presentado' ? (problema ? 'con_problema' : 'sin_revisar') : 'desconocido';
  return { valor: s.valor, fecha: s.fecha, claveSobre: claveSobre || '', estado: estado,
    problema: estado === 'con_problema' ? problema : null, filas: filas };
}

function sobreDeEsperado_(e) { return e && e.sobre ? e.sobre : null; }

/* «A quién llamar»: el sobre sin revisar o tramitado ya es la familia haciendo su parte (3.6). */
function sobreQuitaDeLlamar_(e) {
  var s = sobreDeEsperado_(e);
  return !!s && (s.estado === 'sin_revisar' || s.estado === 'tramitado');
}

/* La etiqueta de «A quién llamar»: «Con problema: <lo escrito>» o «Anuló el sobre»; nada en los demás. */
function sobreEtiquetaLlamar_(e) {
  var s = sobreDeEsperado_(e);
  if (!s) return '';
  if (s.estado === 'con_problema') return '<span class="chip aviso-sobre">Con problema: ' + escapaHtml(s.problema ? s.problema.texto : '') + '</span>';
  if (s.estado === 'anulado') return '<span class="chip aviso-sobre">Anuló el sobre</span>';
  return '';
}

/* ---- El panel de avance: «N sin revisar · N con problema · N anulados», cada cifra un enlace ---- */
function cifrasSobresPanelHtml_(p, d) {
  if (!d.sobresLeidos) return ' · <span class="sobres-sin-fichero">Sobres: sin fichero</span>';
  var c = p.sobres || { sinRevisar: 0, conProblema: 0, anulados: 0 };
  var partes = [['sin_revisar', c.sinRevisar, 'sin revisar'], ['con_problema', c.conProblema, 'con problema'], ['anulado', c.anulados, 'anulados']];
  return ' · ' + partes.map(function (x) {
    var texto = x[1] + ' ' + x[2];
    if (!x[1]) return '<span class="cifra-sobre cero">' + texto + '</span>';
    return '<a href="#" class="cifra-sobre" onclick="filtrarPorSobreQuienViene_(\'' + escapaAtributo_(p.curso) + '\',\'' + x[0] + '\');return false">' + texto + '</a>';
  }).join(' · ');
}

/* Instrucción 103: las cifras de sobres de la tabla por curso llevan a Matrícula › Sobres, con ese curso y ese estado del sobre. */
function filtrarPorSobreQuienViene_(curso, estado) {
  irAPaso_('matricula', 'sobres');
  FILTRO_QUIENVIENE_CURSO = curso;
  FILTRO_QUIENVIENE_SOBRE = estado;
  guardarFiltroQuienVieneGuardado_();
  pintarQuienViene();
}

function cambiarFiltroSobreQuienViene_(v) { FILTRO_QUIENVIENE_SOBRE = v; pintarQuienViene(); }

/* El desplegable «Sobre:» al lado del de curso (en las listas de esperados y en «Sobres», y solo si ya se ha leído algún fichero de sobres). «Sobres» no enseña los tramitados. */
function filtroSobreHtml_() {
  var d = QUIENVIENE_DATOS || {};
  if (!(vistaListaEsperados_() || VISTA_QUIENVIENE === 'sobres') || !d.sobresLeidos) return '';
  var op = [['', 'Todos'], ['sin_revisar', SOBRE_ETIQUETAS_.sin_revisar], ['con_problema', SOBRE_ETIQUETAS_.con_problema],
    ['anulado', SOBRE_ETIQUETAS_.anulado]];
  if (VISTA_QUIENVIENE !== 'sobres') op.push(['tramitado', SOBRE_ETIQUETAS_.tramitado]);
  return ' <label>Sobre: <select id="filtroSobre" onchange="cambiarFiltroSobreQuienViene_(this.value)">' + op.map(function (o) {
    return '<option value="' + o[0] + '"' + (FILTRO_QUIENVIENE_SOBRE === o[0] ? ' selected' : '') + '>' + escapaHtml(o[1]) + '</option>';
  }).join('') + '</select></label>';
}

/* ---- La columna «Sobre» de Esperados ---- */
function celdaSobreHtml_(e) {
  var s = sobreDeEsperado_(e);
  if (!s) return '';
  var clave = escapaAtributo_(e.clave);
  var aMano = s.claveSobre ? ' <button class="pequeno" title="Este sobre se emparejó a mano" onclick="deshacerEmparejarSobre_(\'' +
    escapaAtributo_(s.claveSobre) + '\')">Deshacer emparejado</button>' : '';
  if (s.estado === 'sin_revisar' || s.estado === 'con_problema') {
    var con = s.estado === 'con_problema';
    var texto = con
      ? '<span class="chip aviso-sobre">Con problema: ' + escapaHtml(s.problema ? s.problema.texto : '') + '</span> ' +
        '<span class="meta-revisado" title="' + esperaAttr_((s.problema ? s.problema.quien : '') + ' · ' +
          (s.problema && s.problema.cuando ? new Date(s.problema.cuando).toLocaleString('es-ES') : '')) + '">' +
        escapaHtml(s.problema ? s.problema.quien : '') + '</span> ' +
        '<button class="pequeno" onclick="corregirProblemaSobre_(\'' + clave + '\')">Corregir texto</button>'
      : '<span class="chip">Sobre sin revisar</span>';
    return texto + '<br><label class="casilla-sobre"><input type="checkbox" class="chk-problema"' + (con ? ' checked' : '') +
      ' onchange="alternarProblemaSobre_(\'' + clave + '\', this)"> con problema</label>' + aMano;
  }
  if (s.estado === 'anulado') return '<span class="chip">Anuló el sobre</span>' + aMano;
  if (s.estado === 'tramitado') return '<span class="chip si">Sobre tramitado</span>' + aMano;
  return '<span class="chip">' + escapaHtml(s.valor) + '</span>' + aMano;
}

function esperadoPorClaveSobre_(clave) {
  var lista = (QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || [];
  for (var i = 0; i < lista.length; i++) if (lista[i].clave === clave) return lista[i];
  return null;
}

/* Marcar «con problema»: pide el texto (obligatorio), cambia al momento y envía por detrás; si falla, se deshace. */
function alternarProblemaSobre_(clave, casilla) {
  var e = esperadoPorClaveSobre_(clave);
  if (!e || !e.sobre) return;
  var antes = e.sobre;
  if (!casilla.checked) {
    e.sobre = Object.assign({}, antes, { estado: 'sin_revisar', problema: null });
    pintarQuienViene();
    llamar('webSobreQuitarProblema', CURSO_VISTO, clave).catch(function (err) {
      e.sobre = antes; pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
    });
    return;
  }
  var texto = (prompt('¿Qué falla en este sobre? (obligatorio)', '') || '').trim();
  if (!texto) { casilla.checked = false; avisar('Escribe qué falla: sin eso no se guarda la marca «con problema».', 'error'); return; }
  guardarProblemaSobre_(e, antes, texto);
}

function corregirProblemaSobre_(clave) {
  var e = esperadoPorClaveSobre_(clave);
  if (!e || !e.sobre || !e.sobre.problema) return;
  var texto = (prompt('¿Qué falla en este sobre? (obligatorio)', e.sobre.problema.texto) || '').trim();
  if (!texto) { avisar('Escribe qué falla: sin eso no se guarda.', 'error'); return; }
  guardarProblemaSobre_(e, e.sobre, texto);
}

function guardarProblemaSobre_(e, antes, texto) {
  var prov = { texto: texto, quien: MI_CORREO, cuando: new Date().toISOString() };
  e.sobre = Object.assign({}, antes, { estado: 'con_problema', problema: prov });
  pintarQuienViene();
  llamar('webSobreMarcarProblema', CURSO_VISTO, e.clave, texto).then(function (r) {
    if (e.sobre && e.sobre.problema === prov) { e.sobre.problema = r; pintarQuienViene(); }
  }).catch(function (err) {
    e.sobre = antes; pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

/* ---- «Sobres sin emparejar» ---- */
function sobresSinEmparejar_() { return (QUIENVIENE_DATOS && QUIENVIENE_DATOS.sobresSinEmparejar) || []; }

/* El aviso de arriba de Esperados («N sobres sin emparejar») y, abierto, la lista. */
function avisoSobresSinEmparejarHtml_() {
  var lista = sobresSinEmparejar_();
  if (!lista.length) return '';
  var pendientes = lista.filter(function (s) { return !s.ninguno; }).length;
  var ningunos = lista.length - pendientes;
  var texto = pendientes + ' sobre' + (pendientes === 1 ? '' : 's') + ' sin emparejar' +
    (ningunos ? ' · ' + ningunos + ' marcado' + (ningunos === 1 ? '' : 's') + ' «no es ninguno»' : '');
  return '<p class="aviso-sobres"><a href="#" id="avisoSobres" onclick="alternarListaSobres_();return false">' + escapaHtml(texto) +
    (SOBRES_LISTA_ABIERTA_ ? ' (cerrar)' : '') + '</a></p>' + (SOBRES_LISTA_ABIERTA_ ? listaSobresSinEmparejarHtml_(lista) : '');
}

function alternarListaSobres_() { SOBRES_LISTA_ABIERTA_ = !SOBRES_LISTA_ABIERTA_; pintarQuienViene(); }

/* Los esperados del curso del sobre, los más parecidos primero y luego el resto por nombre. */
function opcionesSobreHtml_(s) {
  var todos = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || []).filter(function (e) { return !s.curso || e.curso === s.curso; });
  var porClave = {};
  todos.forEach(function (e) { porClave[e.clave] = e; });
  var primeros = (s.parecidos || []).filter(function (c) { return porClave[c]; });
  var resto = todos.filter(function (e) { return primeros.indexOf(e.clave) === -1; })
    .sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); }).map(function (e) { return e.clave; });
  var op = function (c) { return '<option value="' + escapaAtributo_(c) + '">' + escapaHtml(porClave[c].nombre) + ' (' + escapaHtml(porClave[c].curso) + ')</option>'; };
  return '<option value="">— elige al alumno —</option>' + primeros.map(op).join('') +
    (resto.length ? '<option disabled>──────────</option>' + resto.map(op).join('') : '') +
    '<option value="' + SOBRES_NINGUNO_ + '">No es ninguno de estos</option>';
}

function listaSobresSinEmparejarHtml_(lista) {
  var filas = lista.map(function (s, i) {
    var celda = s.ninguno
      ? '<span class="chip">No es ninguno de estos</span> <button class="pequeno" onclick="deshacerNingunoSobre_(' + i + ')">Deshacer</button>'
      : '<select class="sel-sobre" onchange="elegirEsperadoSobre_(' + i + ', this)">' + opcionesSobreHtml_(s) + '</select>';
    return '<tr' + (s.ninguno ? ' class="fila-revisada"' : '') + '><td>' + escapaHtml(s.nombre) + '</td><td>' +
      escapaHtml(s.curso || s.cursoTexto || '') + '</td><td>' + escapaHtml(s.origen || 'Solicitud telemática') + '</td><td>' +
      escapaHtml(s.valor) + '</td><td>' + celda + '</td></tr>';
  }).join('');
  return '<table class="listado" id="tablaSobresSinEmparejar"><thead><tr><th>Nombre en el fichero</th><th>Curso</th><th>De dónde viene</th><th>Sobre</th><th>Es…</th></tr></thead><tbody>' +
    filas + '</tbody></table>';
}

/* Elegir al alumno (o «no es ninguno»): cambia al momento y envía por detrás; si falla, vuelve a como estaba. */
function elegirEsperadoSobre_(i, select) {
  var d = QUIENVIENE_DATOS, lista = sobresSinEmparejar_(), s = lista[i], valor = select.value;
  if (!s || !valor) return;
  if (valor === SOBRES_NINGUNO_) {
    s.ninguno = true; reordenarSobresSinEmparejar_();
    pintarQuienViene();
    llamar('webSobreEmparejar', CURSO_VISTO, s.clave, '').catch(function (err) {
      s.ninguno = false; reordenarSobresSinEmparejar_(); pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
    });
    return;
  }
  var e = esperadoPorClaveSobre_(valor);
  var antesLista = lista.slice(), antesSobre = e ? e.sobre : null;
  d.sobresSinEmparejar = lista.filter(function (x) { return x !== s; });
  /* Una solicitud solo de la planificación (instrucción 41) no tiene sobre de la 40 que recalcular. */
  if (e && e.estado === 'Pendiente' && !e.noViene && (s.filas || []).length) {
    var filas = ((antesSobre && antesSobre.filas) || []).concat(s.filas || []);
    e.sobre = sobreDesdeFilas_(filas, antesSobre ? antesSobre.problema : null, s.clave);
  }
  pintarQuienViene();
  llamar('webSobreEmparejar', CURSO_VISTO, s.clave, valor).then(function () {
    /* Lo que le falta en el sobre (instrucción 41) lo calcula el servidor: se vuelve a cargar. */
    if (s.planificacion) cargarQuienViene();
  }).catch(function (err) {
    d.sobresSinEmparejar = antesLista; if (e) e.sobre = antesSobre;
    pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

function reordenarSobresSinEmparejar_() {
  QUIENVIENE_DATOS.sobresSinEmparejar.sort(function (a, b) {
    if (!!a.ninguno !== !!b.ninguno) return a.ninguno ? 1 : -1;
    return (a.curso + '|' + a.nombre) < (b.curso + '|' + b.nombre) ? -1 : 1;
  });
}

function deshacerNingunoSobre_(i) {
  var s = sobresSinEmparejar_()[i];
  if (!s) return;
  s.ninguno = false; reordenarSobresSinEmparejar_();
  pintarQuienViene();
  llamar('webSobreDeshacerEmparejar', CURSO_VISTO, s.clave).catch(function (err) {
    s.ninguno = true; reordenarSobresSinEmparejar_(); pintarQuienViene(); avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}

/* Deshacer un emparejado hecho a mano: el sobre vuelve a la lista de sin emparejar, que solo conoce el servidor: se vuelve a cargar. */
function deshacerEmparejarSobre_(claveSobre) {
  llamar('webSobreDeshacerEmparejar', CURSO_VISTO, claveSobre).then(cargarQuienViene)
    .catch(function (err) { avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error'); });
}
