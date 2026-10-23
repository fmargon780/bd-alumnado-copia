/* Generado de JsMesaReglas.html por web/construir-mesa.mjs: no se toca a mano. */
/* ==================== REGLAS: FIJAR / JUNTAR / SEPARAR ==================== */
function reglasActuales() {
  const r = DATA.modelo.reglas || {};
  DATA.modelo.reglas = { fijar: r.fijar || [], juntar: r.juntar || [], separar: r.separar || [] };
  return DATA.modelo.reglas;
}
function nombreDe(clave) { return (ALUMNOS_POR_CLAVE[clave] || {}).nombre || clave; }

function terminarSeleccion() {
  MODO_SELECCION = false;
  SELECCION = [];
  document.getElementById('btnModoSeleccion').textContent = 'Empezar a seleccionar';
  pintarColumnas();
  pintarAvisoSeleccion();
}

function juntarSeleccionados() {
  if (SELECCION.length < 2) { avisar('Selecciona al menos dos alumnos para juntarlos.', 'error'); return; }
  reglasActuales().juntar.push(SELECCION.slice());
  terminarSeleccion();
  pintarPanelReglas();
  guardarModeloTrasCambio();
}
function separarSeleccionados() {
  if (SELECCION.length < 2) { avisar('Selecciona al menos dos alumnos para separarlos.', 'error'); return; }
  const lista = reglasActuales().separar;
  for (let i = 0; i < SELECCION.length; i++) {
    for (let j = i + 1; j < SELECCION.length; j++) lista.push([SELECCION[i], SELECCION[j]]);
  }
  terminarSeleccion();
  pintarPanelReglas();
  guardarModeloTrasCambio();
}
function quitarRegla(tipo, indice) {
  reglasActuales()[tipo].splice(indice, 1);
  pintarPanelReglas();
  guardarModeloTrasCambio();
}
function fijarDesdeFicha(clave, grupo) {
  const reglas = reglasActuales();
  reglas.fijar = reglas.fijar.filter(function (f) { return f.alumno !== clave; });
  if (grupo) reglas.fijar.push({ alumno: clave, grupo: grupo });
  pintarPanelReglas();
  guardarModeloTrasCambio();
}

/* Componentes de "juntar" (unión de todos los que tienen que ir en el mismo
   grupo, aunque estén en listas distintas que se solapen). */
function componentesDeJuntar(alumnos, juntar) {
  const padre = {};
  alumnos.forEach(function (a) { padre[a.clave] = a.clave; });
  function raiz(x) { while (padre[x] !== x) x = padre[x]; return x; }
  function unir(a, b) { const ra = raiz(a), rb = raiz(b); if (ra !== rb) padre[rb] = ra; }
  (juntar || []).forEach(function (lista) { for (let i = 1; i < lista.length; i++) unir(lista[0], lista[i]); });
  const grupos = {};
  alumnos.forEach(function (a) { const r = raiz(a.clave); (grupos[r] = grupos[r] || []).push(a.clave); });
  return grupos;
}

/* Reglas que no se pueden cumplir a la vez, sea cual sea el reparto: un
   mismo par en "juntar" y en "separar", o miembros de un mismo "juntar"
   fijados a grupos distintos (punto 1 de la instrucción 7). */
function reglasImposibles(alumnos, reglas) {
  const problemas = [];
  const componentes = componentesDeJuntar(alumnos, reglas.juntar);
  const raizDe = {};
  Object.keys(componentes).forEach(function (r) { componentes[r].forEach(function (c) { raizDe[c] = r; }); });

  (reglas.separar || []).forEach(function (p) {
    if (raizDe[p[0]] && raizDe[p[0]] === raizDe[p[1]]) {
      problemas.push('No se puede juntar y separar a la vez a ' + nombreDe(p[0]) + ' y ' + nombreDe(p[1]) + '.');
    }
  });

  const fijoDe = {};
  (reglas.fijar || []).forEach(function (f) { if (!DATA || (DATA.grupos || []).indexOf(f.grupo) !== -1) fijoDe[f.alumno] = f.grupo; });
  Object.keys(componentes).forEach(function (r) {
    const gruposFijados = Array.from(new Set(componentes[r].map(function (c) { return fijoDe[c]; }).filter(Boolean)));
    if (gruposFijados.length > 1 && componentes[r].length > 1) {
      problemas.push('No se puede juntar a ' + componentes[r].map(nombreDe).join(', ') + ': están fijados en grupos distintos.');
    }
  });
  return problemas;
}

/* Cuáles de las reglas guardadas NO se cumplen hoy en el modelo abierto
   (independientemente de si son o no posibles de cumplir). */
function reglasRotas(reglas) {
  const rotas = { fijar: [], juntar: [], separar: [] };
  reglas.fijar.forEach(function (f, i) { if (grupoDe(f.alumno) && grupoDe(f.alumno) !== f.grupo) rotas.fijar.push(i); });
  reglas.juntar.forEach(function (g, i) {
    const grupos = g.map(grupoDe).filter(Boolean);
    if (new Set(grupos).size > 1) rotas.juntar.push(i);
  });
  reglas.separar.forEach(function (p, i) {
    if (grupoDe(p[0]) && grupoDe(p[0]) === grupoDe(p[1])) rotas.separar.push(i);
  });
  return rotas;
}

function pintarPanelReglas() {
  if (!DATA) return;
  const reglas = reglasActuales();
  const rotas = reglasRotas(reglas);
  const imposibles = reglasImposibles(DATA.alumnos, reglas);
  let html = '';
  reglas.fijar.forEach(function (f, i) {
    html += '<div class="regla' + (rotas.fijar.indexOf(i) !== -1 ? ' rota' : '') + '"><span>Fijar: ' +
      escapaHtml(nombreDe(f.alumno)) + ' → ' + escapaHtml(f.grupo) + '</span>' +
      '<button onclick="quitarRegla(\'fijar\',' + i + ')">✕</button></div>';
  });
  reglas.juntar.forEach(function (g, i) {
    html += '<div class="regla' + (rotas.juntar.indexOf(i) !== -1 ? ' rota' : '') + '"><span>Juntar: ' +
      escapaHtml(g.map(nombreDe).join(', ')) + '</span>' +
      '<button onclick="quitarRegla(\'juntar\',' + i + ')">✕</button></div>';
  });
  reglas.separar.forEach(function (p, i) {
    html += '<div class="regla' + (rotas.separar.indexOf(i) !== -1 ? ' rota' : '') + '"><span>Separar: ' +
      escapaHtml(nombreDe(p[0])) + ' y ' + escapaHtml(nombreDe(p[1])) + '</span>' +
      '<button onclick="quitarRegla(\'separar\',' + i + ')">✕</button></div>';
  });
  if (imposibles.length) {
    html += imposibles.map(function (m) { return '<div class="regla rota">' + escapaHtml(m) + '</div>'; }).join('');
  }
  document.getElementById('listaReglas').innerHTML = html || '<p style="font-size:12px;color:#777">Sin reglas todavía.</p>';
}
