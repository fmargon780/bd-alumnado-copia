/* Generado de JsCentro.html por web/construir-datos.mjs: no se toca a mano. */
var CENTRO_DATOS_ = null;
var CENTRO_FIJOS_ = [];     // instrucción 74: los campos que manda el Centro de datos (no se escriben aquí)
var CENTRO_CARPETA_ = null; // y la carpeta del Centro de datos, si se ha encontrado
var CENTRO_MENSAJE_ = '';   // lo que dice el último guardado (sobrevive a repintar el formulario)

function centroDeEstado_() {
  var c = (ESTADO && ESTADO.centro) || {};
  return { nombre: c.nombre || '', ensenanzas: c.ensenanzas || ['ESO', 'BACH'], usaExcelJefatura: c.usaExcelJefatura !== false, subeMedidas: !!c.subeMedidas };
}

function centroTieneBach_() { return centroDeEstado_().ensenanzas.indexOf('BACH') !== -1; }

function pintarNombreCentro_() {
  var el = document.getElementById('nombreCentro');
  if (!el) return;
  var n = centroDeEstado_().nombre;
  el.textContent = n ? 'Alumnado · ' + n : 'Alumnado del centro';
}

function cargarCentro_() {
  var cont = document.getElementById('formularioCentro');
  if (!cont) return;
  if (CENTRO_DATOS_) { pintarCentro_(); return; }
  cont.innerHTML = '<p class="vacio-hoy">Trayendo los datos del centro…</p>';
  llamar('webCentroLeer').then(function (r) { CENTRO_DATOS_ = r.config; CENTRO_FIJOS_ = r.delCentroDeDatos || []; CENTRO_CARPETA_ = r.centroDatos || null; pintarCentro_(); })
    .catch(function (e) { cont.innerHTML = '<p class="vacio-hoy">No he podido traer los datos del centro. ' + escapaHtml(mensajeDeError(e)) + '</p>'; });
}

function campoCentroHtml_(id, etiqueta, valor, ayuda) {
  return '<label class="campo-centro"><span>' + escapaHtml(etiqueta) + '</span><input type="text" id="centro_' + id + '" value="' + escapaAtributo_(valor).replace(/"/g, '&quot;') + '">' +
    (ayuda ? '<small>' + escapaHtml(ayuda) + '</small>' : '') + '</label>';
}

function centroAyuda_(k, normal) { return CENTRO_FIJOS_.indexOf(k) !== -1 ? 'Se cambia en el Centro de datos' : normal; }

function centroDatosAyuda_() {
  var c = CENTRO_CARPETA_;
  if (!c) return 'Sin encontrar: si el Centro de datos está en otra cuenta, pega aquí el enlace de su carpeta.';
  return 'Encontrada: «' + c.nombre + '»' + (c.actualizado ? ', índice del ' + String(c.actualizado).slice(0, 10) : '') + '. Solo hace falta pegar el enlace si un día se muda de cuenta.';
}

function pintarCentro_() {
  var cont = document.getElementById('formularioCentro');
  var c = CENTRO_DATOS_;
  var ens = (c.ensenanzas || '').split(',');
  cont.innerHTML =
    campoCentroHtml_('nombre', 'Nombre del centro', c.nombre, centroAyuda_('nombre', '')) +
    campoCentroHtml_('codigo', 'Código del centro', c.codigo, centroAyuda_('codigo', '')) +
    campoCentroHtml_('localidad', 'Localidad', c.localidad, centroAyuda_('localidad', '')) +
    campoCentroHtml_('provincia', 'Provincia', c.provincia, centroAyuda_('provincia', 'Los domicilios de los alumnos de otra provincia la llevan escrita.')) +
    '<div class="campo-centro"><span>Enseñanzas que imparte</span><label><input type="checkbox" id="centro_ens_ESO"' + (ens.indexOf('ESO') !== -1 ? ' checked' : '') + '> ESO</label> ' +
      '<label><input type="checkbox" id="centro_ens_BACH"' + (ens.indexOf('BACH') !== -1 ? ' checked' : '') + '> Bachillerato</label></div>' +
    campoCentroHtml_('firma', 'Cómo se firman los correos', c.firma, centroAyuda_('firma', '')) +
    '<div class="campo-centro"><label><input type="checkbox" id="centro_usaExcelJefatura"' + (c.usaExcelJefatura === 'si' ? ' checked' : '') + '> El centro usa un Excel propio de agrupamientos</label></div>' +
    '<div class="campo-centro"><label><input type="checkbox" id="centro_subeMedidas"' + (c.subeMedidas === 'si' ? ' checked' : '') + '> Subir las medidas de velocidad al repositorio del programa</label></div>' +
    '<details class="gestion"><summary>Carpeta y cuadernos de este centro (identificadores de Drive)</summary>' +
      campoCentroHtml_('carpetaId', 'Carpeta de la app («1. Descargas de Séneca»)', c.carpetaId) +
      campoCentroHtml_('idInformes', 'Cuaderno de informes de la ESO', c.idInformes) +
      campoCentroHtml_('idNotas', 'Cuaderno de notas', c.idNotas) +
      campoCentroHtml_('centroDatosId', 'Carpeta del Centro de datos', c.centroDatosId, centroDatosAyuda_()) + '</details>' +
    '<div class="fila-botones"><button class="principal" id="botonGuardarCentro" onclick="guardarCentro_()">Guardar los datos del centro</button><span class="cal-nota" id="estadoCentro">' + escapaHtml(CENTRO_MENSAJE_) + '</span><span class="cal-nota" id="cambiadoPorCentro"></span></div>';
  CENTRO_FIJOS_.forEach(function (k) { var el = document.getElementById('centro_' + k); if (el) el.disabled = true; });   // instrucción 74
  cambiadoPorEn_('cambiadoPorCentro', 'centro');   // instrucción 66
  apagarReservado_(cont);   // instrucción 62: el equipo lo ve, pero no lo cambia
}

function datosDelFormularioCentro_() {
  var v = function (id) { return document.getElementById('centro_' + id).value; };
  var ens = ['ESO', 'BACH'].filter(function (e) { return document.getElementById('centro_ens_' + e).checked; });
  return { nombre: v('nombre'), codigo: v('codigo'), localidad: v('localidad'), provincia: v('provincia'), ensenanzas: ens.join(','), firma: v('firma'),
    usaExcelJefatura: document.getElementById('centro_usaExcelJefatura').checked ? 'si' : 'no', subeMedidas: document.getElementById('centro_subeMedidas').checked ? 'si' : 'no',
    carpetaId: v('carpetaId'), idInformes: v('idInformes'), idNotas: v('idNotas'), centroDatosId: v('centroDatosId'), nombreBusqueda: CENTRO_DATOS_ ? CENTRO_DATOS_.nombreBusqueda : '' };
}

function guardarCentro_() {
  var datos = datosDelFormularioCentro_();
  return llamar('webCentroGuardar', datos).then(function (r) {
    CENTRO_DATOS_ = r.config; CENTRO_FIJOS_ = r.delCentroDeDatos || []; CENTRO_CARPETA_ = r.centroDatos || null;
    ESTADO.centro = { nombre: r.config.nombre, ensenanzas: r.config.ensenanzas.split(','), usaExcelJefatura: r.config.usaExcelJefatura === 'si', subeMedidas: r.config.subeMedidas === 'si', esNuevo: false };
    pintarNombreCentro_();
    CENTRO_MENSAJE_ = 'Guardado. Se vuelven a traer los datos para quitar de la vista lo que este centro no usa.';
    pintarCentro_();
    recargarTodoTrasCambio_();
  }).catch(function (e) { avisar('No he podido guardar los datos del centro. ' + mensajeDeError(e), 'error'); });
}
