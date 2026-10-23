/* Generado de JsDocumentos.html por web/construir-documentos.mjs: no se toca a mano. */
var DOCUMENTOS_ = null;
var SONDEO_DOCUMENTOS = null;
var SONDEO_DOC_MS_ = 4000;
var EMPUJANDO_DOCUMENTOS_ = false;
var DOC_AVANCE_VISTO_ = '';

/* El paso de la tarea que se está viendo: 'documentos', 'enviar' o 'listados' (los dos de antes, 'informes' y 'pendientes', se juntaron en 'documentos'). */
function pasoDocumentosActual_() {
  var p = (typeof TAREA_ACTUAL !== 'undefined' && TAREA_ACTUAL && typeof pasoActual_ === 'function') ? pasoActual_(TAREA_ACTUAL, 'documentos') : null;
  return p && (PASO_DOCS_[p.clave] || p.clave === 'enviar') ? p.clave : 'documentos';
}

function cargarDocumentos() {
  if (DOCUMENTOS_ && datoHoy_('webDocumentosEstado', CURSO_VISTO) === DOCUMENTOS_) { pintarDocumentos_(); arrancarSondeoSiHaceFalta_(); return; }   // ya está en memoria: cambiar de paso no llama al servidor
  document.getElementById('tab-documentos').innerHTML = 'Cargando…';
  llamar('webDocumentosEstado', CURSO_VISTO).then(function (r) {
    DOCUMENTOS_ = r;
    pintarDocumentos_();
    arrancarSondeoSiHaceFalta_();
  }).catch(function (e) { avisar('No he podido cargar los documentos. ' + mensajeDeError(e), 'error'); });
}

function arrancarSondeoSiHaceFalta_() { if (DOCUMENTOS_ && DOCUMENTOS_.generacion && DOCUMENTOS_.generacion.enCurso) arrancarSondeoDocumentos_(); }

function recargarDocumentos_() {
  olvidarLecturas_(['webDocumentosEstado']);
  DOCUMENTOS_ = null;
  cargarDocumentos();
}

/* Mientras haya una cola en marcha y esta pantalla esté a la vista: se pregunta cómo va; cuando termina una pieza se vuelve a pedir la tabla; y si pasan 90 segundos sin avanzar, se empuja. */
function avanceDocumentos_(g) { return g.hechas + '/' + g.fallos + '/' + g.total; }

function arrancarSondeoDocumentos_() {
  if (SONDEO_DOCUMENTOS) return;
  if (DOCUMENTOS_ && DOCUMENTOS_.generacion) DOC_AVANCE_VISTO_ = avanceDocumentos_(DOCUMENTOS_.generacion);
  SONDEO_DOCUMENTOS = setTimeout(sondeoDocumentos_, SONDEO_DOC_MS_);
}

function sondeoDocumentos_() {
  if (!SONDEO_DOCUMENTOS) return;
  var sigue = function () { if (SONDEO_DOCUMENTOS) SONDEO_DOCUMENTOS = setTimeout(sondeoDocumentos_, SONDEO_DOC_MS_); };
  llamar('webDocumentosEstadoGeneracion').then(function (g) {
    if (!DOCUMENTOS_) return;
    var terminaba = DOCUMENTOS_.generacion && DOCUMENTOS_.generacion.enCurso;
    DOCUMENTOS_.generacion = g;
    if (!g.enCurso) {
      pararSondeoDocumentos_();
      if (terminaba) recargarDocumentos_();   // recarga entera: estados, fechas y enlaces nuevos
      return;
    }
    var avance = avanceDocumentos_(g);
    if (avance !== DOC_AVANCE_VISTO_) { DOC_AVANCE_VISTO_ = avance; recargarDocumentos_(); return; }   // una pieza más: la tabla se pone al día
    pintarBarraDocumentos_();
    if (g.sinAvanzarMs >= 90000 && !EMPUJANDO_DOCUMENTOS_) empujarDocumentos_();
  }).then(sigue, sigue);   // un fallo de red no para el sondeo: se reintenta en el siguiente
}

function pararSondeoDocumentos_() {
  if (SONDEO_DOCUMENTOS) { clearTimeout(SONDEO_DOCUMENTOS); SONDEO_DOCUMENTOS = null; }
}

/* Una vuelta de la cola desde aquí, sin esperar al disparador (por si no llega a ejecutarse). */
function empujarDocumentos_() {
  EMPUJANDO_DOCUMENTOS_ = true;
  var fin = function () { EMPUJANDO_DOCUMENTOS_ = false; };
  llamar('webDocumentosEmpujar').then(fin, fin);
}

function pintarBarraDocumentos_() {
  pintarDocumentos_();
}

function refrescarCabeceraDocumentos_() {
  if (typeof pintarCabeceraTarea_ === 'function' && PESTANA_ACTUAL === 'documentos') pintarCabeceraTarea_('documentos');
}

/* ---------------- La línea de arriba de cada paso ---------------- */

function cajaGenerandoDocumentos_(g) {
  if (/^Esperando/.test(g.fase || '')) {
    return '<div class="doc-caja marcha"><b>' + escapaHtml(g.fase) + '.</b> Sigue sola cuando termine.<small>Puedes cerrar la web o irte a otra pantalla: sigue sola.</small></div>';
  }
  var pieza = g.actual ? g.actual : null;
  var que = g.paso === 'ordenar' ? '<b>Ordenando la carpeta de Drive…</b>' : (pieza && pieza.clave === 'preparar') ? '<b>Preparando los informes…</b>' :
    '<b>Generando: ' + (NOMBRE_PIEZA_DOCS_[pieza && pieza.clave] || 'documento') + ' ' + Math.min(g.hechas + 1, g.total) + ' de ' + g.total + '</b>' +
    (pieza && pieza.unidad ? ' (' + escapaHtml(pieza.unidad) + ')' : '') + '. Empezó a las ' + horaDocumentos_(g.inicio) + '.';
  return '<div class="doc-caja marcha">' + que + '<small>Puedes cerrar la web o irte a otra pantalla: sigue sola.</small>' +
    '<div class="doc-barra"><i style="width:' + Math.round(100 * (g.hechas + g.fallos) / Math.max(1, g.total)) + '%"></i></div></div>';
}

function cajaParadaDocumentos_(g) {
  var donde = g.donde && g.donde.unidad ? ' Se quedó en ' + escapaHtml(g.donde.unidad) + '.' : '';
  return '<div class="doc-caja parada"><b>La generación se ha parado.</b> Lleva ' + Math.max(10, Math.floor(g.sinAvanzarMs / 60000)) + ' minutos sin avanzar.' + donde +
    '<small>Lo que ya estaba hecho sigue guardado. «Seguir» continúa desde donde se quedó.</small></div>';
}

function lineaPasoDocumentos_(D, paso, r) {
  var g = D.generacion || {}, n = PASO_NOMBRE_DOCS_[paso] || ['documento', 'documentos'];
  var cola = '', resumen = '';
  if (g.enCurso && g.parada) cola = cajaParadaDocumentos_(g);
  else if (g.enCurso && (r.generando || r.espera)) cola = cajaGenerandoDocumentos_(g);
  else if (g.enCurso) cola = '<div class="doc-caja marcha">' + (g.paso === 'ordenar' ? 'Se está ordenando la carpeta de Drive.' : 'Se está generando lo de «' + escapaHtml(PASO_ETIQUETA_DOCS_[g.paso] || 'otro paso') + '».') + '</div>';
  if (!r.total) resumen = 'Todavía no hay nada que generar aquí. ' + fraseDatos_('Pulsa «Actualizar los datos» en el primer paso.');
  else if (r.faltan) {
    resumen = '<b>' + (r.faltan === 1 ? 'Falta 1 ' + n[0] : 'Faltan ' + r.faltan + ' ' + n[1]) + ' de ' + r.total + '.</b>' +
      (r.alDia ? ' ' + (r.alDia === 1 ? 'El otro está' : 'Los otros ' + r.alDia + ' están') + ' al día y no se vuelven a hacer.' : '');
  } else if (!r.generando && !r.espera) {
    var ultima = g.ultimoResultado && g.ultimoCuando ? ' Última generación: ' + fechaDocumentos_(g.ultimoCuando).replace('hoy, ', 'hoy a las ') + ', ' + escapaHtml(g.ultimoResultado) + '.' : '';
    resumen = '<b>' + (r.total === 1 ? 'El ' + n[0] + ' está al día.' : 'Los ' + r.total + ' ' + n[1] + ' están al día.') + '</b>' + ultima;
  }
  return '<div class="doc-linea">' + cola + (cola && resumen ? '<div style="height:8px"></div>' : '') + resumen + '</div>';
}

/* ---------------- La tabla de un paso ---------------- */

function enlacesDocumento_(f) {
  var con = f.piezas.filter(function (p) { return p.url; });
  if (con.length === 1) return '<a href="' + escapaAtributo_(con[0].url) + '" target="_blank">Abrir</a>';
  if (con.length > 1) {
    return '<select onchange="if(this.value) window.open(this.value,\'_blank\')"><option value="">Abrir…</option>' +
      con.map(function (p) { return '<option value="' + escapaAtributo_(p.url) + '">' + escapaHtml(p.unidad || f.nombre) + '</option>'; }).join('') + '</select>';
  }
  return '';
}

function filaDocumento_(f, g) {
  var e = etiquetaDocumento_(f, g);
  return '<tr><td class="doc">' + escapaHtml(f.nombre) +
    '</td>' +
    '<td class="est"><span class="doc-e ' + e.clase + '">' + escapaHtml(e.texto) + '</span></td>' +
    '<td>' + detalleDocumento_(f) + '</td><td class="cuando">' + escapaHtml(fechaDocumentos_(f.ultima)) + '</td><td class="abrir">' + enlacesDocumento_(f) + '</td></tr>';
}

function pintarPasoDocumentos_(D, paso) {
  var claves = PASO_DOCS_[paso] || [];
  var filas = (D.filas || []).filter(function (f) { return claves.indexOf(f.clave) !== -1; });
  var r = sumaDocumentos_(filas);
  return (paso === 'documentos' ? '<div id="docTextoHojas"></div>' : '') +
    '<div class="tarjeta">' + lineaPasoDocumentos_(D, paso, r) +
    /* Instrucción 87: «Texto de las hojas» sale una sola vez (antes, en tres filas); el editor se abre encima de la tabla (JsDocumentosPlantilla.html). */
    (paso === 'documentos' ? '<p class="doc-linea"><a href="javascript:void(0)" onclick="abrirTextoHojas_()">Texto de las hojas</a></p>' : '') +
    '<table class="listado doc-tabla"><thead><tr><th>Documento</th><th>Estado</th><th>Qué falta o qué ha cambiado</th><th>Generados</th><th>Abrir</th></tr></thead><tbody>' +
    (filas.map(function (f) { return filaDocumento_(f, D.generacion); }).join('') || '<tr><td colspan="5">Aquí no hay nada que generar en este centro.</td></tr>') + '</tbody></table></div>';
}

function pintarDocumentos_() {
  var D = DOCUMENTOS_;
  if (!D) return;
  var cont = document.getElementById('tab-documentos');
  var paso = pasoDocumentosActual_();
  var html = '';
  if (D.soloLectura) {
    html += '<div class="tarjeta"><p style="color:#667">Este curso no está en marcha: solo se pueden abrir los PDF que ya hay. ' +
      'Para generar o enviar, elige arriba el curso en marcha.</p></div>';
  }
  if (paso === 'enviar') html += pintarTutoresDocumentos_(D);
  else html += pintarPasoDocumentos_(D, paso);
  if (paso === 'documentos' && typeof avisosInformesHtml_ === 'function') html += avisosInformesHtml_(D);   // instrucción 51: los avisos de los informes (JsDocumentosAvisos.html)
  cont.innerHTML = html;
  if (paso === 'documentos' && typeof pintarTextoHojas_ === 'function') pintarTextoHojas_();   // instrucción 50: si el editor estaba abierto, se vuelve a pintar
  refrescarCabeceraDocumentos_();
}

/* ---------------- Los botones ---------------- */

/* Lo que hace el botón principal del paso (cabecera de la tarea). */
function documentosPrincipal_(paso) {
  var b = documentosBotonPaso_(paso);
  if (b.apagado || b.oculto) return;
  if (b.texto === 'Seguir') { documentosSeguir(); return; }
  documentosGenerarPaso_(paso);
}

function documentosGenerarPaso_(paso) {
  DOCUMENTOS_.pidiendo = paso;
  pintarDocumentos_();
  llamar('webDocumentosGenerarLoQueFalta', CURSO_VISTO, paso).then(function (r) {
    if (r && r.nada) avisar('No hay nada que generar: todo está al día.', 'aviso');
    else avisar('Generando en segundo plano. Puedes seguir usando la web.', 'aviso');
    recargarDocumentos_();
  }).catch(function (e) {
    if (DOCUMENTOS_) { DOCUMENTOS_.pidiendo = ''; pintarDocumentos_(); }
    avisar('No he podido lanzarlo. ' + mensajeDeError(e), 'error');
  });
}

/* «Seguir»: la caja cambia al momento y después se avisa al servidor (reprograma el disparador) y se pide una vuelta ahí mismo. */
function documentosSeguir() {
  var g = DOCUMENTOS_ && DOCUMENTOS_.generacion;
  if (g) { g.parada = false; g.sinAvanzarMs = 0; g.fase = 'Generando…'; pintarDocumentos_(); }
  arrancarSondeoDocumentos_();
  llamar('webDocumentosSeguir').then(function () { empujarDocumentos_(); })
    .catch(function (e) { avisar('No he podido seguir. ' + mensajeDeError(e), 'error'); recargarDocumentos_(); });
}

function fechaCortaDocumentos_(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('es-ES'); } catch (e) { return iso; }
}

/* ---------------- Tutores ---------------- */

function pintarTutoresDocumentos_(D) {
  var filas = (D.tutores || []).map(function (t) {
    return '<tr>' +
      '<td>' + escapaHtml(t.unidad) + '</td>' +
      '<td><input type="text" value="' + escapaAtributo_(t.nombre) + '" id="docNombre_' + escapaAtributo_(t.unidad) + '" style="width:100%"' +
        (D.soloLectura ? ' disabled' : '') + '></td>' +
      '<td><input type="email" value="' + escapaAtributo_(t.correo) + '" id="docCorreo_' + escapaAtributo_(t.unidad) + '" ' +
        'placeholder="nombre@g.educaand.es" style="width:100%"' + (D.soloLectura ? ' disabled' : '') + '></td>' +
      '<td><select id="docTrato_' + escapaAtributo_(t.unidad) + '"' + (D.soloLectura ? ' disabled' : '') + '>' +
        [['', 'sin elegir'], ['Tutor', 'Tutor'], ['Tutora', 'Tutora']].map(function (o) {
          return '<option value="' + o[0] + '"' + (t.trato === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></td>' +
      '<td>' + (D.soloLectura ? '' : '<button class="pequeno" onclick="documentosGuardarTutor(\'' +
        escapaAtributo_(t.unidad) + '\')">Guardar</button>') + '</td>' +
      '<td style="font-size:11.5px;color:#667">' +
        (t.enviadoEl ? 'enviado el ' + fechaCortaDocumentos_(t.enviadoEl) : 'nunca enviado') +
        (t.pendienteDeReenvio ? '<br><span style="color:var(--rojo)">hay que volver a enviarlo</span>' : '') +
      '</td></tr>';
  }).join('') || '<tr><td colspan="6">Todavía no hay ninguna unidad. ' + fraseDatos_('Pulsa "Actualizar los datos".') + '</td></tr>';

  var pend = (D.tutores || []).filter(function (t) { return t.correo && !t.informesAlDia; }).length;
  var aviso = '';
  if (pend) {
    aviso = '<p style="color:var(--aviso)">' + (pend === 1 ? 'Una unidad no se puede enviar' : pend + ' unidades no se pueden enviar') + ' porque algo de lo suyo no está al día. ' +
      '<a href="javascript:void(0)" onclick="irAPaso_(\'inicio\',\'documentos\')">Ir a «Documentos»</a>.</p>';
  }
  return '<div class="tarjeta"><h2>Tutores</h2>' + aviso +
    '<table class="listado"><thead><tr><th>Unidad</th><th>Nombre</th><th>Correo</th><th>Tutor o tutora</th><th></th><th>Envío</th></tr></thead>' +
    '<tbody>' + filas + '</tbody></table>' +
    '</div>';   // instrucción 87: el botón «Enviar a los tutores» sale una sola vez, el de la cabecera de la tarea
}

function documentosGuardarTutor(unidad) {
  var nombre = document.getElementById('docNombre_' + unidad).value.trim();
  var correo = document.getElementById('docCorreo_' + unidad).value.trim();
  var trato = document.getElementById('docTrato_' + unidad).value;
  llamar('webDocumentosTutorGuardar', CURSO_VISTO, unidad, nombre, correo, trato)
    .then(function () { avisar('Guardado.', 'aviso'); })
    .catch(function (e) { avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error'); });
}

function documentosEnviar() {
  llamar('webDocumentosEnviarPreguntar', CURSO_VISTO).then(function (r) {
    if (!r.totalCorreos) {
      avisar('No hay ningún correo pendiente de mandar (o falta generar los informes).', 'aviso');
      return;
    }
    var texto = 'Se van a enviar ' + r.totalCorreos + ' correo(s) a ' + r.totalCorreos + ' tutor(es).';
    if (r.sinCorreo.length) texto += '\n\nSin correo, no se les manda nada: ' + r.sinCorreo.join(', ') + '.';
    if (r.desactualizadas.length) texto += '\n\nDesactualizados, no se les manda nada: ' + r.desactualizadas.join(', ') + '.';
    if (!window.confirm(texto + '\n\n¿Continúo?')) return;
    llamar('webDocumentosEnviar', CURSO_VISTO).then(function (res) {
      if (!res.ok) {
        avisar('No he podido mandar nada: hoy solo quedan ' + res.cuota + ' correos de cuota y hacían falta ' + res.necesarios + '.', 'error');
        return;
      }
      avisar('Enviados ' + res.enviados + ' correo(s).' +
        (res.fallidos.length ? ' No he podido con: ' + res.fallidos.join('; ') + '.' : ''), 'aviso');
      recargarDocumentos_();
    }).catch(function (e) { avisar('No he podido enviarlos. ' + mensajeDeError(e), 'error'); });
  }).catch(function (e) { avisar('No he podido comprobarlo. ' + mensajeDeError(e), 'error'); });
}
