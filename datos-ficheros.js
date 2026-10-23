/* Generado de JsCentroDatosFicheros.html por web/construir-datos.mjs: no se toca a mano. */
var DATOS_ESTADO_ = null;
var POR_PREGUNTAR_ = [];
var RES_LEYENDO_GUARDADO_ = false;

/* La línea gris de una fila que vino del Centro de datos (la misma de las filas fijas de Descargas). */
function grisCentroDatos_(f) {
  return f && f.centroDatos ? '<div class="del-centro-datos">Del Centro de datos, ' + escapaHtml(f.centroDatos.fecha || '') + (f.centroDatos.quien ? ' · lo subió ' + escapaHtml(f.centroDatos.quien) : '') + '</div>' : '';
}

function esQuienGestiona_() { return !(typeof soloLectura_ === 'function' && soloLectura_()); }

/* La línea de estado, en los dos sitios donde se enseña. */
function pintarLineaDatos_(d) {
  if (d) DATOS_ESTADO_ = d;
  var e = DATOS_ESTADO_;
  ['lineaDatosPortada', 'lineaDatosPaso'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var caido = typeof PANTALLA_ !== 'undefined' && PANTALLA_.latidoCaido;   // instrucción 94: sin latido, el botón vuelve y la línea lo dice
    var texto = caido ? 'La app no se está poniendo al día sola.' : (e && e.texto ? e.texto : '');
    el.textContent = texto;
    el.className = 'linea-datos' + (caido || (e && e.estado === 'medias') ? ' ambar' : '') + (texto ? '' : ' oculto');
  });
}

function pintarPorPreguntar_(lista) {
  var el = document.getElementById('porPreguntarCD');
  if (!el) return;
  POR_PREGUNTAR_ = lista || [];
  if (!POR_PREGUNTAR_.length || !esQuienGestiona_()) { el.innerHTML = ''; el.classList.add('oculto'); return; }
  el.innerHTML = POR_PREGUNTAR_.map(function (p, i) {
    return '<div class="pregunta-cd"><span>Ha llegado un listado del Centro de datos: ¿de qué curso es? <b>' + escapaHtml(p.texto) + '</b></span> ' +
      '<select id="preguntaCD' + i + '"><option value="">— elige el curso —</option>' + (p.opciones || []).map(function (o) { return '<option>' + escapaHtml(o) + '</option>'; }).join('') + '</select> ' +
      '<button onclick="responderPorPreguntar_(' + i + ')">Tomarlo</button></div>';
  }).join('');
  el.classList.remove('oculto');
}

function responderPorPreguntar_(i) {
  var p = POR_PREGUNTAR_[i], sel = document.getElementById('preguntaCD' + i);
  if (!p || !sel || !sel.value) { avisar('Elige el curso del listado.', 'error'); return; }
  llamar('webCentroDatosResponder', p.id, sel.value).then(function (r) {
    if (!r || !r.ok) { avisar((r && r.motivo) || 'No he podido tomarlo.', 'error'); return; }
    avisar('Traído del Centro de datos: ' + r.tomado + '.', 'aviso aviso-verde');
    cargarDescargas();
  }).catch(function (e) { avisar('No he podido tomarlo. ' + mensajeDeError(e), 'error'); });
}

/* El PDF de la resolución que llegó del Centro de datos y aún no está leído: se lee aquí (pdf.js, JsResolucionPdf.html) y las filas van al servidor, como al soltarlo. Una sola vez por sesión y fichero. */
function leerResolucionGuardada_(d) {
  if (RES_LEYENDO_GUARDADO_ || !esQuienGestiona_() || !d || !d.resolucion || !(d.resolucion.ficheros || []).some(function (f) { return !f.leido; })) return;
  RES_LEYENDO_GUARDADO_ = true;
  var curso = CURSO_VISTO;
  llamar('webResolucionPdfGuardado', curso).then(function (r) {
    if (!r || !r.hay) return null;
    var bin = atob(r.base64), bytes = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    var file = new File([bytes], r.nombre, { type: 'application/pdf' });
    return resolucionCargarPdfjs_().then(function () { return resolucionLeerPaginas_(file); }).then(function (paginas) {
      var a = resolucionAnalizar_(paginas);
      if (!a.esResolucion || (!a.filas.length && !a.sinCurso.length)) { avisar('El PDF de la resolución que llegó del Centro de datos no parece la resolución de admisión.', 'error'); return null; }
      return llamar('webResolucionGuardar', r.curso, { cursoEscolar: a.cursoEscolar, filas: a.filas, totales: a.totales, totalSuelto: a.totalSuelto, sinCurso: a.sinCurso }).then(function (g) {
        if (!g.ok) { avisar(g.motivo, 'error'); return null; }
        avisar('Resolución de admisión leída: ' + a.filas.length + ' alumnos.', 'aviso aviso-verde');
        return true;
      });
    });
  }).then(function (leido) { if (leido) cargarDescargas(); })
    .catch(function (e) { avisar('No he podido leer la resolución del Centro de datos. ' + mensajeDeError(e), 'error'); });
}
