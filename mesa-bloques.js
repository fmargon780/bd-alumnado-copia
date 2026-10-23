/* Generado de JsMesaBloques.html por web/construir-mesa.mjs: no se toca a mano. */
/* ==================== BLOQUES ==================== */
function pintarBloques() {
  if (!DATA) return;
  const cont = document.getElementById('vistaBloquesMesa');
  const franjas = (DATA.bloques && DATA.bloques.franjas) || [];
  const avisos = (DATA.bloques && DATA.bloques.avisos) || [];
  let html = avisos.map(function (a) { return '<div class="aviso">' + escapaHtml(a) + '</div>'; }).join('');
  if (DATA.estadoCurso === 'preparacion') html += htmlGruposPreparacion();
  if (!franjas.length) html += '<p>No hay materias de optativa o Religión matriculadas todavía en este curso.</p>';
  else html += htmlCriterioDesborde();
  franjas.forEach(function (franja, fi) {
    html += '<div class="franja" data-franja="' + fi + '"><h3>' + escapaHtml(franja.nombre) + '</h3>';
    html += '<div class="bloque-titulo">Materias</div>' + htmlMateriasFranja(franja, fi);
    (franja.bloques || []).forEach(function (bloque, bi) {
      html += htmlBloque(franja, fi, bloque, bi);
    });
    html += '<button onclick="anadirBloque(' + fi + ')">+ bloque</button></div>';
  });
  if (franjas.length) {
    html += '<div class="guardar-bloques"><button class="principal" onclick="guardarBloques()">Guardar bloques</button> ' +
      '<button onclick="aplicarCambiosOptativa()">Aplicar cambios de optativa</button></div>';
  }
  cont.innerHTML = html;
}

/* Instrucción 61, punto 3.4: los grupos de cada nivel del curso que viene parten de los de este curso; aquí se añaden y se quitan. */
function htmlGruposPreparacion() {
  return '<div class="franja" id="gruposPreparacion"><h3>Grupos de ' + escapaHtml(nombreGrado_(NIVEL)) + ' el curso que viene</h3>' +
    '<p style="font-size:12px;color:#555">Parten de los grupos que este nivel tiene este curso. Quitar un grupo deja a su alumnado en «Sin grupo».</p><div class="checklist">' +
    (DATA.grupos || []).map(function (g) {
      return '<span style="border:1px solid #e2e6ea;border-radius:4px;padding:3px 6px;display:inline-flex;gap:6px;align-items:center">' + escapaHtml(g) +
        '<button class="quitar" onclick="quitarGrupoMesa(\'' + g.replace(/'/g, "\\'") + '\')">Quitar grupo</button></span>';
    }).join('') + '</div><button onclick="anadirGrupoMesa()">Añadir grupo</button></div>';
}
async function guardarGruposMesa_(grupos) {
  if (!(await mesaConfirmarSiHayOtros_())) return;   // instrucción 67: cambia lo que otra persona está viendo
  try {
    const r = await llamar('mesaGuardarGrupos', CURSO_ESCOLAR, NIVEL, grupos);
    await cargarCurso(NIVEL, MODELO_ID);
    VISTA_MESA = 'bloques'; pintarPestana();
    return r;
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}
function anadirGrupoMesa() {
  const nombre = (prompt('Nombre del grupo nuevo (por ejemplo «' + nombreGrado_(NIVEL) + ' ' + String.fromCharCode(65 + (DATA.grupos || []).length) + '»):') || '').trim();
  if (!nombre) return;
  if ((DATA.grupos || []).indexOf(nombre) !== -1) { avisar('Ese grupo ya existe.', 'error'); return; }
  guardarGruposMesa_((DATA.grupos || []).concat([nombre]));
}
function quitarGrupoMesa(grupo) {
  const con = DATA.alumnos.filter(function (a) { return ((ASIGNACIONES[a.clave] || {}).grupo || '') === grupo; }).length;
  if (con && !confirm('El grupo «' + grupo + '» tiene ' + con + ' alumnos. Se quedarán en «Sin grupo». ¿Quitarlo?')) return;
  guardarGruposMesa_((DATA.grupos || []).filter(function (g) { return g !== grupo; }));
}

/* Punto 2 y 3 de la instrucción 8: qué materias no se dan este curso y sus
   plazas máximas (opcional). */
function htmlMateriasFranja(franja, fi) {
  return '<div class="checklist" style="margin-bottom:8px">' + (franja.materias || []).map(function (m, mi) {
    return '<span style="border:1px solid #e2e6ea;border-radius:4px;padding:3px 6px;display:inline-flex;gap:6px;align-items:center">' +
      escapaHtml(m.etiqueta) +
      '<label style="font-size:11px"><input type="checkbox" ' + (m.noSeDa ? 'checked ' : '') +
      'onchange="cambiarMateria(' + fi + ',' + mi + ',\'noSeDa\',this.checked)">no se da</label>' +
      '<input type="number" min="0" placeholder="plazas" style="width:60px;font-size:11px" value="' + (m.plazas || '') + '" ' +
      'onchange="cambiarMateria(' + fi + ',' + mi + ',\'plazas\',this.value)">' +
      '</span>';
  }).join('') + '</div>';
}
function cambiarMateria(fi, mi, campo, valor) {
  const m = DATA.bloques.franjas[fi].materias[mi];
  m[campo] = campo === 'plazas' ? (valor === '' ? null : parseInt(valor, 10) || 0) : valor;
}

/* Punto 4: el criterio para decidir quién sale de una optativa desbordada,
   por curso. "Por fecha" y "Por nota media" se desactivan solos si la BD no
   tiene con qué aplicarlos (docs/MESA-AGRUPAMIENTO.md, punto 4). */
function htmlCriterioDesborde() {
  const actual = DATA.bloques.criterioDesborde || 'mano';
  const opciones = [
    { clave: 'mano', etiqueta: 'A mano', disponible: true, motivo: '' },
    { clave: 'fecha', etiqueta: 'Por fecha de matrícula', disponible: DATA.bloques.puedeCriterioFecha,
      motivo: 'Todavía no hay fecha de matrícula guardada para ningún alumno de este curso.' },
    { clave: 'nota', etiqueta: 'Por nota media del curso pasado', disponible: DATA.bloques.puedeCriterioNota,
      motivo: 'La base de datos no calcula la nota media del curso pasado.' }
  ];
  let html = '<div class="franja"><h3>Optativa desbordada: quién sale</h3>' +
    '<p style="font-size:12px;color:#555">Cuando una optativa tiene más alumnos que plazas, decide este orden.</p>';
  opciones.forEach(function (o) {
    html += '<label class="criterio" style="' + (o.disponible ? '' : 'color:#999') + '">' +
      '<input type="radio" name="criterioDesborde" value="' + o.clave + '"' +
      (actual === o.clave ? ' checked' : '') + (o.disponible ? '' : ' disabled') +
      ' onchange="cambiarCriterioDesborde(this.value)"> ' + escapaHtml(o.etiqueta) +
      (o.disponible ? '' : ' — ' + escapaHtml(o.motivo)) + '</label>';
  });
  return html + '</div>';
}
function cambiarCriterioDesborde(valor) { DATA.bloques.criterioDesborde = valor; }

function htmlBloque(franja, fi, bloque, bi) {
  const gruposHtml = (DATA.grupos || []).map(function (g) {
    const marcado = (bloque.grupos || []).indexOf(g) !== -1;
    return '<label><input type="checkbox" ' + (marcado ? 'checked ' : '') +
      'onchange="cambiarBloque(' + fi + ',' + bi + ',\'grupo\',\'' + g + '\',this.checked)">' + escapaHtml(g) + '</label>';
  }).join('');
  const materiasHtml = (franja.materias || []).map(function (m) {
    const marcado = (bloque.materias || []).indexOf(m.codigo) !== -1;
    return '<label><input type="checkbox" ' + (marcado ? 'checked ' : '') +
      'onchange="cambiarBloque(' + fi + ',' + bi + ',\'materia\',\'' + m.codigo.replace(/'/g, "\\'") + '\',this.checked)">' +
      escapaHtml(m.etiqueta) + '</label>';
  }).join('');
  return '<div class="bloque"><div class="fila-bloque">' +
    '<div><div class="bloque-titulo">Grupos</div><div class="checklist">' + gruposHtml + '</div></div>' +
    '<div><div class="bloque-titulo">Materias que se dan juntas</div><div class="checklist">' + materiasHtml + '</div></div>' +
    '<button class="quitar" onclick="quitarBloque(' + fi + ',' + bi + ')">Quitar</button>' +
    '</div></div>';
}
function anadirBloque(fi) {
  DATA.bloques.franjas[fi].bloques = DATA.bloques.franjas[fi].bloques || [];
  DATA.bloques.franjas[fi].bloques.push({ grupos: [], materias: [] });
  pintarBloques();
}
function quitarBloque(fi, bi) {
  DATA.bloques.franjas[fi].bloques.splice(bi, 1);
  pintarBloques();
}
function cambiarBloque(fi, bi, tipo, valor, marcado) {
  const bloque = DATA.bloques.franjas[fi].bloques[bi];
  const lista = tipo === 'grupo' ? (bloque.grupos = bloque.grupos || []) : (bloque.materias = bloque.materias || []);
  const idx = lista.indexOf(valor);
  if (marcado && idx === -1) lista.push(valor);
  if (!marcado && idx !== -1) lista.splice(idx, 1);
}
async function guardarBloques() {
  if (!(await mesaConfirmarSiHayOtros_())) return;   // instrucción 67: cambia lo que otra persona está viendo
  try {
    await llamar('mesaGuardarBloques', CURSO_ESCOLAR, NIVEL, DATA.bloques.franjas, DATA.bloques.criterioDesborde || 'mano');
    avisar('Bloques guardados.', 'aviso');
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}

/* ==================== APLICAR CAMBIOS DE OPTATIVA (instrucción 8) ==================== */
/* Puro: no toca el DOM, para poder probarlo aparte con datos inventados. */
function calcularOptativas(alumnos, franja, asignaciones, preferencias, criterioDesborde) {
  const estadoMateria = {};
  (franja.materias || []).forEach(function (m) { estadoMateria[m.codigo] = m; });

  const ordenDePref = function (clave) {
    const p = preferencias[clave];
    if (!p) return [];
    return (p.ordenSeneca && p.ordenSeneca.length) ? p.ordenSeneca : (p.ordenPapel || []);
  };
  const fechaDePref = function (clave) {
    const p = preferencias[clave];
    if (!p) return '';
    return (p.ordenSeneca && p.ordenSeneca.length) ? p.fechaSeneca : (p.fechaPapel || '');
  };

  const ocupacion = {};
  (franja.materias || []).forEach(function (m) { ocupacion[m.codigo] = []; });
  const debenCambiar = [];
  alumnos.forEach(function (al) {
    const actual = (asignaciones[al.clave] || {}).optativa;
    if (!actual || !estadoMateria[actual]) return;
    if (estadoMateria[actual].noSeDa) {
      debenCambiar.push({ clave: al.clave, motivo: '"' + actual + '" ya no se da este curso.' });
      return;
    }
    ocupacion[actual].push(al.clave);
  });

  const avisosDesborde = [];
  Object.keys(ocupacion).forEach(function (codigo) {
    const materia = estadoMateria[codigo];
    if (!materia.plazas) return;
    let lista = ocupacion[codigo];
    if (lista.length <= materia.plazas) return;
    avisosDesborde.push(materia.etiqueta + ': ' + lista.length + ' alumnos para ' + materia.plazas + ' plazas.');
    if (criterioDesborde === 'fecha') {
      const ordenados = lista.slice().sort(function (a, b) {
        const fa = fechaDePref(a) || '9999-99-99', fb = fechaDePref(b) || '9999-99-99';
        return fa < fb ? -1 : (fa > fb ? 1 : 0);
      });
      const salen = ordenados.slice(materia.plazas);
      ocupacion[codigo] = ordenados.slice(0, materia.plazas);
      salen.forEach(function (clave) { debenCambiar.push({ clave: clave, motivo: '"' + codigo + '" está llena (por fecha de matrícula).' }); });
    }
    // 'mano' y 'nota' (sin datos hoy): se avisa y Jefatura decide a mano en la ficha (selOptativa).
  });

  const cambios = [];
  debenCambiar.forEach(function (d) {
    const orden = ordenDePref(d.clave).filter(function (m) { return estadoMateria[m] && !estadoMateria[m].noSeDa; });
    let nueva = null;
    for (let i = 0; i < orden.length; i++) {
      const m = orden[i];
      if (estadoMateria[m].plazas && ocupacion[m].length >= estadoMateria[m].plazas) continue;
      nueva = m;
      break;
    }
    if (nueva) ocupacion[nueva].push(d.clave);
    cambios.push({ clave: d.clave, anterior: (asignaciones[d.clave] || {}).optativa || '', nueva: nueva, motivo: d.motivo });
  });

  return { cambios: cambios, avisosDesborde: avisosDesborde };
}

async function aplicarCambiosOptativa() {
  const franjas = (DATA.bloques && DATA.bloques.franjas) || [];
  let todosCambios = [], todosAvisos = [];
  franjas.forEach(function (franja) {
    const r = calcularOptativas(DATA.alumnos, franja, ASIGNACIONES, PREFERENCIAS, DATA.bloques.criterioDesborde || 'mano');
    todosCambios = todosCambios.concat(r.cambios);
    todosAvisos = todosAvisos.concat(r.avisosDesborde);
  });
  if (!todosCambios.length) {
    avisar(todosAvisos.length ? todosAvisos.join(' ') : 'No hay ningún cambio de optativa que aplicar.', 'aviso');
    return;
  }
  const resumen = todosCambios.map(function (c) {
    return nombreDe(c.clave) + ': ' + (c.anterior || '(ninguna)') + ' → ' + (c.nueva || 'Sin optativa') + ' (' + c.motivo + ')';
  }).join('\n');
  const opcion = await preguntarOpciones('Aplicar cambios de optativa',
    (todosAvisos.length ? todosAvisos.join(' ') + '\n\n' : '') +
    todosCambios.length + ' alumno(s) van a cambiar de optativa en el modelo abierto ("' +
    (DATA.modelos.find(function (m) { return m.id === MODELO_ID; }) || {}).nombre + '"):\n\n' + resumen,
    [{ clave: 'aplicar', etiqueta: 'Aplicar' }, { clave: 'cancelar', etiqueta: 'Cancelar' }]);
  if (opcion !== 'aplicar') return;

  todosCambios.forEach(function (c) {
    const asign = Object.assign({}, ASIGNACIONES[c.clave]);
    asign.optativa = c.nueva || '';
    asign.optativaCambiada = true;
    asign.optativaAnterior = c.anterior;
    asign.motivoCambio = c.motivo;
    ASIGNACIONES[c.clave] = asign;
  });
  pintarColumnas();
  await guardarModeloTrasCambio();
  avisar(todosCambios.length + ' alumno(s) cambiados. Revísalos en sus fichas (etiqueta "OPT. CAMBIADA").', 'aviso');
}
