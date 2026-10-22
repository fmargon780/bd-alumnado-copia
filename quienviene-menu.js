/* Generado de JsMenuTareas.html por web/construir-quienviene.mjs: no se toca a mano. */
var TAREA_ACTUAL = '';
var PASO_RECORDADO_ = {};

/* Las tareas, en el orden del curso. Sus pasos (y su estado) viven en JsTareasPasos.html; la fila de pasos, en JsTarea.html. */
var TAREAS_ = [
  { clave: 'admision', nombre: 'Admisión', frase: 'Quién ha pedido plaza en el centro y a quién se le ha concedido.' },
  { clave: 'transito', nombre: 'Tránsito', frase: 'Las fichas de los tutores de 6º de los colegios adscritos.' },
  { clave: 'matricula', nombre: 'Matrícula', frase: 'Quién se está matriculando, quién tiene un problema y quién falta. La meta es la certificación de matrícula.' },
  { clave: 'agrupamiento', nombre: 'Agrupamiento', frase: 'Repartir a los matriculados en sus unidades.' },
  { clave: 'espera', nombre: 'Lista de espera', frase: 'Los no admitidos de mayo y las admisiones extraordinarias.' },
  { clave: 'inicio', nombre: 'Inicio de curso', frase: 'Informes por unidad, materias pendientes, hojas de «enterado» y de seguimiento.' }
];

/* Lo que cuelga de «Datos y configuración» (no es una tarea, no sale en el menú) y los listados. Sus pasos no llevan estado. */
var PANTALLA_DATOS_ = { clave: 'datos', nombre: 'Datos y configuración', frase: 'Las fechas del curso, el centro, quién entra, los cambios, los ficheros de Séneca, cómo está la app y los cursos.', pasos: [
  { clave: 'fechas', etiqueta: 'Fechas del curso', tab: 'datos', vista: 'fechas' },
  { clave: 'centro', etiqueta: 'El centro', tab: 'datos', vista: 'centro' },
  { clave: 'equipo', etiqueta: 'Quién entra', tab: 'datos', vista: 'equipo' },
  { clave: 'cambios', etiqueta: 'Cambios', tab: 'datos', vista: 'cambios' },
  { clave: 'ficheros', etiqueta: 'Ficheros de Séneca', tab: 'descargas' },
  /* Instrucción 104: «Comprobaciones con tus datos» y «Última actualización» son un solo apartado, «Cómo está la app» (clave `estado`, lo que se llevaba a las dos se traduce en CLAVES_ANTIGUAS_); «Cursos» enseña solo abrir y cerrar cursos. */
  { clave: 'estado', etiqueta: 'Cómo está la app', tab: 'portada', vista: 'estado' },
  { clave: 'cursos', etiqueta: 'Cursos', tab: 'portada', vista: 'cursos' }] };
var PANTALLA_LISTADOS_ = { clave: 'listados', nombre: 'Listados', frase: 'Todo el alumnado del centro o de una unidad.', pasos: [{ clave: 'listados', etiqueta: 'Listados', tab: 'alumnado' }] };

var PANTALLA_ESTADISTICAS_ = { clave: 'estadisticas', nombre: 'Estadísticas', frase: 'Cuenta y cruza cualquier dato del alumnado; se guarda con un nombre y se descarga en PDF o Excel.', pasos: [{ clave: 'estadisticas', etiqueta: 'Estadísticas', tab: 'estadisticas' }] };

var MESES_ = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
var DIAS_SEMANA_ = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function tareaPorClave_(clave) {
  if (clave === 'datos') return PANTALLA_DATOS_;
  if (clave === 'listados') return PANTALLA_LISTADOS_;
  if (clave === 'estadisticas') return PANTALLA_ESTADISTICAS_;
  return TAREAS_.filter(function (t) { return t.clave === clave; })[0] || null;
}

function fechaCorta_(iso) {
  var p = String(iso || '').split('-');
  return p.length === 3 ? (+p[2]) + ' de ' + MESES_[+p[1] - 1] : '';
}
function fechaCortaAbrev_(iso) {
  var p = String(iso || '').split('-');
  return p.length === 3 ? (+p[2]) + ' ' + MESES_[+p[1] - 1].slice(0, 3) : '';
}
function fechaHoyLarga_() {
  var h = new Date();
  return DIAS_SEMANA_[h.getDay()] + ' ' + h.getDate() + ' de ' + MESES_[h.getMonth()];
}
function mesDe_(iso) { return MESES_[+String(iso).split('-')[1] - 1] || ''; }

/* Las fechas de un curso (lo guardado, completado por el servidor con los valores de partida), o [] si aún no han llegado. */
function calendarioDe_(curso) {
  var c = MEMORIA_['webCalendarioLeer' + JSON.stringify([curso])];
  return (c && c.filas) || [];
}

/* La fecha de un hito: la suya o, la certificación de julio, la fecha general de los objetivos de «Quién viene» (instrucción 44). */
function fechaDeHito_(clave, curso) {
  var f = calendarioDe_(curso).filter(function (x) { return x.clave === clave; })[0];
  if (f && f.desde) return f.desde;
  if (clave === 'certificacionJulio') {
    var d = MEMORIA_['webQuienViene' + JSON.stringify([curso])];
    return (d && d.fechaGeneral && d.fechaGeneral.fecha) || '';
  }
  return '';
}

/* EL CÁLCULO. `estado`: 'marcha' (hoy cae en un tramo), 'antes' (aún no ha empezado), 'cerrada' o 'sinFecha'. */
function estadoTarea_(clave, curso, hoy) {
  hoy = hoy || hoyObjetivos_();
  var tramos = calendarioDe_(curso).filter(function (f) { return f.clave === clave && f.desde && f.hasta; }).sort(function (a, b) { return a.n - b.n; });
  if (!tramos.length) return { estado: 'sinFecha', texto: 'Sin fechas', curso: curso };
  for (var i = 0; i < tramos.length; i++) {
    var t = tramos[i];
    if (hoy >= t.desde && hoy <= t.hasta) {
      var duracion = diasEntreObjetivos_(t.desde, t.hasta) + 1, dia = diasEntreObjetivos_(t.desde, hoy) + 1;
      return { estado: 'marcha', curso: curso, desde: t.desde, hasta: t.hasta, finDias: diasEntreObjetivos_(hoy, t.hasta), dia: dia, duracion: duracion,
        texto: duracion <= 14 ? 'Día ' + dia + ' de ' + duracion : 'En marcha' };
    }
  }
  var proximo = tramos.filter(function (t) { return t.desde > hoy; })[0];
  if (proximo) return { estado: 'antes', curso: curso, desde: proximo.desde, hasta: proximo.hasta, diasHasta: diasEntreObjetivos_(hoy, proximo.desde), texto: 'Empieza el ' + fechaCorta_(proximo.desde) };
  var ultimo = tramos[tramos.length - 1];
  return { estado: 'cerrada', curso: curso, hasta: ultimo.hasta, texto: 'Cerrada en ' + mesDe_(ultimo.hasta) };
}

/* De qué curso es cada tarea cuando hay dos abiertos: Inicio de curso, el curso en marcha; las demás, el curso en preparación (o, si no hay, el que
   está en marcha) en el que la tarea esté en marcha; si en ninguno lo está, el que empiece antes, o el primero. */
function cursoDeTarea_(clave, hoy) {
  var abiertos = (ESTADO && ESTADO.abiertos) || [];
  var prep = abiertos.filter(function (c) { return c.estado === 'En preparación'; });
  var marcha = abiertos.filter(function (c) { return c.estado === 'En marcha'; });
  var candidatos = clave === 'inicio' ? (marcha.length ? marcha : prep) : prep.concat(marcha);
  if (!candidatos.length) return CURSO_VISTO;
  for (var i = 0; i < candidatos.length; i++) if (estadoTarea_(clave, candidatos[i].curso, hoy).estado === 'marcha') return candidatos[i].curso;
  var antes = candidatos.filter(function (c) { return estadoTarea_(clave, c.curso, hoy).estado === 'antes'; })[0];
  return (antes || candidatos[0]).curso;
}

/* Todas las tareas con su curso y su estado de hoy, y cuál «toca»: de las que están en marcha, la que antes llega a su final o a su próximo hito. */
function tareasDeHoy_(hoy) {
  hoy = hoy || hoyObjetivos_();
  var lista = TAREAS_.map(function (t, i) {
    var curso = cursoDeTarea_(t.clave, hoy);
    var e = estadoTarea_(t.clave, curso, hoy);
    e.tarea = t; e.orden = i;
    return e;
  });
  var enMarcha = lista.filter(function (e) { return e.estado === 'marcha'; });
  enMarcha.forEach(function (e) {
    var dias = e.finDias;
    ['certificacionJulio', 'certificacionSeptiembre'].forEach(function (h) {
      if (e.tarea.clave !== 'matricula') return;
      var f = fechaDeHito_(h, e.curso);
      if (f && f >= hoy) dias = Math.min(dias, diasEntreObjetivos_(hoy, f));
    });
    e.proximoDias = dias;
  });
  enMarcha.sort(function (a, b) { return a.proximoDias - b.proximoDias || a.orden - b.orden; });
  var proxima = lista.filter(function (e) { return e.estado === 'antes'; }).sort(function (a, b) { return a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : a.orden - b.orden; })[0] || null;
  return { todas: lista, enMarcha: enMarcha, toca: enMarcha[0] || null, proxima: proxima, hoy: hoy };
}

/* ------------------------------------------------------------ el menú */

/* Instrucción 82: el menú enseña solo las tareas de esta época; el resto va plegado bajo «Otras épocas del curso». Decide `tareasDeHoy_` (estado y días
   hasta que empieza): aquí no hay otra cuenta. Se enseña la que está en marcha, la que empieza en 14 días o menos, la que no tiene fechas y la abierta. */
var DIAS_PREVIOS_MENU_ = 14;
var MENU_FIRMA_ = null;   // null: el menú aún no se ha pintado
function tareaVisibleEnMenu_(e) {
  return e.estado === 'marcha' || e.estado === 'sinFecha' || (e.estado === 'antes' && e.diasHasta <= DIAS_PREVIOS_MENU_) || e.tarea.clave === TAREA_ACTUAL;
}
function firmaMenu_(hoy) { return hoy.todas.filter(tareaVisibleEnMenu_).map(function (e) { return e.tarea.clave; }).join(','); }

function botonTareaMenu_(e, hoy, plegada) {
  var punto = e.estado === 'marcha' ? (hoy.toca === e ? 'hoy' : 'marcha') : (e.estado === 'cerrada' ? 'ok' : '');
  var icono = e.estado === 'marcha' ? '●' : (e.estado === 'cerrada' ? '✓' : '○');
  return '<button data-tarea="' + e.tarea.clave + '"' + (plegada ? ' role="menuitem"' : '') + ' onclick="irATarea(\'' + e.tarea.clave + '\')"><strong>' + escapaHtml(e.tarea.nombre) + '</strong>' +
    '<span><i class="punto ' + punto + '" aria-hidden="true">' + icono + '</i>' + escapaHtml(e.texto) + '</span></button>';
}

function pintarMenuTareas_() {
  var nav = document.getElementById('pestanas');
  if (!nav || !ESTADO) return;
  var hoy = tareasDeHoy_();
  var html = '<button data-tarea="hoy" onclick="irAPestana(\'hoy\')"><strong>Hoy</strong><span>' + escapaHtml(fechaHoyLarga_()) + '</span></button>';
  var plegadas = [];
  hoy.todas.forEach(function (e) {
    if (tareaVisibleEnMenu_(e)) html += botonTareaMenu_(e, hoy, false); else plegadas.push(e);
  });
  if (plegadas.length) {
    html += '<div class="otras-epocas"><button type="button" id="botonOtrasEpocas" class="boton-otras" aria-haspopup="true" aria-expanded="false" aria-controls="listaOtrasEpocas" onclick="alternarOtrasEpocas_()">' +
      '<strong>Otras épocas del curso (' + plegadas.length + ')</strong></button>' +
      '<div id="listaOtrasEpocas" class="lista-otras oculto" role="menu">' + plegadas.map(function (e) { return botonTareaMenu_(e, hoy, true); }).join('') + '</div></div>';
  }
  nav.innerHTML = html;
  MENU_FIRMA_ = firmaMenu_(hoy);
  enganchaOtrasEpocas_();
  marcarMenuActivo_();
}

function otrasEpocasAbiertas_() { var l = document.getElementById('listaOtrasEpocas'); return !!l && !l.classList.contains('oculto'); }
function cerrarOtrasEpocas_(devolverFoco) {
  var l = document.getElementById('listaOtrasEpocas'), b = document.getElementById('botonOtrasEpocas');
  if (!l) return;
  l.classList.add('oculto');
  if (b) { b.setAttribute('aria-expanded', 'false'); if (devolverFoco) b.focus(); }
}
function alternarOtrasEpocas_() {
  var l = document.getElementById('listaOtrasEpocas'), b = document.getElementById('botonOtrasEpocas');
  if (!l || !b) return;
  if (otrasEpocasAbiertas_()) { cerrarOtrasEpocas_(false); return; }
  l.classList.remove('oculto');
  b.setAttribute('aria-expanded', 'true');
}
/* Escape, pulsar fuera y las flechas: una sola vez para toda la vida de la página. */
var OTRAS_ENGANCHADO_ = false;
function enganchaOtrasEpocas_() {
  if (OTRAS_ENGANCHADO_) return;
  OTRAS_ENGANCHADO_ = true;
  document.addEventListener('click', function (ev) {
    if (otrasEpocasAbiertas_() && !ev.target.closest('.otras-epocas')) cerrarOtrasEpocas_(false);
    else if (ev.target.closest('#listaOtrasEpocas button')) cerrarOtrasEpocas_(false);
  });
  document.addEventListener('keydown', function (ev) {
    if (!otrasEpocasAbiertas_()) return;
    if (ev.key === 'Escape') { ev.preventDefault(); cerrarOtrasEpocas_(true); return; }
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    var items = Array.prototype.slice.call(document.querySelectorAll('#listaOtrasEpocas button'));
    var i = items.indexOf(document.activeElement);
    ev.preventDefault();
    items[ev.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1)].focus();
  });
}

function marcarMenuActivo_() {
  /* Si cambia lo que se enseña (la tarea abierta entra en la fila o sale de ella), se repinta; la firma evita el bucle. */
  if (ESTADO && MENU_FIRMA_ !== null && MENU_FIRMA_ !== firmaMenu_(tareasDeHoy_())) { pintarMenuTareas_(); return; }
  var activa = PESTANA_ACTUAL === 'hoy' ? 'hoy' : (TAREAS_.some(function (t) { return t.clave === TAREA_ACTUAL; }) ? TAREA_ACTUAL : '');
  document.querySelectorAll('#pestanas button').forEach(function (b) { b.classList.toggle('activa', b.getAttribute('data-tarea') === activa); });
  var datos = document.getElementById('botonDatos');
  if (datos) datos.classList.toggle('activa', TAREA_ACTUAL === 'datos');
  var lis = document.getElementById('enlaceListados');
  if (lis) lis.classList.toggle('activa', TAREA_ACTUAL === 'listados');
  var est = document.getElementById('enlaceEstadisticas');
  if (est) est.classList.toggle('activa', TAREA_ACTUAL === 'estadisticas');
}

function abrirDatosYConfiguracion_() { irAPaso_('datos', 'fechas'); }
function abrirListados_() { TAREA_ACTUAL = 'listados'; irAPestana('alumnado'); }
function abrirEstadisticas_() { TAREA_ACTUAL = 'estadisticas'; irAPestana('estadisticas'); }
