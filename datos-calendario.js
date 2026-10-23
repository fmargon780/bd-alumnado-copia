/* Generado de JsCalendario.html por web/construir-datos.mjs: no se toca a mano. */
var CALENDARIO_ETIQUETAS_ = {
  admision: 'Admisión', transito: 'Tránsito', matricula: 'Matrícula', agrupamiento: 'Agrupamiento',
  espera: 'Lista de espera y admisión extraordinaria', inicio: 'Inicio de curso',
  certificacionJulio: 'Certificación de matrícula de julio', certificacionSeptiembre: 'Certificación de matrícula de septiembre'
};

function filaCalendarioHtml_(f, i, curso) {
  var esHito = /^certificacion/.test(f.clave);
  var etiqueta = CALENDARIO_ETIQUETAS_[f.clave] + (!esHito && (f.clave === 'matricula') ? ' · ' + (f.n === 1 ? 'julio' : 'septiembre') : '');
  if (esHito) {
    var general = f.clave === 'certificacionJulio' && !f.desde ? fechaDeHito_(f.clave, curso) : '';
    return '<tr data-clave="' + f.clave + '" data-n="' + f.n + '"><td>' + escapaHtml(etiqueta) + '</td>' +
      '<td colspan="2"><input type="date" class="cal-desde" value="' + escapaHtml(f.desde) + '" aria-label="Fecha de ' + escapaHtml(etiqueta) + '">' +
      (general ? ' <span class="cal-nota">Sin fecha propia: se usa la de los objetivos de matrícula (' + escapaHtml(fechaLegibleObjetivos_(general)) + ').</span>' : (f.desde ? '' : ' <span class="cal-nota">Sin fecha.</span>')) + '</td></tr>';
  }
  return '<tr data-clave="' + f.clave + '" data-n="' + f.n + '"><td>' + escapaHtml(etiqueta) + '</td>' +
    '<td><input type="date" class="cal-desde" value="' + escapaHtml(f.desde) + '" aria-label="Empieza ' + escapaHtml(etiqueta) + '"></td>' +
    '<td><input type="date" class="cal-hasta" value="' + escapaHtml(f.hasta) + '" aria-label="Termina ' + escapaHtml(etiqueta) + '"></td></tr>';
}

function pintarCalendario_() {
  var cont = document.getElementById('calendarioCurso');
  if (!cont || !CURSO_VISTO) return;
  var filas = calendarioDe_(CURSO_VISTO);
  if (!filas.length) { cont.innerHTML = '<p class="vacio-hoy">Trayendo las fechas del curso ' + escapaHtml(CURSO_VISTO) + '…</p>'; return; }
  var cerrado = cursoVistoInfo_().estado === 'Cerrado';
  cont.innerHTML = '<table class="listado tabla-hoy tabla-calendario"><thead><tr><th>Tarea</th><th>Empieza</th><th>Acaba</th></tr></thead><tbody>' +
    filas.map(function (f, i) { return filaCalendarioHtml_(f, i, CURSO_VISTO); }).join('') + '</tbody></table>' +
    '<div class="fila-botones"><button class="principal" id="botonGuardarCalendario" onclick="guardarCalendario_()"' + (cerrado ? ' disabled title="El curso está cerrado"' : '') + '>Guardar las fechas</button>' +
    '<span class="cal-nota" id="estadoCalendario"></span><span class="cal-nota" id="cambiadoPorCalendario"></span></div>';
  cambiadoPorEn_('cambiadoPorCalendario', 'calendario|' + CURSO_VISTO);   // instrucción 66
  apagarReservado_(cont);   // instrucción 62: el equipo lo ve, pero no lo cambia
}

function guardarCalendario_() {
  var curso = CURSO_VISTO;
  var filas = [];
  document.querySelectorAll('#calendarioCurso tbody tr').forEach(function (tr) {
    var desde = tr.querySelector('.cal-desde'), hasta = tr.querySelector('.cal-hasta');
    filas.push({ clave: tr.getAttribute('data-clave'), n: +tr.getAttribute('data-n'), desde: desde ? desde.value : '', hasta: hasta ? hasta.value : '' });
  });
  var est = document.getElementById('estadoCalendario');
  if (est) est.textContent = '';
  return llamar('webCalendarioGuardar', curso, filas).then(function (r) {
    MEMORIA_['webCalendarioLeer' + JSON.stringify([curso])] = r;
    if (curso === CURSO_VISTO) pintarCalendario_();
    pintarMenuTareas_();
    var est2 = document.getElementById('estadoCalendario');
    if (est2) est2.textContent = 'Guardadas. El menú y «Hoy» ya las usan.';
  }).catch(function (e) { avisar('No he podido guardar las fechas. ' + mensajeDeError(e), 'error'); });
}
