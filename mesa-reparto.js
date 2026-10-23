/* Generado de JsMesaReparto.html por web/construir-mesa.mjs: no se toca a mano. */
/* ==================== EL REPARTO AUTOMÁTICO ==================== */
function gruposPermitidos(alumno) {
  return DATA.grupos.filter(function (g) { return !motivoBloqueado(alumno, g); });
}

function vectorMejor(a, b) {
  for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; }
  return 0;
}

/* Todas las franjas de un alumno tal como están hoy en Séneca, más el grupo
   que le toque (instrucción 12, punto 4.2). Misma idea que
   mesaAsignacionesDeSeneca_ (MesaDatos.gs, servidor): "optativa" es el campo
   de siempre, que sigue editando la mesa; las demás son nuevas y nadie las
   edita todavía, así que se toman de Séneca cada vez que se recalcula el
   grupo (crear el modelo, o el reparto automático). Función pura, sin DOM:
   se puede probar con datos inventados. */
function franjasDeAlumno_(a, grupo) {
  const esBac = /bach/i.test(a.curso || '');
  return {
    grupo: grupo,
    optativa: a.optativas[0] || a.religion || '',
    opt: a.opt || '', opc1: a.opc1 || '', opc2: a.opc2 || '', opc3: a.opc3 || '', opc4: a.opc4 || '',
    mat: a.mat || '', alct: a.alct || '', rel: a.religion || '',
    bac: !esBac ? [] : []
      .concat(String(a.matModalidad || '').split(' ').filter(Boolean))
      .concat(String(a.bacOptativas || '').split(' ').filter(Boolean))
      .concat(a.religion ? [a.religion] : [])
  };
}

/* El algoritmo en sí: colocar primero lo fijado y lo que tiene que ir junto,
   luego el resto de más restringido a menos, y mejorar con intercambios al
   azar mientras algo mejore (varias semillas, se queda con la mejor).
   Puntúa en el orden de la lista de criterios del modelo, solo los que estén
   encendidos (instrucciones 7 y 48). No toca el DOM: se puede probar
   aparte con datos inventados. */
function calcularReparto(alumnos, grupos, reglas, criterios) {
  const alumnoPorClave = {};
  alumnos.forEach(function (a) { alumnoPorClave[a.clave] = a; });
  const permitidos = {};
  alumnos.forEach(function (a) { permitidos[a.clave] = grupos.filter(function (g) { return !motivoBloqueado(a, g); }); });

  const componentes = componentesDeJuntar(alumnos, reglas.juntar);
  const unidades = Object.keys(componentes).map(function (r) { return componentes[r]; });

  const fijoDe = {};
  (reglas.fijar || []).forEach(function (f) { if (grupos.indexOf(f.grupo) !== -1) fijoDe[f.alumno] = f.grupo; });   // instrucción 73: un «fijar» a un grupo que ya no existe no se aplica

  const separaPares = {};
  (reglas.separar || []).forEach(function (p) { separaPares[[p[0], p[1]].sort().join('|')] = true; });
  function separados(a, b) { return !!separaPares[[a, b].sort().join('|')]; }

  function permitidosUnidad(unidad) {
    let inter = null;
    unidad.forEach(function (c) {
      inter = inter === null ? permitidos[c].slice() : inter.filter(function (g) { return permitidos[c].indexOf(g) !== -1; });
    });
    return inter || [];
  }
  function grupoFijadoUnidad(unidad) {
    for (let i = 0; i < unidad.length; i++) if (fijoDe[unidad[i]]) return fijoDe[unidad[i]];
    return null;
  }
  const orden = unidades.slice().sort(function (a, b) { return permitidosUnidad(a).length - permitidosUnidad(b).length; });

  function contar(claves, filtro) { return claves.filter(function (c) { return filtro(alumnoPorClave[c]); }).length; }
  function colegiosDesviacion(estado) {
    const totalesPorColegio = {};
    grupos.forEach(function (g) {
      estado[g].forEach(function (c) {
        const col = alumnoPorClave[c] && alumnoPorClave[c].colegio;
        if (!col) return;
        totalesPorColegio[col] = totalesPorColegio[col] || {};
        totalesPorColegio[col][g] = (totalesPorColegio[col][g] || 0) + 1;
      });
    });
    let total = 0;
    Object.keys(totalesPorColegio).forEach(function (col) {
      const porGrupo = totalesPorColegio[col];
      const suma = grupos.reduce(function (s, g) { return s + (porGrupo[g] || 0); }, 0);
      const media = suma / (grupos.length || 1);
      grupos.forEach(function (g) { total += Math.abs((porGrupo[g] || 0) - media); });
    });
    return total;
  }
  /* Instrucción 48: un puntuador por criterio encendido, EN EL ORDEN DE LA LISTA (JsMesaCriterios.html); vectorMejor compara de arriba abajo. */
  const puntuadores = criteriosPuntuadores_(criterios, alumnos, grupos, (DATA && DATA.bloques && DATA.bloques.franjas) || [], colegiosDesviacion);
  function puntuar(estado) {
    return puntuadores.map(function (f) { return f(estado); });
  }
  function separaOk(estado, grupo, unidad) {
    const enGrupo = estado[grupo];
    const unidadSet = {};
    unidad.forEach(function (c) { unidadSet[c] = true; });
    for (let j = 0; j < enGrupo.length; j++) {
      if (unidadSet[enGrupo[j]]) continue;
      for (let i = 0; i < unidad.length; i++) { if (separados(unidad[i], enGrupo[j])) return false; }
    }
    return true;
  }
  function mezclar(lista) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copia[i]; copia[i] = copia[j]; copia[j] = tmp;
    }
    return copia;
  }

  function construirUna(desordenar) {
    const estado = {};
    grupos.forEach(function (g) { estado[g] = []; });
    const asignUnidad = {};
    const sinSitio = [];
    (desordenar ? mezclar(orden) : orden).forEach(function (unidad) {
      const permitidosU = permitidosUnidad(unidad);
      const fijado = grupoFijadoUnidad(unidad);
      let candidatos = fijado ? (permitidosU.indexOf(fijado) !== -1 ? [fijado] : []) : permitidosU;
      candidatos = candidatos.filter(function (g) { return separaOk(estado, g, unidad); });
      if (!candidatos.length) { sinSitio.push(unidad); return; }
      let mejor = candidatos[0], mejorTam = Infinity;
      candidatos.forEach(function (g) { if (estado[g].length < mejorTam) { mejorTam = estado[g].length; mejor = g; } });
      unidad.forEach(function (c) { estado[mejor].push(c); asignUnidad[c] = mejor; });
    });
    return { estado: estado, asignUnidad: asignUnidad, sinSitio: sinSitio };
  }

  function mejorarConIntercambios(estado, asignUnidad, intentos) {
    let puntos = puntuar(estado);
    const movibles = orden.filter(function (u) { return u.length === 1 && !fijoDe[u[0]]; }).map(function (u) { return u[0]; });
    for (let n = 0; n < intentos && movibles.length > 1; n++) {
      const c1 = movibles[Math.floor(Math.random() * movibles.length)];
      const c2 = movibles[Math.floor(Math.random() * movibles.length)];
      if (c1 === c2) continue;
      const g1 = asignUnidad[c1], g2 = asignUnidad[c2];
      if (g1 === g2) continue;
      if (permitidos[c1].indexOf(g2) === -1 || permitidos[c2].indexOf(g1) === -1) continue;
      const i1 = estado[g1].indexOf(c1), i2 = estado[g2].indexOf(c2);
      estado[g1][i1] = c2; estado[g2][i2] = c1;
      if (!separaOk(estado, g1, [c2]) || !separaOk(estado, g2, [c1])) {
        estado[g1][i1] = c1; estado[g2][i2] = c2;
        continue;
      }
      const nuevos = puntuar(estado);
      if (vectorMejor(nuevos, puntos) < 0) {
        asignUnidad[c1] = g2; asignUnidad[c2] = g1;
        puntos = nuevos;
      } else {
        estado[g1][i1] = c1; estado[g2][i2] = c2;
      }
    }
    return { estado: estado, asignUnidad: asignUnidad, puntos: puntos };
  }

  const SEMILLAS = 5;
  const INTENTOS = Math.min(alumnos.length * 15, 3000);
  let mejor = null;
  for (let s = 0; s < SEMILLAS; s++) {
    const c = construirUna(s > 0);
    const m = mejorarConIntercambios(c.estado, c.asignUnidad, INTENTOS);
    if (!mejor || vectorMejor(m.puntos, mejor.puntos) < 0) mejor = { asignUnidad: m.asignUnidad, sinSitio: c.sinSitio, puntos: m.puntos };
  }

  const asignaciones = {};
  alumnos.forEach(function (a) {
    const g = mejor.asignUnidad[a.clave] || '';
    /* El reparto automático solo decide el grupo; las demás franjas (punto
       4.2 de la instrucción 12) se toman tal cual están hoy en Séneca, igual
       que hace mesaAsignacionesDeSeneca_ (MesaDatos.gs) al crear un modelo:
       no son cosa de este algoritmo. */
    asignaciones[a.clave] = franjasDeAlumno_(a, g);
  });
  const avisos = mejor.sinSitio.map(function (unidad) {
    return unidad.map(nombreDe).join(' y ') +
      ': no hay ningún grupo que a la vez cumpla su optativa o Religión, las reglas fijadas y "separar".';
  });
  return { asignaciones: asignaciones, avisos: avisos };
}

async function proponerReparto() {
  const reglas = reglasActuales();
  const imposibles = reglasImposibles(DATA.alumnos, reglas);
  if (imposibles.length) { avisar(imposibles.join(' '), 'error'); return; }

  const modeloActual = DATA.modelos.find(function (m) { return m.id === MODELO_ID; });
  const opcion = await preguntarOpciones('Proponer reparto',
    '¿Rehacer "' + (modeloActual ? modeloActual.nombre : '') + '"? Se perderán los cambios hechos a mano.',
    [
      { clave: 'nuevo', etiqueta: 'Crear como modelo nuevo (recomendado)' },
      { clave: 'rehacer', etiqueta: 'Rehacer este mismo modelo' },
      { clave: 'cancelar', etiqueta: 'Cancelar' }
    ]);
  if (opcion === 'cancelar' || !opcion) return;
  if (opcion === 'rehacer' && !(await mesaConfirmarSiHayOtros_())) return;   // instrucción 67: cambia lo que otra persona está viendo

  if (opcion === 'nuevo') {
    const nombre = prompt('Nombre del modelo nuevo:', 'Propuesta automática');
    if (!nombre) return;
    try {
      // Copia las reglas y los criterios del modelo abierto: solo el reparto
      // en sí se sustituye por la propuesta, calculada justo después.
      const nuevo = await llamar('mesaCrearModelo', CURSO_ESCOLAR, NIVEL, nombre, 'copiar', MODELO_ID);
      await cargarCurso(NIVEL, nuevo.id);
    } catch (e) { avisar(mensajeDeError(e), 'error'); return; }
  }

  avisar('Calculando el reparto…', 'aviso');
  await new Promise(function (r) { setTimeout(r, 30); });   // deja pintar el aviso antes de bloquear el hilo
  const resultado = calcularReparto(DATA.alumnos, DATA.grupos, reglasActuales(), CRITERIOS);
  ASIGNACIONES = resultado.asignaciones;
  MESA_REEMPLAZO_TOTAL_ = true;   // instrucción 67: se sustituyen todas las asignaciones (una sola operación, una sola fila en «Cambios»)
  pintarEquilibrio();
  pintarColumnas();
  if (resultado.avisos.length) avisar(resultado.avisos.join(' '), 'error');
  else limpiarAviso();
  await guardarModeloTrasCambio();
}

/* ==================== COMPARAR MODELOS ==================== */
async function compararModelos() {
  const idA = document.getElementById('selCompararA').value;
  const idB = document.getElementById('selCompararB').value;
  if (!idA || !idB) return;
  try {
    const [a, b] = await Promise.all([llamar('mesaObtenerModelo', CURSO_ESCOLAR, idA), llamar('mesaObtenerModelo', CURSO_ESCOLAR, idB)]);
    let cambian = 0;
    DATA.alumnos.forEach(function (al) {
      const ga = (a.asignaciones[al.clave] || {}).grupo || '';
      const gb = (b.asignaciones[al.clave] || {}).grupo || '';
      if (ga !== gb) cambian++;
    });
    const tablaA = tablaEquilibrioDe(a.asignaciones, a.nombre);
    const tablaB = tablaEquilibrioDe(b.asignaciones, b.nombre);
    document.getElementById('resultadoComparar').innerHTML =
      '<p style="font-size:12px">' + cambian + ' alumno(s) cambian de grupo entre los dos modelos.</p>' + tablaA + tablaB;
  } catch (e) { avisar(mensajeDeError(e), 'error'); }
}
function tablaEquilibrioDe(asignaciones, titulo) {
  const grupos = DATA.grupos;
  const porGrupo = {};
  grupos.forEach(function (g) {
    porGrupo[g] = DATA.alumnos.filter(function (a) { return ((asignaciones[a.clave] || {}).grupo || '') === g; });
  });
  let html = '<p style="font-size:12px;font-weight:600;margin:8px 0 2px">' + escapaHtml(titulo) + '</p>' +
    '<table class="equilibrio"><tr><th class="etiqueta">Total</th>' +
    grupos.map(function (g) { return '<th>' + escapaHtml(g) + '</th>'; }).join('') + '</tr><tr><td class="etiqueta"></td>' +
    grupos.map(function (g) { return '<td>' + porGrupo[g].length + '</td>'; }).join('') + '</tr></table>';
  return html;
}

/* Un diálogo con dos o tres botones, sin usar confirm()/prompt() del
   navegador (para poder marcar la opción recomendada). Devuelve una
   promesa con la clave del botón pulsado. Usa el mismo fondo que la ficha
   breve de la mesa, pero con su propio id (#dialogoMesaFondo): pueden
   convivir con la ficha breve abierta detrás. */
function preguntarOpciones(titulo, texto, opciones) {
  return new Promise(function (resolve) {
    const fondo = document.getElementById('dialogoMesaFondo');
    fondo.innerHTML = '<div class="ficha-mesa" style="max-height:80vh;overflow-y:auto"><h3>' + escapaHtml(titulo) + '</h3><p>' +
      escapaHtml(texto).replace(/\n/g, '<br>') + '</p>' +
      opciones.map(function (o, i) {
        return '<div class="cerrar"><button class="' + (i === 0 ? 'principal' : '') + '" data-op="' + escapaHtml(o.clave) + '">' +
          escapaHtml(o.etiqueta) + '</button></div>';
      }).join('') + '</div>';
    fondo.classList.remove('oculto');
    Array.prototype.forEach.call(fondo.querySelectorAll('button[data-op]'), function (b) {
      b.onclick = function () { fondo.classList.add('oculto'); resolve(b.getAttribute('data-op')); };
    });
  });
}
