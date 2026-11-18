/* Las cuentas en el navegador (instrucción 171, tramo 2): con los ficheros de Séneca (que da centro-datos-web.js) y el programa de las cuentas (cuentas-programa.js, salido de los .gs) monta la tabla del alumnado, los avisos,
   el cuadre de Séneca contra Jefatura, la comprobación de la matrícula, el censo NEAE y los expedientes, en la memoria de la página. Las reglas son las mismas líneas de los .gs: aquí no se reescribe ninguna.
   `calcular(entradas)`: entradas = { carpetas: { 'Datos de matrícula': [{ nombre, bytes, fecha }], 'Expedientes Primaria': [...], 'Expedientes Secundaria': [...] },
   notas: { 'EV 1º ESO': filas } (el cuaderno de notas), clave (la ficha de un alumno), hojas: { nombre: filas } (lo que el programa lee de pestañas: el reparto de la mesa, las correcciones…; hasta la fila 172 lo deja Google), centro: { nombre, codigo }, curso, preparar(mundo, programa) (solo para pruebas) }.
   Devuelve { hojas: { ALUMNADO, AVISOS, MATRÍCULA… : filas }, ms }. Hace dos vueltas, como la puesta al día de siempre: la primera deja la tabla con la que la segunda cruza el reparto de la mesa. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var SALIDAS = ['ALUMNADO', 'AVISOS', 'NEAE', 'PRIMARIA', 'SECUNDARIA', 'MATRÍCULA', 'HISTORIAL', 'CUADRE PERSONAS', 'CUADRE MATERIAS', 'CUADRE CONTROLES'];

  /* Las pestañas del cuaderno que el programa LEE y que no salen de los ficheros de Séneca: lo que escriben las personas y lo que sabe BD Alumnado (reparto de la mesa, correcciones, oferta, notas, revisado…). Hasta la fila 172 las deja
     Google; la web las pasa en `hojas`. Más el cuaderno de notas de la evaluación («EV 1º ESO»…), que es otro libro. Una prueba (pruebas/cuentas-navegador.mjs) avisa si el programa empieza a leer una pestaña que no está aquí. */
  var ENTRADAS = ['OFERTA', '_excel_jefatura', '_mesa_marcas', '_mesa_modelos', '_codigos_excel', '_notas', '_correcciones', '_revisados', '_transito'];

  function calcular(entradas) {
    if (!G.CuentasMundo || !G.CuentasPrograma) throw new Error('Faltan cuentas-mundo.js o cuentas-programa.js.');
    var t0 = Date.now();
    var mundo = G.CuentasMundo.crear({ carpetas: entradas.carpetas, centro: entradas.centro, curso: entradas.curso });
    var hojas = entradas.hojas || {};
    Object.keys(hojas).forEach(function (n) { if (!mundo.libro.hojas[n]) mundo.libro.insertSheet(n).filas = JSON.parse(JSON.stringify(hojas[n])); });
    var P = G.CuentasPrograma(mundo.A);
    P.poner('avisar_', function () {});
    /* El cuaderno de notas de la evaluación («EV 1º ESO»…) es otro libro: el programa lo pide por su identificador. */
    if (entradas.notas && Object.keys(entradas.notas).length) {
      var libroNotas = { getName: function () { return 'Cuaderno de notas'; }, getSheetByName: function (n) { var f = entradas.notas[n]; return f ? { getDataRange: function () { return { getValues: function () { return f; } }; } } : null; } };
      var abrir = mundo.A.SpreadsheetApp.openById;
      mundo.A.SpreadsheetApp.openById = function (id) { return id === 'NOTAS' ? libroNotas : abrir(id); };
      mundo.A.DriveApp.getFileById = function (id) { return { getId: function () { return id; }, getName: function () { return 'Cuaderno de notas'; }, getLastUpdated: function () { return new Date(entradas.notasFecha || 0); }, getMimeType: function () { return 'application/vnd.google-apps.spreadsheet'; } }; };
      P.poner('centroIdNotas_', function () { return 'NOTAS'; });
    }
    if (typeof entradas.preparar === 'function') entradas.preparar(mundo, P);
    P.leer('cargarHistorico')();
    var ok = P.leer('construirAlumnado')() && P.leer('construirAlumnado')();
    var cuadre = ok ? P.leer('escribirCuadre_')() : null;   // el cuadre va pegado a la tabla: su dato solo existe en la memoria de esa vuelta
    /* El listado de la web nueva (ListadoWeb.gs): las mismas filas [clave, nombre, unidad, máscara] que deja Google en `_listado-<curso>.json`, hechas con la tabla de ahora. */
    var quiere = entradas.quiere || ['listado'], curso = entradas.curso || '26-27';
    var listado = null, ligero = null;
    if (ok && (quiere.indexOf('listado') !== -1 || quiere.indexOf('ficha') !== -1)) { try { ligero = P.leer('alumnadoLigero_')(curso); } catch (e) { ligero = null; } }
    if (ligero && quiere.indexOf('listado') !== -1) { try { listado = P.leer('listadoWebFilas_')(ligero.alumnos); } catch (e) { listado = null; } }
    /* La ficha de UN alumno (FichaWeb.gs): el mismo registro que deja Google en `_ficha-<curso>-<unidad>.json`. */
    var ficha = null;
    if (ligero && quiere.indexOf('ficha') !== -1 && entradas.clave) {
      try {
        var alumno = ligero.alumnos.filter(function (x) { return x.clave === entradas.clave; })[0];
        if (alumno) ficha = { unidad: alumno.unidad || '', curso: alumno.curso || '', registro: P.leer('fichaWebRegistro_')(alumno, P.leer('webFichaExtra')(curso), P.leer('webHistoricoCursos')(curso), P.leer('fichaWebMaterias_')()) };
      } catch (e) { ficha = null; }
    }
    /* «Revisión» de la web nueva (RevisionWeb.gs): la lectura `webRevision` (avisos, matrícula, cuadre, cambios para Séneca), las tres tablas del cuadre y la oferta, como los deja Google en `_revision-<curso>.json`. */
    var revision = null;
    if (ok && quiere.indexOf('revision') !== -1) {
      try {
        try { P.leer('escribirCambiosSeneca_')(); } catch (e) { /* sin el mundo de la mesa, la lista de cambios queda vacía */ }
        revision = { rev: P.leer('revisionDatos_')(curso), cuadre: P.leer('revisionWebCuadre_')(curso), oferta: P.leer('revisionWebOferta_')(curso) };
      } catch (e) { revision = null; }
    }
    /* «Estadísticas» (EstadisticasWeb.gs): los datos del curso y las materias, como los deja Google en `_estadisticas-datos-<curso>.json` y `_estadisticas-materias-<curso>.json`. */
    var estadisticas = null;
    if (ok && quiere.indexOf('estadisticas') !== -1) {
      try { estadisticas = { datos: P.leer('webEstadisticasCurso')(curso), materias: P.leer('webEstadisticasMaterias')(curso) }; } catch (e) { estadisticas = null; }
    }
    var resumen = ok ? P.leer('cuentasResumen_')(mundo.libro, cuadre) : null;   // solo cifras: lo que la web deja en `_navegador-cuentas.json` para que Google lo compare con el suyo
    var salida = {};
    SALIDAS.forEach(function (n) { salida[n] = mundo.libro.hojas[n] ? mundo.libro.hojas[n].filas : []; });
    var faltan = ENTRADAS.filter(function (n) { return !hojas[n]; });   // las que no se han pasado: la tabla sale como si estuvieran vacías, y la página lo tiene que decir
    return { ok: ok === true, faltan: faltan, listado: listado, revision: revision, estadisticas: estadisticas, ficha: ficha, resumen: resumen, version: P.leer('VERSION_BD'), hojas: salida, cuadre: cuadre ? { sinExplicar: cuadre.sinExplicar, personas: cuadre.personas, materias: cuadre.materias, controles: cuadre.controles } : null, ms: Date.now() - t0 };
  }

  G.CuentasWeb = { SALIDAS: SALIDAS, ENTRADAS: ENTRADAS, calcular: calcular };
})();
