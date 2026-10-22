/* La regla del listado de la web nueva (instrucción 138, parte 1). Es la del listado de hoy (JsAlumnado.html): once filtros que se suman, la unidad, orden por nombre o unidad (comparando textos, como hoy) y las
   etiquetas de cada fila. Cada alumno viene como [clave, nombre, unidad, máscara]; la máscara lleva un bit por bandera, en el orden de BANDERAS (el mismo que LISTADO_BANDERAS_ de ListadoWeb.gs: una prueba los compara). */
(function (raiz) {
  'use strict';
  /* clave y etiqueta de cada filtro, en el orden de los bits y de FILTROS_DISPONIBLES de la app de hoy. */
  var BANDERAS = [
    ['rep', 'REP'], ['pil', 'PIL'], ['neae', 'NEAE'], ['div', 'DIV'], ['pendientes', 'Con pendientes'], ['suspensasAnoPasado3', '3+ suspensas el curso pasado'],
    ['conflictivo', 'Conflictivo'], ['bilingue', 'Pide bilingüe'], ['exentoFrances', 'Exento de francés'], ['avisos', 'Con avisos'], ['matriculaNoCuadra', 'Matrícula no cuadra']
  ];
  /* Las etiquetas de la fila, en el orden de etiquetasFilaListado_ de hoy. */
  var CHIPS = [['rep', 'REP'], ['pil', 'PIL'], ['neae', 'NEAE'], ['div', 'DIV'], ['conflictivo', 'Conflictivo'], ['matriculaNoCuadra', 'Matrícula'], ['avisos', 'Avisos']];

  function bit(mascara, clave) {
    for (var i = 0; i < BANDERAS.length; i++) if (BANDERAS[i][0] === clave) return Math.floor((Number(mascara) || 0) / Math.pow(2, i)) % 2 === 1;
    return false;
  }
  function preparar(filas) {
    return (filas || []).map(function (f) { return { clave: f[0], nombre: f[1], unidad: f[2], mascara: f[3] }; });
  }
  /* Las unidades que hay, ordenadas como hoy (`sort()` de textos). */
  function unidades(alumnos) {
    var l = [];
    alumnos.forEach(function (a) { if (a.unidad && l.indexOf(a.unidad) === -1) l.push(a.unidad); });
    return l.sort();
  }
  /* `activos`: { clave: true }. Cada filtro activo se suma (el alumno tiene que cumplirlos todos). */
  function filtrar(alumnos, unidad, activos) {
    var claves = Object.keys(activos || {}).filter(function (k) { return activos[k]; });
    return alumnos.filter(function (a) {
      if (unidad && a.unidad !== unidad) return false;
      return claves.every(function (k) { return bit(a.mascara, k); });
    });
  }
  /* Compara textos con < y >, como la de hoy (no con `localeCompare`). */
  function ordenar(filas, campo, asc) {
    return filas.slice().sort(function (x, y) {
      var vx = String(x[campo] || ''), vy = String(y[campo] || '');
      var c = vx < vy ? -1 : (vx > vy ? 1 : 0);
      return asc ? c : -c;
    });
  }
  function etiquetas(a) { return CHIPS.filter(function (c) { return bit(a.mascara, c[0]); }).map(function (c) { return c[1]; }); }
  function resumen(n) { return n + ' alumno' + (n === 1 ? '' : 's') + '.'; }

  var api = { BANDERAS: BANDERAS, CHIPS: CHIPS, bit: bit, preparar: preparar, unidades: unidades, filtrar: filtrar, ordenar: ordenar, etiquetas: etiquetas, resumen: resumen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.ListadoBase = api;
})(typeof window !== 'undefined' ? window : globalThis);
