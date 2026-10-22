/* Generado de JsEstadisticasCalculo.html por web/construir-estadisticas.mjs: no se toca a mano. */
var EST_SIN_DATO = 'Sin dato';
var EST_NIVELES = ['1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º BACH', '2º BACH'];
var EST_MAX_COLUMNAS = 30;
/* Lo que se cuenta en cada conjunto (instrucciones 71 y 72). */
var EST_NOMBRE_CUENTA = { alumnado: 'Alumnos', materias: 'Materias', solicitudes: 'Solicitudes', esperados: 'Alumnos esperados', transito: 'Fichas' };
var EST_CELDA_SD = 'sin dato';   // una casilla de un dato que no existe en esos cursos

/* `datos.existe`: { curso escolar: [claves que existen en ese curso] | null (todas) }. Un alumno de un curso anterior (historial de Séneca) solo tiene unos pocos datos; el resto no existe y sus
   casillas dicen «sin dato», nunca 0 (instrucción 71). `datos.conjunto`: 'alumnado' (una fila por alumno) o 'materias' (una por alumno y materia: `a.k` es el alumno). */
function estadPreparar(datos) {
  var cat = {}, existe = {}, ultimo = '';
  ((datos && datos.catalogo) || []).forEach(function (c, i) { cat[c.clave] = { c: c, i: i }; });
  var ex = (datos && datos.existe) || {};
  Object.keys(ex).forEach(function (cu) { if (ex[cu]) { existe[cu] = {}; ex[cu].forEach(function (k) { existe[cu][k] = true; }); } });
  var alumnos = (datos && datos.alumnos) || [];
  if (datos && datos.conjunto === 'materias' && cat.queEs && cat.cursoEscolar) {
    alumnos.forEach(function (a) { if (a.v[cat.queEs.i] === 'Nota de un curso pasado' && String(a.v[cat.cursoEscolar.i]) > ultimo) ultimo = String(a.v[cat.cursoEscolar.i]); });
  }
  return { alumnos: alumnos, cat: cat, lista: ((datos && datos.catalogo) || []), existe: existe, conjunto: (datos && datos.conjunto) || 'alumnado', ultimoConNotas: ultimo };
}

/* Los datos de «Materias de cada alumno» (lo que devuelve webEstadisticasMaterias) como los espera `estadPreparar`: una fila por alumno y materia, con todos los datos del alumno
   (en este conjunto «Curso escolar» es el de la nota o la matrícula) y los de la materia detrás. */
function estadDatosDeMaterias(m) {
  var iCurso = m.catalogo.map(function (c) { return c.clave; }).indexOf('cursoEscolar');
  return { catalogo: m.catalogo.concat(m.catalogoMaterias), conjunto: 'materias', existe: {}, alumnos: m.filas.map(function (f) {
    var a = m.alumnos[f[0]], v = a.v.slice();
    v[iCurso] = f[3];
    v.push(f[1], f[2], f[4], f[5], f[6], f[6] === null ? 'Sin nota' : (f[6] >= 5 ? 'Sí' : 'No'));
    return { k: a.k, n: a.n, u: a.u, c: f[3], v: v };
  }) };
}

/* Los alumnos de varios cursos juntos: cada uno sabe de qué curso es (`c`) y cada curso, qué datos tiene (`existe`). `porCurso`: { curso: respuesta del servidor }. */
function estadDatosDeCursos(catalogo, porCurso, cursos, conjunto) {
  var existe = {}, alumnos = [];
  cursos.forEach(function (c) {
    var d = porCurso[c];
    if (!d) return;
    d.alumnos.forEach(function (a) { if (a.c === undefined) a.c = c; });
    existe[c] = d.existe;
    alumnos = alumnos.concat(d.alumnos);
  });
  return { catalogo: catalogo, conjunto: conjunto || 'alumnado', existe: existe, alumnos: alumnos };
}

/* ¿Tiene este alumno el dato `clave`? Los de un curso anterior solo tienen los del historial. */
function estadTieneDato(P, a, clave) {
  var e = a.c !== undefined ? P.existe[a.c] : null;
  return !e || e[clave] === true;
}

/* Las etiquetas por las que se agrupa un alumno en un dato: una, o varias si el dato es una lista. */
function estadEtiquetas(campo, valor) {
  if (campo.tipo === 'lista') return (valor && valor.length) ? valor.map(String) : [EST_SIN_DATO];
  if (valor === null || valor === undefined || valor === '') return [EST_SIN_DATO];
  return [String(valor)];
}

function estadEtiquetasDe(P, a, clave) {
  var k = P.cat[clave];
  return k ? estadEtiquetas(k.c, a.v[k.i]) : [EST_SIN_DATO];
}

/* «2º ESO B» → [rango del nivel, resto]. */
function estadClaveUnidad(u) {
  var m = /^(\d)\s*º\s*(BACH\w*|ESO)?\s*(.*)$/i.exec(String(u));
  if (!m) return [99, String(u)];
  return [(/BACH/i.test(m[2] || '') ? 4 : 0) + Number(m[1]), m[3]];
}

/* El orden natural de dos etiquetas de un dato. «Sin dato» va siempre al final. */
function estadComparar(campo, a, b) {
  if (a === b) return 0;
  if (a === EST_SIN_DATO) return 1;
  if (b === EST_SIN_DATO) return -1;
  if (campo.orden === 'nivel') {
    var x = EST_NIVELES.indexOf(a), y = EST_NIVELES.indexOf(b);
    return (x === -1 ? 99 : x) - (y === -1 ? 99 : y) || String(a).localeCompare(String(b), 'es', { numeric: true });
  }
  if (campo.orden === 'unidad') {
    var ca = estadClaveUnidad(a), cb = estadClaveUnidad(b);
    return (ca[0] - cb[0]) || String(ca[1]).localeCompare(String(cb[1]), 'es', { numeric: true });
  }
  if (campo.tipo === 'sino') {
    var o = ['Sí', 'No', 'No aplica'], i = o.indexOf(a), j = o.indexOf(b);
    return (i === -1 ? 9 : i) - (j === -1 ? 9 : j);
  }
  if (campo.tipo === 'numero' || campo.orden === 'numero') {
    var p = parseFloat(a), q = parseFloat(b);
    if (!isNaN(p) && !isNaN(q)) return p - q;
  }
  return String(a).localeCompare(String(b), 'es', { numeric: true });
}

function estadEtiquetaCalculo(P, c) {
  if (c.etiqueta) return c.etiqueta;
  if (c.tipo === 'alumnos') return EST_NOMBRE_CUENTA[P.conjunto] || 'Alumnos';
  if (c.tipo === 'distintos') return 'Alumnos distintos';
  var k = P.cat[c.dato], et = k ? k.c.etiqueta : c.dato;
  if (c.tipo === 'cumplen') return et + ': ' + c.valor;
  if (c.tipo === 'porcentaje') return '% ' + et + ': ' + c.valor;
  var bajo = et.charAt(0).toLowerCase() + et.slice(1);
  return (c.tipo === 'media' ? 'Media de ' : 'Suma de ') + bajo;
}

/* Quita de una definición lo que ya no está en el catálogo. Devuelve { def, quitados: [claves] }. */
function estadLimpiarDefinicion(P, def) {
  var quitados = [];
  var existe = function (k) { if (P.cat[k]) return true; if (quitados.indexOf(k) === -1) quitados.push(k); return false; };
  var d = JSON.parse(JSON.stringify(def || {}));
  d.conjunto = d.conjunto || 'alumnado';
  d.filas = (d.filas || []).filter(existe);
  d.columna = d.columna && existe(d.columna) ? d.columna : '';
  d.calculos = (d.calculos || []).filter(function (c) { return c.tipo === 'alumnos' || c.tipo === 'distintos' || existe(c.dato); });
  var f = {};
  Object.keys(d.filtros || {}).forEach(function (k) { if (existe(k)) f[k] = d.filtros[k]; });
  d.filtros = f;
  d.orden = d.orden || { columna: -1, sentido: 1 };
  /* El gráfico (instrucción 70): una consulta guardada antes se abre con barras, el primer cálculo y el gráfico en el PDF. */
  var g = d.grafico || {};
  d.grafico = { calculo: g.calculo >= 0 && g.calculo < d.calculos.length ? g.calculo : 0, tipo: g.tipo === 'sectores' ? 'sectores' : 'barras', enPdf: g.enPdf === false ? false : true };
  return { def: d, quitados: quitados };
}

/* Los alumnos (posiciones en P.alumnos) que cumplen todos los filtros. Un dato de lista pasa si alguno de sus valores está marcado. */
function estadIncluidos(P, def) {
  var claves = Object.keys(def.filtros || {}).filter(function (k) { return P.cat[k]; });
  var ids = [];
  P.alumnos.forEach(function (a, i) {
    for (var j = 0; j < claves.length; j++) {
      var marcados = def.filtros[claves[j]].map(function (v) { return v === '@ultimoConNotas' ? P.ultimoConNotas : v; }), et = estadEtiquetasDe(P, a, claves[j]);
      if (!et.some(function (e) { return marcados.indexOf(e) !== -1; })) return;
    }
    ids.push(i);
  });
  return ids;
}

function estadUnCalculo(P, c, sub) {
  var n = sub.length, i, k = 0;
  if (c.tipo === 'alumnos') return n;
  if (c.tipo === 'distintos') { var vistos = {}, d = 0; for (i = 0; i < n; i++) { var q = P.alumnos[sub[i]].k; if (!vistos[q]) { vistos[q] = true; d++; } } return d; }
  /* Solo cuentan los alumnos que tienen ese dato: si en esta casilla ninguno lo tiene, «sin dato» (no 0). */
  var con = sub.filter(function (j) { return estadTieneDato(P, P.alumnos[j], c.dato); });
  if (n && !con.length) return EST_CELDA_SD;
  if (c.tipo === 'cumplen' || c.tipo === 'porcentaje') {
    for (i = 0; i < con.length; i++) if (estadEtiquetasDe(P, P.alumnos[con[i]], c.dato).indexOf(c.valor) !== -1) k++;
    return c.tipo === 'cumplen' ? k : (con.length ? k / con.length * 100 : null);
  }
  var ki = P.cat[c.dato], suma = 0, cuenta = 0;
  if (!ki) return c.tipo === 'suma' ? 0 : null;
  for (i = 0; i < con.length; i++) {
    var v = P.alumnos[con[i]].v[ki.i];
    if (v === null || v === undefined || v === '' || isNaN(Number(v))) continue;
    suma += Number(v); cuenta++;
  }
  if (c.tipo === 'suma') return suma;
  return cuenta ? suma / cuenta : null;
}

/* Las cifras de un grupo de alumnos: por cada columna (y el total), cada cálculo. */
function estadCeldas(P, def, ids, columnas, etColumna) {
  var out = [];
  columnas.forEach(function (cv) {
    var sub = cv === null ? ids : ids.filter(function (i) { return etColumna[i].indexOf(cv) !== -1; });
    (def.calculos || []).forEach(function (c) { out.push(estadUnCalculo(P, c, sub)); });
  });
  return out;
}

function estadCalcular(P, def) {
  var calculos = (def.calculos || []).map(function (c) {
    return { tipo: c.tipo, dato: c.dato || '', valor: c.valor === undefined ? '' : c.valor, etiqueta: estadEtiquetaCalculo(P, c) };
  });
  var ids = estadIncluidos(P, def);
  var distintos = {}; ids.forEach(function (i) { distintos[P.alumnos[i].k] = true; });
  var res = { incluidos: ids.length, alumnosDistintos: Object.keys(distintos).length, columnas: [], calculos: calculos, filas: [], total: null, hayLista: false, columnaDemasiada: 0, ids: ids };
  var campoCol = def.columna && P.cat[def.columna] ? P.cat[def.columna].c : null;
  var filasCampos = (def.filas || []).filter(function (k) { return P.cat[k]; });
  res.hayLista = filasCampos.concat(campoCol ? [def.columna] : []).some(function (k) { return P.cat[k].c.tipo === 'lista'; });

  var etColumna = {};
  var columnas = [null];
  if (campoCol) {
    var vistos = {};
    ids.forEach(function (i) {
      etColumna[i] = estadEtiquetasDe(P, P.alumnos[i], def.columna);
      etColumna[i].forEach(function (e) { vistos[e] = true; });
    });
    var valores = Object.keys(vistos);
    if (valores.length > EST_MAX_COLUMNAS) { res.columnaDemasiada = valores.length; res.columnas = []; return res; }
    valores.sort(function (a, b) { return estadComparar(campoCol, a, b); });
    columnas = valores.concat([null]);
  }
  res.columnas = columnas;
  var nc = calculos.length;
  var ci = def.orden && def.orden.columna >= 0 && def.orden.columna < columnas.length * nc ? def.orden.columna : -1;
  var sentido = def.orden && def.orden.sentido === -1 ? -1 : 1;
  var celdas = function (grupo) { return estadCeldas(P, def, grupo, columnas, etColumna); };

  function construir(grupo, nivel, camino) {
    var campo = P.cat[filasCampos[nivel]].c, mapa = {}, claves = [];
    grupo.forEach(function (i) {
      estadEtiquetasDe(P, P.alumnos[i], filasCampos[nivel]).forEach(function (e) {
        if (!mapa[e]) { mapa[e] = []; claves.push(e); }
        mapa[e].push(i);
      });
    });
    var grupos = claves.map(function (e) { return { v: e, ids: mapa[e], celdas: celdas(mapa[e]) }; });
    grupos.sort(function (a, b) {
      if (ci < 0) return estadComparar(campo, a.v, b.v) * sentido;
      var x = typeof a.celdas[ci] === 'number' ? a.celdas[ci] : -Infinity, y = typeof b.celdas[ci] === 'number' ? b.celdas[ci] : -Infinity;
      return (x === y ? 0 : (x < y ? -1 : 1)) * sentido || estadComparar(campo, a.v, b.v);
    });
    var ultimo = nivel === filasCampos.length - 1;
    grupos.forEach(function (g) {
      var cam = camino.concat([g.v]);
      if (ultimo) res.filas.push({ tipo: 'hoja', nivel: nivel, camino: cam, celdas: g.celdas, ids: g.ids });
      else {
        construir(g.ids, nivel + 1, cam);
        res.filas.push({ tipo: 'sub', nivel: nivel, camino: cam, texto: 'Total ' + g.v, celdas: g.celdas, ids: g.ids });
      }
    });
  }
  if (filasCampos.length && nc) construir(ids, 0, []);
  res.total = { tipo: 'total', nivel: 0, camino: [], texto: 'Total', celdas: nc ? celdas(ids) : [], ids: ids };
  return res;
}

/* ---------------------------------------------------------------- los alumnos detrás de una cifra (instrucción 70) */

/* La fila `k` del resultado (las filas y, al final, el total) y la cifra `ci` (columna × cálculo): quiénes son, de la MISMA cuenta que la tabla.
   Devuelve { ids, calculo, columna, fila, valores }: `valores[i]` es el valor del dato de cada alumno en una media o una suma. */
function estadAlumnosDeCelda(P, def, res, k, ci) {
  var fila = k < res.filas.length ? res.filas[k] : res.total, nc = res.calculos.length;
  var calculo = res.calculos[ci % nc], columna = res.columnas[Math.floor(ci / nc)];
  var ids = fila.ids;
  if (columna !== null && columna !== undefined && def.columna) ids = ids.filter(function (i) { return estadEtiquetasDe(P, P.alumnos[i], def.columna).indexOf(columna) !== -1; });
  var condicion = calculo.tipo === 'cumplen' || calculo.tipo === 'porcentaje';
  if (condicion) ids = ids.filter(function (i) { return estadEtiquetasDe(P, P.alumnos[i], calculo.dato).indexOf(calculo.valor) !== -1; });
  var valores = null;
  if ((calculo.tipo === 'media' || calculo.tipo === 'suma') && P.cat[calculo.dato]) {
    var ki = P.cat[calculo.dato].i;
    valores = ids.map(function (i) { var v = P.alumnos[i].v[ki]; return v === null || v === undefined || v === '' ? '' : String(v).replace('.', ','); });
  }
  return { ids: ids, calculo: calculo, columna: columna === undefined ? null : columna, fila: fila, valores: valores };
}

/* «9 alumnos · 2º ESO · 2º B · Tiene alguna pendiente: Sí», en llano. */
function estadTituloCelda(P, def, c) {
  var partes = c.fila.camino.slice();
  if (c.fila.tipo === 'total' || !partes.length) partes = ['Total'];
  else if (c.fila.tipo === 'sub') partes = c.fila.camino.slice();
  if (c.columna !== null && def.columna) partes.push(P.cat[def.columna].c.etiqueta + ': ' + c.columna);
  if (c.calculo.tipo === 'cumplen' || c.calculo.tipo === 'porcentaje') partes.push(P.cat[c.calculo.dato].c.etiqueta + ': ' + c.calculo.valor);
  else if (c.calculo.tipo === 'media' || c.calculo.tipo === 'suma') partes.push(c.calculo.etiqueta);
  return partes.join(' · ');
}

/* ---------------------------------------------------------------- cómo se escribe una cifra */

/* 1240 → «1.240». */
function estadMiles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function estadNumeroEs(v, decimales) {
  return Number(v).toFixed(decimales).replace('.', ',');
}

function estadFormato(v, tipo) {
  if (v === EST_CELDA_SD) return EST_CELDA_SD;
  if (v === null || v === undefined) return '–';
  if (tipo === 'porcentaje') return estadNumeroEs(v, 1) + ' %';
  if (tipo === 'media') return estadNumeroEs(v, 2);
  if (tipo === 'suma') return Math.round(v) === v ? String(v) : estadNumeroEs(v, 2);
  return String(v);
}

/* Los filtros, en llano: «Nivel: 2º ESO, 3º ESO · Sexo: Mujer». Sin filtros: todo el alumnado del curso. */
function estadTextoFiltros(P, def) {
  var partes = [];
  Object.keys(def.filtros || {}).forEach(function (k) {
    if (!P.cat[k]) return;
    var v = def.filtros[k].map(function (x) { return x === '@ultimoConNotas' ? 'el último curso con notas' : (x === '@cuaderno' ? 'los cursos con cuaderno' : (x === '@ultimos5' ? 'los cinco últimos cursos' : x)); });
    partes.push(P.cat[k].c.etiqueta + ': ' + (v.length <= 8 ? v.join(', ') : v.slice(0, 8).join(', ') + ' y ' + (v.length - 8) + ' más'));
  });
  return partes.length ? partes.join(' · ') : 'todo el alumnado del curso';
}

/* Los datos que usa la consulta (filas, columna, cálculos, filtros), sin repetir: las columnas de la segunda hoja del Excel. */
function estadClavesUsadas(P, def) {
  var claves = [];
  var meter = function (k) { if (k && P.cat[k] && claves.indexOf(k) === -1) claves.push(k); };
  (def.filas || []).forEach(meter);
  meter(def.columna);
  (def.calculos || []).forEach(function (c) { meter(c.dato); });
  Object.keys(def.filtros || {}).forEach(meter);
  return claves;
}

/* El resultado aplanado, para el PDF y el Excel: títulos y filas de texto con sus cifras. */
function estadMatriz(P, def, res) {
  var filasCampos = (def.filas || []).filter(function (k) { return P.cat[k]; });
  var nf = Math.max(1, filasCampos.length), nc = res.calculos.length;
  var titulosFila = filasCampos.length ? filasCampos.map(function (k) { return P.cat[k].c.etiqueta; }) : [''];
  var grupos = null;
  if (def.columna && P.cat[def.columna]) grupos = res.columnas.map(function (cv) { return { texto: cv === null ? 'Total' : cv, span: nc }; });
  var titulos = titulosFila.slice();
  res.columnas.forEach(function () { res.calculos.forEach(function (c) { titulos.push(c.etiqueta); }); });
  var cuerpo = [], previo = [];
  var valores = function (celdas) { return celdas.map(function (v, j) { return { v: v, tipo: res.calculos[j % nc].tipo, texto: estadFormato(v, res.calculos[j % nc].tipo) }; }); };
  res.filas.forEach(function (f) {
    var etiquetas = [];
    if (f.tipo === 'hoja') {
      for (var i = 0; i < nf; i++) {
        var repetido = i < f.camino.length - 1 && previo.slice(0, i + 1).join('\u0001') === f.camino.slice(0, i + 1).join('\u0001');
        etiquetas.push(repetido ? '' : (f.camino[i] === undefined ? '' : f.camino[i]));
      }
      previo = f.camino;
      cuerpo.push({ tipo: 'hoja', etiquetas: etiquetas, desde: 0, valores: valores(f.celdas) });
    } else {
      for (var j = 0; j < nf; j++) etiquetas.push(j === f.nivel ? f.texto : '');
      previo = [];
      cuerpo.push({ tipo: 'sub', etiquetas: etiquetas, desde: f.nivel, valores: valores(f.celdas) });
    }
  });
  var tot = []; for (var t = 0; t < nf; t++) tot.push(t === 0 ? 'Total' : '');
  cuerpo.push({ tipo: 'total', etiquetas: tot, desde: 0, valores: valores(res.total.celdas) });
  return { nf: nf, nc: nc, titulosFila: titulosFila, grupos: grupos, titulos: titulos, cuerpo: cuerpo };
}
