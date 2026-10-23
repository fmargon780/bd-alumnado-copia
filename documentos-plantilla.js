/* Generado de JsDocumentosPlantilla.html por web/construir-documentos.mjs: no se toca a mano. */
var TEXTO_HOJAS_ = { abierto: false, datos: null, original: {}, mensaje: '', avisos: [] };

function marcasDeTexto_(texto) {
  var salida = [];
  (String(texto == null ? '' : texto).match(/\{[A-Z_]+\}/g) || []).forEach(function (m) { if (salida.indexOf(m) === -1) salida.push(m); });
  return salida;
}

var GRUPOS_TEXTO_HOJAS_ = [
  { id: 'relacion', nombre: 'Relación de pendientes' },
  { id: 'enterado', nombre: 'Hoja de «enterado»' },
  { id: 'seguimiento', nombre: 'Hoja de seguimiento mensual' },
  { id: 'bach', nombre: 'Textos de Bachillerato' },
  { id: 'comunes', nombre: 'Comunes' }
];

/* El grupo de una clave de la plantilla: por lo que va antes del primer «_» (RELACION_, ENTERADO_, SEGUIMIENTO_); el resto, comunes. Instrucción 125: las que empiezan por BACH_ van
   en su propio grupo, «Textos de Bachillerato», sin mezclarse con las de la ESO. */
function grupoDeClaveTextoHojas_(clave) {
  var p = String(clave).split('_')[0];
  if (p === 'BACH') return 'bach';
  return p === 'RELACION' ? 'relacion' : p === 'ENTERADO' ? 'enterado' : p === 'SEGUIMIENTO' ? 'seguimiento' : 'comunes';
}

function abrirTextoHojas_() {
  if (TEXTO_HOJAS_.abierto) { cerrarTextoHojas_(); return; }
  llamar('webPlantillaLeer', CURSO_VISTO).then(function (r) {
    TEXTO_HOJAS_ = { abierto: true, datos: r, original: {}, mensaje: '', avisos: [] };
    r.filas.forEach(function (f) { TEXTO_HOJAS_.original[f.clave] = f.texto; });
    pintarTextoHojas_();
    var el = document.getElementById('docTextoHojas');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }).catch(function (e) { avisar('No he podido abrir el texto de las hojas. ' + mensajeDeError(e), 'error'); });
}

function cerrarTextoHojas_() {
  TEXTO_HOJAS_ = { abierto: false, datos: null, original: {}, mensaje: '', avisos: [] };
  pintarTextoHojas_();
}

function pintarTextoHojas_() {
  var el = document.getElementById('docTextoHojas');
  if (!el) return;
  var D = TEXTO_HOJAS_.datos;
  if (!TEXTO_HOJAS_.abierto || !D) { el.innerHTML = ''; return; }
  var dis = D.editable ? '' : ' disabled';
  /* Instrucción 59: las claves van agrupadas con un rótulo por documento. Cada caja conserva su número de fila (i) en la lista. */
  var cajaDe = function (f, i) {
    var filas = Math.max(1, Math.min(8, Math.ceil(String(f.texto).length / 150) + (String(f.texto).split('\n').length - 1)));
    return '<div class="th-fila"><label for="thTexto_' + i + '"><code>' + escapaHtml(f.clave) + '</code></label>' +
      '<textarea id="thTexto_' + i + '" rows="' + filas + '"' + dis + ' oninput="cambiaTextoHojas_(' + i + ')">' + escapaHtml(f.texto) + '</textarea>' +
      '<div class="th-marcas" id="thMarcas_' + i + '">' + marcasHtmlTextoHojas_(f.clave, f.texto) + '</div></div>';
  };
  var cajas = GRUPOS_TEXTO_HOJAS_.map(function (g) {
    var dentro = D.filas.map(function (f, i) { return { f: f, i: i }; }).filter(function (x) { return grupoDeClaveTextoHojas_(x.f.clave) === g.id; });
    return dentro.length ? '<h3 class="th-grupo" style="font-size:13px;margin:14px 0 4px;color:var(--acento)">' + escapaHtml(g.nombre) + '</h3>' + dentro.map(function (x) { return cajaDe(x.f, x.i); }).join('') : '';
  }).join('');
  var avisos = TEXTO_HOJAS_.avisos.map(function (a) { return '<div class="th-aviso">' + escapaHtml(a.texto) + ' <span class="th-marcas">(' + escapaHtml(a.clave) + ')</span></div>'; }).join('');
  el.innerHTML = '<div class="tarjeta" id="tarjetaTextoHojas"><h2>Texto de las hojas</h2>' +
    '<p style="font-size:12.5px;color:#667;margin:0 0 8px">Es el texto de la relación de pendientes, de las hojas de «enterado» y de las hojas de seguimiento mensual (el de 2º de Bachillerato va aparte, en «Textos de Bachillerato», con las claves BACH_). Los PDF que se generen después usan el texto nuevo. ' +
    'Marcas que se sustituyen: ' + D.marcas.map(escapaHtml).join(' ') + '. Las formas «[al alumno|a la alumna]» y «[T:Tutor|Tutora|Tutoría]» también valen.' +
    (D.existe ? '' : ' Todavía no hay texto guardado: se guarda al pulsar «Guardar».') + '</p>' + cajas +
    '<div class="fila-botones">' + (D.editable ? '<button class="principal" onclick="guardarTextoHojas_()">Guardar</button>' : '<span class="of-nota">Este curso no está en marcha: solo se puede ver.</span>') +
    '<button class="pequeno" onclick="cerrarTextoHojas_()">Cerrar</button></div>' + avisos +
    (TEXTO_HOJAS_.mensaje ? '<p class="of-nota" style="margin:6px 0 0">' + escapaHtml(TEXTO_HOJAS_.mensaje) + '</p>' : '') + '</div>';
}

/* Las marcas que lleva el texto de una caja y, en rojo, las que tenía al abrir y ya no lleva. */
function marcasHtmlTextoHojas_(clave, texto) {
  var ahora = marcasDeTexto_(texto);
  var antes = marcasDeTexto_(TEXTO_HOJAS_.original[clave] || '');
  var faltan = antes.filter(function (m) { return ahora.indexOf(m) === -1; });
  return (ahora.length ? 'Marcas: ' + ahora.map(escapaHtml).join(' ') : 'Sin marcas') +
    faltan.map(function (m) { return '<span class="th-aviso"> · Falta la marca ' + escapaHtml(m) + ': en la hoja no saldrá ese dato.</span>'; }).join('');
}

function cambiaTextoHojas_(i) {
  var f = TEXTO_HOJAS_.datos.filas[i];
  var caja = document.getElementById('thTexto_' + i);
  f.texto = caja.value;
  document.getElementById('thMarcas_' + i).innerHTML = marcasHtmlTextoHojas_(f.clave, f.texto);
}

function guardarTextoHojas_() {
  var D = TEXTO_HOJAS_.datos;
  var cambios = D.filas.filter(function (f) { return f.texto !== TEXTO_HOJAS_.original[f.clave]; }).map(function (f) { return { clave: f.clave, texto: f.texto }; });
  if (!cambios.length) { TEXTO_HOJAS_.mensaje = 'No hay nada que guardar.'; pintarTextoHojas_(); return; }
  llamar('webPlantillaGuardar', CURSO_VISTO, cambios).then(function (r) {
    cambios.forEach(function (c) { TEXTO_HOJAS_.original[c.clave] = c.texto; });
    D.existe = true;
    TEXTO_HOJAS_.avisos = r.avisos || [];
    TEXTO_HOJAS_.mensaje = 'Guardado. Los PDF que se generen ahora usarán el texto nuevo.';
    pintarTextoHojas_();
    avisar('Texto guardado.' + (TEXTO_HOJAS_.avisos.length ? ' Ojo: falta alguna marca (míralo debajo).' : ''), TEXTO_HOJAS_.avisos.length ? 'aviso' : undefined);
  }).catch(function (e) { avisar('No he podido guardar el texto. ' + mensajeDeError(e), 'error'); });
}
