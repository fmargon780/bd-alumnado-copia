/* Generado de JsTransitoJefatura.html por web/construir-transito.mjs: no se toca a mano. */
var VISTA_TRANSITO = 'tutores';
var TRANSITO_TUTORES_ = [];
var TRANSITO_COLEGIOS_ = [];
var TRANSITO_SEGUIMIENTO_ = null;
var TRANSITO_BANDEJA_ = [];

/* Instrucción 104: sin fila de pestañas; el paso de la tarea (JsTareasPasos.html) pone `VISTA_TRANSITO`. */
function cargarTransitoJefatura() {
  cargarContenidoTransito_();
}

function cargarContenidoTransito_() {
  var cont = document.getElementById('contenidoSubpestanaTransito');
  cont.innerHTML = 'Cargando…';
  if (VISTA_TRANSITO === 'tutores') {
    llamar('webTransitoColegiosEsperados', CURSO_VISTO).then(function (cols) {
      TRANSITO_COLEGIOS_ = cols;
      return llamar('webTransitoTutoresListar', CURSO_VISTO);
    }).then(function (r) { TRANSITO_TUTORES_ = r; pintarTransitoTutores_(); })
      .catch(function (e) { avisar('No he podido cargar los tutores. ' + mensajeDeError(e), 'error'); });
  } else if (VISTA_TRANSITO === 'seguimiento') {
    llamar('webTransitoSeguimiento', CURSO_VISTO).then(function (r) { TRANSITO_SEGUIMIENTO_ = r; pintarTransitoSeguimiento_(); })
      .catch(function (e) { avisar('No he podido cargar el seguimiento. ' + mensajeDeError(e), 'error'); });
  } else {
    llamar('webTransitoBandeja', CURSO_VISTO).then(function (r) { TRANSITO_BANDEJA_ = r; pintarTransitoBandeja_(); })
      .catch(function (e) { avisar('No he podido cargar la bandeja. ' + mensajeDeError(e), 'error'); });
  }
}

/* ---------------- Tutores ---------------- */

function pintarTransitoTutores_() {
  var filas = TRANSITO_TUTORES_.map(function (t) {
    return '<tr><td>' + escapaHtml(t.colegioNombre || t.colegioCodigo) + '</td><td>' + escapaHtml(t.clase) + '</td>' +
      '<td>' + escapaHtml(t.nombre) + '</td><td>' + escapaHtml(t.correo) + '</td>' +
      '<td style="white-space:nowrap"><span class="meta-revisado">Último correo: ' + fechaUltimoCorreoTransito_(t.ultimoCorreo) + '</span> ' +
      '<button class="pequeno" onclick="transitoReenviarCorreo(\'' + escapaAtributo_(t.id) + '\')">Reenviar correo</button> ' +
      '<button class="pequeno" onclick="transitoTutorBaja(\'' + escapaAtributo_(t.id) + '\')">Dar de baja</button></td></tr>';
  }).join('') || '<tr><td colspan="5">Ningún tutor de alta todavía.</td></tr>';

  var opcionesColegio = '<option value="">Elige el colegio…</option>' +
    TRANSITO_COLEGIOS_.map(function (c) {
      return '<option value="' + escapaAtributo_(c.codigo) + '|' + escapaAtributo_(c.nombre) + '">' + escapaHtml(c.nombre) + '</option>';
    }).join('');
  var avisoSinColegios = TRANSITO_COLEGIOS_.length ? '' :
    '<p class="aviso" style="margin:4px 0">Todavía no hay ningún colegio con alumnado esperado de 1º de ESO: sube antes el fichero de admisión.</p>';

  document.getElementById('contenidoSubpestanaTransito').innerHTML =
    '<div class="tarjeta"><h2>Plazo general</h2>' +
    '<div class="fila-botones" style="margin-top:0">' +
    '<input type="datetime-local" id="trPlazoGeneral" style="padding:6px">' +
    '<button onclick="transitoGuardarPlazoGeneral()">Guardar plazo</button></div></div>' +
    '<div class="tarjeta"><h2>Alta de un tutor/a</h2>' + avisoSinColegios +
    '<div class="fila-botones" style="margin-top:0;flex-wrap:wrap">' +
    '<select id="trAltaColegio" style="padding:6px">' + opcionesColegio + '</select>' +
    '<input type="text" id="trAltaClase" placeholder="Clase (6º A)" style="padding:6px">' +
    '<input type="text" id="trAltaNombre" placeholder="Nombre del tutor/a" style="padding:6px">' +
    '<input type="email" id="trAltaCorreo" placeholder="Correo (@g.educaand.es)" style="padding:6px">' +
    '<button class="principal" onclick="transitoTutorAlta()">Dar de alta</button></div></div>' +
    '<div class="tarjeta"><table class="listado"><thead><tr><th>Colegio</th><th>Clase</th><th>Nombre</th><th>Correo</th><th></th></tr></thead>' +
    '<tbody>' + filas + '</tbody></table></div>';
}

/* «29/09/2026 10:15», o «—» si nunca se ha anotado (tutores dados de alta antes de la instrucción 21). */
function fechaUltimoCorreoTransito_(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Reenviar el correo del alta (instrucción 21): recuadro con la dirección ya escrita, que se puede corregir. */
var TUTOR_REENVIO_ID_ = null;

function transitoReenviarCorreo(id) {
  var t = (TRANSITO_TUTORES_ || []).filter(function (x) { return x.id === id; })[0];
  if (!t) return;
  TUTOR_REENVIO_ID_ = id;
  document.getElementById('reenviarNombreTutor').textContent = t.nombre + ' — ' + (t.colegioNombre || t.colegioCodigo) + ' ' + t.clase;
  document.getElementById('reenviarCorreoNuevo').value = t.correo;
  document.getElementById('botonEnviarReenvio').disabled = false;
  document.getElementById('reenviarError').classList.add('oculto');
  document.getElementById('modalReenviarCorreo').classList.remove('oculto');
}

function cerrarReenviarCorreo_() {
  document.getElementById('modalReenviarCorreo').classList.add('oculto');
  TUTOR_REENVIO_ID_ = null;
}

function enviarReenvioCorreo_() {
  var id = TUTOR_REENVIO_ID_;
  if (!id) return;
  var boton = document.getElementById('botonEnviarReenvio');
  var direccion = document.getElementById('reenviarCorreoNuevo').value.trim();
  boton.disabled = true;
  llamar('webTransitoTutorReenviar', id, direccion).then(function (r) {
    cerrarReenviarCorreo_();
    /* Se refresca solo la fila de este tutor, con lo que devuelve el servidor. */
    TRANSITO_TUTORES_ = (TRANSITO_TUTORES_ || []).map(function (x) { return x.id === id ? r.tutor : x; });
    if (VISTA_TRANSITO === 'tutores') pintarTransitoTutores_();
    if (r.correoEnviado) {
      avisar('Correo reenviado a ' + r.correo + '.', 'aviso');
    } else {
      avisar('La dirección se ha guardado, pero el correo no ha salido. Detalle: ' + r.avisoCorreo, 'error');
    }
  }).catch(function (e) {
    boton.disabled = false;
    var caja = document.getElementById('reenviarError');
    caja.textContent = 'No he reenviado el correo. ' + mensajeDeError(e);
    caja.classList.remove('oculto');
  });
}

function transitoGuardarPlazoGeneral() {
  var v = document.getElementById('trPlazoGeneral').value;
  llamar('webTransitoPlazoGeneral', CURSO_VISTO, v ? new Date(v).toISOString() : '')
    .then(function () { avisar('Plazo guardado.', 'aviso'); })
    .catch(function (e) { avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error'); });
}

function transitoTutorAlta() {
  var sel = document.getElementById('trAltaColegio').value;
  if (!sel) { avisar('Elige el colegio de la lista.', 'error'); return; }
  var barra = sel.indexOf('|');
  var datos = {
    colegioCodigo: sel.substring(0, barra),
    colegioNombre: sel.substring(barra + 1),
    clase: document.getElementById('trAltaClase').value.trim(),
    nombre: document.getElementById('trAltaNombre').value.trim(),
    correo: document.getElementById('trAltaCorreo').value.trim(),
    cursoEscolar: CURSO_VISTO
  };
  llamar('webTransitoTutorAlta', datos, MI_CORREO).then(function (r) {
    if (r.correoEnviado) {
      avisar('Tutor/a dado de alta. Le llega un correo con el enlace.', 'aviso');
    } else {
      avisar('Tutor/a dado de alta, pero no se ha podido mandar el correo. Pásale tú esta dirección: ' +
        (r.url || '(pídesela a quien gestiona la base de datos)') + '. Detalle: ' + r.avisoCorreo, 'error');
    }
    cargarContenidoTransito_();
  }).catch(function (e) { avisar('No he podido darlo de alta. ' + mensajeDeError(e), 'error'); });
}

function transitoTutorBaja(id) {
  llamar('webTransitoTutorBaja', id).then(function () { cargarContenidoTransito_(); })
    .catch(function (e) { avisar('No he podido darlo de baja. ' + mensajeDeError(e), 'error'); });
}

/* ---------------- Seguimiento ---------------- */

function pintarTransitoSeguimiento_() {
  var colegios = (TRANSITO_SEGUIMIENTO_ && TRANSITO_SEGUIMIENTO_.porColegio) || [];
  document.getElementById('contenidoSubpestanaTransito').innerHTML = colegios.map(function (c) {
    var tutoresHtml = c.tutores.map(function (t) {
      return '<tr><td>' + escapaHtml(t.clase) + '</td><td>' + escapaHtml(t.nombre) + '</td>' +
        '<td>' + t.marcadas + '</td><td>' + t.enviadas + '</td>' +
        '<td><button class="pequeno" onclick="transitoRecordatorio(\'' + escapaAtributo_(t.correo) + '\')">Enviar recordatorio</button></td></tr>';
    }).join('');
    return '<div class="tarjeta"><h2>' + escapaHtml(c.colegioNombre) + '</h2>' +
      '<p>' + c.enviadas + ' fichas enviadas de ' + c.totalEsperados + ' alumnos esperados' +
      (c.sinMarcar.length ? ' · sin marcar todavía: ' + c.sinMarcar.map(escapaHtml).join(', ') : '') + '</p>' +
      '<table class="listado"><thead><tr><th>Clase</th><th>Tutor/a</th><th>Marcadas</th><th>Enviadas</th><th></th></tr></thead>' +
      '<tbody>' + tutoresHtml + '</tbody></table></div>';
  }).join('') || '<div class="tarjeta">Sin alumnado esperado de ningún colegio todavía.</div>';
}

function transitoRecordatorio(correo) {
  llamar('webTransitoRecordatorio', CURSO_VISTO, correo).then(function () { avisar('Recordatorio enviado.', 'aviso'); })
    .catch(function (e) { avisar('No he podido mandarlo. ' + mensajeDeError(e), 'error'); });
}

/* ---------------- Bandeja de revisión ---------------- */

function pintarTransitoBandeja_() {
  var filas = TRANSITO_BANDEJA_.map(function (f) {
    return '<tr><td>' + escapaHtml(f.nombre) + '</td><td>' + escapaHtml(f.colegioCodigo) + '</td>' +
      '<td><button class="pequeno" onclick="transitoAbrirRevision(\'' + escapaAtributo_(f.clave) + '\')">Revisar</button></td></tr>';
  }).join('') || '<tr><td colspan="3">Nada pendiente de revisar.</td></tr>';
  document.getElementById('contenidoSubpestanaTransito').innerHTML =
    '<table class="listado"><thead><tr><th>Alumno/a</th><th>Colegio</th><th></th></tr></thead><tbody>' + filas + '</tbody></table>';
}

function transitoAbrirRevision(clave) {
  var f = TRANSITO_BANDEJA_.filter(function (x) { return x.clave === clave; })[0];
  if (!f) return;
  var r = f.respuestas;
  var modal = document.getElementById('modalFicha');
  var campo = function (id, etiqueta, valor) {
    return '<div class="campo-ficha" style="margin-bottom:8px"><label style="color:var(--suave);font-size:12.5px">' +
      escapaHtml(etiqueta) + '</label><input type="text" id="' + id + '" value="' + escapaAtributo_(valor) + '" style="width:100%;padding:5px"></div>';
  };
  modal.innerHTML = '<div class="ficha" style="max-width:640px">' +
    '<div class="ficha-cabecera"><h2>' + escapaHtml(f.nombre) + '</h2><button class="cerrar" onclick="cerrarFicha()">&times;</button></div>' +
    campo('trRevNivelLengua', 'Nivel en Lengua', r.nivelLengua) + campo('trRevNivelMates', 'Nivel en Matemáticas', r.nivelMates) +
    campo('trRevNivelIngles', 'Nivel en Inglés', r.nivelIngles) + campo('trRevHabitos', 'Hábitos de trabajo', r.habitosTrabajo) +
    campo('trRevComportamiento', 'Comportamiento', r.comportamiento) + campo('trRevAsistencia', 'Asistencia', r.asistencia) +
    campo('trRevObservaciones', 'Observaciones', r.observaciones) +
    '<p>Separar de: ' + escapaHtml((r.separarDe || []).join(', ') || '—') + ' · Juntar con: ' + escapaHtml((r.juntarCon || []).join(', ') || '—') + '</p>' +
    '<label style="display:block;margin:10px 0"><input type="checkbox" id="trRevConflictivo"' +
      (f.aprobacion && f.aprobacion.conflictivo ? ' checked' : '') + '> Marcar como conflictivo en la mesa</label>' +
    '<div class="fila-botones"><button class="principal" onclick="transitoAprobarFicha(\'' + escapaAtributo_(clave) + '\')">Aprobar</button></div>' +
    '</div>';
  modal.classList.remove('oculto');
}

function transitoAprobarFicha(clave) {
  var f = TRANSITO_BANDEJA_.filter(function (x) { return x.clave === clave; })[0];
  var r = Object.assign({}, f.respuestas, {
    nivelLengua: document.getElementById('trRevNivelLengua').value,
    nivelMates: document.getElementById('trRevNivelMates').value,
    nivelIngles: document.getElementById('trRevNivelIngles').value,
    habitosTrabajo: document.getElementById('trRevHabitos').value,
    comportamiento: document.getElementById('trRevComportamiento').value,
    asistencia: document.getElementById('trRevAsistencia').value,
    observaciones: document.getElementById('trRevObservaciones').value
  });
  var conflictivo = document.getElementById('trRevConflictivo').checked;
  llamar('webTransitoAprobar', CURSO_VISTO, clave, r, conflictivo, MI_CORREO).then(function (res) {
    cerrarFicha();
    avisar('Aprobada.' + ((res.avisos || []).length ? ' ' + res.avisos.join(' ') : ''), 'aviso');
    cargarContenidoTransito_();
  }).catch(function (e) { avisar('No he podido aprobarla. ' + mensajeDeError(e), 'error'); });
}
