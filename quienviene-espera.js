/* Generado de JsListaEspera.html por web/construir-quienviene.mjs: no se toca a mano. */
var ESPERA_SEL_ = '';          // clave del solicitante elegido
var ESPERA_SUCIO_ = false;     // hay cambios sin guardar en el detalle
var ESPERA_VISTA_ = [];        // las filas que se ven ahora (para pulsar por posición)
var VIAS_ESPERA_ = ['Teléfono', 'WhatsApp', 'Correo', 'En persona'];
var RESULTADOS_ESPERA_ = ['Sin respuesta', 'Interesada', 'Lo piensa', 'No le interesa'];

function esperaAttr_(t) { return escapaHtml(t).replace(/"/g, '&quot;'); }

function esperaCerrado_() { return cursoVistoInfo_().estado === 'Cerrado'; }

function esperaPorClave_(clave) {
  var lista = (QUIENVIENE_DATOS && QUIENVIENE_DATOS.listaEspera) || [];
  for (var i = 0; i < lista.length; i++) if (lista[i].clave === clave) return lista[i];
  return null;
}

/* El estado, con la misma tabla que EsperaGestion.gs (esperaEstado_): gana el primero que se cumpla. */
function esperaEstadoLocal_(g, llamadas) {
  var res = llamadas.length ? llamadas[0].resultado : '';
  if (res === 'No le interesa') return { estado: 'No le interesa', enGris: true };
  if (g.docRecibida) return { estado: 'Documentación recibida', enGris: false };
  if (g.docEnviada) return { estado: 'Documentación enviada', enGris: false };
  if (g.interesada) return { estado: 'Interesada', enGris: false };
  if (res === 'Lo piensa') return { estado: 'Lo piensa', enGris: false };
  if (res === 'Sin respuesta') return { estado: 'Sin respuesta', enGris: false };
  if (g.llamada || llamadas.length) return { estado: 'Llamada', enGris: false };
  return { estado: 'En espera', enGris: false };
}

function esperaAplicarEstado_(s) {
  var e = esperaEstadoLocal_(s.gestion, s.llamadas);
  s.estado = e.estado; s.enGris = e.enGris;
}

function pintarListaEspera_(filas) {
  ESPERA_VISTA_ = filas;
  return '<h3 class="espera-titulo">' + escapaHtml(tituloListaEspera_(filas)) + '</h3>' +
    '<div class="espera-dos"><div class="espera-lista">' + tablaListaEsperaHtml_(filas) + '</div>' +
    '<div class="espera-detalle" id="esperaDetalle">' + detalleEsperaHtml_() + '</div></div>';
}

/* Instrucción 42: cada curso con resolución lleva su título (ResolucionCruce.gs); sin resolución, el de siempre. Con varios títulos a la vista, uno por curso. */
function tituloListaEspera_(filas) {
  var porTitulo = {}, orden = [];
  filas.forEach(function (s) {
    var t = s.ordenTitulo || 'Orden aproximado (por puntos)';
    if (!porTitulo[t]) { porTitulo[t] = []; orden.push(t); }
    var g = s.grado || s.curso || '';
    if (porTitulo[t].indexOf(g) === -1) porTitulo[t].push(g);
  });
  if (orden.length <= 1) return orden[0] || 'Orden aproximado (por puntos)';
  return orden.map(function (t) { return porTitulo[t].join(', ') + ': ' + t; }).join(' · ');
}

function tablaListaEsperaHtml_(filas) {
  var conTipo = filas.some(function (s) { return !!s.tipoSolicitud; });
  var cabecera = ['Nº', 'Alumno/a', 'Curso', 'Centro de procedencia', 'Puntos'].concat(conTipo ? ['Tipo'] : [], ['Estado', 'Última llamada']);
  var cuerpo = filas.map(function (s, i) {
    var u = s.llamadas && s.llamadas[0];
    var ultima = u ? new Date(u.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) +
      (u.resultado ? ' · ' + u.resultado : '') : '';
    return '<tr class="espera-fila' + (s.enGris ? ' gris' : '') + (s.clave === ESPERA_SEL_ ? ' sel' : '') +
      '" onclick="elegirEsperaPorPosicion_(' + i + ')">' +
      '<td>' + s.posicion + '</td><td>' + escapaHtml(s.nombre) +
      (s.noEstaEnResolucion ? ' <span class="meta-revisado">No está en la resolución</span>' : '') +
      (s.sinSolicitud ? ' <span class="meta-revisado">Sin solicitud</span>' : '') + '</td>' +
      '<td>' + escapaHtml((s.curso || s.grado || '') + (s.modalidad ? ' (' + s.modalidad + ')' : '')) + '</td>' +
      '<td>' + escapaHtml(s.centro && s.centro.nombre ? s.centro.nombre : '') + '</td>' +
      '<td>' + (s.puntos || (s.puntos === 0 ? '0' : '')) + '</td>' + (conTipo ? '<td>' + escapaHtml(s.tipoSolicitud || '') + '</td>' : '') +
      '<td>' + escapaHtml(s.estado) + '</td><td>' + escapaHtml(ultima) + '</td></tr>';
  }).join('');
  return '<table class="listado"><thead><tr>' + cabecera.map(function (c) { return '<th>' + escapaHtml(c) + '</th>'; }).join('') +
    '</tr></thead><tbody>' + (cuerpo || '<tr><td colspan="' + cabecera.length + '">Nada aquí.</td></tr>') + '</tbody></table>';
}

function detalleEsperaHtml_() {
  var s = ESPERA_SEL_ && esperaPorClave_(ESPERA_SEL_);
  if (!s) return '<p class="campo">Pulsa a un alumno de la lista</p>';
  var cerrado = esperaCerrado_();
  var dis = cerrado ? ' disabled' : '';
  var g = s.gestion;
  var senecas = s.telefonosSeneca || [];
  var grande = g.telefono || (senecas[0] ? senecas[0].telefono : '');
  var marca = function (id, texto, v) {
    return '<label class="marca-check"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + dis +
      ' onchange="ESPERA_SUCIO_=true"> ' + texto + '</label>';
  };
  var opciones = function (lista, vacio, puesta) {
    return (vacio ? '<option value=""></option>' : '') + lista.map(function (o) {
      return '<option' + (o === puesta ? ' selected' : '') + '>' + escapaHtml(o) + '</option>';
    }).join('');
  };
  return '<div class="espera-cab"><b>' + escapaHtml(s.nombre) + '</b> · ' + escapaHtml(s.curso || s.grado || '') +
    (s.modalidad ? ' (' + escapaHtml(s.modalidad) + ')' : '') + ' · ' + (s.puntos || 0) + ' puntos · ' +
    escapaHtml(s.centro && s.centro.nombre ? s.centro.nombre : 'sin centro') + '</div>' +
    '<div class="espera-tel" id="esperaTelGrande">' + (grande ? escapaHtml(grande) : '<span class="campo">Sin teléfono</span>') + '</div>' +
    '<input type="text" id="esTel" placeholder="Teléfono de la familia" value="' + esperaAttr_(g.telefono) + '"' + dis +
    ' oninput="ESPERA_SUCIO_=true">' +
    (senecas.length ? '<div class="espera-seneca">De Séneca: ' + senecas.map(function (t) {
      return escapaHtml(t.quien) + ' ' + escapaHtml(t.telefono);
    }).join(' · ') + '</div>' : '') +
    '<div class="espera-pasos">' + marca('esLlamada', 'Llamada', g.llamada) + marca('esInteresada', 'Interesada', g.interesada) +
    marca('esEnviada', 'Documentación enviada', g.docEnviada) + marca('esRecibida', 'Documentación recibida', g.docRecibida) + '</div>' +
    '<div class="espera-nueva"><b>Apuntar una llamada</b> ' +
    '<select id="esVia"' + dis + ' onchange="ESPERA_SUCIO_=true">' + opciones(VIAS_ESPERA_, false, 'Teléfono') + '</select> ' +
    '<select id="esRes"' + dis + ' onchange="ESPERA_SUCIO_=true">' + opciones(RESULTADOS_ESPERA_, true, '') + '</select> ' +
    '<input type="text" id="esNotas" placeholder="Notas"' + dis + ' oninput="ESPERA_SUCIO_=true"></div>' +
    (cerrado ? '<p class="campo">Curso cerrado: solo se puede mirar.</p>' :
      '<div class="fila-botones"><button class="principal" id="esGuardar" onclick="guardarEspera_()">Guardar</button></div>') +
    '<div class="espera-hist"><b>Llamadas anteriores</b>' + (s.llamadas.length ? s.llamadas.map(function (l) {
      var mia = l.autor === MI_CORREO;
      return '<div class="nota"><div class="texto">' + escapaHtml(l.via || 'Llamada') + (l.resultado ? ' · ' + escapaHtml(l.resultado) : '') +
        (l.texto ? ' · ' + escapaHtml(l.texto) : '') + '</div><div class="meta">' + new Date(l.fecha).toLocaleString('es-ES') +
        ' · ' + escapaHtml(l.autor) + '</div>' +
        ((!cerrado && mia && l.id.indexOf('prov_') !== 0) ? '<button class="pequeno peligro" onclick="borrarLlamadaEspera_(\'' +
          escapaAtributo_(l.id) + '\')">Borrar</button>' : '') + '</div>';
    }).join('') : '<p class="campo">Sin llamadas todavía.</p>') + '</div>';
}

function repintarListaEspera_() { pintarQuienViene(); }

function elegirEsperaPorPosicion_(i) {
  var s = ESPERA_VISTA_[i];
  if (!s || s.clave === ESPERA_SEL_) return;
  if (ESPERA_SUCIO_ && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
  ESPERA_SEL_ = s.clave;
  ESPERA_SUCIO_ = false;
  repintarListaEspera_();
}

function valorEspera_(id) { var e = document.getElementById(id); return e ? e.value : ''; }
function marcadaEspera_(id) { var e = document.getElementById(id); return !!(e && e.checked); }

function guardarEspera_() {
  var s = ESPERA_SEL_ && esperaPorClave_(ESPERA_SEL_);
  if (!s || esperaCerrado_()) return;
  var notas = valorEspera_('esNotas').trim(), res = valorEspera_('esRes'), via = valorEspera_('esVia');
  if (notas && !res) { avisar('Elige el resultado de la llamada', 'error'); return; }
  var nueva = res ? { via: via, resultado: res, notas: notas } : null;
  var datos = { nombre: s.nombre, grado: s.grado, telefono: valorEspera_('esTel').trim(),
    llamada: marcadaEspera_('esLlamada'), interesada: marcadaEspera_('esInteresada'),
    docEnviada: marcadaEspera_('esEnviada'), docRecibida: marcadaEspera_('esRecibida'), llamadaNueva: nueva };
  if (nueva) { datos.llamada = true; if (res === 'Interesada') datos.interesada = true; }
  limpiarAviso();
  /* Guardar sin esperar: se ve al momento y se envía por detrás; si falla, se deshace. */
  var antes = { gestion: s.gestion, llamadas: s.llamadas, estado: s.estado, enGris: s.enGris };
  var provisional = nueva ? { id: 'prov_' + Date.now(), fecha: new Date().toISOString(), autor: MI_CORREO,
    via: via, resultado: res, texto: notas } : null;
  s.gestion = { telefono: datos.telefono, llamada: datos.llamada, interesada: datos.interesada,
    docEnviada: datos.docEnviada, docRecibida: datos.docRecibida };
  if (provisional) s.llamadas = [provisional].concat(s.llamadas);
  esperaAplicarEstado_(s);
  ESPERA_SUCIO_ = false;
  repintarListaEspera_();
  llamar('webEsperaGuardar', CURSO_VISTO, s.clave, datos).then(function (r) {
    if (r && r.llamada && provisional) s.llamadas = s.llamadas.map(function (x) { return x === provisional ? r.llamada : x; });
    esperaAplicarEstado_(s);
    repintarListaEspera_();
  }).catch(function (e) {
    s.gestion = antes.gestion; s.llamadas = antes.llamadas; s.estado = antes.estado; s.enGris = antes.enGris;
    repintarListaEspera_();
    avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error');
  });
}

function borrarLlamadaEspera_(id) {
  var s = ESPERA_SEL_ && esperaPorClave_(ESPERA_SEL_);
  if (!s || !confirm('¿Borrar esta llamada?')) return;
  var antes = { llamadas: s.llamadas, estado: s.estado, enGris: s.enGris };
  s.llamadas = s.llamadas.filter(function (x) { return x.id !== id; });
  esperaAplicarEstado_(s);
  repintarListaEspera_();
  llamar('webNotaBorrar', id).catch(function (e) {
    s.llamadas = antes.llamadas; s.estado = antes.estado; s.enGris = antes.enGris;
    repintarListaEspera_();
    avisar('No he podido borrarla. ' + mensajeDeError(e), 'error');
  });
}
