/* Generado de JsDocumentosEstado.html por web/construir-documentos.mjs: no se toca a mano. */
/* Qué documentos enseña cada paso (la misma tabla que DOCUMENTOS_PASOS_ de DocumentosDatos.gs) y cómo se llama lo que se genera en cada uno. */
var PASO_DOCS_ = { documentos: ['informesEso', 'informesBac', 'pendientes', 'pendientesBac', 'enterado', 'seguimiento'], informes: ['informesEso', 'informesBac'], pendientes: ['pendientes', 'pendientesBac', 'enterado', 'seguimiento'], listados: ['mesa'] };
var PASO_NOMBRE_DOCS_ = { documentos: ['documento', 'documentos'], informes: ['informe', 'informes'], pendientes: ['documento', 'documentos'], listados: ['listado', 'listados'] };
var PASO_ETIQUETA_DOCS_ = { documentos: 'Documentos', informes: 'Informes por unidad', pendientes: 'Pendientes y seguimiento', listados: 'Listados por grupo', ordenar: 'Ordenar la carpeta de Drive' };
var NOMBRE_PIEZA_DOCS_ = { informesEso: 'informe', informesBac: 'informe', pendientes: 'relación de pendientes', pendientesBac: 'relación de pendientes', enterado: 'hoja de «enterado»', seguimiento: 'hoja de seguimiento', mesa: 'listado', ordenar: 'carpeta' };

/* Suma los resúmenes de unos documentos: { total, alDia, falta, cambiado, fallo, generando, espera, faltan } (faltan = falta + cambiado + fallo: lo que el botón volvería a hacer). */
function sumaDocumentos_(filas) {
  var s = { total: 0, alDia: 0, falta: 0, cambiado: 0, fallo: 0, generando: 0, espera: 0 };
  filas.forEach(function (f) { Object.keys(s).forEach(function (k) { s[k] += (f.resumen && f.resumen[k]) || 0; }); });
  s.faltan = s.falta + s.cambiado + s.fallo;
  return s;
}

function resumenPasoDocumentos_(D, paso) {
  var claves = PASO_DOCS_[paso] || [];
  return sumaDocumentos_((D.filas || []).filter(function (f) { return claves.indexOf(f.clave) !== -1; }));
}

function docDatos_() { return (typeof DOCUMENTOS_ !== 'undefined' && DOCUMENTOS_) || datoHoy_('webDocumentosEstado', CURSO_VISTO); }

/* El botón principal del paso: { texto, apagado, oculto, accion }. Su texto y si está apagado salen de esta cuenta. */
function documentosBotonPaso_(paso) {
  var D = docDatos_();
  if (!D) return { texto: 'Generar lo que falta', apagado: true };
  if (D.soloLectura) return { oculto: true };
  var g = D.generacion || {};
  if (g.enCurso && g.parada) return { texto: 'Seguir' };
  var r = resumenPasoDocumentos_(D, paso);
  if (D.pidiendo === paso) return { texto: 'Generando…', apagado: true };
  if (r.faltan) return { texto: 'Generar lo que falta (' + r.faltan + ')' };
  if (r.generando || r.espera) return { texto: 'Generando…', apagado: true };
  return { texto: 'Nada que generar', apagado: true };
}

/* Cada documento, con una etiqueta de pocas palabras: { clase: 'ok' | 'falta' | 'gen' | 'esp' | 'mal', texto }. */
function etiquetaDocumento_(f, g) {
  var r = f.resumen, pl = ((g && g.plan) || {})[f.clave];
  if (!r.total) return { clase: 'esp', texto: 'Sin unidades' };
  if (g && g.enCurso && g.parada && (r.generando || r.espera)) return { clase: 'mal', texto: 'Parado' };
  if (r.generando) return { clase: 'gen', texto: 'Generando' + (pl ? ' · ' + Math.min(pl[1] + 1, pl[0]) + ' de ' + pl[0] : '') };
  if (r.espera) return { clase: 'esp', texto: 'En espera' };
  if (r.fallo) return { clase: 'mal', texto: 'Falló ' + r.fallo + ' de ' + r.total };
  var faltan = r.falta + r.cambiado;
  if (faltan) return { clase: 'falta', texto: (faltan === 1 ? 'Falta 1' : 'Faltan ' + faltan) + ' de ' + r.total };
  return { clase: 'ok', texto: '✓ Al día · ' + r.total + ' de ' + r.total };
}

/* Para la fila de pasos y «Hoy»: { s: 'hecho' | 'falta' | 'nohace', n, texto } con las mismas palabras. */
function estadoDocumento_(c, claves) {
  if (!c.doc) return { s: 'falta', texto: 'Trayendo los documentos…' };
  var r = sumaDocumentos_((c.doc.filas || []).filter(function (f) { return claves.indexOf(f.clave) !== -1; }));
  var g = c.doc.generacion || {};
  if (!r.total) return { s: 'nohace' };
  if (r.generando || r.espera) return { s: 'falta', n: r.generando + r.espera, texto: g.enCurso && g.parada ? 'Se ha parado' : 'Generando' };
  if (r.faltan) return { s: 'falta', n: r.faltan, texto: 'Faltan ' + r.faltan };
  return { s: 'hecho', texto: 'Al día' };
}

/* ---- las palabras ---- */

function fechaDocumentos_(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso), hoy = new Date();
    var hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === hoy.toDateString() ? 'hoy, ' + hora : d.toLocaleDateString('es-ES') + ', ' + hora;
  } catch (e) { return iso; }
}

function horaDocumentos_(ms) {
  try { return new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
}

/* «A», «A y B», «A, B y C»; con más de seis, las seis primeras y «y 5 más», que se despliega. `nombres` ya va escapado. */
function listaUnidadesDocumentos_(nombres) {
  function une(l) { return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1]; }
  if (nombres.length <= 6) return une(nombres);
  return nombres.slice(0, 6).join(', ') + ' <details style="display:inline"><summary style="display:inline;cursor:pointer;color:var(--acento)">y ' + (nombres.length - 6) + ' más</summary>' + nombres.slice(6).join(', ') + '</details>';
}

/* Qué falta o qué ha cambiado en un documento, con los nombres de las unidades. */
function detalleDocumento_(f) {
  var frases = [], por = function (e) { return f.piezas.filter(function (p) { return p.estado === e; }); };
  var nombre = function (p) { return escapaHtml(p.unidad || f.nombre); };
  var sin = por('falta').filter(function (p) { return !p.razon; });
  if (sin.length) frases.push('Sin generar: ' + listaUnidadesDocumentos_(sin.map(nombre)) + '.');
  var viejas = por('falta').filter(function (p) { return p.razon; });
  if (viejas.length) frases.push(escapaHtml(viejas[0].razon) + ': ' + listaUnidadesDocumentos_(viejas.map(nombre)) + '.');
  var camb = por('cambiado');
  if (camb.length) frases.push('Ha cambiado desde que se generó: ' + listaUnidadesDocumentos_(camb.map(function (p) { return nombre(p) + (p.razon ? ' (' + escapaHtml(p.razon) + ')' : ''); })) + '.');
  por('fallo').forEach(function (p) { frases.push('No se pudo: ' + nombre(p) + ' — ' + escapaHtml(String(p.motivo || 'no se ha podido').replace(/\.$/, '')) + '.'); });
  var ahora = por('generando'), luego = por('espera');
  if (ahora.length) frases.push('Ahora: ' + listaUnidadesDocumentos_(ahora.map(nombre)) + '.');
  if (luego.length) frases.push('Va después: ' + listaUnidadesDocumentos_(luego.map(nombre)) + '.');
  return frases.join(' ') || '—';
}
