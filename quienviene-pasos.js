/* Generado de JsQuienVienePasos.html por web/construir-quienviene.mjs: no se toca a mano. */
/* Los pasos que necesitan el curso en preparación (con el curso en marcha solo hay solicitudes y lista de espera). */
var VISTAS_SOLO_PREPARACION_ = ['esperados', 'cursos', 'aLlamar', 'sobres', 'casos'];
var QV_CURSO_ABIERTO_ = {};   // por vista: el curso cuya lista está a la vista ('' = ninguna)

/* Las dos vistas con la lista de esperados de UN curso, que se abre al pulsar el curso en la tabla de arriba. */
function vistaListaEsperados_(v) { v = v || VISTA_QUIENVIENE; return v === 'esperados' || v === 'cursos'; }

/* Repinta la pantalla del paso (el panel de objetivos lo llama al editar y al cancelar). */
function pintarPanelAvanceQuienViene_() { pintarQuienViene(); }

/* Cambiar de paso no arrastra los filtros del paso anterior. */
function reiniciarFiltrosQuienViene_() {
  FILTRO_QUIENVIENE_CURSO = ''; FILTRO_QUIENVIENE_SOBRE = ''; FILTRO_QUIENVIENE_PREVISION = ''; FILTRO_QUIENVIENE_ESTADO = ''; FILTRO_QUIENVIENE_RESOLUCION = '';
  QV_CURSO_ABIERTO_ = {};
  guardarFiltroQuienVieneGuardado_();
}

/* Pulsar un curso de la tabla: debajo sale la lista de ese curso (y, si se pide, solo con ese estado). */
function abrirListaCursoQV_(curso, estado) {
  QV_CURSO_ABIERTO_[VISTA_QUIENVIENE] = curso;
  FILTRO_QUIENVIENE_SOBRE = ''; FILTRO_QUIENVIENE_PREVISION = ''; FILTRO_QUIENVIENE_ESTADO = estado || '';
  pintarQuienViene();
  setTimeout(function () { var el = document.getElementById('tablaQuienViene'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }, 30);
}

function cerrarListaCursoQV_() {
  QV_CURSO_ABIERTO_[VISTA_QUIENVIENE] = '';
  FILTRO_QUIENVIENE_SOBRE = ''; FILTRO_QUIENVIENE_PREVISION = ''; FILTRO_QUIENVIENE_ESTADO = '';
  pintarQuienViene();
}

/* ---- Admisión › Resolución de admisión: el cuadre con el PDF, o la frase que dice qué falta ---- */
function pintarPasoResolucion_(ban, cont) {
  var d = QUIENVIENE_DATOS;
  if (resolucionLeida_()) { pintarBannerResolucion_(); cont.classList.add('oculto'); return; }
  cont.innerHTML = '<p class="paso-vacio">' + ((d.solicitudes || []).length
    ? 'Todavía no se ha leído la resolución de admisión. ' + (pantallaNueva_() ? 'Suelta el PDF en el Centro de datos y se lee sola.' : 'Se suelta el PDF en «Datos de Séneca» de esta tarea y se lee en tu navegador.')
    : 'Aún no hay solicitudes de admisión.') + '</p>';
}

/* ---- Admisión › A quién se espera en cada curso: una fila por curso ---- */
function ordenCursoPanel_(a, b) {
  var ia = GRADOS_PANEL_OBJETIVOS_.indexOf(a), ib = GRADOS_PANEL_OBJETIVOS_.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a < b ? -1 : 1;
}

function porCursoAdmisionHtml_(d) {
  var por = {};
  (d.esperados || []).forEach(function (e) {
    if (e.noViene) return;
    var c = por[e.curso] = por[e.curso] || { total: 0, centro: 0, adm: 0, mano: 0 };
    c.total++;
    if (e.origen === 'previsión') c.centro++; else if (e.origen === 'admisión' || e.origen === 'resolución') c.adm++; else c.mano++;
  });
  var cursos = Object.keys(por).sort(ordenCursoPanel_);
  var abierto = QV_CURSO_ABIERTO_.esperados || '';
  var filas = cursos.map(function (c) {
    var x = por[c];
    return '<tr' + (c === abierto ? ' class="curso-abierto"' : '') + ' data-curso="' + escapaAtributo_(c) + '"><td><a href="#" onclick="abrirListaCursoQV_(\'' + escapaAtributo_(c) + '\');return false">' + escapaHtml(c) + '</a></td>' +
      '<td>' + x.total + '</td><td>' + x.centro + '</td><td>' + x.adm + '</td><td>' + x.mano + '</td></tr>';
  }).join('');
  return lineaPrevisionHtml_() + avisoPrevisionesHtml_() + (filas
    ? '<table class="listado tabla-por-curso"><thead><tr><th>Curso</th><th>Se esperan</th><th>Ya están en el centro</th><th>Vienen de la admisión</th><th>Incluidos a mano</th></tr></thead><tbody>' + filas + '</tbody></table>'
    : '<p class="paso-vacio">Aún no hay esperados en este curso.</p>');
}

/* ---- Matrícula › Cómo va cada curso: la certificación y, debajo, la tabla por curso ---- */
function lineaCertificacionHtml_() {
  var partes = [['certificacionJulio', 'de julio'], ['certificacionSeptiembre', 'de septiembre']].map(function (x) {
    var f = fechaDeHito_(x[0], CURSO_VISTO);
    if (!f) return 'Certificación de matrícula ' + x[1] + ': sin fecha (<a href="#" onclick="irAPaso_(\'datos\',\'fechas\');return false">se escribe en Datos y configuración › Fechas del curso</a>)';
    var dias = diasEntreObjetivos_(hoyObjetivos_(), f);
    var cuando = dias > 0 ? (dias === 1 ? 'falta 1 día' : 'faltan ' + dias + ' días') : (dias === 0 ? 'es hoy' : 'hace ' + (-dias) + (dias === -1 ? ' día' : ' días'));
    return 'Certificación de matrícula ' + x[1] + ': ' + escapaHtml(fechaCorta_(f)) + ' (' + cuando + ')';
  });
  return '<p class="aviso-sobres" id="lineaCertificacion">' + partes.join(' · ') + '</p>';
}

function cabeceraCursosHtml_(d) {
  return lineaCertificacionHtml_() + ((d.panel || []).length ? panelAvanceHtml_(d) : '<p class="paso-vacio">Sin esperados todavía en este curso.</p>');
}

/* ---- Matrícula › Casos a mirar: los tres tipos de caso, cada uno solo si tiene algo ---- */
function casosQuienVieneHtml_() {
  var d = QUIENVIENE_DATOS || {}, html = '';
  var noEsp = d.noEsperados || [];
  if (noEsp.length) {
    html += '<h3 class="qv-titulo">Matriculados que no se esperaban · ' + noEsp.length + '</h3><table class="listado"><thead><tr><th>Curso</th><th>Alumno/a</th><th>Unidad</th><th></th></tr></thead><tbody>' +
      noEsp.map(filaNoEsperadoHtml_).join('') + '</tbody></table>';
  }
  var otros = otroCursoLista_();
  if (otros.length) {
    var sinRevisar = otros.filter(function (e) { return !e.otroCurso.revisado; }).length;
    html += '<h3 class="qv-titulo">Matriculados en un curso distinto del previsto · ' + (sinRevisar ? sinRevisar + ' sin revisar' : 'todos revisados') + '</h3>' + listaOtroCursoHtml_(otros);
  }
  var prov = provisionalesSinEmparejar_();
  if (prov.length) {
    var pend = prov.filter(function (s) { return !s.ninguno; }).length;
    html += '<h3 class="qv-titulo">Matrículas provisionales sin emparejar · ' + pend + '</h3>' + listaProvisionalesHtml_(prov);
  }
  return html || '<p class="paso-vacio">No hay ningún caso que mirar.</p>';
}
