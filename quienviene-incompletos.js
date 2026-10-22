/* Generado de JsQuienVieneIncompletos.html por web/construir-quienviene.mjs: no se toca a mano. */
var FALTA_OPTATIVA_ = 'falta optativa';
var FALTA_RELIGION_ = 'falta religión';
var DOS_SOLICITUDES_ = 'dos solicitudes distintas';
var INCOMPLETO_DESHACER_ = {};   // clave del esperado -> lo necesario para deshacer lo último que sacó a alguien de la lista

/* ¿Le queda algo a este esperado? (falta algo, o dos solicitudes distintas sin revisar). */
function incompletoActivo_(e) {
  var inc = e && e.incompleto;
  return !!inc && ((inc.falta || []).length > 0 || (!!inc.dos && !inc.dos.revisado));
}

/* Las etiquetas junto al nombre: las de lo que falta, con los textos exactos. */
function incompletoEtiquetasLlamar_(e) {
  var inc = e.incompleto;
  if (!incompletoActivo_(e)) return '';
  var textos = (inc.falta || []).slice();
  if (inc.dos && !inc.dos.revisado) textos.push(DOS_SOLICITUDES_);
  return textos.map(function (t) { return '<span class="chip aviso-sobre">' + escapaHtml(t) + '</span>'; }).join('');
}

/* Orden dentro de «Sobre incompleto»: primero las familias sin ningún contacto apuntado; dentro, por curso y apellidos. */
function ordenSobreIncompleto_(a, b) {
  var ca = (a.contactos || []).length ? 1 : 0, cb = (b.contactos || []).length ? 1 : 0;
  if (ca !== cb) return ca - cb;
  var cua = String(a.curso || ''), cub = String(b.curso || '');
  if (cua !== cub) return cua < cub ? -1 : 1;
  return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
}

/* Los avisos de arriba (un solo aviso por nivel que no tiene columna de religión reconocible). */
function avisosPlanificacionHtml_() {
  var p = QUIENVIENE_DATOS && QUIENVIENE_DATOS.planificacion;
  if (!p || !(p.avisos || []).length) return '';
  return p.avisos.map(function (a) { return '<p class="aviso-sobres">' + escapaHtml(a) + '</p>'; }).join('');
}

function datosNivelIncompleto_(e) {
  var p = QUIENVIENE_DATOS && QUIENVIENE_DATOS.planificacion;
  return (p && p.niveles && e.incompleto && p.niveles[e.incompleto.nivel]) || { nPref: 1, optativas: [], religiones: [] };
}

/* El recuadro «Lo que falta en el sobre», a todo el ancho del panel. */
function recuadroFaltaHtml_(e) {
  if (!incompletoActivo_(e)) return '';
  var inc = e.incompleto, datos = datosNivelIncompleto_(e), falta = inc.falta || [], cuerpo = '';
  var opciones = function (lista) {
    return '<option value=""></option>' + lista.map(function (o) {
      return '<option value="' + escapaAtributo_(o.codigo) + '">' + escapaHtml(o.etiqueta) + '</option>';
    }).join('');
  };
  var pide = '';
  if (falta.indexOf(FALTA_OPTATIVA_) !== -1) {
    for (var i = 1; i <= datos.nPref; i++) {
      pide += '<label>' + i + 'ª optativa' + (i === 1 ? ' (obligatoria)' : '') + ' <select id="fcOpt' + i + '">' + opciones(datos.optativas) + '</select></label> ';
    }
  }
  if (falta.indexOf(FALTA_RELIGION_) !== -1) {
    pide += '<label>Religión o atención educativa <select id="fcRel">' + opciones(datos.religiones) + '</select></label> ';
  }
  if (pide) cuerpo += '<div>' + pide + '<button class="principal" id="fcGuardar" onclick="guardarFaltaSobre_()">Guardar lo que faltaba</button></div>';
  if (inc.dos && !inc.dos.revisado) {
    cuerpo += '<div><b>Dos solicitudes distintas</b><table class="listado"><thead><tr><th>Fecha de registro</th><th>Optativas en orden</th><th>Religión</th><th></th></tr></thead><tbody>' +
      inc.dos.solicitudes.map(function (s) {
        return '<tr><td>' + escapaHtml(s.fecha || 'sin fecha') + '</td><td>' + escapaHtml((s.optativas || []).join(' › ') || '—') + '</td><td>' +
          escapaHtml((s.religion || []).join(', ') || '—') + '</td><td>' + (s.vale ? '<span class="chip si">Vale esta</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table><button id="fcRevisado" onclick="revisarSobreDos_()">Revisado</button></div>';
  }
  return '<div class="recuadro-falta"><b>Lo que falta en el sobre</b>' + cuerpo + '</div>';
}

/* Un aviso con «Deshacer» durante unos segundos (como el de «No viene»). */
function avisarIncompletoConDeshacer_(texto, funcion, clave) {
  var cont = document.getElementById('mensajes');
  var html = '<div class="aviso">' + escapaHtml(texto) + ' <button class="pequeno" onclick="' + funcion + '(\'' + escapaAtributo_(clave) + '\')">Deshacer</button></div>';
  cont.innerHTML = html;
  setTimeout(function () { if (cont.innerHTML === html) limpiarAviso(); }, 10000);
}

function esperadoAbiertoIncompleto_() {
  var e = LLAMAR_ABIERTO_ && esperadoPorClaveLlamar_(LLAMAR_ABIERTO_);
  return e && e.incompleto ? e : null;
}

/* «Guardar lo que faltaba»: se ve al momento y se envía por detrás; si falla, se deshace y se avisa. */
function guardarFaltaSobre_() {
  var e = esperadoAbiertoIncompleto_();
  if (!e) return;
  var inc = e.incompleto, datos = datosNivelIncompleto_(e), opt = [], rel = '', huecoAntes = false, saltado = false;
  for (var i = 1; i <= datos.nPref; i++) {
    var s = document.getElementById('fcOpt' + i);
    if (!s) continue;
    if (s.value) { opt.push(s.value); if (huecoAntes) saltado = true; } else huecoAntes = true;
  }
  var sr = document.getElementById('fcRel');
  if (sr) rel = sr.value;
  if (saltado) { avisar('La 1ª optativa es la obligatoria: elígela antes que las demás', 'error'); return; }
  if (!opt.length && !rel) { avisar('Elige la optativa o la religión que faltaba', 'error'); return; }
  limpiarAviso();
  var resta = (inc.falta || []).filter(function (f) { return !((opt.length && f === FALTA_OPTATIVA_) || (rel && f === FALTA_RELIGION_)); });
  var nuevo = Object.assign({}, inc, { falta: resta });
  var sigue = resta.length > 0 || (!!inc.dos && !inc.dos.revisado);
  e.incompleto = sigue ? nuevo : null;
  if (!sigue) LLAMAR_ABIERTO_ = '';
  pintarQuienViene();
  llamar('webPlanificacionGuardarFalta', CURSO_VISTO, e.clave, opt, rel).then(function (r) {
    if (sigue) return;
    INCOMPLETO_DESHACER_[e.clave] = { antes: inc, previo: r.previo };
    avisarIncompletoConDeshacer_(e.nombre + ': sobre completo.', 'deshacerFaltaSobre_', e.clave);
  }).catch(function (err) {
    e.incompleto = inc;
    pintarQuienViene();
    avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

function deshacerFaltaSobre_(clave) {
  var e = esperadoPorClaveLlamar_(clave), ctx = INCOMPLETO_DESHACER_[clave];
  if (!e || !ctx) return;
  limpiarAviso();
  var actual = e.incompleto;
  e.incompleto = ctx.antes;
  pintarQuienViene();
  llamar('webPlanificacionDeshacerFalta', CURSO_VISTO, clave, ctx.previo).catch(function (err) {
    e.incompleto = actual;
    pintarQuienViene();
    avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}

/* «Revisado»: ya se ha comprobado cuál de las dos solicitudes vale; sale de la lista si no le queda nada. */
function revisarSobreDos_() {
  var e = esperadoAbiertoIncompleto_();
  if (!e || !e.incompleto.dos) return;
  var inc = e.incompleto;
  var nuevo = Object.assign({}, inc, { dos: Object.assign({}, inc.dos, { revisado: true }) });
  var sigue = (inc.falta || []).length > 0;
  limpiarAviso();
  e.incompleto = sigue ? nuevo : null;
  if (!sigue) LLAMAR_ABIERTO_ = '';
  pintarQuienViene();
  llamar('webPlanificacionRevisado', CURSO_VISTO, e.clave, inc.dos.huella).then(function () {
    if (sigue) return;
    INCOMPLETO_DESHACER_[e.clave] = { antes: inc };
    avisarIncompletoConDeshacer_(e.nombre + ': marcado como revisado.', 'deshacerRevisadoSobre_', e.clave);
  }).catch(function (err) {
    e.incompleto = inc;
    pintarQuienViene();
    avisar('No he podido guardarlo. ' + mensajeDeError(err), 'error');
  });
}

function deshacerRevisadoSobre_(clave) {
  var e = esperadoPorClaveLlamar_(clave), ctx = INCOMPLETO_DESHACER_[clave];
  if (!e || !ctx) return;
  limpiarAviso();
  var actual = e.incompleto;
  e.incompleto = ctx.antes;
  pintarQuienViene();
  llamar('webPlanificacionQuitarRevisado', CURSO_VISTO, clave).catch(function (err) {
    e.incompleto = actual;
    pintarQuienViene();
    avisar('No he podido deshacerlo. ' + mensajeDeError(err), 'error');
  });
}
