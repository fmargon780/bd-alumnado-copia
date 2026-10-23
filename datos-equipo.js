/* Generado de JsEquipo.html por web/construir-datos.mjs: no se toca a mano. */
var EQUIPO_DATOS_ = null;       // lo último que dijo webEquipoLeer
var EQUIPO_EDITANDO_ = null;    // null: sin formulario; '': alta nueva; id: corrigiendo a esa persona; 'yo': mi nombre y cargo
var EQUIPO_MENSAJE_ = '';

function miPapel_() {
  return (ESTADO && ESTADO.miPapel) || { rol: 'admin', nombre: '', cargo: '', gestor: '' };
}

/* Quien es «equipo» ve lo reservado, pero no lo puede cambiar. */
function soloLectura_() { return miPapel_().rol === 'equipo'; }

function lineaReservadaHtml_() {
  var g = miPapel_().gestor;
  return '<p class="linea-reservada">Solo lo cambia quien gestiona la base de datos' + (g ? ' (' + escapaHtml(g) + ')' : '') + '.</p>';
}

/* Apaga los campos y botones de un trozo de pantalla y pone la línea arriba (una sola vez). Sin efecto si quien mira gestiona la base de datos. */
function apagarReservado_(contenedor) {
  if (!contenedor || !soloLectura_()) return;
  contenedor.querySelectorAll('input, select, textarea, button').forEach(function (el) { el.disabled = true; });
  if (!contenedor.querySelector('.linea-reservada')) contenedor.insertAdjacentHTML('afterbegin', lineaReservadaHtml_());
}

/* Instrucción 101: los siete pasos del último pegado, con las mismas palabras que la línea de `docs/TE-TOCA.md`. */
var GH_BLOB_ = 'https://github.com/fmargon780/bd-alumnado-ies/blob/main/';
function enlaceGH_(ruta, texto) { return '<a href="' + GH_BLOB_ + ruta + '" target="_blank" rel="noopener">' + texto + '</a>'; }
var PEGAR_PASOS_HTML_ = '<ol>' +
  '<li>Abre el cuaderno «BASE DE DATOS ALUMNADO» › Extensiones › Apps Script.</li>' +
  '<li>A la izquierda, la rueda dentada «Configuración del proyecto»: marca «Mostrar el archivo de manifiesto "appsscript.json" en el editor».</li>' +
  '<li>Vuelve al editor (el icono <code>&lt; &gt;</code>). Abre <code>appsscript.json</code>, borra todo, pega el contenido de ' + enlaceGH_('pegado/appsscript.json', 'pegado/appsscript.json en GitHub') + ' y guarda.</li>' +
  '<li>Abre el fichero de código, borra todo, pega ' + enlaceGH_('Actualizador.gs', 'Actualizador.gs en GitHub') + ' y guarda.</li>' +
  '<li>Arriba, en la lista de funciones, elige <code>darPermisos</code> y pulsa «Ejecutar». Si Google pide permisos: «Revisar permisos» › tu cuenta › «Permitir». Abajo saldrá una de estas tres cosas. <strong>«TODO BIEN»:</strong> sigue con el paso 6. <strong>«TODAVÍA NO: …»:</strong> no has roto nada; haz lo que dice (casi siempre, esperar a la hora que indica) y repite solo este paso. <strong>Un texto en rojo:</strong> si dentro pone «403» o «429», es GitHub, que ha cortado el paso: espera una hora y repite solo este paso; si pone otra cosa, avisa por Soporte y no sigas. No hace falta deshacer nada de lo pegado: la web sigue funcionando como antes hasta que hagas el paso 6.</li>' +
  '<li>«Implementar» › «Gestionar implementaciones» › el lápiz › «Versión»: «Nueva versión» › «Implementar».</li>' +
  '<li>Abre la web. El aviso ya no sale. Es la última vez.</li></ol>';

/* Instrucción 105: encima de los pasos, cómo está el paso 5 (con un corte de GitHub, esperar; si no, ya se puede ejecutar). */
/* Instrucción 118: el pegado está hecho (el disparador ya trabaja con la cáscara) pero la web se sirve con una versión antigua del proyecto: falta un solo paso, no los siete. */
var IMPLEMENTAR_PASO_HTML_ = '<p class="cal-nota">El pegado ya está hecho. Lo único que falta es que la web use la versión nueva:</p><ol>' +
  '<li>Abre el cuaderno «BASE DE DATOS ALUMNADO» › Extensiones › Apps Script.</li>' +
  '<li>Arriba a la derecha, «Implementar» › «Gestionar implementaciones» › el lápiz › «Versión»: «Nueva versión» › «Implementar».</li>' +
  '<li>Vuelve a abrir la web. El aviso ya no sale.</li></ol>';

function pegarPasosHtml_() {
  if (typeof ESTADO !== 'undefined' && ESTADO && ESTADO.faltaImplementar) return IMPLEMENTAR_PASO_HTML_;
  var v = (typeof ESTADO !== 'undefined' && ESTADO && ESTADO.versionAviso) || null, linea = '';
  if (v && v.corteHasta) linea = '<p class="cal-nota">Paso 5: espera. GitHub ha cortado el paso hasta las ' + escapaHtml(v.corteHasta) + '.</p>';
  else if (v && v.pasoCinco === 'listo') linea = '<p class="cal-nota">Paso 5: ya puedes ejecutarlo.</p>';
  return linea + PEGAR_PASOS_HTML_;
}

function cargarEquipo_() {
  var cont = document.getElementById('contenidoEquipo');
  if (!cont) return;
  if (!EQUIPO_DATOS_) cont.innerHTML = '<p class="vacio-hoy">Trayendo quién entra…</p>';
  llamar('webEquipoLeer').then(function (r) { EQUIPO_DATOS_ = r; pintarEquipo_(); })
    .catch(function (e) { cont.innerHTML = '<p class="vacio-hoy">No he podido traer la lista. ' + escapaHtml(mensajeDeError(e)) + '</p>'; });
}

function fechaDeAltaEquipo_(iso) {
  var d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
}

function equipoFormularioHtml_() {
  var d = EQUIPO_DATOS_, p = null;
  if (EQUIPO_EDITANDO_ && EQUIPO_EDITANDO_ !== 'yo') p = d.equipo.filter(function (x) { return x.id === EQUIPO_EDITANDO_; })[0] || null;
  var yo = EQUIPO_EDITANDO_ === 'yo' ? d.gestores.filter(function (g) { return g.esElMismo; })[0] : null;
  var base = p || yo || { nombre: '', cargo: '', correo: '' };
  var cargos = d.cargos || [];
  var esLista = cargos.indexOf(base.cargo) !== -1 && base.cargo !== 'Otro';
  var otro = base.cargo && !esLista ? base.cargo : '';
  var seleccion = esLista ? base.cargo : (base.cargo ? 'Otro' : cargos[0]);
  var titulo = EQUIPO_EDITANDO_ === 'yo' ? 'Mi nombre y cargo' : (p ? 'Corregir a ' + escapaHtml(p.nombre) : 'Dar de alta a una persona');
  var correoCampo = EQUIPO_EDITANDO_ === 'yo' ? '' :
    '<label class="campo-centro"><span>Correo</span><input type="email" id="equipoCorreo" value="' + escapaHtml(base.correo).replace(/"/g, '&quot;') + '" placeholder="nombre@' + escapaHtml(d.dominio || 'dominio') + '">' +
    (d.dominio ? '<small>Tiene que acabar en @' + escapaHtml(d.dominio) + ': con otro correo no podría entrar.</small>' : '') + '</label>';
  return '<div class="tarjeta formulario-equipo" id="formularioEquipo"><h2>' + titulo + '</h2>' +
    '<label class="campo-centro"><span>Nombre</span><input type="text" id="equipoNombre" value="' + escapaHtml(base.nombre).replace(/"/g, '&quot;') + '"></label>' +
    '<label class="campo-centro"><span>Cargo</span><select id="equipoCargo" onchange="equipoCargoCambia_()">' +
      cargos.map(function (c) { return '<option' + (c === seleccion ? ' selected' : '') + '>' + escapaHtml(c) + '</option>'; }).join('') + '</select> ' +
      '<input type="text" id="equipoCargoOtro" placeholder="¿Cuál?" value="' + escapaHtml(otro).replace(/"/g, '&quot;') + '"' + (seleccion === 'Otro' ? '' : ' class="oculto"') + '></label>' +
    correoCampo +
    '<div class="fila-botones"><button class="principal" id="botonGuardarEquipo" onclick="equipoGuardar_()">' + (EQUIPO_EDITANDO_ === '' ? 'Dar de alta' : 'Guardar') + '</button>' +
    '<button onclick="equipoCancelar_()">Cancelar</button></div></div>';
}

function equipoCargoCambia_() {
  var otro = document.getElementById('equipoCargoOtro');
  if (otro) otro.classList.toggle('oculto', document.getElementById('equipoCargo').value !== 'Otro');
}

function pintarEquipo_() {
  var cont = document.getElementById('contenidoEquipo');
  var d = EQUIPO_DATOS_;
  if (!cont || !d) return;
  var lectura = soloLectura_();
  var html = '';
  if (!d.alDia && miPapel_().rol === 'admin') {
    html += '<details class="aviso-cargador" open><summary>Falta el último pegado</summary>' + pegarPasosHtml_() + '</details>';
  }
  if (lectura) html += lineaReservadaHtml_();
  if (EQUIPO_MENSAJE_) html += '<p class="cal-nota" id="mensajeEquipo">' + escapaHtml(EQUIPO_MENSAJE_) + '</p>';
  html += '<div class="fila-botones" style="justify-content:flex-end;margin:0 0 8px">' + (lectura ? '' : '<button class="principal" id="botonAltaEquipo" onclick="equipoNuevo_()">Dar de alta</button>') + '</div>';
  html += '<h3 style="margin:0 0 6px;font-size:14px">Quien gestiona la base de datos</h3><table class="listado tabla-hoy" id="tablaGestores"><thead><tr><th>Nombre</th><th>Cargo</th><th>Correo</th>' + (lectura ? '' : '<th></th>') + '</tr></thead><tbody>' +
    d.gestores.map(function (g) {
      return '<tr><td>' + escapaHtml(g.nombre || '—') + '</td><td>' + escapaHtml(g.cargo || '—') + '</td><td>' + escapaHtml(g.correo) + '</td>' +
        (lectura ? '' : '<td class="acciones-equipo">' + (g.esElMismo ? '<button class="pequeno" onclick="equipoMiNombre_()">Mi nombre y cargo</button>' : '') + '</td>') + '</tr>';
    }).join('') + '</tbody></table>';
  if (EQUIPO_EDITANDO_ !== null && !lectura) html += equipoFormularioHtml_();
  html += '<h3 style="margin:16px 0 6px;font-size:14px">Equipo directivo</h3><table class="listado tabla-hoy" id="tablaEquipo"><thead><tr><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Desde</th>' + (lectura ? '' : '<th></th>') + '</tr></thead><tbody>' +
    (d.equipo.map(function (p) {
      return '<tr data-id="' + escapaHtml(p.id) + '"><td>' + escapaHtml(p.nombre) + '</td><td>' + escapaHtml(p.cargo) + '</td><td>' + escapaHtml(p.correo) + '</td><td>' + escapaHtml(fechaDeAltaEquipo_(p.fechaAlta)) + '</td>' +
        (lectura ? '' : '<td class="acciones-equipo">' +
          (p.correoEnviado ? '' : '<span class="cal-nota">Correo sin enviar.</span> <button class="pequeno" onclick="equipoReenviar_(\'' + escapaHtml(p.id) + '\')">Volver a enviar</button> ') +
          '<button class="pequeno" onclick="equipoCorregir_(\'' + escapaHtml(p.id) + '\')">Corregir</button> ' +
          '<button class="pequeno" onclick="equipoBaja_(\'' + escapaHtml(p.id) + '\')">Dar de baja</button></td>') + '</tr>';
    }).join('') || '<tr><td colspan="' + (lectura ? 4 : 5) + '">Nadie dado de alta todavía: solo entra quien gestiona la base de datos.</td></tr>') + '</tbody></table>' +
    '<p class="cal-nota">Quien gestiona (propietario y editores del cuaderno) no se da de alta aquí y no tiene botón de baja. El equipo ve y cambia todo, salvo los datos del centro, las fechas, los cursos y esta lista.</p>';
  cont.innerHTML = html;
}

function equipoNuevo_() { EQUIPO_EDITANDO_ = ''; EQUIPO_MENSAJE_ = ''; pintarEquipo_(); }
function equipoCorregir_(id) { EQUIPO_EDITANDO_ = id; EQUIPO_MENSAJE_ = ''; pintarEquipo_(); }
function equipoMiNombre_() { EQUIPO_EDITANDO_ = 'yo'; EQUIPO_MENSAJE_ = ''; pintarEquipo_(); }
function equipoCancelar_() { EQUIPO_EDITANDO_ = null; pintarEquipo_(); }

function datosDelFormularioEquipo_() {
  var cargo = document.getElementById('equipoCargo').value;
  if (cargo === 'Otro') cargo = document.getElementById('equipoCargoOtro').value.trim() || 'Otro';
  var correo = document.getElementById('equipoCorreo');
  return { nombre: document.getElementById('equipoNombre').value.trim(), cargo: cargo, correo: correo ? correo.value.trim() : '' };
}

function equipoGuardar_() {
  var datos = datosDelFormularioEquipo_(), editando = EQUIPO_EDITANDO_;
  limpiarAviso();
  var llamada = editando === 'yo' ? llamar('webEquipoMiNombre', datos)
    : (editando ? llamar('webEquipoCorregir', editando, datos) : llamar('webEquipoAlta', datos));
  return llamada.then(function (r) {
    EQUIPO_EDITANDO_ = null;
    if (editando === '') {
      EQUIPO_MENSAJE_ = r.correo && r.correo.ok ? 'Dada de alta. Le llega un correo con la dirección de la web.'
        : 'Dada de alta, pero el correo no ha salido. Usa «Volver a enviar» o pásale tú esta dirección: ' + (r.url || '');
    } else EQUIPO_MENSAJE_ = 'Guardado.';
    cargarEquipo_();
  }).catch(function (e) { avisar(mensajeDeError(e), 'error'); });
}

function equipoBaja_(id) {
  var p = EQUIPO_DATOS_.equipo.filter(function (x) { return x.id === id; })[0];
  if (!p || !confirm('¿Dar de baja a ' + p.nombre + '? Deja de poder entrar al momento.')) return;
  limpiarAviso();
  llamar('webEquipoBaja', id).then(function () { EQUIPO_MENSAJE_ = 'Dada de baja. Ya no puede entrar.'; cargarEquipo_(); })
    .catch(function (e) { avisar('No he podido darla de baja. ' + mensajeDeError(e), 'error'); });
}

function equipoReenviar_(id) {
  limpiarAviso();
  llamar('webEquipoReenviar', id).then(function (r) {
    EQUIPO_MENSAJE_ = r.correo && r.correo.ok ? 'Correo enviado.' : 'El correo no ha salido. Pásale tú esta dirección: ' + (r.url || '');
    cargarEquipo_();
  }).catch(function (e) { avisar('No he podido mandar el correo. ' + mensajeDeError(e), 'error'); });
}
