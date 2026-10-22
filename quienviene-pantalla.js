/* Generado de JsQuienViene.html por web/construir-quienviene.mjs: no se toca a mano. */
var QUIENVIENE_DATOS = null;

/* Instrucción 103 (docs/PODA-2-ADMISION-MATRICULA-Y-ESPERA.md): cada paso de Admisión, Matrícula y Lista de espera enseña solo lo suyo y la `vista` es la clave del paso, única en toda la web:
     resolucion · solicitudes (Admisión) · esperados (Admisión) · cursos · aLlamar · sobres · casos (Matrícula) · listaEspera (Lista de espera).
   Ya no hay fila de pestañas. Lo de cada paso pintado en pantalla está en JsQuienVienePasos.html. */
var VISTA_QUIENVIENE = 'esperados';

var FILTRO_QUIENVIENE_CURSO = cargarFiltroQuienVieneGuardado_();

function cargarFiltroQuienVieneGuardado_() {
  try { return localStorage.getItem('bdAlumnado_filtroQuienVieneCurso') || ''; } catch (e) { return ''; }
}

function guardarFiltroQuienVieneGuardado_() {
  try { localStorage.setItem('bdAlumnado_filtroQuienVieneCurso', FILTRO_QUIENVIENE_CURSO); } catch (e) { /* no pasa nada */ }
}

function cargarQuienViene() {
  var curso = CURSO_VISTO;
  document.getElementById('resumenQuienViene').classList.remove('oculto');
  document.getElementById('resumenQuienViene').textContent = 'Cargando…';
  llamar('webQuienViene', curso).then(function (r) {
    if (curso !== CURSO_VISTO) return;
    QUIENVIENE_DATOS = r;
    pintarQuienViene();
    if (typeof pintarCabeceraTarea_ === 'function' && PESTANA_ACTUAL === 'quienviene') pintarCabeceraTarea_('quienviene');   // instrucción 103: el número y el botón del paso salen de lo que acaba de llegar
  }).catch(function (e) { avisar('No he podido cargar los datos de la matrícula. ' + mensajeDeError(e), 'error'); });
}

/* Las filas de una vista; «A quién llamar» son los esperados «Pendiente» (instrucción 39). */
function filasVistaQuienViene_(clave) {
  var d = QUIENVIENE_DATOS || {};
  /* Instrucción 40: quien ya presentó el sobre (sin revisar) o lo tiene tramitado ya ha hecho su parte: no sale. */
  /* Instrucción 41: además, quien tiene el sobre incompleto (falta optativa o religión, o dos solicitudes distintas), esté
     Matriculado o Pendiente y tenga el sobre como lo tenga: «Sobre incompleto» (JsQuienVieneIncompletos.html). */
  if (clave === 'aLlamar') return (d.esperados || []).filter(function (e) {
    if (e.noViene) return false;
    return (e.estado === 'Pendiente' && !sobreQuitaDeLlamar_(e)) || incompletoActivo_(e);
  });
  if (clave === 'esperados' || clave === 'cursos') return d.esperados || [];
  /* Instrucción 103: «Sobres» enseña solo los esperados con el sobre sin revisar, con problema o anulado (no los tramitados ni los que no tienen). */
  if (clave === 'sobres') return (d.esperados || []).filter(function (e) { return !!e.sobre && SOBRES_DE_UN_VISTAZO_.indexOf(e.sobre.estado) !== -1; });
  return d[clave] || [];
}

var SOBRES_DE_UN_VISTAZO_ = ['sin_revisar', 'con_problema', 'anulado'];

/* Instrucción 44: la tabla del panel (objetivo, estado y fecha límite) y su cuenta viven en JsQuienVieneObjetivos.html. */
function filtrarPanelAvanceQuienViene_(curso) { abrirListaCursoQV_(curso, ''); }

function pintarFiltrosQuienViene_() {
  var cont = document.getElementById('filtrosQuienViene');
  if (!QUIENVIENE_DATOS) { cont.innerHTML = ''; return; }
  var v = VISTA_QUIENVIENE, html = '';
  /* En las vistas con la tabla por curso (esperados, cursos) el curso lo elige la tabla de arriba: aquí no hay desplegable de curso. */
  if (!vistaListaEsperados_(v)) {
    var filas = filasVistaQuienViene_(v), cursos = [];
    filas.forEach(function (f) { var c = f.curso || f.grado; if (c && cursos.indexOf(c) === -1) cursos.push(c); });
    cursos.sort();
    html += '<label>Curso: <select onchange="cambiarFiltroQuienVieneCurso_(this.value)">' +
      '<option value="">Todos</option>' + cursos.map(function (c) {
        return '<option value="' + escapaAtributo_(c) + '"' + (FILTRO_QUIENVIENE_CURSO === c ? ' selected' : '') + '>' + escapaHtml(c) + '</option>';
      }).join('') + '</select></label>';
  }
  cont.innerHTML = html + filtroEstadoHtml_() + filtroPrevisionHtml_() + filtroSobreHtml_() + filtroResolucionHtml_();
}

function cambiarFiltroQuienVieneCurso_(v) { FILTRO_QUIENVIENE_CURSO = v; guardarFiltroQuienVieneGuardado_(); pintarQuienViene(); }

function pintarQuienViene() {
  var v = VISTA_QUIENVIENE;
  var ban = document.getElementById('resolucionQuienViene'), panel = document.getElementById('panelAvanceQuienViene'), filt = document.getElementById('filtrosQuienViene');
  var resumen = document.getElementById('resumenQuienViene'), cont = document.getElementById('tablaQuienViene');
  [ban, panel, filt, resumen, cont].forEach(function (e) { e.classList.add('oculto'); });
  var d = QUIENVIENE_DATOS;
  if (!d) { resumen.classList.remove('oculto'); resumen.textContent = 'Cargando…'; return; }
  cont.classList.remove('oculto');
  /* Con el curso en marcha solo hay solicitudes y lista de espera: los demás pasos lo dicen (nunca una pantalla en blanco). */
  if (VISTAS_SOLO_PREPARACION_.indexOf(v) !== -1 && !d.esPreparacion) {
    cont.innerHTML = '<p class="paso-vacio">Este paso es del curso que está en preparación. Con el curso en marcha no hay nada que hacer aquí.</p>';
    return;
  }
  if (v === 'resolucion') { pintarPasoResolucion_(ban, cont); return; }
  if (v === 'casos') { cont.innerHTML = casosQuienVieneHtml_(); return; }
  if (v === 'esperados' || v === 'cursos') {
    panel.classList.remove('oculto');
    panel.innerHTML = v === 'esperados' ? porCursoAdmisionHtml_(d) : cabeceraCursosHtml_(d);
    var abierto = QV_CURSO_ABIERTO_[v] || '';
    if (!abierto) { cont.innerHTML = '<p class="paso-vacio">Pulsa un curso para ver su lista.</p>'; return; }
    filt.classList.remove('oculto'); pintarFiltrosQuienViene_();
    resumen.classList.remove('oculto');
  } else {
    filt.classList.remove('oculto'); pintarFiltrosQuienViene_();
    resumen.classList.remove('oculto');
  }

  var filas = filasVistaQuienViene_(v).filter(function (f) {
    if (vistaListaEsperados_(v) && QV_CURSO_ABIERTO_[v] !== '*' && f.curso !== QV_CURSO_ABIERTO_[v]) return false;   // '*': todos los cursos, solo para las pruebas
    if (vistaListaEsperados_(v) && (!pasaFiltroPrevision_(f) || !pasaFiltroEstado_(f))) return false;   // instrucción 43
    if ((vistaListaEsperados_(v) || v === 'sobres') && FILTRO_QUIENVIENE_SOBRE && !(f.sobre && f.sobre.estado === FILTRO_QUIENVIENE_SOBRE)) return false;
    if (v === 'solicitudes' && !pasaFiltroResolucion_(f)) return false;
    if (!vistaListaEsperados_(v) && FILTRO_QUIENVIENE_CURSO && (f.curso || f.grado) !== FILTRO_QUIENVIENE_CURSO) return false;
    return true;
  });
  if (v === 'aLlamar') {
    /* Instrucción 39: tres bloques por urgencia (JsQuienVieneLlamar.html), sin reordenar aquí. */
    resumen.textContent = filas.length + ' familia' + (filas.length === 1 ? '' : 's') + ' por llamar.';
    cont.innerHTML = pintarALlamar_(filas);
    return;
  }
  if (v === 'listaEspera') {
    /* Instrucción 38: orden por puntos del servidor (JsListaEspera.html), sin reordenar. */
    resumen.textContent = filas.length + ' línea' + (filas.length === 1 ? '' : 's') + '.';
    cont.innerHTML = pintarListaEspera_(filas);
    return;
  }
  filas = filas.slice().sort(function (a, b) {
    var ca = String(a.curso || ''), cb = String(b.curso || '');
    if (ca !== cb) return ca < cb ? -1 : 1;
    return String(a.nombre || '') < String(b.nombre || '') ? -1 : 1;
  });

  resumen.innerHTML = (vistaListaEsperados_(v) ? '<b>' + escapaHtml(QV_CURSO_ABIERTO_[v]) + '</b> · ' : '') + filas.length + ' línea' + (filas.length === 1 ? '' : 's') + '.' +
    (vistaListaEsperados_(v) ? ' <a href="#" onclick="cerrarListaCursoQV_();return false">Cerrar la lista</a>' : '');
  /* Instrucción 103: encima de cada tabla, solo lo suyo: en «Admitidos», el aviso de la resolución sin emparejar; en «Sobres», los sobres sin emparejar. */
  cont.innerHTML = (v === 'solicitudes' ? cabeceraResolucionSolicitudesHtml_() : '') + (v === 'sobres' ? avisoSobresSinEmparejarHtml_() : '') + tablaQuienVieneHtml_(filas);
}

function tablaQuienVieneHtml_(filas) {
  var cabecera, cuerpo;
  if (vistaListaEsperados_() || VISTA_QUIENVIENE === 'sobres') {
    cabecera = ['Curso', 'Alumno/a', 'De dónde viene', 'Estado', 'Sobre'];
    cuerpo = filas.map(filaEsperadoHtml_).join('');
  } else {
    cabecera = ['Curso', 'Alumno/a', 'Centro de procedencia', 'Puntos', 'Qué pasa'].concat(resolucionLeida_() ? ['Resolución'] : []);
    cuerpo = filas.map(filaSolicitudHtml_).join('');
  }
  return '<table class="listado"><thead><tr>' + cabecera.map(function (c) { return '<th>' + escapaHtml(c) + '</th>'; }).join('') +
    '</tr></thead><tbody>' + (cuerpo || ('<tr><td colspan="' + cabecera.length + '">Nada aquí.</td></tr>')) + '</tbody></table>';
}

function filaEsperadoHtml_(e) {
  var cursoTexto = e.curso + (e.modalidad ? ' (' + e.modalidad + ')' : '') + (e.dudoso ? ' — dudoso' : '');
  /* Instrucción 43: junto al curso, «Repite (Séneca)» / «Repetirá (a mano)» o «se esperaba en 3º». */
  var cursoHtml = escapaHtml(cursoTexto) + etiquetaPrevisionHtml_(e) + etiquetaOtroCursoHtml_(e);
  var origenTexto = e.origen === 'previsión' ? 'Ya está en el centro' :
    ((e.origen === 'admisión' || e.origen === 'resolución') ? (e.origen === 'resolución' ? 'Admitido en la resolución' : 'Admitido') + (e.colegioProcedencia ? ' (' + e.colegioProcedencia + ')' : '') : 'Incluido a mano' + (e.incluidoNota ? ': ' + e.incluidoNota : ''));
  var estadoHtml;
  if (e.noViene) {
    estadoHtml = '<span class="chip">No viene' + (e.noViene.motivo ? ': ' + escapaHtml(e.noViene.motivo) : '') + '</span> ' +
      '<span class="meta-revisado">' + escapaHtml(e.noViene.quien) + '</span> ' +
      '<button class="pequeno" onclick="deshacerNoVieneQuienViene_(\'' + escapaAtributo_(e.clave) + '\')">Deshacer</button>';
  } else {
    estadoHtml = '<span class="chip' + (e.estado === 'Matriculado' ? ' si' : '') + '">' + escapaHtml(e.estado) + '</span>' +
      etiquetaProvisionalHtml_(e) + ' ' +
      '<button class="pequeno" onclick="marcarNoVieneQuienViene_(\'' + escapaAtributo_(e.clave) + '\')">No viene</button>' + botonRepiteHtml_(e);
  }
  return '<tr>' +
    '<td>' + cursoHtml + '</td>' +
    '<td>' + escapaHtml(e.nombre) + '</td>' +
    '<td>' + escapaHtml(origenTexto) + '</td>' +
    '<td>' + estadoHtml + '</td>' +
    '<td>' + celdaSobreHtml_(e) + '</td></tr>';
}

function filaSolicitudHtml_(s) {
  return '<tr' + (s.avisoDesconocido ? ' class="fila-revisada"' : '') + '>' +
    '<td>' + escapaHtml(s.curso || s.grado || '') + '</td>' +
    '<td>' + escapaHtml(s.nombre) + (s.nie ? ' <span class="meta-revisado">(NIE)</span>' : '') + '</td>' +
    '<td>' + escapaHtml(s.centro && s.centro.nombre ? s.centro.nombre : '') + '</td>' +
    '<td>' + (s.puntos || (s.puntos === 0 ? '0' : '')) + '</td>' +
    '<td>' + escapaHtml(s.frase || '') + '</td>' + (resolucionLeida_() ? '<td>' + celdaResolucionHtml_(s) + '</td>' : '') + '</tr>';
}

function filaNoEsperadoHtml_(n) {
  return '<tr><td>' + escapaHtml(n.curso) + '</td><td>' + escapaHtml(n.nombre) + '</td><td>' + escapaHtml(n.unidad) + '</td>' +
    '<td><button class="pequeno" onclick="incluirNoEsperadoQuienViene_(\'' + escapaAtributo_(n.nombre) + '\', \'' + escapaAtributo_(n.curso) + '\')">Pasar a esperados</button>' +
    preguntaOtroCursoHtml_(n) + '</td></tr>';
}

/* Cambia la marca «no viene» de un esperado en lo que ya hay en el navegador y repinta; devuelve lo que había. */
function ponerNoVieneLocal_(clave, noViene) {
  var antes = null;
  if (QUIENVIENE_DATOS) (QUIENVIENE_DATOS.esperados || []).forEach(function (e) {
    if (e.clave === clave) { antes = e.noViene || null; e.noViene = noViene; }
  });
  pintarQuienViene();
  return antes;
}

function marcarNoVieneQuienViene_(clave) {
  var motivo = prompt('¿Por qué no viene? (una línea, opcional):', '') || '';
  /* Guardar sin esperar: se ve al momento y se envía por detrás; si falla, se deshace. */
  var antes = ponerNoVieneLocal_(clave, { motivo: motivo, quien: MI_CORREO });
  llamar('webQuienVieneMarcarNoViene', CURSO_VISTO, clave, motivo, MI_CORREO)
    .catch(function (e) { ponerNoVieneLocal_(clave, antes); avisar('No he podido guardarlo. ' + mensajeDeError(e), 'error'); });
}

function deshacerNoVieneQuienViene_(clave) {
  var antes = ponerNoVieneLocal_(clave, null);
  /* Instrucción 44: al deshacer, el servidor es el único que sabe si esa persona estaba matriculada o pendiente (el estado «No viene» tapa
     el real): se vuelve a leer para que el objetivo y los «quedan N por matricular» cuenten bien. */
  llamar('webQuienVieneDeshacerNoViene', CURSO_VISTO, clave)
    .then(function () { olvidarLecturas_(['webQuienViene']); cargarQuienViene(); })
    .catch(function (e) { ponerNoVieneLocal_(clave, antes); avisar('No he podido deshacerlo. ' + mensajeDeError(e), 'error'); });
}

function incluirNoEsperadoQuienViene_(nombre, curso) {
  llamar('webQuienVieneIncluirNoEsperado', CURSO_VISTO, nombre, curso, MI_CORREO).then(cargarQuienViene)
    .catch(function (e) { avisar('No he podido incluirlo. ' + mensajeDeError(e), 'error'); });
}
