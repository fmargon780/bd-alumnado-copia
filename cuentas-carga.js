/* De la carpeta a la tabla (instrucción 171, tramo 4): junta lo que hay en la carpeta «CENTRO DE DATOS» (centro-datos-web.js) y lo que deja Google en la carpeta privada de la web nueva (`_cuentas-entradas.json`, CuentasEntradas.gs)
   y hace las cuentas (cuentas-web.js). Todo en la memoria de la página: nada de alumnos se guarda en el ordenador.
   `cargar({ centro, privada })`: `centro` = CentroDatosWeb (ya abierta) y `privada` = CarpetaWeb (la carpeta privada, ya abierta). Devuelve { ok, hojas, cuadre, faltan, hora, ficheros, sinExpedientes, ms } o lanza un error con un texto para la persona. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var FICHERO_ENTRADAS = '_cuentas-entradas.json';
  var CLAVES = { alumnado: true, matricula: true, 'censo-neae': true };   // lo que el programa lee de Séneca para la tabla (los expedientes, aparte)
  var CARPETA_DATOS = 'Datos de matrícula';

  /* Las fechas viajan como { "$f": milisegundos }: se devuelven a fechas. */
  function revivir(x) {
    if (Array.isArray(x)) return x.map(revivir);
    if (x && typeof x === 'object') {
      if (Object.keys(x).length === 1 && typeof x['$f'] === 'number') return new Date(x['$f']);
      var o = {}; Object.keys(x).forEach(function (k) { o[k] = revivir(x[k]); }); return o;
    }
    return x;
  }

  /* Las entradas del índice que se llevan a las cuentas: de Séneca, de un fichero, y del curso en marcha las de matrícula. Las de un periodo o de un alumno, no. */
  function entradasQueSeUsan(indice) {
    var C = G.CentroDatosWeb;
    return C.ficherosDeSeneca(indice).filter(function (e) {
      if (!CLAVES[String(e.clave || '')]) return false;
      if (String(e.alumno || '').trim() || String(e.periodo || '').trim()) return false;
      if (e.clave === 'matricula' && indice.cursoActual && String(e.cursoEscolar || '') && String(e.cursoEscolar) !== String(indice.cursoActual)) return false;
      return true;
    });
  }

  async function cargar(o) {
    var C = o.centro, privada = o.privada;
    var t0 = Date.now();
    var indice = await C.leerIndice();
    var est = C.estado(indice);
    if (!est.ok) throw new Error(est.motivo);
    var usadas = entradasQueSeUsan(indice);
    if (!usadas.some(function (e) { return e.clave === 'alumnado'; })) throw new Error('En el Centro de datos no está el listado del alumnado.');
    var ficheros = [];
    for (var i = 0; i < usadas.length; i++) {
      var e = usadas[i];
      ficheros.push({ nombre: String(e.fichero), bytes: new Uint8Array(await C.leerBytes(e)), fecha: Date.parse(String(e.subido || '')) || 0 });
    }
    var entradas = { hojas: {}, notas: {} };
    try { var j = revivir(await privada.leerJson(FICHERO_ENTRADAS)); entradas = { hojas: j.hojas || {}, notas: j.notas || {}, hora: j.hora || '' }; } catch (err) { /* sin el fichero de Google se calcula sin él y se dice (`faltan`) */ }
    var carpetas = {}; carpetas[CARPETA_DATOS] = ficheros;
    var r = G.CuentasWeb.calcular({ carpetas: carpetas, hojas: entradas.hojas, notas: entradas.notas, centro: o.datosCentro, quiere: o.quiere, curso: indice.cursoActual || undefined });
    r.curso = indice.cursoActual || '26-27';
    r.hora = C.horaDeLosDatos(indice, usadas);
    r.ficheros = ficheros.length;
    r.sinExpedientes = true;   // los expedientes de Primaria y Secundaria no vienen todavía de esta carpeta (queda por decidir con Francisco)
    r.ms = Date.now() - t0;
    return r;
  }

  G.CuentasCarga = { cargar: cargar, revivir: revivir, entradasQueSeUsan: entradasQueSeUsan, FICHERO_ENTRADAS: FICHERO_ENTRADAS };
})();
