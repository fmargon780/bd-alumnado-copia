/* Generado de JsMesaOperaciones.html por web/construir-mesa.mjs: no se toca a mano. */
var BASE_ = null;                       // { asignaciones, reglas, criterios }: lo último que se sabe que guarda el servidor del modelo abierto
var MESA_REEMPLAZO_TOTAL_ = false;      // «Proponer reparto»: se sustituyen todas las asignaciones
var MESA_ARRASTRANDO_ = false;          // una tarjeta en el aire: no se mueve nada debajo
var MESA_REPINTAR_PENDIENTE_ = false;
var MESA_CAMBIOS_PENDIENTES_ = [];      // cambios de otras personas que llegaron durante un arrastre
var MESA_REINTENTOS_ = 0;
var MESA_FRESCO_EN_VUELO_ = false;
var MESA_TIPOS_REGLA_ = ['fijar', 'juntar', 'separar'];

function mesaClon_(x) { return JSON.parse(JSON.stringify(x === undefined ? null : x)); }

/* La clave de un alumno en un modelo, la misma que apunta el servidor (MesaOperaciones.gs) y que la 66 limpia igual que él. */
function datoMesaAlumno_(clave) { return datoLimpio_('mesa|' + MODELO_ID + '|a|' + clave); }

function mesaFijarBase_() {
  BASE_ = { asignaciones: mesaClon_(ASIGNACIONES), reglas: mesaClon_(reglasActuales()), criterios: mesaClon_(CRITERIOS) };
}

function mesaIgualRegla_(a, b) {
  var norm = function (x) { return Array.isArray(x) ? JSON.stringify(x.slice().sort()) : JSON.stringify(x); };
  return norm(a) === norm(b);
}

/* Sin grupo ni optativa es lo mismo que no estar: no se guarda como cambio (si no, un arrastre pisaría con vacíos lo que otro acaba de poner). */
function mesaAsignVacia_(v) { return !v || !Object.keys(v).some(function (k) { return v[k]; }); }

/* Las operaciones que faltan por guardar: lo de ahora contra `BASE_`, en orden (asignaciones, reglas, criterios). */
function mesaOperaciones_() {
  if (!BASE_) return [];
  var ops = [], vivo = ASIGNACIONES, base = BASE_.asignaciones;
  if (MESA_REEMPLAZO_TOTAL_) ops.push({ t: 'todas', v: mesaClon_(vivo) });
  else {
    Object.keys(vivo).forEach(function (k) {
      if (JSON.stringify(vivo[k]) === JSON.stringify(base[k])) return;
      var op = { t: 'a', c: k, v: mesaClon_(vivo[k]) };
      if (base[k] === undefined && mesaAsignVacia_(vivo[k])) op.visto = true;   // solo «visto en Sin grupo»: si otra persona ya lo ha colocado, no se lo pisa
      ops.push(op);
    });
    Object.keys(base).forEach(function (k) { if (!(k in vivo)) ops.push({ t: 'q', c: k }); });
  }
  var r = reglasActuales(), br = BASE_.reglas;
  MESA_TIPOS_REGLA_.forEach(function (k) {
    (r[k] || []).forEach(function (v) { if (!(br[k] || []).some(function (b) { return mesaIgualRegla_(b, v); })) ops.push({ t: 'r+', k: k, v: mesaClon_(v) }); });
    (br[k] || []).forEach(function (v) { if (!(r[k] || []).some(function (b) { return mesaIgualRegla_(b, v); })) ops.push({ t: 'r-', k: k, v: mesaClon_(v) }); });
  });
  if (JSON.stringify(CRITERIOS) !== JSON.stringify(BASE_.criterios)) ops.push({ t: 'cr', v: mesaClon_(CRITERIOS) });
  return ops;
}

/* Lo mismo que hace el servidor con esas operaciones, sobre `BASE_`: así se sabe qué tiene el servidor sin pedírselo. */
function mesaAplicarABase_(base, ops) {
  ops.forEach(function (op) {
    if (op.t === 'a') base.asignaciones[op.c] = mesaClon_(op.v);
    else if (op.t === 'q') delete base.asignaciones[op.c];
    else if (op.t === 'todas') base.asignaciones = mesaClon_(op.v);
    else if (op.t === 'cr') base.criterios = mesaClon_(op.v);
    else if (op.t === 'r+') { var l = base.reglas[op.k] = base.reglas[op.k] || []; if (!l.some(function (x) { return mesaIgualRegla_(x, op.v); })) l.push(mesaClon_(op.v)); }
    else if (op.t === 'r-') base.reglas[op.k] = (base.reglas[op.k] || []).filter(function (x) { return !mesaIgualRegla_(x, op.v); });
  });
}

/* ==================== GUARDAR ==================== */
/* GUARDAR EN PAQUETES, NO A CADA ARRASTRE (instrucción 13): 900 ms desde el último cambio. `flushGuardadoPendiente_` lo adelanta (cambiar de modelo o de nivel, salir de la mesa). */
let TEMPORIZADOR_GUARDADO_ = null;
function guardarModeloConRetraso_() {
  if (TEMPORIZADOR_GUARDADO_) clearTimeout(TEMPORIZADOR_GUARDADO_);
  TEMPORIZADOR_GUARDADO_ = setTimeout(function () { TEMPORIZADOR_GUARDADO_ = null; guardarModeloTrasCambio(); }, 900);
}
function flushGuardadoPendiente_() {
  if (!TEMPORIZADOR_GUARDADO_) return;
  clearTimeout(TEMPORIZADOR_GUARDADO_);
  TEMPORIZADOR_GUARDADO_ = null;
  guardarModeloTrasCambio();
}
window.addEventListener('beforeunload', flushGuardadoPendiente_);

/* Si llega un cambio mientras se guarda el anterior, NO se descarta: se guarda en cuanto termine (docs/HISTORIA.md, 27-sep-2026). */
let GUARDANDO = false;
let GUARDADO_PENDIENTE = false;
async function guardarModeloTrasCambio() {
  if (GUARDANDO) { GUARDADO_PENDIENTE = true; return; }
  GUARDANDO = true;
  do {
    GUARDADO_PENDIENTE = false;
    /* Instrucción 61: se puede cambiar de nivel mientras se guarda: la respuesta es del modelo que se guardó, no del que haya abierto ahora. */
    const idModelo = MODELO_ID, cursoEscolar = CURSO_ESCOLAR, nivel = NIVEL, version = VERSION;
    try {
      mesaRegistrarVistos_();
      const ops = mesaOperaciones_();
      if (!ops.length) break;
      const total = MESA_REEMPLAZO_TOTAL_;
      const r = await llamar('mesaGuardarOperaciones', cursoEscolar, nivel, idModelo, ops, version);
      MESA_REINTENTOS_ = 0;
      if (total) MESA_REEMPLAZO_TOTAL_ = false;
      const enCache = MESA_CACHE_[cursoEscolar + '|' + nivel];
      if (!r.ok) {   // el modelo se ha borrado mientras tanto
        if (MODELO_ID === idModelo && NIVEL === nivel) { GUARDADO_PENDIENTE = false; await mesaModeloBorrado_(null, ops.length); }
        else if (enCache) delete MESA_CACHE_[cursoEscolar + '|' + nivel];
        break;
      }
      if (MODELO_ID === idModelo && NIVEL === nivel) {
        VERSION = r.version;
        mesaAplicarABase_(BASE_, ops);
        if (r.modelo) mesaMezclarConServidor_(r.modelo, []);
        if (r.saltadas && r.saltadas.length) mesaDeshacerSaltadas_(r.saltadas);
        else avisar('Guardado.', 'aviso');
      } else if (enCache && enCache.MODELO_ID === idModelo) {
        enCache.VERSION = r.version;
        if (enCache.BASE) mesaAplicarABase_(enCache.BASE, ops);
      }
    } catch (e) {
      avisar(mensajeDeError(e), 'error');
      /* Nada se ha perdido: BASE_ sigue siendo lo último que se sabe y las operaciones se vuelven a calcular. Se reintenta en unos segundos. */
      if (MESA_REINTENTOS_++ < 5) setTimeout(function () { guardarModeloConRetraso_(); }, 3000);
      break;
    }
  } while (GUARDADO_PENDIENTE);
  GUARDANDO = false;
}

/* Una operación que el servidor ha saltado (el alumno ya no es del nivel, el grupo ya no existe): se deshace aquí y se dice. */
function mesaDeshacerSaltadas_(saltadas) {
  saltadas.forEach(function (s) {
    if (!s.c) return;
    if (BASE_.asignaciones[s.c] === undefined) delete ASIGNACIONES[s.c]; else ASIGNACIONES[s.c] = mesaClon_(BASE_.asignaciones[s.c]);
  });
  avisar(saltadas.length + (saltadas.length === 1 ? ' cambio no se ha guardado' : ' cambios no se han guardado') + ': ' + saltadas[0].motivo + '.', 'error');
  mesaRepintar_();
}

/* ==================== MEZCLAR LO QUE HA CAMBIADO OTRA PERSONA ==================== */
/* Mezcla en tres vías: `BASE_` (lo que sabíamos), `srv` (lo que hay ahora) y lo de esta pantalla. Devuelve las claves de alumnos que otra persona ha movido y aquí se han puesto. */
function mesaMezclarConServidor_(srv, cambios) {
  var base = BASE_.asignaciones, vivo = ASIGNACIONES, movidos = [];
  var claves = {};
  [base, srv.asignaciones, vivo].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { claves[k] = true; }); });
  Object.keys(claves).forEach(function (k) {
    var norm = function (v) { return mesaAsignVacia_(v) ? '' : JSON.stringify(v); };   // «sin grupo» y «no está» son lo mismo
    var sb = norm(base[k]), ss = norm((srv.asignaciones || {})[k]);
    if (sb === ss) return;                          // nadie ha cambiado esto
    if (norm(vivo[k]) !== sb) return;     // aquí hay algo sin guardar: vale lo nuestro (se enviará y será lo último)
    if ((srv.asignaciones || {})[k] === undefined) delete vivo[k]; else vivo[k] = mesaClon_(srv.asignaciones[k]);
    movidos.push(k);
  });
  var reglas = reglasActuales(), reglasBase = BASE_.reglas;
  MESA_TIPOS_REGLA_.forEach(function (k) {
    var delSrv = (srv.reglas || {})[k] || [];
    delSrv.forEach(function (v) {   // una regla nueva de otra persona, que aquí no hemos quitado
      if ((reglasBase[k] || []).some(function (b) { return mesaIgualRegla_(b, v); }) || (reglas[k] || []).some(function (b) { return mesaIgualRegla_(b, v); })) return;
      (reglas[k] = reglas[k] || []).push(mesaClon_(v));
    });
    (reglasBase[k] || []).forEach(function (v) {   // una regla que otra persona ha quitado y aquí seguimos igual
      if (delSrv.some(function (b) { return mesaIgualRegla_(b, v); })) return;
      reglas[k] = (reglas[k] || []).filter(function (b) { return !mesaIgualRegla_(b, v); });
    });
  });
  var critSrv = criteriosNormalizar_(srv.criterios);
  if (JSON.stringify(critSrv) !== JSON.stringify(BASE_.criterios) && JSON.stringify(CRITERIOS) === JSON.stringify(BASE_.criterios)) CRITERIOS = critSrv;
  BASE_ = { asignaciones: mesaClon_(srv.asignaciones || {}), reglas: mesaClon_(srv.reglas || { fijar: [], juntar: [], separar: [] }), criterios: critSrv };
  if (DATA && DATA.modelo) { DATA.modelo.asignaciones = mesaClon_(srv.asignaciones || {}); DATA.modelo.definitivo = !!srv.definitivo; }
  return movidos;
}

/* Repinta lo de la mesa (nunca mientras se arrastra: se hace al soltar). */
function mesaRepintar_() {
  if (MESA_ARRASTRANDO_) { MESA_REPINTAR_PENDIENTE_ = true; return; }
  MESA_REPINTAR_PENDIENTE_ = false;
  if (!DATA) return;
  pintarSelectorModelos();
  pintarEquilibrio(); pintarColumnas(); pintarPanelReglas(); pintarCriterios();
  mesaPintarTambien_();
}

function mesaAlSoltarTarjeta_() {
  MESA_ARRASTRANDO_ = false;
  var pendientes = MESA_CAMBIOS_PENDIENTES_;
  MESA_CAMBIOS_PENDIENTES_ = [];
  if (pendientes.length) mesaAlLlegarCambios_(pendientes);
  else if (MESA_REPINTAR_PENDIENTE_) mesaRepintar_();
}

/* ==================== LO QUE HACEN LAS DEMÁS PERSONAS (enganche con la 66) ==================== */
/* `lista`: cambios de otras personas (JsCambios.html). Solo importan los de la mesa, de este curso escolar y de lo que está abierto; con otra pantalla puesta, solo se olvida lo recordado para que la mesa
   pida lo suyo fresco al volver. */
function mesaEsDeLaMesaAbierta_(e) {
  var d = String(e.d || '');
  if (d.indexOf('mesa|') !== 0) return false;
  if (d.indexOf('mesa|' + datoLimpio_(MODELO_ID) + '|') === 0) return true;
  if (d.indexOf('mesa|bloques|' + NIVEL) === 0 || d.indexOf('mesa|grupos|' + NIVEL) === 0) return true;
  if (/^mesa\|(marca|pref)\|/.test(d)) return true;
  return false;
}

function mesaAlLlegarCambios_(lista) {
  var delCurso = lista.filter(function (e) { return e.t === 'mesa' && (!e.u || e.u === CURSO_ESCOLAR); });
  if (!delCurso.length) return;
  if (PESTANA_ACTUAL !== 'mesa' || !DATA) { MESA_CACHE_ = {}; DATA = null; NIVEL = null; return; }   // al volver, lo suyo fresco
  var rel = delCurso.filter(mesaEsDeLaMesaAbierta_);
  if (!rel.length) {   // otro modelo u otro nivel: no se pinta nada (sale en «Últimos cambios»); lo recordado de esos niveles ya no vale
    Object.keys(MESA_CACHE_).forEach(function (k) { if (k !== CURSO_ESCOLAR + '|' + NIVEL) delete MESA_CACHE_[k]; });
    return;
  }
  if (MESA_ARRASTRANDO_) { MESA_CAMBIOS_PENDIENTES_ = MESA_CAMBIOS_PENDIENTES_.concat(lista); return; }
  mesaTraerFresco_(rel);
}

async function mesaTraerFresco_(rel) {
  if (MESA_FRESCO_EN_VUELO_) { MESA_CAMBIOS_PENDIENTES_ = MESA_CAMBIOS_PENDIENTES_.concat(rel); return; }
  MESA_FRESCO_EN_VUELO_ = true;
  var ce = CURSO_ESCOLAR, nivel = NIVEL, id = MODELO_ID, r = null;
  try { r = await llamarAlServidor_('mesaObtenerCurso', [ce, nivel, id], { sinBoton: true, sinTiempos: true }); } catch (e) { r = null; }
  MESA_FRESCO_EN_VUELO_ = false;
  if (!r || ce !== CURSO_ESCOLAR || nivel !== NIVEL || id !== MODELO_ID || !DATA) return;   // se ha cambiado de nivel o de modelo: lo suyo se pide al entrar
  if (!r.modelo || r.modelo.id !== id) { await mesaModeloBorrado_(rel, mesaOperaciones_().length); return; }
  var movidos = mesaMezclarConServidor_(r.modelo, rel);
  DATA.modelos = r.modelos; DATA.grupos = r.grupos; DATA.alumnos = r.alumnos; DATA.bloques = r.bloques; DATA.bajas = r.bajas || []; DATA.fuera = r.fuera || [];
  DATA.preferencias = r.preferencias || {}; PREFERENCIAS = DATA.preferencias;
  ALUMNOS_POR_CLAVE = {};
  DATA.alumnos.forEach(function (a) { ALUMNOS_POR_CLAVE[a.clave] = a; });
  VERSION = r.modelo.version;
  DATA.modelo.nombre = r.modelo.nombre;
  mesaRepintar_();
  mesaAvisosDeModelo_(rel);
  guardarEnCacheMesa_();
  if (MESA_CAMBIOS_PENDIENTES_.length) { var p = MESA_CAMBIOS_PENDIENTES_; MESA_CAMBIOS_PENDIENTES_ = []; mesaAlLlegarCambios_(p); }
  if (GUARDADO_PENDIENTE || mesaOperaciones_().length) guardarModeloConRetraso_();   // lo nuestro sin guardar sigue su camino
}

/* Lo que se dice cuando otra persona cambia el modelo entero (punto 3.4): una caja que no se va hasta «Entendido». */
function mesaAvisosDeModelo_(rel) {
  rel.forEach(function (e) {
    if (/\|todas$/.test(e.d)) cambiosAvisoLibre_(e.q + ' ha vuelto a repartir este modelo.', 'repartir-' + e.n);
    else if (/\|definitivo$/.test(e.d)) { /* la marca cambia sola (se pinta en el selector), con «<Nombre>, ahora» */ }
  });
}

/* Otra persona ha borrado el modelo que se tenía abierto: se pasa a la lista de modelos del nivel y se dice cuántos cambios sin guardar se pierden. */
async function mesaModeloBorrado_(rel, perdidos) {
  var quien = (rel || []).filter(function (e) { return e.s === 'borrado'; }).map(function (e) { return e.q; })[0];
  var texto = (quien ? quien + ' ha borrado este modelo' : 'Este modelo se ha borrado') + '.' +
    (perdidos ? (perdidos === 1 ? ' Se pierde 1 cambio tuyo que no estaba guardado.' : ' Se pierden ' + perdidos + ' cambios tuyos que no estaban guardados.') : '');
  MESA_CACHE_ = {};
  BASE_ = null;
  TEMPORIZADOR_GUARDADO_ && clearTimeout(TEMPORIZADOR_GUARDADO_); TEMPORIZADOR_GUARDADO_ = null;
  await cargarCurso(NIVEL);
  cambiosAvisoLibre_(texto, 'borrado-' + Date.now());
}

/* ==================== QUIÉN MÁS ESTÁ EN ESTE MODELO ==================== */
function mesaDondeExtra_() {
  if (PESTANA_ACTUAL !== 'mesa' || !DATA || !CURSO_ESCOLAR || !NIVEL) return '';
  var m = (DATA.modelos || []).filter(function (x) { return x.id === MODELO_ID; })[0];
  return CURSO_ESCOLAR + ' · ' + NIVEL + ' · «' + (m ? m.nombre : '') + '»';
}

function mesaOtrosEnEsteModelo_() {
  var yo = pulsoDonde_();
  return (PULSO_.presentes || []).filter(function (p) { return p.d === yo; }).map(function (p) { return p.n; });
}

function mesaPintarTambien_() {
  var el = document.getElementById('tambienEnModelo');
  if (!el) return;
  var otros = PESTANA_ACTUAL === 'mesa' ? mesaOtrosEnEsteModelo_() : [];
  el.textContent = otros.length ? 'También en este modelo: ' + otros.join(', ') : '';
  el.classList.toggle('oculto', !otros.length);
}

/* Antes de un cambio de todo el modelo (repartir de nuevo, borrarlo, marcarlo definitivo, quitar un grupo, cambiar los bloques): si hay otra persona dentro, se pregunta. */
async function mesaConfirmarSiHayOtros_() {
  var otros = mesaOtrosEnEsteModelo_();
  if (!otros.length) return true;
  var r = await preguntarOpciones('Cambiar todo el modelo', otros.join(' y ') + ' está ahora en este modelo. Si sigues, cambia también lo que está viendo. ¿Seguir?',
    [{ clave: 'seguir', etiqueta: 'Seguir' }, { clave: 'cancelar', etiqueta: 'Cancelar' }]);
  return r === 'seguir';
}

/* El aviso de «dos personas sobre el mismo alumno», con las palabras de la mesa (la 66 lo pinta): «<Nombre> acaba de cambiar a <alumno> al grupo B. Tú lo habías puesto en el C.» */
function mesaFormatoAviso_(e, mio) {
  var m = /^mesa\|[^|]+\|a\|(.+)$/.exec(String(e.d || ''));
  if (!m) return null;
  var clave = m[1], alumno = (function () { for (var k in ALUMNOS_POR_CLAVE) if (datoLimpio_(k) === clave) return ALUMNOS_POR_CLAVE[k]; return null; })();
  if (!alumno) return null;
  var grupo = function (g) { return g === 'Sin grupo' || !g ? 'Sin grupo' : 'el grupo ' + g; };
  return { texto: e.q + ' acaba de cambiar a ' + alumno.nombre + ' a' + (e.s === 'Sin grupo' || !e.s ? ' «Sin grupo»' : 'l grupo ' + e.s) + '. Tú lo habías puesto en ' + (mio.s === 'Sin grupo' || !mio.s ? '«Sin grupo»' : 'el ' + mio.s) + '.',
    ver: function () { resaltarAlumnoEnMesa_(alumno.clave); } };
}

function mesaFormatoSuave_(previo, e) {
  var m = /^mesa\|[^|]+\|a\|(.+)$/.exec(String(e.d || ''));
  if (!m) return null;
  var seg = Math.max(1, Math.round((Date.now() - previo.t) / 1000));
  var hace = seg < 90 ? seg + ' segundos' : Math.round(seg / 60) + ' minutos';
  return previo.q + ' lo había puesto en ' + (previo.s === 'Sin grupo' || !previo.s ? '«Sin grupo»' : 'el ' + previo.s) + ' hace ' + hace + '.';
}

(function () {
  if (typeof pulsoDondeAnadir_ === 'function') pulsoDondeAnadir_(mesaDondeExtra_);
  if (typeof pulsoGancho_ === 'function') pulsoGancho_(mesaPintarTambien_);
})();
