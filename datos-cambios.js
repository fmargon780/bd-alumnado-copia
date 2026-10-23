/* Generado de JsCambios.html por web/construir-datos.mjs: no se toca a mano. */
var CAMBIOS_ = {
  ultimoN: 0, lista: [], nombres: {}, selloVisto: null, enVuelo: false,
  propios: {},        // dato -> { n, s (lo que puse), h }: lo que esta persona ha guardado (30 minutos)
  ajenos: {},         // dato -> { n, q, s, h }: lo que otras personas han cambiado (10 minutos)
  avisos: [],         // avisos que no se van solos (hasta «Entendido»)
  pendiente: null,    // repintado aplazado porque se está escribiendo
  listaCompleta: null, porDato: {}, iniciado: false
};
var CAMBIOS_PROPIOS_MS_ = 30 * 60000, CAMBIOS_AJENOS_MS_ = 10 * 60000, CAMBIOS_MAX_LISTA_ = 200;

/* Se llama una vez, con el arranque ya pintado (JsComun.html). */
function cambiosIniciar_() {
  if (CAMBIOS_.iniciado || !ESTADO) return;
  CAMBIOS_.iniciado = true;
  var c = ESTADO.cambios || { n: 0, recientes: [] };
  CAMBIOS_.ultimoN = c.n || 0;
  Object.keys(c.nombres || {}).forEach(function (correo) { CAMBIOS_.nombres[correo] = c.nombres[correo]; });
  (c.recientes || []).forEach(function (e) { cambiosRecordar_(e); });
  if (typeof pulsoGancho_ === 'function') { pulsoPedirClave_('pulso_pub_cambios'); pulsoGancho_(cambiosLatido_); }
  document.addEventListener('focusout', function () { setTimeout(cambiosSoltarPendiente_, 350); });
}

/* Las personas se nombran con el nombre de «Quién entra»; sin él, lo de antes de la arroba. */
function nombreDePersona_(correo) {
  var t = String(correo || '').trim();
  if (t.indexOf('@') === -1) return t;   // «Excel de Jefatura» y otros autores que no son un correo
  var c = t.toLowerCase();
  return CAMBIOS_.nombres[c] || c.split('@')[0];
}

/* La misma limpieza que hace el servidor con la clave de un dato (Cambios.gs, cambioFila_): sin espacios y de 120 letras como mucho. Con ella se encuentra, en pantalla, lo que ha cambiado otra persona. */
function datoLimpio_(d) { return String(d || '').replace(/\s+/g, '_').slice(0, 120); }

function cambiosRecordar_(e) {
  if (!e || !e.n) return false;
  if (e.c && e.q) CAMBIOS_.nombres[e.c] = e.q;
  if (CAMBIOS_.lista.some(function (x) { return x.n === e.n; })) return false;
  CAMBIOS_.lista.push(e);
  CAMBIOS_.lista.sort(function (a, b) { return a.n - b.n; });
  if (CAMBIOS_.lista.length > CAMBIOS_MAX_LISTA_) CAMBIOS_.lista = CAMBIOS_.lista.slice(-CAMBIOS_MAX_LISTA_);
  if (e.d) CAMBIOS_.porDato[e.d] = e;
  return true;
}

/* ---------------------------------------------------------------- lo que trae cada vuelta de la puerta */

function cambiosLatido_(r) {
  var pub = r && r.publicado ? r.publicado['pulso_pub_cambios'] : null, lista = null;
  try { lista = pub ? JSON.parse(pub) : null; } catch (e) { lista = null; }
  var sello = r ? r.sello : '';
  if (Array.isArray(lista) && lista.length) {
    var nuevos = lista.filter(function (e) { return e.n > CAMBIOS_.ultimoN; });
    if (nuevos.length && nuevos[0].n > CAMBIOS_.ultimoN + 1 && lista[0].n > CAMBIOS_.ultimoN + 1) cambiosPedirDesde_();   // hay un hueco: se piden por el puente normal
    else if (nuevos.length) cambiosProcesar_(nuevos);
  } else if (CAMBIOS_.selloVisto !== null && sello !== CAMBIOS_.selloVisto) {
    cambiosPedirDesde_();   // la caché no trae nada y los datos han cambiado: se pregunta
  }
  CAMBIOS_.selloVisto = sello;
}

function cambiosPedirDesde_() {
  if (CAMBIOS_.enVuelo) return;
  CAMBIOS_.enVuelo = true;
  llamarAlServidor_('webCambiosDesde', [CAMBIOS_.ultimoN], { sinBoton: true, sinTiempos: true }).then(function (r) {
    CAMBIOS_.enVuelo = false;
    var nuevos = ((r && r.lista) || []).filter(function (e) { return e.n > CAMBIOS_.ultimoN; });
    if (nuevos.length) cambiosProcesar_(nuevos);
    else if (r && r.ultimo > CAMBIOS_.ultimoN) CAMBIOS_.ultimoN = r.ultimo;
  }).catch(function () { CAMBIOS_.enVuelo = false; /* se reintenta en la vuelta siguiente */ });
}

function cambiosProcesar_(nuevos) {
  var ahora = Date.now(), ajenosNuevos = [], suaves = [];
  nuevos.sort(function (a, b) { return a.n - b.n; }).forEach(function (e) {
    if (e.n > CAMBIOS_.ultimoN) CAMBIOS_.ultimoN = e.n;
    cambiosRecordar_(e);
    var cuando = Date.parse(e.h) || ahora;
    if (e.c === MI_CORREO) {   // lo mío: ya está pintado; solo se recuerda, y se mira si otra persona había tocado lo mismo hace poco
      var previo = CAMBIOS_.ajenos[e.d];
      if (previo && previo.n < e.n && cuando - previo.t <= CAMBIOS_AJENOS_MS_) suaves.push({ previo: previo, e: e });
      CAMBIOS_.propios[e.d] = { n: e.n, s: e.s, t: cuando, x: e.x };
      return;
    }
    var mio = CAMBIOS_.propios[e.d];
    if (mio && mio.n < e.n && cuando - mio.t <= CAMBIOS_PROPIOS_MS_) cambiosAvisoFuerte_(e, mio);
    CAMBIOS_.ajenos[e.d] = { n: e.n, q: e.q, s: e.s, t: cuando };
    ajenosNuevos.push(e);
  });
  suaves.forEach(function (x) { cambiosLineaSuave_(x.previo, x.e); });
  if (CAMBIOS_.listaCompleta) {   // el paso «Cambios» ya cargado: lo nuevo entra arriba
    nuevos.forEach(function (e) { if (!CAMBIOS_.listaCompleta.some(function (x) { return x.n === e.n; })) CAMBIOS_.listaCompleta.unshift(e); });
    if (PESTANA_ACTUAL === 'datos' && VISTA_DATOS_ === 'cambios') pintarCambios_();
  }
  if (ajenosNuevos.length) cambiosRefrescar_(ajenosNuevos);
  else if (typeof pintarUltimosCambios_ === 'function' && PESTANA_ACTUAL === 'hoy') pintarUltimosCambios_();
}

/* ---------------------------------------------------------------- poner la pantalla al día, en silencio */

function cambiosRelevantes_(lista) {
  return lista.filter(function (e) { return !e.u || e.u === CURSO_VISTO; });
}

function cambiosRefrescar_(lista) {
  if (typeof mesaAlLlegarCambios_ === 'function') mesaAlLlegarCambios_(lista);   // instrucción 67: la mesa mezcla lo suyo (modelo, reglas, marcas…) por su cuenta
  var rel = cambiosRelevantes_(lista), nombres = {};
  rel.forEach(function (e) { (e.k || []).forEach(function (k) { nombres[k] = true; }); });
  if (!nombres['*'] && typeof unidoAjustarNombres_ === 'function') nombres = unidoAjustarNombres_(nombres);   // instrucción 107
  var curso = CURSO_VISTO;
  var fin = function (cambiadas) { cambiosRepintar_(cambiadas || {}, lista); };
  if (nombres['*']) { recargarTodoTrasCambio_(); setTimeout(function () { cambiosResaltar_(lista); }, 1200); if (typeof pintarUltimosCambios_ === 'function') pintarUltimosCambios_(); return; }
  if (!Object.keys(nombres).length) { fin({}); return; }
  if (nombres['__estado']) {
    llamarAlServidor_('webArranque', [curso, false], { sinBoton: true, sinTiempos: true }).then(function (r) { if (curso === CURSO_VISTO) fin(aplicarFrescos_('arranque', curso, r)); }).catch(function () { fin({}); });
    return;
  }
  llamarAlServidor_('webCambiosDatos', [curso, Object.keys(nombres)], { sinBoton: true, sinTiempos: true }).then(function (r) {
    if (curso === CURSO_VISTO) fin(aplicarFrescos_('datos', curso, r || {}));
  }).catch(function () { fin({}); /* sin esos datos, se ven al recargar; los cambios sí salen en «Últimos cambios» */ });
}

/* ¿Hay texto sin guardar en un campo que se está usando? Entonces no se repinta ese trozo: se avisa y se espera a que salga del campo. */
function cambiosEscribiendo_() {
  var a = document.activeElement;
  if (!a || a === document.body || !/^(INPUT|TEXTAREA)$/.test(a.tagName)) return false;
  if (a.type && /^(checkbox|radio|button|submit|file|range|color)$/.test(a.type)) return false;
  if (a.closest && a.closest('.caja-buscador, #modalSoporte, #soporte-ventana, #soporte-boton')) return false;
  return (a.value || '') !== '' && (a.value || '') !== (a.defaultValue || '');
}

function cambiosRepintar_(cambiadas, lista) {
  if (cambiosEscribiendo_()) {
    var p = CAMBIOS_.pendiente || { cambiadas: {}, lista: [] };
    Object.keys(cambiadas).forEach(function (k) { p.cambiadas[k] = true; });
    p.lista = p.lista.concat(lista);
    CAMBIOS_.pendiente = p;
    var e = lista[lista.length - 1];
    cambiosLineaEscribiendo_(e);
    return;
  }
  var y = window.pageYOffset || 0;
  var ficha = document.getElementById('modalFicha');
  var fichaAbierta = ficha && !ficha.classList.contains('oculto');
  if (cambiadas.__estado) { pintarSelectores(); pintarPortada(); pintarNombreCentro_(); }
  if (cambiadas.webAlumnadoLigero && !fichaAbierta) cargarAlumnadoLigero();
  pintarMenuTareas_();
  var miran = AL_DIA_PANTALLAS_[PESTANA_ACTUAL] || [];
  if (cambiadas.__estado || miran.some(function (fn) { return cambiadas[fn]; })) cargarDatosPestana();
  else if (PESTANA_ACTUAL === 'hoy' && typeof pintarUltimosCambios_ === 'function') pintarUltimosCambios_();
  if (window.scrollTo) window.scrollTo(0, y);
  /* Las pantallas se pintan con lo que hay en memoria, algunas tras una vuelta de promesas: el resaltado, cuando ya está todo en su sitio. */
  setTimeout(function () { cambiosResaltar_(lista); }, 250);
}

function cambiosSoltarPendiente_() {
  var p = CAMBIOS_.pendiente;
  if (!p || cambiosEscribiendo_()) return;
  CAMBIOS_.pendiente = null;
  var l = document.getElementById('lineaEscribiendo');
  if (l) l.remove();
  cambiosRepintar_(p.cambiadas, p.lista);
}

function cambiosAvisosCaja_() {
  var c = document.getElementById('avisosCambios');
  if (!c) {
    c = document.createElement('div');
    c.id = 'avisosCambios'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
    var main = document.querySelector('main');
    main.insertBefore(c, main.firstChild);
  }
  return c;
}

function cambiosLineaEscribiendo_(e) {
  var c = cambiosAvisosCaja_(), l = document.getElementById('lineaEscribiendo');
  if (!l) { l = document.createElement('div'); l.id = 'lineaEscribiendo'; l.className = 'linea-cambio'; c.appendChild(l); }
  l.textContent = e.q + ' ha cambiado esto mientras escribías: ' + e.x + '.';
}

/* ---------------------------------------------------------------- resaltar lo que ha cambiado otra persona */

function cambiosResaltar_(lista) {
  cambiosRelevantes_(lista).forEach(function (e) {
    var els = [];
    try { els = document.querySelectorAll('[data-dato="' + String(e.d).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]'); } catch (x) { els = []; }
    Array.prototype.forEach.call(els, function (el) {
      if (!el.offsetParent && el !== document.body) return;
      el.classList.add('cambio-ajeno');
      var r = el.getBoundingClientRect();
      var tag = document.createElement('span');
      tag.className = 'quien-ahora';
      tag.textContent = e.q + ', ahora';
      tag.style.top = Math.max(0, r.top - 14) + 'px';
      tag.style.left = Math.max(0, r.left) + 'px';
      document.body.appendChild(tag);
      setTimeout(function () { el.classList.remove('cambio-ajeno'); tag.remove(); }, 6000);
    });
  });
}

/* ---------------------------------------------------------------- dos personas sobre lo mismo (punto 3.4) */

function cambiosAvisoFuerte_(e, mio) {
  var f = (e.t === 'mesa' && typeof mesaFormatoAviso_ === 'function') ? mesaFormatoAviso_(e, mio) : null;   // instrucción 67: las palabras de la mesa
  CAMBIOS_.avisos.push(f ? { n: e.n, libre: true, x: f.texto, ver: f.ver, w: e.w } : { n: e.n, q: e.q, x: e.x, s: e.s, mio: mio.s, w: e.w });
  cambiosPintarAvisos_();
}

/* Un aviso con su propio texto (lo que pasa en la mesa de otra persona), que no se va hasta «Entendido». `id` evita repetirlo. */
function cambiosAvisoLibre_(texto, id) {
  if (CAMBIOS_.avisos.some(function (a) { return a.id === id; })) return;
  CAMBIOS_.avisos.push({ libre: true, id: id, x: texto, w: '' });
  cambiosPintarAvisos_();
}

function cambiosPintarAvisos_() {
  var c = cambiosAvisosCaja_(), caja = document.getElementById('cajaAvisosCambios');
  if (!CAMBIOS_.avisos.length) { if (caja) caja.remove(); return; }
  if (!caja) { caja = document.createElement('div'); caja.id = 'cajaAvisosCambios'; caja.className = 'caja-aviso-cambios'; c.insertBefore(caja, c.firstChild); }
  caja.innerHTML = CAMBIOS_.avisos.map(function (a, i) {
    var texto = a.libre ? escapaHtml(a.x) : escapaHtml(a.q) + ' acaba de cambiar esto: ' + escapaHtml(a.x) + '.' + (a.mio ? ' Tú habías puesto ' + escapaHtml(a.mio) + '.' : '');
    var ir = a.libre && !a.ver && !a.w ? '' : '<button class="pequeno" onclick="cambiosIrAviso_(' + i + ')">' + (a.ver ? 'Ver' : 'Ir') + '</button>';
    return '<div class="aviso-cambio"><span>' + texto + '</span>' + ir + '<button class="pequeno" onclick="cambiosEntendido_(' + i + ')">Entendido</button></div>';
  }).join('') + (CAMBIOS_.avisos.length > 1 ? '<div class="aviso-cambio-todos"><button class="pequeno" onclick="cambiosEntendidoTodos_()">Entendido todos</button></div>' : '');
}

function cambiosEntendido_(i) { CAMBIOS_.avisos.splice(i, 1); cambiosPintarAvisos_(); }
function cambiosEntendidoTodos_() { CAMBIOS_.avisos = []; cambiosPintarAvisos_(); }
function cambiosIrAviso_(i) { var a = CAMBIOS_.avisos[i]; if (!a) return; if (a.ver) a.ver(); else irADonde_(a.w); }

/* Quien guarda sobre algo que otra persona tocó hace menos de diez minutos: se guarda igual y una línea, que se va sola, lo dice. */
function cambiosLineaSuave_(previo, e) {
  var c = cambiosAvisosCaja_(), l = document.createElement('div');
  l.className = 'linea-cambio suave';
  var mins = Math.max(0, Math.round((Date.now() - previo.t) / 60000));
  var propio = (e.t === 'mesa' && typeof mesaFormatoSuave_ === 'function') ? mesaFormatoSuave_(previo, e) : null;   // instrucción 67: las palabras de la mesa
  l.textContent = propio || ('Lo había cambiado ' + previo.q + ' hace ' + (mins < 1 ? 'un momento' : mins + (mins === 1 ? ' minuto' : ' minutos')) + (previo.s ? ' (' + previo.s + ')' : '') + '.');
  c.appendChild(l);
  setTimeout(function () { l.remove(); }, 8000);
}

/* «tarea|paso» → la pantalla (las tareas cambian el curso del selector si hace falta; «datos» y «listados» no son tareas). */
function irADonde_(donde) {
  var p = String(donde || '').split('|');
  if (!p[0]) return;
  if (TAREAS_.some(function (t) { return t.clave === p[0]; })) irATareaPaso_(p[0], p[1]); else irAPaso_(p[0], p[1] || p[0]);
}
