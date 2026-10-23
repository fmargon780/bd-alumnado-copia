/* Generado de JsDocumentosAvisos.html por web/construir-documentos.mjs: no se toca a mano. */
var AVISOS_INFORMES_ABIERTO_ = false;

function avisosInformesHtml_(D) {
  var lista = D.avisosInformes || [];
  var pendientes = lista.filter(function (a) { return !a.revisado; }).length;
  var filas = lista.map(function (a, i) {
    var accion = a.revisado
      ? '<span class="meta-revisado">' + escapaHtml(a.revisado.quien) + ', ' + new Date(a.revisado.cuando).toLocaleDateString('es-ES') + (a.revisado.nota ? ' — ' + escapaHtml(a.revisado.nota) : '') + '</span> ' +
        (D.soloLectura ? '' : '<button class="pequeno" onclick="avisoInformeDeshacer_(' + i + ')">Deshacer</button>')
      : (D.soloLectura ? '' : '<button class="pequeno" onclick="avisoInformeMarcar_(' + i + ')">Revisado, no es error</button>');
    return '<tr class="' + (a.revisado ? 'fila-revisada' : '') + '"><td>' + escapaHtml(a.grupo) + '</td><td>' + escapaHtml(a.pestana) + '</td><td>' + escapaHtml(a.aviso) +
      '</td><td>' + escapaHtml(a.detalle) + '</td><td>' + accion + '</td></tr>';
  }).join('');
  return '<div class="tarjeta" id="avisosInformesDoc"><details' + (AVISOS_INFORMES_ABIERTO_ ? ' open' : '') + ' ontoggle="AVISOS_INFORMES_ABIERTO_ = this.open">' +
    '<summary><strong>Avisos de los informes: ' + pendientes + '</strong> <span style="color:#667">(de la última vez que se generaron)</span>' + (lista.length !== pendientes ? ' <span style="color:#667">(' + lista.length + ' en total)</span>' : '') + '</summary>' +
    (lista.length ? '<table class="listado"><thead><tr><th>Grupo</th><th>Pestaña</th><th>Aviso</th><th>Detalle</th><th></th></tr></thead><tbody>' + filas + '</tbody></table>'
      : '<p style="color:#667;margin:6px 0 0">Ningún aviso al rellenar los informes.</p>') + '</details></div>';
}

function avisoInformeMarcar_(i) {
  var a = DOCUMENTOS_.avisosInformes[i];
  var nota = prompt('Nota (opcional, una línea):', '') || '';
  var antes = a.revisado;
  a.revisado = { quien: MI_CORREO, cuando: new Date().toISOString(), nota: nota };
  pintarDocumentos_();
  llamar('webRevisionMarcar', CURSO_VISTO, 'informes', a.clave, nota).then(function (r) { a.revisado = r; pintarDocumentos_(); }).catch(function (e) {
    a.revisado = antes; pintarDocumentos_(); avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error');
  });
}

function avisoInformeDeshacer_(i) {
  var a = DOCUMENTOS_.avisosInformes[i];
  var antes = a.revisado;
  a.revisado = null;
  pintarDocumentos_();
  llamar('webRevisionDeshacer', CURSO_VISTO, 'informes', a.clave).catch(function (e) {
    a.revisado = antes; pintarDocumentos_(); avisar('No he podido deshacerlo. ' + mensajeDeError(e), 'error');
  });
}
