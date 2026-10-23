/* Generado de JsMesaTabla.html por web/construir-mesa.mjs: no se toca a mano. */
/* ==================== LA MESA: EQUILIBRIO ==================== */
/* Instrucción 73: UN solo sitio decide el grupo de un alumno. Un grupo que ya no existe cuenta como «Sin grupo» (si no, el alumno no saldría en ninguna columna). */
function grupoDe(clave) {
  const a = ASIGNACIONES[clave], g = (a && a.grupo) || '';
  return g && DATA && (DATA.grupos || []).indexOf(g) === -1 ? '' : g;
}
function mesaSinSuGrupo_(clave) { const a = ASIGNACIONES[clave], g = (a && a.grupo) || ''; return !!g && !!DATA && (DATA.grupos || []).indexOf(g) === -1; }

/* pintarEquilibrio() (la tabla de equilibrio) vive desde la instrucción 48 en JsMesaEquilibrio.html. */

/* ==================== PREFERENCIAS DE OPTATIVAS (instrucción 8) ==================== */
/* Séneca manda si ha llegado; si no, lo escrito en papel (punto 1). */
function ordenDe(clave) {
  const p = PREFERENCIAS[clave];
  if (!p) return [];
  return (p.ordenSeneca && p.ordenSeneca.length) ? p.ordenSeneca : (p.ordenPapel || []);
}
function fechaDe(clave) {
  const p = PREFERENCIAS[clave];
  if (!p) return '';
  return (p.ordenSeneca && p.ordenSeneca.length) ? p.fechaSeneca : (p.fechaPapel || '');
}
function tienePreferencias(clave) { return ordenDe(clave).length > 0; }
function difierenPreferencias(clave) {
  const p = PREFERENCIAS[clave];
  if (!p || !p.ordenPapel.length || !p.ordenSeneca.length) return false;
  return JSON.stringify(p.ordenPapel) !== JSON.stringify(p.ordenSeneca);
}
function alternarFiltroPreferencias(marcado) {
  SOLO_SIN_PREFERENCIAS = marcado;
  pintarColumnas();
}

/* ==================== LA MESA: COLUMNAS Y ARRASTRE ==================== */
function tarjetaHtml(al) {
  const chips = [];
  if (al.rep) chips.push('<span class="etiqueta-mesa rep">REP</span>');
  if (al.pil) chips.push('<span class="etiqueta-mesa pil">PIL</span>');
  if (al.neae) chips.push('<span class="etiqueta-mesa neae">NEAE</span>');
  if (al.div) chips.push('<span class="etiqueta-mesa div">DIV</span>');
  if (al.conflictivo) chips.push('<span class="etiqueta-mesa conf">CONF</span>');
  if (al.bilingue) chips.push('<span class="etiqueta-mesa bil">BIL</span>');
  if (al.exentoFrances) chips.push('<span class="etiqueta-mesa opt">EX. FRANCÉS</span>');
  /* Instrucción 61: con icono y texto, nunca solo color. El matriculado no lleva ninguna. */
  if (al.estadoMatricula === 'pendiente') {
    if (mesaFueraDePlazo_(al)) chips.push('<span class="etiqueta-mesa fuera-plazo"><i aria-hidden="true">!</i> Sin matricular, fuera de plazo</span>');
    else chips.push('<span class="etiqueta-mesa sin-matricular"><i aria-hidden="true">…</i> Sin matricular</span>');
  }
  if (al.estadoMatricula === 'provisional') chips.push('<span class="etiqueta-mesa sin-matricular"><i aria-hidden="true">…</i> Matrícula provisional</span>');
  if (al.suspensas >= 3) chips.push('<span class="etiqueta-mesa susp">' + al.suspensas + ' susp.</span>');
  const asign = ASIGNACIONES[al.clave] || {};
  const prep = DATA.estadoCurso === 'preparacion';
  if (asign.optativa) chips.push('<span class="etiqueta-mesa opt">' + escapaHtml(asign.optativa) + '</span>');
  else if (prep) { if (mesaOptativaSinElegir_(al)) chips.push('<span class="etiqueta-mesa sin-elegir"><i aria-hidden="true">?</i> Optativa sin elegir</span>'); }
  else if ((al.optativas && al.optativas.length) || al.religion) chips.push('<span class="etiqueta-mesa susp">Sin optativa</span>');
  if (al.religion) chips.push('<span class="etiqueta-mesa opt">' + escapaHtml(al.religion) + '</span>');
  else if (prep) chips.push('<span class="etiqueta-mesa sin-elegir"><i aria-hidden="true">?</i> Religión sin elegir</span>');
  if (asign.optativaCambiada) chips.push('<span class="etiqueta-mesa cambio" title="Antes: ' + escapaHtml(asign.optativaAnterior || '') + '">OPT. CAMBIADA</span>');
  if (mesaSinSuGrupo_(al.clave)) chips.unshift('<span class="etiqueta-mesa sin-su-grupo"><i aria-hidden="true">!</i> Sin su grupo</span>');
  if (mesaEsNuevo_(al) && !grupoDe(al.clave)) chips.unshift('<span class="etiqueta-mesa nuevo"><i aria-hidden="true">+</i> Nuevo</span>');
  const seleccionada = SELECCION.indexOf(al.clave) !== -1 ? ' seleccionada' : '';
  return '<div class="tarjeta-alumno' + seleccionada + '" draggable="' + (SOLO_LECTURA_MESA_ ? 'false' : 'true') + '" data-clave="' + escapaHtml(al.clave) + '" data-dato="' + escapaHtml(datoMesaAlumno_(al.clave)).replace(/"/g, '&quot;') + '" onclick="clicTarjeta(\'' +
    al.clave.replace(/'/g, "\\'") + '\')"><span class="nombre">' + escapaHtml(al.nombre) + '</span>' + chips.join('') + '</div>';
}

function clicTarjeta(clave) {
  if (!MODO_SELECCION) { abrirFichaMesa(clave); return; }
  const idx = SELECCION.indexOf(clave);
  if (idx === -1) SELECCION.push(clave); else SELECCION.splice(idx, 1);
  pintarColumnas();
  pintarAvisoSeleccion();
}

function pintarAvisoSeleccion() {
  const div = document.getElementById('avisoSeleccionMesa');
  if (!MODO_SELECCION) { div.classList.add('oculto'); return; }
  div.classList.remove('oculto');
  const nombres = SELECCION.map(function (c) { return (ALUMNOS_POR_CLAVE[c] || {}).nombre; }).filter(Boolean);
  div.innerHTML = SELECCION.length
    ? ('Seleccionados: ' + escapaHtml(nombres.join(', ')) +
       '. <button onclick="juntarSeleccionados()">Juntar</button> ' +
       '<button onclick="separarSeleccionados()">Separar</button> ' +
       '<button onclick="vaciarSeleccion()">Vaciar</button>')
    : 'Modo selección activo: toca a los alumnos que quieras juntar o separar.';
}
function vaciarSeleccion() { SELECCION = []; pintarColumnas(); pintarAvisoSeleccion(); }

function alternarModoSeleccion() {
  MODO_SELECCION = !MODO_SELECCION;
  SELECCION = [];
  document.getElementById('btnModoSeleccion').textContent = MODO_SELECCION ? 'Dejar de seleccionar' : 'Empezar a seleccionar';
  pintarColumnas();
  pintarAvisoSeleccion();
}

function pintarColumnas() {
  if (typeof pintarCajasMesa_ === 'function') pintarCajasMesa_();   // instrucción 65: «Han dejado de venir» y «Han llegado»
  const cont = document.getElementById('columnasMesa');
  const columnas = [''].concat(DATA.grupos);
  const sinEleccion = DATA.estadoCurso === 'preparacion' ? mesaSinElegir_ : function (a) { return !tienePreferencias(a.clave); };
  const base = SOLO_SIN_PREFERENCIAS ? DATA.alumnos.filter(sinEleccion) : DATA.alumnos;
  const cuenta = document.getElementById('cuentaSinElegir');
  const rotulo = document.getElementById('rotuloSinElegir');
  if (rotulo) rotulo.textContent = DATA.estadoCurso === 'preparacion' ? ' Solo sin elegir' : ' Solo alumnos sin preferencias de optativa';
  if (cuenta) cuenta.textContent = DATA.estadoCurso === 'preparacion' ? '(' + DATA.alumnos.filter(mesaSinElegir_).length + ')' : '';
  cont.innerHTML = columnas.map(function (g) {
    const alumnos = base.filter(function (a) { return grupoDe(a.clave) === g; });
    if (!g) alumnos.sort(function (x, y) { return (mesaEsNuevo_(y) ? 1 : 0) - (mesaEsNuevo_(x) ? 1 : 0); });   // los «Nuevo», arriba de «Sin grupo»
    return '<div class="columna"><h3><span>' + (g || 'Sin grupo') + '</span><span>' + alumnos.length + '</span></h3>' +
      '<div class="columna-lista" data-grupo="' + escapaHtml(g) + '">' + alumnos.map(tarjetaHtml).join('') + '</div></div>';
  }).join('');

  SORTABLES.forEach(function (s) { s.destroy(); });
  SORTABLES = [];
  cont.querySelectorAll('.columna-lista').forEach(function (lista) {
    SORTABLES.push(new Sortable(lista, {
      group: 'alumnos', animation: 120, disabled: SOLO_LECTURA_MESA_,
      onStart: function () { MESA_ARRASTRANDO_ = true; },   // instrucción 67: mientras se arrastra, nada se mueve debajo
      onEnd: function (evt) { moverAlumno(evt); mesaAlSoltarTarjeta_(); }
    }));
  });
}

/* Buscar un alumno estando en la mesa (o pulsar "Ver en la mesa" desde su
   ficha completa) lo resalta en su columna: instrucción 19, punto 0. */
function resaltarAlumnoEnMesa_(clave) {
  const tarjeta = document.querySelector('#columnasMesa .tarjeta-alumno[data-clave="' + clave.replace(/"/g, '\\"') + '"]');
  if (!tarjeta) return;
  tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  tarjeta.classList.add('resaltada');
  setTimeout(function () { tarjeta.classList.remove('resaltada'); }, 2500);
}

function moverAlumno(evt) {
  if (SOLO_LECTURA_MESA_) { pintarColumnas(); return; }   // un curso cerrado solo se mira
  const clave = evt.item.getAttribute('data-clave');
  const grupoDestino = evt.to.getAttribute('data-grupo');
  const grupoOrigen = evt.from.getAttribute('data-grupo');
  if (grupoDestino === grupoOrigen) return;
  const alumno = DATA.alumnos.find(function (a) { return a.clave === clave; });
  const motivo = motivoBloqueado(alumno, grupoDestino);
  if (motivo) {
    avisar(motivo, 'error');
    pintarColumnas();   // deshace el arrastre, volviendo a pintar desde ASIGNACIONES
    return;
  }
  limpiarAviso();
  ASIGNACIONES[clave] = Object.assign({}, ASIGNACIONES[clave], { grupo: grupoDestino });
  pintarEquilibrio();
  guardarModeloConRetraso_();
}

/* Si el grupo de destino no da la optativa o la Religión del alumno, no se
   deja soltar (punto 3 de la instrucción 6). Sin bloques configurados
   todavía para esa franja o ese grupo, se deja pasar: no hay con qué
   comprobar. Se busca primero el bloque QUE TIENE el grupo de destino (no
   "el primero que dé esa materia", que sería el mismo bloque para todos los
   alumnos si dos bloques de la misma franja ofrecen las mismas materias,
   como pasa a menudo en Religión/Atención educativa). */
function motivoBloqueado(alumno, grupoDestino) {
  if (!grupoDestino) return null;
  const franjas = (DATA.bloques && DATA.bloques.franjas) || [];
  for (let i = 0; i < franjas.length; i++) {
    const franja = franjas[i];
    const bloqueDestino = (franja.bloques || []).find(function (b) { return (b.grupos || []).indexOf(grupoDestino) !== -1; });
    if (!bloqueDestino) continue;   // este grupo no está en ningún bloque de esta franja todavía
    const esReligion = /religi/i.test(franja.nombre);
    const materiasAlumno = esReligion ? [alumno.religion] : (alumno.optativas || []);
    const codigos = (franja.materias || []).map(function (m) { return m.codigo; });
    const materia = materiasAlumno.filter(Boolean).find(function (m) { return codigos.indexOf(m) !== -1; });
    if (!materia) continue;   // el alumno no tiene ninguna materia de esta franja: no se comprueba
    if ((bloqueDestino.materias || []).indexOf(materia) === -1) {
      return 'En el grupo ' + grupoDestino + ' no se da "' + materia + '" (' + franja.nombre + ').';
    }
  }
  return null;
}

/* El guardado (en paquetes, con cola, y por operaciones: la mesa ya no manda el modelo entero) vive desde la instrucción 67 en JsMesaOperaciones.html: `guardarModeloConRetraso_`, `flushGuardadoPendiente_`, `guardarModeloTrasCambio`. */

/* ==================== LA FICHA BREVE DEL ALUMNO, DENTRO DE LA MESA ====================
   Distinta de abrirFicha() (JsBuscadorFicha.html), la ficha completa de la
   fase 2: esta es la de siempre en la mesa (fijar a un grupo, preferencias
   de optativa...), con un enlace nuevo a la completa (punto 0, fase 7). */
function franjaPorNombre(fragmento) {
  return (DATA.bloques.franjas || []).find(function (f) { return f.nombre.toLowerCase().indexOf(fragmento) !== -1; });
}

function abrirFichaMesa(clave) {
  const al = DATA.alumnos.find(function (a) { return a.clave === clave; });
  if (!al) return;
  const asign = ASIGNACIONES[clave] || {};
  const franjaOpt = franjaPorNombre('optativa');
  const materiasOpt = (franjaOpt ? franjaOpt.materias : []).filter(function (m) { return !m.noSeDa; });
  const p = PREFERENCIAS[clave] || { ordenPapel: [], fechaPapel: '', ordenSeneca: [], fechaSeneca: '' };

  const fondo = document.getElementById('fichaMesaFondo');
  fondo.innerHTML = '<div class="ficha-mesa">' +
    '<h3>' + escapaHtml(al.nombre) + '</h3>' +
    '<p><a href="#" onclick="cerrarFichaMesa_(); abrirFicha(\'' + clave.replace(/'/g, "\\'") + '\'); return false;">Ficha completa →</a></p>' +
    '<p>Grupo actual en Séneca: ' + escapaHtml(al.grupo) + '</p>' +
    (al.grupoOrigen ? '<p>Grupo de origen: ' + escapaHtml(al.grupoOrigen) + '</p>' : '') +
    (al.colegio ? '<p>Procedencia: ' + escapaHtml(al.colegio) + '</p>' : '') +
    (al.religion ? '<p>Religión / At. educativa: ' + escapaHtml(al.religion) + '</p>' : '') +
    (p.religion ? '<p>Religión / At. educativa escrita a mano (sobre de matrícula): ' + escapaHtml(p.religion) + '</p>' : '') +
    (asign.optativaCambiada ? '<p style="color:#9d174d">Optativa cambiada. Antes: ' +
      escapaHtml(asign.optativaAnterior || '') + '. Motivo: ' + escapaHtml(asign.motivoCambio || '') + '</p>' : '') +
    '<label><input type="checkbox" id="ckConf"' + (al.conflictivo ? ' checked' : '') + '> Conflictivo</label>' +
    '<label><input type="checkbox" id="ckBil"' + (al.bilingue ? ' checked' : '') + '> Pide bilingüe</label>' +
    '<label><input type="checkbox" id="ckFrances"' + (al.exentoFrances ? ' checked' : '') + '> Exento de francés</label>' +
    '<p>Fijar a un grupo:</p>' +
    '<select id="selFijar"><option value="">(sin fijar)</option>' +
    DATA.grupos.map(function (g) { return '<option value="' + escapaHtml(g) + '">' + escapaHtml(g) + '</option>'; }).join('') +
    '</select>' +
    (materiasOpt.length ? '<p>Optativa asignada:</p><select id="selOptativa"><option value="">(ninguna)</option>' +
      materiasOpt.map(function (m) { return '<option value="' + escapaHtml(m.codigo) + '">' + escapaHtml(m.etiqueta) + '</option>'; }).join('') +
      '</select>' : '') +
    (DATA.estadoCurso === 'preparacion' ? '<p>Religión / Atención educativa:</p><input type="text" id="txtReligion" style="width:100%" value="' + escapaHtml(al.religion || '') + '">' : '') +
    '<p>Preferencias de optativa (en orden, separadas por comas):</p>' +
    '<input type="text" id="txtPreferencias" style="width:100%" value="' + escapaHtml((p.ordenSeneca.length ? p.ordenSeneca : p.ordenPapel).join(', ')) + '">' +
    '<p>Fecha de entrega:</p>' +
    '<input type="date" id="txtFechaPreferencia" value="' + escapaHtml(p.ordenSeneca.length ? p.fechaSeneca : p.fechaPapel) + '">' +
    (difierenPreferencias(clave) ? '<p style="color:#b45309;font-size:12px">Lo escrito a mano no coincide con lo que trajo Séneca ' +
      '(Séneca: ' + escapaHtml(p.ordenSeneca.join(', ')) + '). Manda Séneca.</p>' : '') +
    '<div class="cerrar"><button onclick="guardarPreferenciaDesdeFicha(\'' + clave.replace(/'/g, "\\'") + '\')">Guardar preferencias</button> ' +
    '<button onclick="cerrarFichaMesa_()">Cerrar</button></div></div>';
  fondo.classList.remove('oculto');
  document.getElementById('ckConf').onchange = function (e) { guardarMarca(clave, 'conflictivo', e.target.checked); };
  document.getElementById('ckBil').onchange = function (e) { guardarMarca(clave, 'bilingue', e.target.checked); };
  document.getElementById('ckFrances').onchange = function (e) { guardarMarca(clave, 'exentoFrances', e.target.checked); };
  const fijoActual = reglasActuales().fijar.find(function (f) { return f.alumno === clave; });
  const selFijar = document.getElementById('selFijar');
  selFijar.value = fijoActual ? fijoActual.grupo : '';
  selFijar.onchange = function (e) { fijarDesdeFicha(clave, e.target.value); };
  const selOptativa = document.getElementById('selOptativa');
  if (selOptativa) {
    selOptativa.value = asign.optativa || '';
    selOptativa.onchange = function (e) { cambiarOptativaAMano(clave, e.target.value); };
  }
}

/* Cambio manual de optativa (la resolución "a mano" del punto 4 de la
   instrucción 8: Jefatura decide quién sale de una optativa desbordada). */
function cambiarOptativaAMano(clave, optativa) {
  const asign = Object.assign({}, ASIGNACIONES[clave]);
  asign.optativa = optativa;
  delete asign.optativaCambiada;
  delete asign.optativaAnterior;
  delete asign.motivoCambio;
  ASIGNACIONES[clave] = asign;
  pintarColumnas();
  guardarModeloTrasCambio();
}

async function guardarPreferenciaDesdeFicha(clave) {
  const orden = document.getElementById('txtPreferencias').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const fecha = document.getElementById('txtFechaPreferencia').value || '';
  try {
    const campoReligion = document.getElementById('txtReligion');
    const religion = campoReligion ? campoReligion.value.trim() : undefined;
    await llamar('mesaGuardarPreferencia', clave, orden, fecha, religion === undefined ? null : religion);
    const alu = DATA.alumnos.find(function (a) { return a.clave === clave; });
    if (alu && DATA.estadoCurso === 'preparacion') {
      alu.optativas = orden.length ? [orden[0]] : [];
      if (religion !== undefined) alu.religion = religion;
    }
    const p = PREFERENCIAS[clave] || { ordenSeneca: [], fechaSeneca: '' };
    PREFERENCIAS[clave] = { ordenPapel: orden, fechaPapel: fecha, ordenSeneca: p.ordenSeneca || [], fechaSeneca: p.fechaSeneca || '', religion: p.religion || '' };
    avisar('Preferencias guardadas.', 'aviso');
    pintarColumnas();
    cerrarFichaMesa_();
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}
function cerrarFichaMesa_() { document.getElementById('fichaMesaFondo').classList.add('oculto'); }
async function guardarMarca(clave, campo, valor) {
  try {
    await llamar('mesaGuardarMarca', clave, campo, valor);
    const al = DATA.alumnos.find(function (a) { return a.clave === clave; });
    if (al) al[campo] = valor;
    pintarEquilibrio(); pintarColumnas();
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}
