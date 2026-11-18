/* Las cuentas en el navegador (instrucción 171, tramo 2): con los ficheros de Séneca (que da centro-datos-web.js) y el programa de las cuentas (cuentas-programa.js, salido de los .gs) monta la tabla del alumnado, los avisos,
   el cuadre de Séneca contra Jefatura, la comprobación de la matrícula, el censo NEAE y los expedientes, en la memoria de la página. Las reglas son las mismas líneas de los .gs: aquí no se reescribe ninguna.
   `calcular(entradas)`: entradas = { carpetas: { 'Datos de matrícula': [{ nombre, bytes, fecha }], 'Expedientes Primaria': [...], 'Expedientes Secundaria': [...] },
   hojas: { nombre: filas } (lo que el programa lee de pestañas: el reparto de la mesa, las correcciones…; hasta la fila 172 lo deja Google), centro: { nombre, codigo }, curso, preparar(mundo, programa) (solo para pruebas) }.
   Devuelve { hojas: { ALUMNADO, AVISOS, MATRÍCULA… : filas }, ms }. Hace dos vueltas, como la puesta al día de siempre: la primera deja la tabla con la que la segunda cruza el reparto de la mesa. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var SALIDAS = ['ALUMNADO', 'AVISOS', 'NEAE', 'PRIMARIA', 'SECUNDARIA', 'MATRÍCULA', 'HISTORIAL', 'CUADRE PERSONAS', 'CUADRE MATERIAS', 'CUADRE CONTROLES'];

  /* Las pestañas del cuaderno que el programa LEE y que no salen de los ficheros de Séneca: lo que escriben las personas y lo que sabe BD Alumnado (reparto de la mesa, correcciones, oferta, notas, revisado…). Hasta la fila 172 las deja
     Google; la web las pasa en `hojas`. Más el cuaderno de notas de la evaluación («EV 1º ESO»…), que es otro libro. Una prueba (pruebas/cuentas-navegador.mjs) avisa si el programa empieza a leer una pestaña que no está aquí. */
  var ENTRADAS = ['OFERTA', '_excel_jefatura', '_mesa_marcas', '_mesa_modelos', '_codigos_excel', '_notas', '_correcciones', '_revisados'];

  function calcular(entradas) {
    if (!G.CuentasMundo || !G.CuentasPrograma) throw new Error('Faltan cuentas-mundo.js o cuentas-programa.js.');
    var t0 = Date.now();
    var mundo = G.CuentasMundo.crear({ carpetas: entradas.carpetas, centro: entradas.centro, curso: entradas.curso });
    var hojas = entradas.hojas || {};
    Object.keys(hojas).forEach(function (n) { if (!mundo.libro.hojas[n]) mundo.libro.insertSheet(n).filas = JSON.parse(JSON.stringify(hojas[n])); });
    var P = G.CuentasPrograma(mundo.A);
    P.poner('avisar_', function () {});
    if (typeof entradas.preparar === 'function') entradas.preparar(mundo, P);
    P.leer('cargarHistorico')();
    var ok = P.leer('construirAlumnado')() && P.leer('construirAlumnado')();
    var cuadre = ok ? P.leer('escribirCuadre_')() : null;   // el cuadre va pegado a la tabla: su dato solo existe en la memoria de esa vuelta
    var salida = {};
    SALIDAS.forEach(function (n) { salida[n] = mundo.libro.hojas[n] ? mundo.libro.hojas[n].filas : []; });
    var faltan = ENTRADAS.filter(function (n) { return !hojas[n]; });   // las que no se han pasado: la tabla sale como si estuvieran vacías, y la página lo tiene que decir
    return { ok: ok === true, faltan: faltan, hojas: salida, cuadre: cuadre ? { sinExplicar: cuadre.sinExplicar, personas: cuadre.personas, materias: cuadre.materias, controles: cuadre.controles } : null, ms: Date.now() - t0 };
  }

  G.CuentasWeb = { SALIDAS: SALIDAS, ENTRADAS: ENTRADAS, calcular: calcular };
})();
