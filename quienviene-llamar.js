/* Generado de JsQuienVieneLlamar.html por web/construir-quienviene.mjs: no se toca a mano. */
var LLAMAR_ABIERTO_ = '';    // clave del esperado con el panel abierto (solo uno)
var LLAMAR_VISTA_ = [];      // las filas que se ven ahora, en orden, para pulsar por posición
var VIAS_CONTACTO_ = ['Teléfono', 'Correo', 'En persona', 'Otra'];
var RESULTADOS_CONTACTO_ = ['No contesta', 'Dejado recado o mensaje', 'Dice que se va a matricular', 'Dice que no viene',
  'Teléfono equivocado', 'Pide que se le vuelva a llamar', 'Otro'];
var BLOQUES_LLAMAR_ = [
  { clave: 'sin', titulo: 'Sin llamar' },
  { clave: 'volver', titulo: 'Volver a llamar' },
  { clave: 'matricular', titulo: 'Dicen que se van a matricular' },
  { clave: 'incompleto', titulo: 'Sobre incompleto' }   // instrucción 41
];

/* A qué bloque va un esperado, por su último contacto. Añadir otro estado que también «hay que llamar» es
   cambiar la lista de filasVistaQuienViene_ (JsQuienViene.html), no esto. */
function bloqueLlamar_(e) {
  /* Instrucción 41: nadie sale dos veces. Quien ya entra en uno de los tres de arriba (Pendiente que sigue por llamar) se queda
     ahí, con las etiquetas de lo que falta; el cuarto es para el resto (Matriculados, o con el sobre ya presentado). */
  if (!(e.estado === 'Pendiente' && !sobreQuitaDeLlamar_(e))) return 'incompleto';
  var c = e.contactos || [];
  if (!c.length) return 'sin';
  return c[0].resultado === 'Dice que se va a matricular' ? 'matricular' : 'volver';
}

function esperadoPorClaveLlamar_(clave) {
  var lista = (QUIENVIENE_DATOS && QUIENVIENE_DATOS.esperados) || [];
  for (var i = 0; i < lista.length; i++) if (lista[i].clave === clave) return lista[i];
  return null;
}

function pintarALlamar_(filas) {
  var orden = filas.slice().sort(function (a, b) {
    var ca = String(a.curso || ''), cb = String(b.curso || '');
    if (ca !== cb) return ca < cb ? -1 : 1;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
  });
  LLAMAR_VISTA_ = [];
  var cuerpo = '';
  BLOQUES_LLAMAR_.forEach(function (b) {
    var del = orden.filter(function (e) { return bloqueLlamar_(e) === b.clave; });
    if (b.clave === 'incompleto') del.sort(ordenSobreIncompleto_);
    if (!del.length) return;
    cuerpo += '<tr class="bloque-llamar"><td colspan="4">' + escapaHtml(b.titulo) + ' (' + del.length + ')</td></tr>';
    del.forEach(function (e) {
      LLAMAR_VISTA_.push(e);
      var abierto = e.clave === LLAMAR_ABIERTO_;
      cuerpo += '<tr class="fila-llamar' + (abierto ? ' sel' : '') + '" onclick="abrirPanelLlamar_(' + (LLAMAR_VISTA_.length - 1) + ')">' +
        '<td>' + escapaHtml(e.curso + (e.modalidad ? ' (' + e.modalidad + ')' : '')) + '</td>' +
        '<td>' + escapaHtml(e.nombre) + ' ' + sobreEtiquetaLlamar_(e) + incompletoEtiquetasLlamar_(e) + '</td><td>' + familiaLlamarHtml_(e, false) + '</td>' +
        '<td>' + escapaHtml(ultimoContactoTexto_(e)) + '</td></tr>';
      if (abierto) cuerpo += '<tr class="panel-llamar-fila"><td colspan="4">' + panelLlamarHtml_(e) + '</td></tr>';
    });
  });
  return avisosPlanificacionHtml_() + '<table class="listado"><thead><tr><th>Curso</th><th>Alumno/a</th><th>Teléfonos y correos de los tutores</th><th>Último contacto</th></tr></thead>' +
    '<tbody>' + (cuerpo || '<tr><td colspan="4">Nadie por llamar.</td></tr>') + '</tbody></table>';
}

function ultimoContactoTexto_(e) {
  var c = (e.contactos || [])[0];
  if (!c) return 'Sin llamar';
  return c.resultado + ' · ' + new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function telHref_(t) { return 'tel:' + String(t).replace(/[^\d+]/g, ''); }

/* Los tutores con sus teléfonos (enlaces tel:) y correos (mailto:); sin nada, lo dice. */
function familiaLlamarHtml_(e, grande) {
  var fam = e.familia || [];
  if (!fam.length) return '<span class="campo">Sin teléfono en los datos</span>';
  return fam.map(function (t) {
    var tels = (t.telefonos || []).map(function (n) {
      return '<a href="' + esperaAttr_(telHref_(n)) + '" onclick="event.stopPropagation()">' + escapaHtml(n) + '</a>';
    }).join(', ');
    var mail = t.correo ? '<a href="mailto:' + esperaAttr_(t.correo) + '" onclick="event.stopPropagation()">' + escapaHtml(t.correo) + '</a>' : '';
    return '<div class="' + (grande ? 'llamar-tutor-grande' : 'llamar-tutor') + '"><b>' + escapaHtml(t.quien) + ':</b> ' +
      [tels, mail].filter(Boolean).join(' · ') + '</div>';
  }).join('');
}

function panelLlamarHtml_(e) {
  var op = function (lista, vacio, puesta) {
    return (vacio ? '<option value=""></option>' : '') + lista.map(function (o) {
      return '<option' + (o === puesta ? ' selected' : '') + '>' + escapaHtml(o) + '</option>';
    }).join('');
  };
  var hist = (e.contactos || []).map(function (c) {
    var mia = c.autor === MI_CORREO && String(c.id).indexOf('prov_') !== 0;
    return '<div class="nota"><div class="texto">' + escapaHtml(c.via || 'Contacto') + (c.resultado ? ' · ' + escapaHtml(c.resultado) : '') +
      (c.texto ? ' · ' + escapaHtml(c.texto) : '') + '</div><div class="meta">' + new Date(c.fecha).toLocaleString('es-ES') + ' · ' +
      escapaHtml(c.autor) + '</div>' + (mia ? '<button class="pequeno peligro" onclick="borrarContactoLlamar_(\'' + escapaAtributo_(c.id) + '\')">Borrar</button>' : '') + '</div>';
  }).join('') || '<p class="campo">Sin contactos todavía.</p>';
  return '<div class="panel-llamar">' + recuadroFaltaHtml_(e) + (sobreEtiquetaLlamar_(e) ? '<div>' + sobreEtiquetaLlamar_(e) + '</div>' : '') + '<div>' + familiaLlamarHtml_(e, true) + '</div>' +
    '<div><b>Apuntar un contacto</b><br>Vía <select id="llVia">' + op(VIAS_CONTACTO_, false, 'Teléfono') + '</select> ' +
    'Resultado <select id="llRes">' + op(RESULTADOS_CONTACTO_, true, '') + '</select>' +
    '<textarea id="llNotas" rows="2" placeholder="Notas"></textarea>' +
    '<div class="fila-botones"><button class="principal" id="llGuardar" onclick="guardarContactoLlamar_()">Guardar</button></div></div>' +
    '<div class="espera-hist"><b>Contactos anteriores</b>' + hist + '</div></div>';
}

/* Solo un panel abierto a la vez; pulsar la misma fila lo cierra. */
function abrirPanelLlamar_(i) {
  var e = LLAMAR_VISTA_[i];
  if (!e) return;
  LLAMAR_ABIERTO_ = (e.clave === LLAMAR_ABIERTO_) ? '' : e.clave;
  pintarQuienViene();
}

function guardarContactoLlamar_() {
  var e = LLAMAR_ABIERTO_ && esperadoPorClaveLlamar_(LLAMAR_ABIERTO_);
  if (!e) return;
  var via = document.getElementById('llVia').value, res = document.getElementById('llRes').value;
  var notas = document.getElementById('llNotas').value.trim();
  if (!res) { avisar('Elige el resultado del contacto', 'error'); return; }
  if (res === 'Otro' && !notas) { avisar('Con «Otro», explícalo en las notas', 'error'); return; }
  limpiarAviso();
  var noViene = res === 'Dice que no viene';
  /* Guardar sin esperar: se ve al momento y se envía por detrás; si falla, se deshace. */
  var antes = { contactos: e.contactos, noViene: e.noViene, estado: e.estado };
  var prov = { id: 'prov_' + Date.now(), fecha: new Date().toISOString(), autor: MI_CORREO, via: via, resultado: res, texto: notas };
  e.contactos = [prov].concat(e.contactos || []);
  if (noViene) { e.noViene = { motivo: notas || 'Lo dice la familia', quien: MI_CORREO, cuando: new Date().toISOString() }; e.estado = 'No viene'; }
  if (noViene) LLAMAR_ABIERTO_ = '';
  pintarQuienViene();
  llamar('webContactoGuardar', CURSO_VISTO, e.clave, e.claveContacto, { via: via, resultado: res, notas: notas }).then(function (r) {
    e.contactos = e.contactos.map(function (x) { return x === prov ? r.contacto : x; });
    if (noViene) avisarNoVieneConDeshacer_(e);
    else pintarQuienViene();
  }).catch(function (err) {
    e.contactos = antes.contactos; e.noViene = antes.noViene; e.estado = antes.estado;
    pintarQuienViene();
    avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

/* Un aviso con «Deshacer» durante unos segundos: quita el «No viene» y el alumno vuelve a la lista; el contacto se queda. */
function avisarNoVieneConDeshacer_(e) {
  var cont = document.getElementById('mensajes');
  var html = '<div class="aviso">' + escapaHtml(e.nombre) + ' pasa a «No viene». <button class="pequeno" onclick="deshacerNoVieneLlamar_(\'' +
    escapaAtributo_(e.clave) + '\')">Deshacer</button></div>';
  cont.innerHTML = html;
  setTimeout(function () { if (cont.innerHTML === html) limpiarAviso(); }, 10000);
  pintarQuienViene();
}

function deshacerNoVieneLlamar_(clave) {
  var e = esperadoPorClaveLlamar_(clave);
  if (!e) return;
  limpiarAviso();
  var antes = { noViene: e.noViene, estado: e.estado };
  e.noViene = null; e.estado = 'Pendiente';
  pintarQuienViene();
  llamar('webQuienVieneDeshacerNoViene', CURSO_VISTO, clave).catch(function (err) {
    e.noViene = antes.noViene; e.estado = antes.estado;
    pintarQuienViene();
    avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}

function borrarContactoLlamar_(id) {
  var e = LLAMAR_ABIERTO_ && esperadoPorClaveLlamar_(LLAMAR_ABIERTO_);
  if (!e || !confirm('¿Borrar este contacto?')) return;
  var antes = e.contactos;
  e.contactos = e.contactos.filter(function (x) { return x.id !== id; });
  pintarQuienViene();
  llamar('webNotaBorrar', id).catch(function (err) {
    e.contactos = antes;
    pintarQuienViene();
    avisar('No he podido borrarlo. ' + mensajeDeError(err), 'error');
  });
}
