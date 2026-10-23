/* Generado de JsPortada.html por web/construir-datos.mjs: no se toca a mano. */
function pintarPortada() {
  var info = cursoVistoInfo_();

  /* "Quién viene" (instrucción 16) solo tiene sentido en un curso en preparación o en marcha, y Tránsito (instrucción 17) en el curso en
     preparación: si se cambia a un curso donde no, se vuelve a «Hoy». (Desde la instrucción 54 ya no hay solapas que ocultar.) */
  if (info.estado === 'Cerrado' && PESTANA_ACTUAL === 'quienviene') irAPestana('hoy');
  if (info.estado !== 'En preparación' && PESTANA_ACTUAL === 'transito') irAPestana('hoy');

  /* Instrucción 104: «Datos y configuración › Cursos»: qué cursos hay y en qué estado, y los botones de siempre, a la vista. */
  var cursos = ((ESTADO && ESTADO.abiertos) || []).concat((ESTADO && ESTADO.cerrados) || []);
  document.getElementById('filasCursosPortada').innerHTML = cursos.map(function (c) {
    var clase = c.estado === 'En marcha' ? 'ok' : (c.estado === 'Cerrado' ? '' : 'av');
    return '<tr><td>' + escapaHtml(c.curso) + (c.curso === info.curso ? ' <span class="meta-revisado">(el que ves)</span>' : '') + '</td><td><span class="' + clase + '">' + escapaHtml(c.estado) + '</span></td></tr>';
  }).join('') || '<tr><td colspan="2">Todavía no hay ningún curso.</td></tr>';

  var seccion = document.getElementById('seccionCursos');
  var botones = document.getElementById('botonesPortada');
  botones.innerHTML = '';
  var reservada = seccion.querySelector('.linea-reservada');
  if (reservada) reservada.parentNode.removeChild(reservada);

  if (info.estado === 'En preparación') {
    botones.appendChild(crearBoton('Pasar a en marcha', function () { pasarAEnMarcha(info.curso); }, 'principal'));
  }
  if (info.estado === 'En marcha') {
    botones.appendChild(crearBoton('Cerrar el curso ' + info.curso, function () { cerrarCurso(info.curso, false); }, 'peligro'));
  }
  if (ESTADO.proximo && ESTADO.abiertos.every(function (c) { return c.curso !== ESTADO.proximo; })) {
    botones.appendChild(crearBoton('Abrir el curso ' + ESTADO.proximo, function () { abrirCurso(ESTADO.proximo); }, ''));
  }
  /* Instrucción 62: los cursos los cambia solo quien gestiona la base de datos; el equipo los ve apagados. */
  if (soloLectura_()) {
    seccion.querySelectorAll('button, input').forEach(function (el) { el.disabled = true; });
    botones.insertAdjacentHTML('beforebegin', lineaReservadaHtml_());
  }
}

function crearBoton(texto, accion, clase) {
  var b = document.createElement('button');
  b.textContent = texto;
  if (clase) b.classList.add(clase);
  b.onclick = accion;
  return b;
}

function cargarPortada() {
  var curso = CURSO_VISTO;
  /* Instrucción 104: dos apartados de «Datos y configuración» viven aquí: «Cómo está la app» (la última actualización y las comprobaciones) y «Cursos». */
  var cursos = VISTA_DATOS_ === 'cursos';
  document.getElementById('seccionEstadoApp').classList.toggle('oculto', cursos);
  document.getElementById('seccionCursos').classList.toggle('oculto', !cursos);
  pintarPortada();
  if (cursos) return;
  cargarComprobaciones_();
  llamar('webPortada', curso).then(function (p) {
    if (curso !== CURSO_VISTO) return;   // ha cambiado de curso mientras llegaba la respuesta
    aplicarPantalla_(p.pantalla);   // instrucción 94: sin botón ni zona cuando la app se pone al día sola (JsSinBoton.html)
    pintarLineaDatos_(p.datos);   // instrucción 93: «Datos al día de las 12:40» (JsCentroDatosFicheros.html)
    pintarAvisoFicha_(p.avisoFicha);   // instrucción 91: la ficha del Centro de datos no sirve (JsPortadaResumen.html)
    pintarResumenActualizacion_(p.resumen);   // instrucción 51: el renglón «Última actualización» (JsPortadaResumen.html)
    /* El estado de la actualización cambia por detrás: manda lo último que se supo en esta sesión,
       no lo que había cuando se guardó la portada en memoria (instrucción 24). */
    pintarActualizacion(ULTIMA_ACTUALIZACION_[curso] || p.actualizacion, p.esEnMarcha);
  }).catch(function (e) { avisar('No he podido cargar el estado de la app. ' + mensajeDeError(e), 'error'); });
}

/* El botón de "Actualizar los datos" y el sondeo mientras está en marcha
   (punto 3.2: no hay que esperar aquí a que termine; se puede seguir usando
   la web mientras). */
var ULTIMA_ACTUALIZACION_ = {};
var ACTUALIZANDO_ = {};

function pintarActualizacion(a, esEnMarcha) {
  if (typeof avanceActualizacionTarea_ === 'function') avanceActualizacionTarea_(a, esEnMarcha);   // instrucción 55: el avance también junto al botón del paso «Datos de Séneca»
  /* Una actualización que acaba cambia los datos de todas las pestañas: se vuelven a traer
     (una sola vez, en cuanto termina) en vez de dejar lo guardado en memoria. */
  if (esEnMarcha && a) {
    var cursoAct = CURSO_VISTO;
    ULTIMA_ACTUALIZACION_[cursoAct] = a;
    if (ACTUALIZANDO_[cursoAct] && !a.enCurso) { ACTUALIZANDO_[cursoAct] = false; ULTIMA_ACTUALIZACION_ = {}; recargarTodoTrasCambio_(); return; }
    if (a.enCurso) ACTUALIZANDO_[cursoAct] = true;
  }
  var boton = document.getElementById('botonActualizar');
  var barra = document.getElementById('barraFase');
  var texto = document.getElementById('resumenActualizacion');

  if (!esEnMarcha) {
    var enlaceOculto = document.getElementById('enlaceRehacer');
    if (enlaceOculto) enlaceOculto.classList.add('oculto');
    texto.textContent = 'Solo el curso en marcha';
    texto.className = 'val';
    if (boton) boton.disabled = true;
    barra.classList.add('oculto');
    pararSondeo();
    return;
  }
  if (boton) boton.disabled = false;
  var enlaceRehacer = document.getElementById('enlaceRehacer');
  if (enlaceRehacer) enlaceRehacer.classList.toggle('oculto', !!a.enCurso || (typeof pantallaNueva_ === 'function' && pantallaNueva_()));   // con una en marcha no se puede rehacer

  if (a.enCurso) {
    texto.textContent = 'Actualizando' + (a.fase ? ' (' + a.fase + ')' : '') + '…';
    texto.className = 'val av';
    barra.classList.remove('oculto');
    arrancarSondeo();
  } else {
    texto.textContent = a.ultimoCambio || 'Nunca';
    texto.className = 'val ' + (a.ultimoCambio && !a.cortada ? 'ok' : 'av');
    barra.classList.add('oculto');
    pararSondeo();
  }
}

function arrancarSondeo() {
  if (SONDEO_ACTUALIZACION) return;
  SONDEO_ACTUALIZACION = setInterval(function () {
    llamar('webEstadoActualizacion').then(function (a) {
      pintarActualizacion(a, true);
    }).catch(function () { /* se reintenta en el siguiente sondeo */ });
  }, 4000);
}

function pararSondeo() {
  if (SONDEO_ACTUALIZACION) { clearInterval(SONDEO_ACTUALIZACION); SONDEO_ACTUALIZACION = null; }
}

/* Instrucción 84: el enlace discreto de la Portada. Pide confirmación en una frase; el servidor olvida lo leído y lo guardado de cada pestaña y lanza una actualización normal. */
function rehacerTodoDesdeCero() {
  if (!confirm('¿Rehacer todo desde cero? Olvida lo que la app tenía guardado de la última vez y vuelve a leer y escribir todo: tarda más que una actualización normal.')) return;
  limpiarAviso();
  llamar('webActualizarDatos', true).then(function (r) {
    if (r && r.ok === false) { avisar(r.motivo || 'No he podido rehacerlo ahora.', 'error'); return; }
    return llamar('webEstadoActualizacion').then(function (a) { pintarActualizacion(a, true); });
  }).catch(function (e) { avisar('No he podido arrancar la actualización. ' + mensajeDeError(e), 'error'); });
}

function pulsarActualizar() {
  limpiarAviso();
  llamar('webActualizarDatos').then(function () {
    return llamar('webEstadoActualizacion');
  }).then(function (a) { pintarActualizacion(a, true); })
    .catch(function (e) { avisar('No he podido arrancar la actualización. ' + mensajeDeError(e), 'error'); });
}
