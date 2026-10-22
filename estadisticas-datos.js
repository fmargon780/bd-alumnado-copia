/* Generado de JsEstadisticasDatos.html por web/construir-estadisticas.mjs: no se toca a mano. */
EST_.conjunto = 'alumnado'; EST_.cursos = []; EST_.cargados = {}; EST_.materias = {}; EST_.otros = {}; EST_.claveP = ''; EST_.errorCarga = '';

function estadSelloActual_() { return (typeof PULSO_ !== 'undefined' && PULSO_.sello) || ''; }

/* Se llama desde cargarDatosPestana: pide los datos la primera vez (o si ha cambiado el curso o el sello) y pinta. */
function cargarEstadisticas() {
  estadConstruirPantalla_();
  if (!CURSO_VISTO) return;
  estadAjustarAlto_();
  var curso = CURSO_VISTO, sello = estadSelloActual_();
  if (EST_.datos && EST_.curso === curso && EST_.sello === sello) { estadAplicarConsultasFrescas_(); estadAsegurarYPintar_(); return; }
  if (EST_.cargando && EST_.cursoPedido === curso) return;
  EST_.cargando = true; EST_.cursoPedido = curso; EST_.error = ''; EST_.errorCarga = '';
  estadPintarTodo_();
  llamarAlServidor_('webEstadisticasDatos', [curso], { sinBoton: true }).then(function (r) {
    EST_.cargando = false;
    if (curso !== CURSO_VISTO) return;
    EST_.datos = r; EST_.curso = curso; EST_.sello = sello; EST_.consultas = (r && r.consultas) || []; EST_.cursos = (r && r.cursos) || [];
    estadMarcarCurso_(r, curso);
    EST_.cargados = {}; EST_.cargados[curso] = r; EST_.materias = {}; EST_.otros = {}; EST_.claveP = '';
    delete MEMORIA_[EST_MEMORIA_CONSULTAS_ + JSON.stringify([curso])];
    if (!EST_.def) { var c = EST_.consultas[0]; estadAbrirConsulta_(c ? c.id : ''); }
    estadAsegurarYPintar_(true);
  }).catch(function (e) {
    EST_.cargando = false; EST_.error = mensajeDeError(e);
    if (curso === CURSO_VISTO) estadPintarTodo_();
  });
}

/* Cada alumno sabe de qué curso es (los del historial y los de las materias traen el suyo). */
function estadMarcarCurso_(datos, curso) { (datos.alumnos || []).forEach(function (a) { if (a.c === undefined) a.c = curso; }); }   // (estadDatosDeCursos también lo hace)

/* Otra persona ha guardado o borrado una consulta (JsCambios.html la trae a MEMORIA_): el desplegable se pone al día solo. */
function estadAplicarConsultasFrescas_() {
  var m = MEMORIA_[EST_MEMORIA_CONSULTAS_ + JSON.stringify([CURSO_VISTO])];
  if (m && m.consultas) { EST_.consultas = m.consultas; delete MEMORIA_[EST_MEMORIA_CONSULTAS_ + JSON.stringify([CURSO_VISTO])]; }
}

function estadConsulta_(id) { return EST_.consultas.filter(function (c) { return c.id === id; })[0] || null; }

/* Los valores con «@» de una consulta de partida se resuelven aquí: @cuaderno = los cursos con cuaderno, @ultimos5 = los cinco últimos cursos que hay. (@ultimoConNotas lo resuelve el cálculo.) */
function estadResolver_(def) {
  var f = def.filtros && def.filtros.cursoEscolar;
  if (!f) return def;
  var nombres = EST_.cursos.map(function (c) { return c.curso; }), salida = [];
  f.forEach(function (v) {
    if (v === '@cuaderno') EST_.cursos.forEach(function (c) { if (c.tipo === 'cuaderno') salida.push(c.curso); });
    else if (v === '@ultimos5') nombres.slice(-5).forEach(function (c) { salida.push(c); });
    else salida.push(v);
  });
  def.filtros.cursoEscolar = salida.filter(function (c, i) { return salida.indexOf(c) === i; });
  return def;
}

/* Abre una consulta: la definición pasa a ser la de trabajo (los datos que faltan llegan en `estadAsegurarYPintar_`). */
function estadAbrirConsulta_(id) {
  var c = estadConsulta_(id);
  EST_.idConsulta = c ? c.id : '';
  if (!c) return;
  EST_.def = estadResolver_(JSON.parse(JSON.stringify(c.definicion)));
  EST_.conjunto = EST_.def.conjunto;
  EST_.res = null; EST_.limpiarAlAbrir = true;
}

function estadAvisarQuitados_(quitados) {
  var el = document.getElementById('estAvisos');
  if (!el) return;
  el.innerHTML = quitados.length ? '<div class="aviso">Esta consulta usaba datos que ya no existen y se ha abierto sin ellos.</div>' : '';
}

/* Los cursos cuyos datos hacen falta: en «Alumnos», los del filtro «Curso escolar» (o, sin filtro, el de arriba). */
function estadEsOtro_(conjunto) { return conjunto === 'solicitudes' || conjunto === 'esperados' || conjunto === 'transito'; }

function estadCursosNecesarios_() {
  if (EST_.def.conjunto === 'materias') return [CURSO_VISTO];
  var f = (EST_.def.filtros && EST_.def.filtros.cursoEscolar) || [];
  var otro = estadEsOtro_(EST_.def.conjunto);   // admisión, esperados y tránsito solo existen en los cursos con cuaderno
  var hay = f.filter(function (c) { return EST_.cursos.some(function (x) { return x.curso === c && (!otro || x.tipo === 'cuaderno'); }); });
  return hay.length ? hay : [CURSO_VISTO];
}

function estadFaltan_() {
  if (EST_.def.conjunto === 'materias') return EST_.materias[CURSO_VISTO] ? [] : ['materias'];
  if (estadEsOtro_(EST_.def.conjunto)) { var o = EST_.otros[EST_.def.conjunto] || {}; return estadCursosNecesarios_().filter(function (c) { return !o[c]; }); }
  return estadCursosNecesarios_().filter(function (c) { return !EST_.cargados[c]; });
}

function estadPedir_(fn, args) { return llamarAlServidor_(fn, args, { sinBoton: true }); }

/* Trae, uno por uno, los datos que faltan. */
function estadTraerFaltantes_() {
  var faltan = estadFaltan_();
  if (!faltan.length) return Promise.resolve();
  var uno = faltan[0];
  var conj = EST_.def.conjunto, otro = estadEsOtro_(conj);
  EST_.trayendo = uno === 'materias' ? 'las materias' : (otro ? 'los datos del curso ' + uno : 'el curso ' + uno);
  estadPintarTodo_();   // dice qué está llegando
  var p = uno === 'materias'
    ? estadPedir_('webEstadisticasMaterias', [CURSO_VISTO]).then(function (r) { EST_.materias[CURSO_VISTO] = r; })
    : (otro
      ? estadPedir_('webEstadisticasConjunto', [conj, uno]).then(function (r) { estadMarcarCurso_(r, uno); (EST_.otros[conj] = EST_.otros[conj] || {})[uno] = r; })
      : estadPedir_('webEstadisticasCurso', [uno]).then(function (r) { estadMarcarCurso_(r, uno); EST_.cargados[uno] = r; }));
  return p.then(estadTraerFaltantes_);
}

/* Datos preparados para la función de cálculo, de lo que ya ha llegado. */
function estadReconstruirP_() {
  var clave, datos;
  if (EST_.def.conjunto === 'materias') {
    var m = EST_.materias[CURSO_VISTO];
    if (!m) return;
    clave = 'materias|' + CURSO_VISTO;
    if (EST_.claveP === clave) return;
    datos = estadDatosDeMaterias(m);
  } else if (estadEsOtro_(EST_.def.conjunto)) {
    var conj = EST_.def.conjunto, o = EST_.otros[conj] || {}, cursosO = estadCursosNecesarios_().filter(function (c) { return o[c]; });
    clave = conj + '|' + cursosO.join(',');
    if (EST_.claveP === clave) return;
    if (!cursosO.length) return;
    datos = estadDatosDeCursos(o[cursosO[0]].catalogo, o, cursosO, conj);
    EST_.vacio = o[cursosO[0]].vacio || '';
  } else {
    var cursos = estadCursosNecesarios_().filter(function (c) { return EST_.cargados[c]; });
    clave = 'alumnado|' + cursos.join(',');
    if (EST_.claveP === clave) return;
    datos = estadDatosDeCursos(EST_.datos.catalogo, EST_.cargados, cursos);
  }
  EST_.P = estadPreparar(datos);
  EST_.claveP = clave;
}

/* Pide lo que falte (diciéndolo mientras llega), prepara los datos, limpia la definición y pinta. */
function estadAsegurarYPintar_(alAbrir) {
  if (!EST_.datos || !EST_.def) return;
  EST_.errorCarga = ''; EST_.trayendo = '';
  var seguir = function () {
    estadReconstruirP_();
    var l = estadLimpiarDefinicion(EST_.P, EST_.def);
    EST_.def = l.def;
    if (EST_.limpiarAlAbrir || alAbrir) { estadAvisarQuitados_(l.quitados); EST_.limpiarAlAbrir = false; }
    EST_.res = null; EST_.trayendo = '';
    estadPintarTodo_();
  };
  if (!estadFaltan_().length) { seguir(); return; }
  EST_.cargando = true; estadPintarTodo_();
  var def = EST_.def;
  estadTraerFaltantes_().then(function () { EST_.cargando = false; seguir(); }).catch(function (e) {
    EST_.cargando = false; EST_.errorCarga = mensajeDeError(e);   // `trayendo` se queda: dice qué no ha llegado
    estadPintarTodo_();
  });
}

/* «Qué se cuenta»: una tabla nueva del otro conjunto. */
function estadCambiaConjunto_(conjunto) {
  var d = estadDefLimpia_();
  d.conjunto = conjunto;
  d.calculos = [{ tipo: 'alumnos', dato: '', valor: '', etiqueta: '' }];
  EST_.def = d; EST_.conjunto = conjunto; EST_.idConsulta = ''; EST_.res = null;
  estadCerrarLista_();
  estadAsegurarYPintar_();
}

function estadEsModificada_() {
  var c = estadConsulta_(EST_.idConsulta);
  if (!c || !EST_.P || c.definicion.conjunto !== EST_.def.conjunto) return true;
  return JSON.stringify(estadLimpiarDefinicion(EST_.P, estadResolver_(JSON.parse(JSON.stringify(c.definicion)))).def) !== JSON.stringify(EST_.def);
}

function estadTituloConsulta_() {
  var c = estadConsulta_(EST_.idConsulta);
  return c && !estadEsModificada_() ? c.nombre : 'Estadística sin guardar';
}
