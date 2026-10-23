/* Generado de JsMesaNucleo.html por web/construir-mesa.mjs: no se toca a mano. */
/* ==================== ESTADO ==================== */
let CURSO_ESCOLAR = null;   // instrucción 61: el curso escolar («26-27») de la mesa que se ve; NIVEL es «1º», «2º BACH»…: dos palabras, dos argumentos
let NIVEL = null;
let NIVELES_MESA_ = {};     // curso escolar -> { niveles, estadoCurso }, pedido una vez
let NIVEL_RECORDADO_ = {};  // curso escolar -> último nivel visto (mientras dure la sesión)
let MESA_CACHE_ = {};       // 'curso escolar|nivel' -> lo pedido al servidor y lo tocado: volver a un nivel ya visto no pide nada
let NIVEL_PEDIDO_ = '';     // un nivel que alguien ha pedido ver (la ficha, el buscador)
let SOLO_LECTURA_MESA_ = false;   // un curso cerrado solo se mira
let DATA = null;            // lo que devuelve mesaObtenerCurso
let ASIGNACIONES = {};      // clave alumno -> {grupo, optativa}
let VERSION = 0;
let MODELO_ID = null;
let VISTA_MESA = 'mesa';    // 'mesa' o 'bloques' (antes "PESTANA": ese nombre se dejó libre para PESTANA_ACTUAL, la pestaña de toda la web)
let SORTABLES = [];
let CRITERIOS = { lista: [] };   // instrucción 48: { lista: [{ id, activo }] } en orden de prioridad (JsMesaCriterios.html)
let MODO_SELECCION = false;
let SELECCION = [];          // claves de alumnos seleccionados, en orden de click
let ALUMNOS_POR_CLAVE = {};  // clave -> alumno, se recalcula en cada cargarCurso
let PREFERENCIAS = {};       // clave -> {ordenPapel, fechaPapel, ordenSeneca, fechaSeneca}
let SOLO_SIN_PREFERENCIAS = false;

/* ==================== ARRANQUE DE LA PESTAÑA ==================== */
/* Llamada desde cargarDatosPestana() (JsComun.html) cada vez que se entra en
   la pestaña Mesa o se cambia de curso arriba. Si ya está cargado este mismo
   curso, no vuelve a pedir nada al servidor (punto 1 de la instrucción 19):
   solo repinta con lo que ya hay. */
function cargarMesa() {
  pintarMesaShell_();
  if (CURSO_ESCOLAR === CURSO_VISTO && DATA && !(NIVEL_PEDIDO_ && NIVEL_PEDIDO_ !== NIVEL)) { pintarNivelesMesa_(); aplicarModoLecturaMesa_(); pintarPestana(); return; }
  empezarMesaDeCurso_(CURSO_VISTO);
}

/* Instrucción 61: abre la mesa de un curso escolar. Los niveles se piden una vez (mesaListarCursos); se abre el pedido, el último visto de ese curso o el primero. */
async function empezarMesaDeCurso_(cursoEscolar) {
  guardarEnCacheMesa_();
  CURSO_ESCOLAR = cursoEscolar; DATA = null; NIVEL = null;
  let lista = NIVELES_MESA_[cursoEscolar];
  if (!lista) {
    try {
      const r = await llamar('mesaListarCursos', cursoEscolar);
      lista = NIVELES_MESA_[cursoEscolar] = { niveles: r.cursos || [], estadoCurso: r.estadoCurso || 'marcha' };
    } catch (e) { avisar(mensajeDeError(e), 'error'); return; }
  }
  if (cursoEscolar !== CURSO_VISTO) return;   // mientras tanto se ha cambiado de curso: esa carga se encarga
  const elegido = [NIVEL_PEDIDO_, NIVEL_RECORDADO_[cursoEscolar], lista.niveles[0]].filter(function (n) { return n && lista.niveles.indexOf(n) !== -1; })[0] || '';
  NIVEL_PEDIDO_ = '';
  pintarNivelesMesa_();
  if (!elegido) { document.getElementById('columnasMesa').innerHTML = ''; document.getElementById('tablaEquilibrio').innerHTML = ''; avisar('Este curso todavía no tiene alumnado en la mesa.', 'aviso'); return; }
  await abrirNivel(elegido);
}

/* La fila de botones de nivel. */
function pintarNivelesMesa_() {
  const cont = document.getElementById('nivelesMesa');
  if (!cont) return;
  const lista = NIVELES_MESA_[CURSO_ESCOLAR] || { niveles: [] };
  cont.innerHTML = lista.niveles.map(function (n) {
    return '<button class="nivel-mesa' + (n === NIVEL ? ' activo' : '') + '" data-nivel="' + escapaHtml(n) + '" onclick="abrirNivel(\'' + n.replace(/'/g, "\\'") + '\')">' + escapaHtml(nombreGrado_(n)) + '</button>';
  }).join('');
}

/* Guarda en la memoria de la sesión lo que hay abierto, para volver sin pedir nada. */
function guardarEnCacheMesa_() {
  if (!DATA || !CURSO_ESCOLAR || !NIVEL) return;
  MESA_CACHE_[CURSO_ESCOLAR + '|' + NIVEL] = { DATA: DATA, ASIGNACIONES: Object.assign({}, ASIGNACIONES), VERSION: VERSION, MODELO_ID: MODELO_ID, CRITERIOS: CRITERIOS, PREFERENCIAS: PREFERENCIAS, BASE: BASE_ };
}

/* Cambiar de nivel pide ese nivel al servidor una vez; volver a uno ya visto no pide nada. */
async function abrirNivel(nivel) {
  flushGuardadoPendiente_();
  guardarEnCacheMesa_();
  const guardado = MESA_CACHE_[CURSO_ESCOLAR + '|' + nivel];
  if (!guardado) { await cargarCurso(nivel); return; }
  NIVEL = nivel; NIVEL_RECORDADO_[CURSO_ESCOLAR] = nivel;
  DATA = guardado.DATA; ASIGNACIONES = Object.assign({}, guardado.ASIGNACIONES); VERSION = guardado.VERSION; MODELO_ID = guardado.MODELO_ID;
  CRITERIOS = guardado.CRITERIOS; PREFERENCIAS = guardado.PREFERENCIAS; BASE_ = guardado.BASE || null;
  if (!BASE_) mesaFijarBase_();
  ALUMNOS_POR_CLAVE = {};
  DATA.alumnos.forEach(function (a) { ALUMNOS_POR_CLAVE[a.clave] = a; });
  SELECCION = []; MODO_SELECCION = false; SOLO_SIN_PREFERENCIAS = false;
  limpiarAviso();
  pintarNivelesMesa_();
  pintarSelectorModelos();
  pintarCriterios();
  aplicarModoLecturaMesa_();
  pintarPestana();
  pintarPanelReglas();
  if (typeof pulsoPantallaCambia_ === 'function') pulsoPantallaCambia_();   // instrucción 67
}

/* Un curso cerrado solo se mira: sin arrastre y sin botones que guarden. */
function aplicarModoLecturaMesa_() {
  SOLO_LECTURA_MESA_ = !!(DATA && DATA.soloLectura);
  document.getElementById('tab-mesa').classList.toggle('mesa-solo-lectura', SOLO_LECTURA_MESA_);
  ['btnNuevoModeloMesa', 'btnRenombrarMesa', 'btnBorrarMesa', 'btnDefinitivo', 'btnPanelMesa'].forEach(function (id) {
    const b = document.getElementById(id);
    if (b) b.disabled = SOLO_LECTURA_MESA_ || (id === 'btnDefinitivo' && b.disabled && !SOLO_LECTURA_MESA_);
  });
  if (SOLO_LECTURA_MESA_) document.body.classList.remove('panel-abierto');
  const av = document.getElementById('avisoLecturaMesa');
  if (av) { av.classList.toggle('oculto', !SOLO_LECTURA_MESA_); av.textContent = 'Este curso está cerrado: la mesa solo se puede mirar.'; }
}

let MESA_SHELL_LISTA_ = false;
function pintarMesaShell_() {
  if (MESA_SHELL_LISTA_) return;
  MESA_SHELL_LISTA_ = true;
  document.getElementById('tab-mesa').innerHTML =
    '<div class="niveles-mesa" id="nivelesMesa"></div>' +
    '<div id="avisoLecturaMesa" class="aviso oculto"></div>' +
    '<div class="tarjeta">' +
      '<div class="fila-botones" style="align-items:center;margin-top:0">' +
        '<select id="selModeloMesa"></select>' +
        '<button id="btnNuevoModeloMesa" onclick="crearModelo()">Nuevo modelo</button>' +
        '<button id="btnRenombrarMesa" onclick="renombrarModelo()">Renombrar</button>' +
        '<button id="btnBorrarMesa" onclick="borrarModelo()">Borrar</button>' +
        '<button id="btnDefinitivo" onclick="marcarDefinitivo()">Marcar como definitivo</button>' +
        '<button id="btnPanelMesa" onclick="alternarPanelLateral()">Reglas y reparto</button>' +
        '<span class="tambien-modelo oculto" id="tambienEnModelo" role="status"></span>' +
      '</div>' +
      '<div class="subpestanas" id="subpestanasMesa">' +
        '<span id="subMesaMesa" onclick="cambiarPestana(\'mesa\')">Mesa</span>' +
        '<span id="subMesaBloques" onclick="cambiarPestana(\'bloques\')">Bloques</span>' +
      '</div>' +
    '</div>' +
    '<div id="cajasMesa"></div>' +
    '<div id="avisoSeleccionMesa" class="aviso oculto"></div>' +
    '<label style="font-size:12px;display:inline-block;margin-bottom:8px">' +
      '<input type="checkbox" id="ckSoloSinPreferencias" onchange="alternarFiltroPreferencias(this.checked)">' +
      '<span id="rotuloSinElegir"> Solo alumnos sin preferencias de optativa</span> <span id="cuentaSinElegir"></span></label>' +
    '<section id="vistaMesaColumnas">' +
      '<table class="equilibrio" id="tablaEquilibrio"></table>' +
      '<div class="columnas" id="columnasMesa"></div>' +
    '</section>' +
    '<section id="vistaBloquesMesa" class="oculto"></section>' +
    '<aside id="panelLateralMesa" class="panel-lateral">' +
      '<h3>Seleccionar alumnos</h3>' +
      '<button id="btnModoSeleccion" onclick="alternarModoSeleccion()">Empezar a seleccionar</button>' +
      '<h4>Reglas de Jefatura</h4>' +
      '<div id="listaReglas"></div>' +
      '<h4>Criterios del reparto, por orden de prioridad</h4>' +
      '<p class="crit-ayuda">El de arriba pesa más. Los bloques y las reglas de Jefatura se cumplen siempre.</p>' +
      '<ol id="listaCriterios" class="lista-criterios"></ol>' +
      '<select id="selAnadirCriterio" class="crit-anadir"></select>' +
      '<button class="principal" onclick="proponerReparto()">Proponer reparto</button>' +
      '<p class="crit-ayuda">Los cambios se aplican al pulsar “Proponer reparto”.</p>' +
      '<h4>Comparar modelos</h4>' +
      '<div class="fila-comparar"><select id="selCompararA"></select><select id="selCompararB"></select></div>' +
      '<button onclick="compararModelos()">Comparar</button>' +
      '<div id="resultadoComparar"></div>' +
    '</aside>' +
    '<div id="fichaMesaFondo" class="modal-fondo oculto" onclick="if (event.target === this) cerrarFichaMesa_();"></div>' +
    '<div id="dialogoMesaFondo" class="modal-fondo oculto"></div>';
  pintarCriterios();
}

async function cargarCurso(nivel, idModelo) {
  flushGuardadoPendiente_();   // no perder el último arrastre del modelo que se deja (instrucción 13)
  NIVEL = nivel; NIVEL_RECORDADO_[CURSO_ESCOLAR] = nivel;
  pintarNivelesMesa_();
  document.getElementById('cargando').classList.remove('oculto');
  document.getElementById('vistaMesaColumnas').classList.add('oculto');
  document.getElementById('vistaBloquesMesa').classList.add('oculto');
  limpiarAviso();
  try {
    const r = await llamar('mesaObtenerCurso', CURSO_ESCOLAR, nivel, idModelo || null);
    DATA = r;
    ALUMNOS_POR_CLAVE = {};
    DATA.alumnos.forEach(function (a) { ALUMNOS_POR_CLAVE[a.clave] = a; });
    PREFERENCIAS = DATA.preferencias || {};
    SOLO_SIN_PREFERENCIAS = false;
    ASIGNACIONES = Object.assign({}, DATA.modelo.asignaciones);
    VERSION = DATA.modelo.version;
    MODELO_ID = DATA.modelo.id;
    CRITERIOS = criteriosNormalizar_(DATA.modelo.criterios);   // instrucción 48: un modelo antiguo se convierte al vuelo, sin reescribirlo
    mesaFijarBase_();   // instrucción 67: lo que tiene el servidor, para guardar solo lo que cambie
    SELECCION = [];
    MODO_SELECCION = false;
    pintarSelectorModelos();
    pintarCriterios();
    aplicarModoLecturaMesa_();
    pintarPestana();
    pintarPanelReglas();
    guardarEnCacheMesa_();
    if (typeof pulsoPantallaCambia_ === 'function') pulsoPantallaCambia_();   // instrucción 67: dónde está esta persona (el nivel y el modelo) se dice enseguida
  } catch (e) {
    avisar(mensajeDeError(e), 'error');
  }
  document.getElementById('cargando').classList.add('oculto');
}

function pintarSelectorModelos() {
  const sel = document.getElementById('selModeloMesa');
  const opciones = DATA.modelos.map(function (m) {
    return '<option value="' + m.id + '"' + (m.id === MODELO_ID ? ' selected' : '') + '>' +
      escapaHtml(m.nombre) + (m.definitivo ? ' (definitivo)' : '') + '</option>';
  }).join('');
  sel.innerHTML = opciones;
  sel.onchange = function () { cargarCurso(NIVEL, sel.value); if (typeof pulsoPantallaCambia_ === 'function') pulsoPantallaCambia_(); };

  const selA = document.getElementById('selCompararA'), selB = document.getElementById('selCompararB');
  selA.innerHTML = opciones;
  selB.innerHTML = opciones;
  selA.value = MODELO_ID;
  // La B, por comodidad, en el segundo modelo si lo hay.
  if (DATA.modelos.length > 1) {
    selB.value = DATA.modelos.find(function (m) { return m.id !== MODELO_ID; }).id;
  } else {
    selB.value = MODELO_ID;
  }

  const esDefinitivo = (DATA.modelos.find(function (m) { return m.id === MODELO_ID; }) || {}).definitivo;
  const btn = document.getElementById('btnDefinitivo');
  btn.setAttribute('data-dato', datoLimpio_('mesa|' + MODELO_ID + '|definitivo'));   // instrucción 67: se resalta cuando otra persona lo marca
  btn.textContent = esDefinitivo ? 'Es el definitivo ✓' : 'Marcar como definitivo';
  btn.disabled = !!esDefinitivo;
}

async function marcarDefinitivo() {
  if (!(await mesaConfirmarSiHayOtros_())) return;   // instrucción 67: hay otra persona en este modelo
  if (!confirm('¿Marcar "' + (DATA.modelos.find(function (m) { return m.id === MODELO_ID; }) || {}).nombre +
    '" como el modelo definitivo de ' + nombreGrado_(NIVEL) + ' (curso ' + CURSO_ESCOLAR + ')?\n\nSolo puede haber uno por nivel; se desmarca el que hubiera.')) return;
  try {
    await llamar('mesaMarcarDefinitivo', CURSO_ESCOLAR, NIVEL, MODELO_ID);
    await cargarCurso(NIVEL, MODELO_ID);
    avisar('Modelo definitivo marcado.', 'aviso');
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}

function alternarPanelLateral() {
  document.body.classList.toggle('panel-abierto');
}

function cambiarPestana(cual) {
  VISTA_MESA = cual;
  document.getElementById('subMesaMesa').classList.toggle('activa', cual === 'mesa');
  document.getElementById('subMesaBloques').classList.toggle('activa', cual === 'bloques');
  pintarPestana();
}
function pintarPestana() {
  document.getElementById('vistaMesaColumnas').classList.toggle('oculto', VISTA_MESA !== 'mesa');
  document.getElementById('vistaBloquesMesa').classList.toggle('oculto', VISTA_MESA !== 'bloques');
  if (VISTA_MESA === 'mesa') { pintarEquilibrio(); pintarColumnas(); }
  else pintarBloques();
}

/* ==================== MODELOS ==================== */
async function crearModelo() {
  const nombre = prompt('Nombre del nuevo modelo:');
  if (!nombre) return;
  const enPrep = DATA.estadoCurso === 'preparacion';
  const opciones = [{ clave: 'vacio', etiqueta: 'Modelo vacío' }];
  if (enPrep) opciones.unshift({ clave: 'mismo-grupo', etiqueta: 'Mismo grupo que este curso (recomendado)' });
  else opciones.unshift({ clave: 'seneca', etiqueta: 'Grupos actuales de Séneca (recomendado)' });
  opciones.push({ clave: 'copiar', etiqueta: 'Copiar el modelo abierto' }, { clave: 'cancelar', etiqueta: 'Cancelar' });
  const origen = await preguntarOpciones('Nuevo modelo «' + nombre + '»', enPrep
    ? 'Quien pasa de curso va al grupo con la misma letra que tiene hoy, si ese grupo existe; quien repite y quien llega de fuera se quedan en «Sin grupo».'
    : 'Elige con qué reparto empieza.', opciones);
  if (!origen || origen === 'cancelar') return;
  try {
    const nuevo = await llamar('mesaCrearModelo', CURSO_ESCOLAR, NIVEL, nombre, origen, origen === 'copiar' ? MODELO_ID : null);
    await cargarCurso(NIVEL, nuevo.id);
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}
async function renombrarModelo() {
  const actual = DATA.modelos.find(function (m) { return m.id === MODELO_ID; });
  const nombre = prompt('Nuevo nombre del modelo:', actual ? actual.nombre : '');
  if (!nombre) return;
  try { await llamar('mesaRenombrarModelo', CURSO_ESCOLAR, MODELO_ID, nombre); await cargarCurso(NIVEL, MODELO_ID); }
  catch (e) { avisar(mensajeDeError(e), 'error'); }
}
async function borrarModelo() {
  if (DATA.modelos.length <= 1) { avisar('Es el único modelo del curso: no se puede borrar.', 'error'); return; }
  if (!(await mesaConfirmarSiHayOtros_())) return;   // instrucción 67: hay otra persona en este modelo
  if (!confirm('¿Borrar este modelo? No se puede deshacer.')) return;
  try { await llamar('mesaBorrarModelo', CURSO_ESCOLAR, MODELO_ID); await cargarCurso(NIVEL); }
  catch (e) { avisar(mensajeDeError(e), 'error'); }
}
