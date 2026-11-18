/* Las cuentas en el navegador (instrucción 171, tramo 2): con los ficheros de Séneca (que da centro-datos-web.js) y el programa de las cuentas (cuentas-programa.js, salido de los .gs) monta la tabla del alumnado, los avisos,
   la comprobación de la matrícula, el censo NEAE y los expedientes, en la memoria de la página. Las reglas son las mismas líneas de los .gs: aquí no se reescribe ninguna.
   `calcular(entradas)`: entradas = { carpetas: { 'Datos de matrícula': [{ nombre, bytes, fecha }], 'Expedientes Primaria': [...], 'Expedientes Secundaria': [...] },
   hojas: { nombre: filas } (lo que el programa lee de pestañas: el reparto de la mesa, las correcciones…; hasta la fila 172 lo deja Google), centro: { nombre, codigo }, curso, preparar(mundo, programa) (solo para pruebas) }.
   Devuelve { hojas: { ALUMNADO, AVISOS, MATRÍCULA… : filas }, ms }. Hace dos vueltas, como la puesta al día de siempre: la primera deja la tabla con la que la segunda cruza el reparto de la mesa. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var SALIDAS = ['ALUMNADO', 'AVISOS', 'NEAE', 'PRIMARIA', 'SECUNDARIA', 'MATRÍCULA', 'HISTORIAL'];

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
    var salida = {};
    SALIDAS.forEach(function (n) { salida[n] = mundo.libro.hojas[n] ? mundo.libro.hojas[n].filas : []; });
    return { ok: ok === true, hojas: salida, ms: Date.now() - t0 };
  }

  G.CuentasWeb = { SALIDAS: SALIDAS, calcular: calcular };
})();
