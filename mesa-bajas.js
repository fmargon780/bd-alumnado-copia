/* Generado de JsMesaBajas.html por web/construir-mesa.mjs: no se toca a mano. */
function mesaEnPreparacion_() { return !!DATA && DATA.estadoCurso === 'preparacion' && !SOLO_LECTURA_MESA_; }
function mesaModeloEmpezado_() { return !!(DATA && DATA.modelo && Object.keys(DATA.modelo.asignaciones || {}).length); }

/* Quien deja de venir y tenía grupo en el modelo abierto, con la clave con la que está en él. */
function mesaBajasAbiertas_() {
  if (!mesaEnPreparacion_()) return [];
  return (DATA.bajas || []).map(function (b) {
    const k = ASIGNACIONES[b.clave] ? b.clave : (b.claveEsperado && ASIGNACIONES[b.claveEsperado] ? b.claveEsperado : '');
    return { baja: b, clave: k, grupo: k ? String(ASIGNACIONES[k].grupo || '') : '' };
  }).filter(function (x) { return x.clave && x.grupo; });
}

/* Quien es alumno de la mesa y el modelo no había visto nunca (ni lo ha colocado, ni lo ha dejado a propósito en «Sin grupo»). */
function mesaEsNuevo_(al) { return mesaEnPreparacion_() && mesaModeloEmpezado_() && !DATA.modelo.asignaciones[al.clave] && !ASIGNACIONES[al.clave]; }
function mesaNuevosAbiertos_() { return mesaEnPreparacion_() ? DATA.alumnos.filter(mesaEsNuevo_) : []; }

/* Antes de guardar un reparto que no se había empezado, todos quedan anotados (los que siguen en «Sin grupo» con grupo vacío): así no salen como «nuevos» al volver. */
function mesaRegistrarVistos_() {
  if (!mesaEnPreparacion_() || mesaModeloEmpezado_()) return;
  DATA.alumnos.forEach(function (a) { if (!ASIGNACIONES[a.clave]) ASIGNACIONES[a.clave] = { grupo: '', optativa: '' }; });
}

function pintarCajasMesa_() {
  const cont = document.getElementById('cajasMesa');
  if (!cont) return;
  const bajas = mesaBajasAbiertas_(), nuevos = mesaNuevosAbiertos_();
  let html = '';
  if (bajas.length) {
    html += '<div class="caja-mesa baja"><div class="cabecera-caja"><b>Han dejado de venir (' + bajas.length + ')</b>' +
      '<button class="pequeno" onclick="mesaEntendidoBajas_(-1)">Entendido, todos</button></div>' +
      bajas.map(function (x, i) {
        return '<div class="linea-caja"><span><b>' + escapaHtml(x.baja.nombre) + '</b> deja ' + escapaHtml(x.grupo) + ' · ' + escapaHtml(x.baja.motivo) +
          (x.baja.desde ? ' · desde el ' + escapaHtml(x.baja.desde) : '') + '</span><button class="pequeno" onclick="mesaEntendidoBajas_(' + i + ')">Entendido</button></div>';
      }).join('') + '</div>';
  }
  if (nuevos.length) {
    html += '<div class="caja-mesa llegada"><div class="cabecera-caja"><b>Han llegado (' + nuevos.length + ')</b>' +
      '<a href="#" onclick="mesaVerSinGrupo_(); return false;">Ver en «Sin grupo» ↓</a>' +
      '<button class="pequeno" onclick="mesaEntendidoNuevos_()">Entendido, todos</button></div></div>';
  }
  if (typeof mesaCajaSobrantesHtml_ === 'function') html += mesaCajaSobrantesHtml_();   // instrucción 73: «Han cambiado desde que se hizo este reparto»
  cont.innerHTML = html;
}

function mesaQuitarClaveDeReglas_(clave) {
  const r = reglasActuales();
  r.fijar = r.fijar.filter(function (f) { return f.alumno !== clave; });
  ['juntar', 'separar'].forEach(function (tipo) {
    r[tipo] = r[tipo].map(function (l) { return l.filter(function (k) { return k !== clave; }); }).filter(function (l) { return l.length >= 2; });
  });
}

/* «Entendido»: se le quita del modelo abierto (asignación y reglas). `i` = -1: todos. No se mueve a nadie más. */
function mesaEntendidoBajas_(i) {
  const lista = mesaBajasAbiertas_();
  (i < 0 ? lista : [lista[i]]).forEach(function (x) {
    if (!x) return;
    delete ASIGNACIONES[x.clave];
    mesaQuitarClaveDeReglas_(x.clave);
  });
  pintarColumnas(); pintarEquilibrio(); pintarPanelReglas();
  guardarModeloTrasCambio();
}

/* Dejar a los llegados a propósito en «Sin grupo». */
function mesaEntendidoNuevos_() {
  mesaNuevosAbiertos_().forEach(function (a) { ASIGNACIONES[a.clave] = { grupo: '', optativa: '' }; });
  pintarColumnas(); pintarEquilibrio();
  guardarModeloTrasCambio();
}

function mesaVerSinGrupo_() {
  const col = document.querySelector('#columnasMesa .columna');
  if (col && col.scrollIntoView) col.scrollIntoView({ block: 'start' });
}

/* Lo que escribe «A quién llamar» o «Quién viene» cambia quién es alumno de la mesa: lo recordado de la mesa ya no vale. */
var MESA_SE_OLVIDA_ = { webQuienVieneMarcarNoViene: 1, webQuienVieneDeshacerNoViene: 1, webContactoGuardar: 1, webSobreEmparejar: 1, webSobreDeshacerEmparejar: 1 };
function mesaOlvidarSiToca_(fn) {
  if (!MESA_SE_OLVIDA_[fn] || typeof MESA_CACHE_ === 'undefined') return;
  MESA_CACHE_ = {};
  if (typeof DATA !== 'undefined' && DATA && DATA.estadoCurso === 'preparacion') { DATA = null; NIVEL = null; }
}

/* La línea de «Hoy» y del paso «La mesa»: cuántos han dejado de venir y cuántos llegados hay, sumando los niveles del resumen. */
function mesaBajasNuevosResumen_(cursos) {
  var baj = 0, nue = 0, cam = 0, nivel = '';
  (cursos || []).forEach(function (c) { if ((c.bajas || 0) + (c.nuevos || 0) + (c.cambiosReparto || 0) && !nivel) nivel = c.curso; baj += c.bajas || 0; nue += c.nuevos || 0; cam += c.cambiosReparto || 0; });
  var partes = [];
  if (baj) partes.push(baj + (baj === 1 ? ' ha dejado de venir' : ' han dejado de venir'));
  if (nue) partes.push(nue + (nue === 1 ? ' nuevo' : ' nuevos'));
  if (cam) partes.push(cam + (cam === 1 ? ' cambio desde el reparto' : ' cambios desde el reparto'));   // instrucción 73
  return { baj: baj, nue: nue, cam: cam, nivel: nivel, texto: partes.join(' · ') };
}
function irAMesaDeNivel_(nivel) { NIVEL_PEDIDO_ = nivel || ''; irAPestana('mesa'); }
