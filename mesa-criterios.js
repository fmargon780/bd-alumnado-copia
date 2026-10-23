/* Generado de JsMesaCriterios.html por web/construir-mesa.mjs: no se toca a mano. */
/* ==================== EL CATÁLOGO ==================== */
/* Los siete de siempre: están en todos los modelos, en este orden al crear uno; solo se apagan, nunca se quitan. */
var CRITERIOS_FIJOS_ = [
  { id: 'tamano', texto: 'Grupos del mismo tamaño' },
  { id: 'rep', texto: 'Repetidores, repartidos por igual' },
  { id: 'pil', texto: 'PIL, repartidos por igual' },
  { id: 'neae', texto: 'NEAE, repartidos por igual' },
  { id: 'conf', texto: 'Conflictivos, repartidos por igual' },
  { id: 'sexo', texto: 'Chicos y chicas, repartidos por igual' },
  { id: 'procedencia', texto: 'Mezclar colegio y clase de 6º' }
];
/* Los que se añaden (los de materia, `mat:<código>`, se construyen con la materia). */
var CRITERIOS_EXTRA_ = [
  { id: 'susp', texto: '3 o más suspensas, repartidos por igual' },
  { id: 'bil', texto: 'Piden bilingüe, repartidos por igual' }
];

function criterioEsFijo_(id) { return CRITERIOS_FIJOS_.some(function (c) { return c.id === id; }); }
function criterioEsMateria_(id) { return String(id).indexOf('mat:') === 0; }
function criterioConocido_(id) {
  return criterioEsFijo_(id) || CRITERIOS_EXTRA_.some(function (c) { return c.id === id; }) || (criterioEsMateria_(id) && String(id).length > 4);
}

function criteriosPorDefecto_() {
  return { lista: CRITERIOS_FIJOS_.map(function (c) { return { id: c.id, activo: true }; }) };
}

/* Lo guardado en un modelo, con la forma de ahora ({ lista: [{ id, activo }] }, en orden de prioridad). Un modelo antiguo
   ({ tamano, equidad, sexo, procedencia }) o sin criterios se convierte al vuelo, sin reescribirlo: los siete de siempre en su orden;
   «equidad» valía por repetidores, PIL, NEAE y conflictivos a la vez. Lo que falte, encendido y al final; un id desconocido, ignorado. */
function criteriosNormalizar_(guardado) {
  const g = guardado && typeof guardado === 'object' ? guardado : {};
  let lista = [];
  if (Array.isArray(g.lista)) {
    const vistos = {};
    g.lista.forEach(function (c) {
      const id = c && typeof c.id === 'string' ? c.id : '';
      if (!id || vistos[id] || !criterioConocido_(id)) return;
      vistos[id] = true;
      lista.push({ id: id, activo: c.activo !== false });
    });
  } else {
    const viejo = function (clave) { return g[clave] !== false; };
    lista = [
      { id: 'tamano', activo: viejo('tamano') }, { id: 'rep', activo: viejo('equidad') }, { id: 'pil', activo: viejo('equidad') },
      { id: 'neae', activo: viejo('equidad') }, { id: 'conf', activo: viejo('equidad') },
      { id: 'sexo', activo: viejo('sexo') }, { id: 'procedencia', activo: viejo('procedencia') }
    ];
  }
  CRITERIOS_FIJOS_.forEach(function (c) {
    if (!lista.some(function (x) { return x.id === c.id; })) lista.push({ id: c.id, activo: true });
  });
  return { lista: lista };
}

/* ==================== QUÉ MATERIAS TIENE UN ALUMNO ==================== */
/* Una sola función, para la tabla y para el criterio. La optativa que la mesa le ha asignado en el modelo manda sobre la primera de Séneca
   (a la que sustituye); si no tiene asignada, las de Séneca (todas las franjas: OPT y OPC1 a OPC4; en Bachillerato, también sus optativas);
   y además su Religión o Atención Educativa. `asign` es lo asignado a este alumno en el modelo (o null: el reparto automático, que parte de
   lo que dice Séneca, igual que motivoBloqueado). Devuelve códigos de materia, sin repetir. */
function materiasDeAlumno_(a, asign) {
  const optativas = (a.optativas || []).slice();
  const asignada = asign && asign.optativa ? asign.optativa : '';
  if (asignada) { if (optativas.length) optativas[0] = asignada; else optativas.push(asignada); }
  const bac = /bach/i.test(a.curso || '') ? String(a.bacOptativas || '').split(' ') : [];
  const vistos = {}, salida = [];
  optativas.concat(bac, [a.religion]).forEach(function (m) {
    if (m && !vistos[m]) { vistos[m] = true; salida.push(m); }
  });
  return salida;
}

/* Las materias de las franjas del curso que se pueden repartir: no marcadas «no se da» y con al menos un alumno. Primero las optativas y
   después Religión y Atención Educativa. Un código en dos franjas es una sola materia. */
function materiasDelCurso_(alumnos, franjas, asignaciones) {
  const tienen = {};
  alumnos.forEach(function (a) {
    materiasDeAlumno_(a, asignaciones && asignaciones[a.clave]).forEach(function (m) { tienen[m] = (tienen[m] || 0) + 1; });
  });
  const vistos = {}, optativas = [], religion = [];
  (franjas || []).forEach(function (franja) {
    const esReligion = /religi|atenci/i.test(franja.nombre || '');
    (franja.materias || []).forEach(function (m) {
      if (m.noSeDa || !tienen[m.codigo] || vistos[m.codigo]) return;
      vistos[m.codigo] = true;
      (esReligion ? religion : optativas).push({ codigo: m.codigo, etiqueta: m.etiqueta || m.codigo, franja: franja.nombre || '', alumnos: tienen[m.codigo] });
    });
  });
  return optativas.concat(religion);
}

/* Los grupos que dan una materia, según los bloques de sus franjas. Si la franja no tiene bloques todavía, o la materia no está en ninguno,
   valen todos los grupos. Un código en dos franjas: valen los de cualquiera de las dos. */
function gruposQueDan_(codigo, franjas, grupos) {
  const dan = {};
  let todos = false;
  (franjas || []).forEach(function (franja) {
    if (!(franja.materias || []).some(function (m) { return m.codigo === codigo; })) return;
    const bloques = (franja.bloques || []).filter(function (b) { return (b.materias || []).indexOf(codigo) !== -1; });
    if (!bloques.length) { todos = true; return; }
    bloques.forEach(function (b) { (b.grupos || []).forEach(function (g) { dan[g] = true; }); });
  });
  return todos ? grupos.slice() : grupos.filter(function (g) { return dan[g]; });
}

/* ==================== CÓMO PUNTÚA CADA CRITERIO ==================== */
function desviacionDe_(valores) {
  const media = valores.reduce(function (s, v) { return s + v; }, 0) / (valores.length || 1);
  return valores.reduce(function (s, v) { return s + Math.abs(v - media); }, 0);
}

/* Un puntuador por cada criterio ENCENDIDO que puede puntuar, en el orden de la lista: function (estado) → número (menos es mejor), con
   `estado[grupo]` = claves de los alumnos del grupo. Lo que cuenta cada criterio se calcula una sola vez por alumno. Un criterio de materia
   que ya no se da (marcada «no se da» o sin alumnos) no puntúa. `procedencia` es una función (estado) → número que pone el reparto. */
function criteriosPuntuadores_(criterios, alumnos, grupos, franjas, procedencia) {
  const lista = criteriosNormalizar_(criterios).lista;
  const marcasDe = {
    rep: function (a) { return a.rep; }, pil: function (a) { return a.pil; }, neae: function (a) { return a.neae; },
    conf: function (a) { return a.conflictivo; }, sexo: function (a) { return /^(h|v)/i.test(a.sexo || ''); },
    susp: function (a) { return (a.suspensas || 0) >= 3; }, bil: function (a) { return a.bilingue; }
  };
  const disponibles = materiasDelCurso_(alumnos, franjas, null);
  const salida = [];
  lista.forEach(function (c) {
    if (!c.activo) return;
    if (c.id === 'tamano') {
      salida.push(function (estado) { return desviacionDe_(grupos.map(function (g) { return estado[g].length; })); });
    } else if (c.id === 'procedencia') {
      salida.push(procedencia);
    } else if (marcasDe[c.id]) {
      const marca = {};
      alumnos.forEach(function (a) { marca[a.clave] = marcasDe[c.id](a) ? 1 : 0; });
      salida.push(function (estado) {
        return desviacionDe_(grupos.map(function (g) { return estado[g].reduce(function (s, k) { return s + (marca[k] || 0); }, 0); }));
      });
    } else if (criterioEsMateria_(c.id)) {
      const codigo = c.id.slice(4);
      if (!disponibles.some(function (m) { return m.codigo === codigo; })) return;
      const marca = {};
      alumnos.forEach(function (a) { marca[a.clave] = materiasDeAlumno_(a, null).indexOf(codigo) !== -1 ? 1 : 0; });
      const dan = gruposQueDan_(codigo, franjas, grupos);
      if (!dan.length) return;
      salida.push(function (estado) {
        return desviacionDe_(dan.map(function (g) { return estado[g].reduce(function (s, k) { return s + (marca[k] || 0); }, 0); }));
      });
    }
  });
  return salida;
}

/* ==================== LA LISTA EN EL PANEL ==================== */
function franjasDelCurso_() { return (DATA && DATA.bloques && DATA.bloques.franjas) || []; }

function textoCriterio_(id, materias) {
  const fijo = CRITERIOS_FIJOS_.concat(CRITERIOS_EXTRA_).filter(function (c) { return c.id === id; })[0];
  if (fijo) return { texto: fijo.texto, yaNoSeDa: false };
  const codigo = String(id).slice(4);
  const m = materias.filter(function (x) { return x.codigo === codigo; })[0];
  return m ? { texto: m.etiqueta + ', repartida entre los grupos que la dan', yaNoSeDa: false } : { texto: codigo, yaNoSeDa: true };
}

function pintarCriterios() {
  const cont = document.getElementById('listaCriterios');
  if (!cont || !DATA) return;
  const materias = materiasDelCurso_(DATA.alumnos, franjasDelCurso_(), ASIGNACIONES);
  const lista = CRITERIOS.lista;
  cont.innerHTML = lista.map(function (c, i) {
    const t = textoCriterio_(c.id, materias);
    const apagado = !c.activo || t.yaNoSeDa;
    return '<li class="crit' + (apagado ? ' apagado' : '') + '" data-crit="' + escapaHtml(c.id) + '">' +
      '<span class="crit-n">' + (i + 1) + '</span>' +
      '<label class="crit-texto"><input type="checkbox"' + (c.activo ? ' checked' : '') + ' onchange="alternarCriterio_(' + i + ', this.checked)"> ' +
        escapaHtml(t.texto) + (t.yaNoSeDa ? ' <span class="crit-gris">(ya no se da)</span>' : '') + '</label>' +
      '<span class="crit-botones">' +
        (i > 0 ? '<button type="button" class="crit-sube" title="Subir" aria-label="Subir un puesto" onclick="moverCriterio_(' + i + ', -1)">▲</button>' : '<span class="crit-hueco"></span>') +
        (i < lista.length - 1 ? '<button type="button" class="crit-baja" title="Bajar" aria-label="Bajar un puesto" onclick="moverCriterio_(' + i + ', 1)">▼</button>' : '<span class="crit-hueco"></span>') +
        (criterioEsFijo_(c.id) ? '<span class="crit-hueco"></span>' : '<button type="button" class="crit-quita" title="Quitar" aria-label="Quitar este criterio" onclick="quitarCriterio_(' + i + ')">✕</button>') +
      '</span></li>';
  }).join('');

  /* «Añadir criterio…»: lo que todavía no está en la lista. */
  const enLista = {};
  lista.forEach(function (c) { enLista[c.id] = true; });
  let opciones = CRITERIOS_EXTRA_.filter(function (c) { return !enLista[c.id]; }).map(function (c) {
    return '<option value="' + c.id + '">' + escapaHtml(c.texto.replace(', repartidos por igual', '')) + '</option>';
  }).join('');
  const porFranja = {};
  materias.forEach(function (m) { if (!enLista['mat:' + m.codigo]) (porFranja[m.franja] = porFranja[m.franja] || []).push(m); });
  Object.keys(porFranja).forEach(function (franja) {
    opciones += '<optgroup label="' + escapaHtml(franja) + '">' + porFranja[franja].map(function (m) {
      return '<option value="mat:' + escapaHtml(m.codigo) + '">' + escapaHtml(m.etiqueta) + '</option>';
    }).join('') + '</optgroup>';
  });
  const sel = document.getElementById('selAnadirCriterio');
  sel.innerHTML = '<option value="">Añadir criterio…</option>' + opciones;
  sel.classList.toggle('oculto', !opciones);
  sel.onchange = function () { if (sel.value) anadirCriterio_(sel.value); };
}

/* Cada cambio guarda el modelo y repinta la tabla (cambia qué filas pueden salir en rojo); el reparto no se rehace: se aplica al pulsar
   «Proponer reparto». */
function criteriosCambiados_() {
  pintarCriterios();
  pintarEquilibrio();
  guardarModeloTrasCambio();
}
function alternarCriterio_(i, activo) { if (CRITERIOS.lista[i]) { CRITERIOS.lista[i].activo = !!activo; criteriosCambiados_(); } }
function moverCriterio_(i, paso) {
  const j = i + paso, l = CRITERIOS.lista;
  if (!l[i] || !l[j]) return;
  const tmp = l[i]; l[i] = l[j]; l[j] = tmp;
  criteriosCambiados_();
}
function quitarCriterio_(i) {
  const c = CRITERIOS.lista[i];
  if (!c || criterioEsFijo_(c.id)) return;
  CRITERIOS.lista.splice(i, 1);
  criteriosCambiados_();
}
function anadirCriterio_(id) {
  if (!criterioConocido_(id) || CRITERIOS.lista.some(function (c) { return c.id === id; })) return;
  CRITERIOS.lista.push({ id: id, activo: true });
  criteriosCambiados_();
}
