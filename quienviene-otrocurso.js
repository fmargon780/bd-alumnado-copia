/* Generado de JsQuienVieneOtroCurso.html por web/construir-quienviene.mjs: no se toca a mano. */
var OTROCURSO_LISTA_ABIERTA_ = false;

/* Los matriculados en otro curso: los sin revisar primero, los revisados (en gris) al final. */
function otroCursoLista_() {
  var l = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || []).filter(function (e) { return !!e.otroCurso; });
  return l.sort(function (a, b) {
    var ra = a.otroCurso.revisado ? 1 : 0, rb = b.otroCurso.revisado ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  });
}

/* La etiqueta de la fila de Esperados; un clic abre la lista (así se puede quitar un «Revisado» aunque ya no haya aviso). */
function etiquetaOtroCursoHtml_(e) {
  if (!e.otroCurso) return '';
  return ' <a href="#" class="meta-revisado etiqueta-otro-curso" onclick="abrirListaOtroCurso_();return false">se esperaba en ' +
    escapaHtml(e.otroCurso.esperadoEn) + '</a>';
}

/* Instrucción 103: «se esperaba en 3º» lleva a Matrícula › Casos a mirar, donde la lista de matriculados en otro curso sale siempre abierta. */
function abrirListaOtroCurso_() { irAPaso_('matricula', 'casos'); }
function alternarListaOtroCurso_() { OTROCURSO_LISTA_ABIERTA_ = !OTROCURSO_LISTA_ABIERTA_; pintarQuienViene(); }

/* El aviso de arriba de Esperados («N matriculados en otro curso sin revisar») y, abierta, la lista. Sin ninguno sin revisar no hay aviso. */
function avisoOtroCursoHtml_() {
  var lista = otroCursoLista_();
  if (!lista.length) { OTROCURSO_LISTA_ABIERTA_ = false; return ''; }
  var sinRevisar = lista.filter(function (e) { return !e.otroCurso.revisado; }).length;
  var aviso = sinRevisar
    ? '<p class="aviso-sobres"><a href="#" id="avisoOtroCurso" onclick="alternarListaOtroCurso_();return false">' + sinRevisar +
      ' matriculados en otro curso sin revisar' + (OTROCURSO_LISTA_ABIERTA_ ? ' (cerrar)' : '') + '</a></p>'
    : (OTROCURSO_LISTA_ABIERTA_ ? '<p class="aviso-sobres"><a href="#" onclick="alternarListaOtroCurso_();return false">Matriculados en otro curso (cerrar)</a></p>' : '');
  return aviso + (OTROCURSO_LISTA_ABIERTA_ ? listaOtroCursoHtml_(lista) : '');
}

function listaOtroCursoHtml_(lista) {
  var filas = lista.map(function (e) {
    var o = e.otroCurso, rev = o.revisado, clave = escapaAtributo_(e.clave);
    var id = /^id:(.+)$/.exec(e.clave);
    var nombre = id ? '<a href="#" onclick="abrirFichaOtroCurso_(\'' + escapaAtributo_(id[1]) + '\');return false">' + escapaHtml(e.nombre) + '</a>' : escapaHtml(e.nombre);
    return '<tr' + (rev ? ' class="fila-revisada"' : '') + '><td>' + nombre + '</td><td>' + escapaHtml(o.esperadoEn) + '</td><td>' + escapaHtml(o.matriculadoEn) +
      '</td><td>' + escapaHtml(o.porque) + '</td><td>' + (o.aMano ? 'Unido a mano' : 'Unido solo') + '</td>' +
      '<td><label class="casilla-sobre"><input type="checkbox" class="chk-revisado-otro"' + (rev ? ' checked' : '') +
      ' onchange="revisadoOtroCurso_(\'' + clave + '\', this.checked)"> Revisado</label>' +
      (rev ? ' <span class="meta-revisado" title="' + esperaAttr_((rev.quien || '') + (rev.cuando ? ' · ' + new Date(rev.cuando).toLocaleString('es-ES') : '')) + '">' + escapaHtml(rev.quien || '') + '</span>' : '') +
      (o.aMano ? ' <button class="pequeno" onclick="deshacerOtroCurso_(\'' + clave + '\')">Deshacer</button>' : '') + '</td></tr>';
  }).join('');
  return '<table class="listado" id="tablaOtroCurso"><thead><tr><th>Alumno/a</th><th>Se esperaba en</th><th>Se ha matriculado en</th><th>Por qué se le esperaba ahí</th><th>Cómo</th><th></th></tr></thead><tbody>' +
    filas + '</tbody></table>';
}

function abrirFichaOtroCurso_(id) {
  if (typeof ALUMNADO_POR_CLAVE !== 'undefined' && ALUMNADO_POR_CLAVE && ALUMNADO_POR_CLAVE[id]) abrirFicha(id, false);
}

/* «Revisado»: cambia al momento y envía por detrás; si falla, vuelve a como estaba. */
function revisadoOtroCurso_(clave, marcado) {
  var e = esperadoPorClaveSobre_(clave);
  if (!e || !e.otroCurso) return;
  var antes = e.otroCurso.revisado;
  var provisional = marcado ? { quien: MI_CORREO, cuando: new Date().toISOString() } : null;
  e.otroCurso.revisado = provisional;
  pintarQuienViene();
  llamar('webOtroCursoRevisado', CURSO_VISTO, clave, !!marcado).then(function (r) {
    if (marcado && e.otroCurso.revisado === provisional && r && r.revisado) { e.otroCurso.revisado = r.revisado; pintarQuienViene(); }
  }).catch(function (err) {
    e.otroCurso.revisado = antes; pintarQuienViene(); avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

/* Deshacer lo unido a mano: vuelven a ser dos filas, y eso solo lo sabe el servidor. */
function deshacerOtroCurso_(clave) {
  llamar('webOtroCursoDeshacer', CURSO_VISTO, clave).then(cargarQuienViene)
    .catch(function (err) { avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error'); });
}

/* ---- En «No esperados»: la pregunta «¿Es …?» de los casos con duda (3.8) ---- */
function preguntaOtroCursoHtml_(n) {
  var posibles = n.posibles || [];
  if (!posibles.length) return '';
  var i = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.noEsperados) || []).indexOf(n);
  var texto = function (p) { return p.nombre + ', esperado en ' + p.curso; };
  var cuerpo = posibles.length === 1
    ? '¿Es ' + escapaHtml(texto(posibles[0])) + '?'
    : '¿Es <select class="sel-otro-curso" id="selOtroCurso' + i + '">' + posibles.map(function (p) {
        return '<option value="' + escapaAtributo_(p.clave) + '">' + escapaHtml(texto(p)) + '</option>';
      }).join('') + '</select>?';
  return '<div class="pregunta-otro-curso">' + cuerpo + ' <button class="pequeno" onclick="esElMismoOtroCurso_(' + i + ')">Es el mismo</button></div>';
}

function esElMismoOtroCurso_(i) {
  var n = ((QUIENVIENE_DATOS && QUIENVIENE_DATOS.noEsperados) || [])[i];
  if (!n || !(n.posibles || []).length) return;
  var sel = document.getElementById('selOtroCurso' + i);
  var clave = n.posibles.length === 1 ? n.posibles[0].clave : (sel ? sel.value : '');
  if (!clave) return;
  llamar('webOtroCursoMismo', CURSO_VISTO, clave, n.nombre, n.curso).then(cargarQuienViene)
    .catch(function (err) { avisar('No he podido unirlos. ' + mensajeDeError(err), 'error'); });
}
