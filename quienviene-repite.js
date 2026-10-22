/* Generado de JsQuienVieneRepite.html por web/construir-quienviene.mjs: no se toca a mano. */
var FILTRO_QUIENVIENE_PREVISION = '';   // '' | repite_seneca | repite_mano | sin_decision | texto:<lo que pone Séneca>
var PREVISIONES_LISTA_ABIERTA_ = false;

/* Los esperados que vienen del alumnado del centro y siguen esperándose (sin «No viene»). */
function esperadosDePrevision_() {
  return ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || []).filter(function (e) { return e.origen === 'previsión' && !e.noViene; });
}

function sinDecisionSeneca_(e) { return e.decisionSeneca === 'sin' || e.decisionSeneca === 'sin_interpretar'; }

/* La etiqueta corta junto al curso: solo para quien repite (promociona, titula o sin decisión es lo normal). */
function etiquetaPrevisionHtml_(e) {
  if (e.prevision === 'repite_seneca') return ' <span class="chip">Repite (Séneca)</span>';
  if (e.prevision === 'repite_mano') return ' <span class="chip">Repetirá (a mano)</span>';
  return '';
}

function pasaFiltroPrevision_(e) {
  var f = FILTRO_QUIENVIENE_PREVISION;
  if (!f) return true;
  if (f === 'repite_seneca' || f === 'repite_mano') return e.prevision === f;
  if (e.origen !== 'previsión') return false;
  if (f === 'sin_decision') return sinDecisionSeneca_(e);
  if (f.indexOf('texto:') === 0) return e.decisionSeneca === 'sin_interpretar' && e.decisionTexto === f.slice(6);
  return true;
}

function cambiarFiltroPrevision_(v) { FILTRO_QUIENVIENE_PREVISION = v; pintarQuienViene(); }

/* Un enlace que filtra por la previsión (sin ir al servidor), o gris y sin enlace si la cifra es cero. */
function cifraPrevisionHtml_(n, texto, filtro) {
  if (!n) return '<span class="cifra-sobre cero">' + escapaHtml(texto) + '</span>';
  return '<a href="#" class="cifra-sobre" onclick="filtrarPorPrevision_(\'' + escapaAtributo_(filtro) + '\');return false">' + escapaHtml(texto) + '</a>';
}

function filtrarPorPrevision_(filtro) { FILTRO_QUIENVIENE_PREVISION = filtro; pintarQuienViene(); }

/* El desplegable «Previsión:» (solo en Esperados). */
function filtroPrevisionHtml_() {
  if (!vistaListaEsperados_()) return '';
  var op = [['', 'Todos'], ['repite_seneca', 'Repite (Séneca)'], ['repite_mano', 'Repetirá (a mano)'], ['sin_decision', 'Sin decisión']];
  if (FILTRO_QUIENVIENE_PREVISION.indexOf('texto:') === 0) op.push([FILTRO_QUIENVIENE_PREVISION, 'Sin interpretar: «' + FILTRO_QUIENVIENE_PREVISION.slice(6) + '»']);
  return ' <label>Previsión: <select id="filtroPrevision" onchange="cambiarFiltroPrevision_(this.value)">' + op.map(function (o) {
    return '<option value="' + escapaAtributo_(o[0]) + '"' + (FILTRO_QUIENVIENE_PREVISION === o[0] ? ' selected' : '') + '>' + escapaHtml(o[1]) + '</option>';
  }).join('') + '</select></label>';
}

/* La línea de arriba de Esperados (3.2): una sola línea, densa y a todo el ancho. */
function lineaPrevisionHtml_() {
  var d = QUIENVIENE_DATOS || {};
  if (VISTA_QUIENVIENE !== 'esperados' || !d.esPreparacion) return '';
  var lista = esperadosDePrevision_();
  if (!lista.length) return '';
  var seneca = lista.filter(function (e) { return e.prevision === 'repite_seneca'; }).length;
  var mano = lista.filter(function (e) { return e.prevision === 'repite_mano'; }).length;
  var sin = lista.filter(sinDecisionSeneca_).length;
  var hayDecisiones = lista.some(function (e) { return e.decisionSeneca !== 'sin'; });
  var partes;
  if (hayDecisiones) {
    partes = 'Repiten: ' + cifraPrevisionHtml_(seneca, seneca + ' según Séneca', 'repite_seneca') + ' · ' +
      cifraPrevisionHtml_(mano, mano + ' marcados a mano', 'repite_mano') + ' · ' +
      cifraPrevisionHtml_(sin, 'Sin decisión de Séneca: ' + sin, 'sin_decision');
  } else {
    partes = 'Séneca todavía no trae decisiones de promoción · ' + cifraPrevisionHtml_(mano, mano + ' marcados a mano', 'repite_mano');
  }
  /* Lo que Séneca pone y no se interpreta: se enseña tal cual, con su número, para que una persona lo vea. */
  var textos = {};
  lista.forEach(function (e) { if (e.decisionSeneca === 'sin_interpretar') textos[e.decisionTexto] = (textos[e.decisionTexto] || 0) + 1; });
  var claves = Object.keys(textos).sort();
  if (claves.length) {
    partes += ' · Sin interpretar: ' + claves.map(function (t) {
      return '<a href="#" class="cifra-sobre" onclick="filtrarPorPrevision_(\'' + escapaAtributo_('texto:' + t) + '\');return false">«' +
        escapaHtml(t) + '» (' + textos[t] + ')</a>';
    }).join(', ');
  }
  return '<p class="aviso-sobres" id="lineaPrevision">' + partes + '</p>';
}

/* ---- El botón «Repetirá» (3.3) ---- */
function botonRepiteHtml_(e) {
  if (e.noViene) return '';
  var clave = escapaAtributo_(e.clave);
  if (e.prevision === 'repite_mano') {
    var m = e.repiteMarca || {};
    return ' <button class="pequeno" title="' + esperaAttr_((m.quien || '') + (m.cuando ? ' · ' + new Date(m.cuando).toLocaleString('es-ES') : '')) +
      '" onclick="deshacerRepitera_(\'' + clave + '\')">Deshacer «Repetirá»</button>' +
      (e.pil ? ' <span class="meta-revisado">PIL: ya no puede repetir</span>' : '');
  }
  if (e.puedeRepetir) return ' <button class="pequeno" onclick="marcarRepitera_(\'' + clave + '\')">Repetirá</button>';
  return '';
}

/* Cambia una cifra del panel de avance de un curso a otro (los esperados, los matriculados, los provisionales y los sobres). */
function moverEnPanel_(e, de, a) {
  var d = QUIENVIENE_DATOS;
  if (!d || !d.panel || de === a) return;
  var fila = function (curso, crear) {
    var f = d.panel.filter(function (p) { return p.curso === curso; })[0];
    if (!f && crear) {
      f = { curso: curso, matriculados: 0, esperados: 0, provisionales: 0, sobres: { sinRevisar: 0, conProblema: 0, anulados: 0 } };
      d.panel.push(f);
      d.panel.sort(function (x, y) { return x.curso < y.curso ? -1 : 1; });
    }
    return f;
  };
  var mover = function (sentido, curso) {
    var f = fila(curso, sentido > 0);
    if (!f) return;
    f.esperados += sentido;
    if (e.estado === 'Matriculado') f.matriculados += sentido;
    if (e.estado === 'Matrícula provisional') f.provisionales = (f.provisionales || 0) + sentido;
    if (e.sobre && f.sobres) {
      if (e.sobre.estado === 'sin_revisar') f.sobres.sinRevisar += sentido;
      else if (e.sobre.estado === 'con_problema') f.sobres.conProblema += sentido;
      else if (e.sobre.estado === 'anulado') f.sobres.anulados += sentido;
    }
  };
  mover(-1, de);
  mover(1, a);
  /* El servidor solo manda los cursos con esperados, más los seis grados de siempre (instrucción 44: siempre se les puede escribir objetivo). */
  d.panel = d.panel.filter(function (p) { return p.esperados > 0 || GRADOS_PANEL_OBJETIVOS_.indexOf(p.curso) !== -1; });
}

/* Pone o quita «Repetirá» en lo que ya hay en el navegador; devuelve cómo estaba para poder deshacerlo si el servidor falla. */
function repiteLocal_(e, repite, marca) {
  var antes = { curso: e.curso, dudoso: e.dudoso, prevision: e.prevision, marca: e.repiteMarca, repite: e.repiteElAnoQueViene, modalidad: e.modalidad };
  var nuevo = repite ? e.cursoActual : e.cursoSiguiente;
  moverEnPanel_(e, e.curso, nuevo);
  e.curso = nuevo;
  e.dudoso = repite ? false : !!e.dudosoSiguiente;
  e.prevision = repite ? 'repite_mano' : '';
  e.repiteMarca = repite ? marca : null;
  e.repiteElAnoQueViene = repite;
  return antes;
}

function restaurarRepite_(e, antes) {
  moverEnPanel_(e, e.curso, antes.curso);
  e.curso = antes.curso; e.dudoso = antes.dudoso; e.prevision = antes.prevision; e.repiteMarca = antes.marca;
  e.repiteElAnoQueViene = antes.repite; e.modalidad = antes.modalidad;
}

function marcarRepitera_(clave) {
  var e = esperadoPorClaveSobre_(clave);
  if (!e || !e.puedeRepetir) return;
  var provisional = { quien: MI_CORREO, cuando: new Date().toISOString() };
  var antes = repiteLocal_(e, true, provisional);
  pintarQuienViene();
  llamar('webRepiteMarcar', CURSO_VISTO, clave).then(function (r) {
    if (e.repiteMarca === provisional && r) { e.repiteMarca = r; pintarQuienViene(); }
  }).catch(function (err) {
    restaurarRepite_(e, antes); pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

function deshacerRepitera_(clave) {
  var e = esperadoPorClaveSobre_(clave);
  if (!e || e.prevision !== 'repite_mano') return;
  var antes = repiteLocal_(e, false, null);
  pintarQuienViene();
  llamar('webRepiteQuitar', CURSO_VISTO, clave).catch(function (err) {
    restaurarRepite_(e, antes); pintarQuienViene(); avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}

/* ---- «Previsiones que no coinciden con Séneca» (3.4) ---- */
function previsionesNoCoinciden_() {
  return ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || []).filter(function (e) { return !!e.marcaNoCoincide; });
}

var DECISION_TEXTO_ = { promociona: 'Promociona', titula: 'Obtiene Título', repite: 'Repite' };

function avisoPrevisionesHtml_() {
  var lista = previsionesNoCoinciden_();
  if (!lista.length) { PREVISIONES_LISTA_ABIERTA_ = false; return ''; }
  var texto = lista.length + ' previsiones a mano no coinciden con Séneca';
  return '<p class="aviso-sobres"><a href="#" id="avisoPrevisiones" onclick="alternarListaPrevisiones_();return false">' + escapaHtml(texto) +
    (PREVISIONES_LISTA_ABIERTA_ ? ' (cerrar)' : '') + '</a></p>' + (PREVISIONES_LISTA_ABIERTA_ ? listaPrevisionesHtml_(lista) : '');
}

function alternarListaPrevisiones_() { PREVISIONES_LISTA_ABIERTA_ = !PREVISIONES_LISTA_ABIERTA_; pintarQuienViene(); }

function listaPrevisionesHtml_(lista) {
  var filas = lista.map(function (e) {
    var m = e.marcaNoCoincide;
    return '<tr><td>' + escapaHtml(e.nombre) + '</td><td>' + escapaHtml(e.curso) + '</td>' +
      '<td>Se marcó «Repetirá» (' + escapaHtml(m.quien || '') + (m.cuando ? ', ' + escapaHtml(new Date(m.cuando).toLocaleDateString('es-ES')) : '') + ')</td>' +
      '<td>Séneca dice: ' + escapaHtml(DECISION_TEXTO_[m.decision] || m.decision) + '</td>' +
      '<td><button class="pequeno" onclick="entendidoPrevision_(\'' + escapaAtributo_(e.clave) + '\')">Entendido</button></td></tr>';
  }).join('');
  return '<table class="listado" id="tablaPrevisiones"><thead><tr><th>Alumno/a</th><th>Curso</th><th>Marca</th><th>Séneca</th><th></th></tr></thead><tbody>' +
    filas + '</tbody></table>';
}

/* «Entendido»: borra la marca y saca la fila de la lista; cambia al momento y, si el servidor falla, vuelve a como estaba. */
function entendidoPrevision_(clave) {
  var e = esperadoPorClaveSobre_(clave);
  if (!e || !e.marcaNoCoincide) return;
  var antes = { n: e.marcaNoCoincide, marca: e.repiteMarca };
  e.marcaNoCoincide = null; e.repiteMarca = null;
  pintarQuienViene();
  llamar('webRepiteQuitar', CURSO_VISTO, clave).catch(function (err) {
    e.marcaNoCoincide = antes.n; e.repiteMarca = antes.marca; pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}
