/* Generado de JsMesaSobrantes.html por web/construir-mesa.mjs: no se toca a mano. */
/* Los alumnos apuntados en el modelo abierto que ya no son de este nivel y siguen con grupo guardado. */
function mesaFueraAbiertos_() {
  if (!DATA || DATA.estadoCurso === 'cerrado' || SOLO_LECTURA_MESA_) return [];
  return (DATA.fuera || []).filter(function (f) {
    var a = ASIGNACIONES[f.clave];
    return a && String(a.grupo || '').trim() && !ALUMNOS_POR_CLAVE[f.clave];
  });
}

/* Los grupos guardados que ya no existen, cada uno con los alumnos del nivel que seguían en él: [{ grupo, alumnos }]. */
function mesaGruposPerdidos_() {
  if (!DATA || DATA.estadoCurso === 'cerrado' || SOLO_LECTURA_MESA_) return [];
  var porGrupo = {}, orden = [];
  DATA.alumnos.forEach(function (al) {
    if (!mesaSinSuGrupo_(al.clave)) return;
    var g = String(ASIGNACIONES[al.clave].grupo || '');
    if (!porGrupo[g]) { porGrupo[g] = []; orden.push(g); }
    porGrupo[g].push(al);
  });
  return orden.sort().map(function (g) { return { grupo: g, alumnos: porGrupo[g] }; });
}

/* Cuántas líneas tiene la caja ahora mismo. */
function mesaCambiosDesdeElReparto_() { return mesaFueraAbiertos_().length + mesaGruposPerdidos_().length; }

function mesaCajaSobrantesHtml_() {
  var fuera = mesaFueraAbiertos_(), grupos = mesaGruposPerdidos_();
  var n = fuera.length + grupos.length;
  if (!n) return '';
  var lineas = fuera.map(function (f, i) {
    var texto = f.nombre
      ? '<b>' + escapaHtml(f.nombre) + '</b> ya no es de ' + escapaHtml(DATA.nivel) + '. Estaba en ' + escapaHtml(f.grupo) + '.'
      : 'Un alumno que ya no está en los datos. Estaba en ' + escapaHtml(f.grupo) + '.';
    return '<div class="linea-caja" data-linea="fuera"><span>' + texto + '</span><button class="pequeno" onclick="mesaEntendidoFuera_(' + i + ')">Entendido</button></div>';
  }).concat(grupos.map(function (x, i) {
    var cuantos = x.alumnos.length;
    var nombres = x.alumnos.map(function (a) { return escapaHtml(a.nombre); }).join(', ');
    return '<div class="linea-caja" data-linea="grupo"><span>El grupo <b>' + escapaHtml(x.grupo) + '</b> ya no existe. ' + cuantos + (cuantos === 1 ? ' alumno pasa' : ' alumnos pasan') + ' a «Sin grupo».' +
      ' <details style="display:inline"><summary>Ver quién</summary>' + nombres + '</details></span>' +
      '<button class="pequeno" onclick="mesaEntendidoGrupo_(' + i + ')">Entendido</button></div>';
  }));
  return '<div class="caja-mesa cambio-reparto"><div class="cabecera-caja"><b>Han cambiado desde que se hizo este reparto (' + n + ')</b></div>' + lineas.join('') + '</div>';
}

function mesaRepintarTrasEntendido_() {
  pintarColumnas(); pintarEquilibrio(); pintarPanelReglas();
  guardarModeloTrasCambio();
}

/* «Entendido» en un alumno que ya no es del nivel: se le quita del modelo abierto (su asignación y sus reglas). No se mueve a nadie más. */
function mesaEntendidoFuera_(i) {
  var f = mesaFueraAbiertos_()[i];
  if (!f) return;
  delete ASIGNACIONES[f.clave];
  mesaQuitarClaveDeReglas_(f.clave);
  mesaRepintarTrasEntendido_();
}

/* «Entendido» en un grupo que ya no existe: sus alumnos quedan guardados con el grupo vacío, y los «fijar» a ese grupo se borran. */
function mesaEntendidoGrupo_(i) {
  var x = mesaGruposPerdidos_()[i];
  if (!x) return;
  x.alumnos.forEach(function (al) { ASIGNACIONES[al.clave] = Object.assign({}, ASIGNACIONES[al.clave], { grupo: '' }); });
  var r = reglasActuales();
  r.fijar = r.fijar.filter(function (f) { return f.grupo !== x.grupo; });
  mesaRepintarTrasEntendido_();
}
